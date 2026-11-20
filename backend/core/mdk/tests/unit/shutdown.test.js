'use strict'

// Lifecycle helpers: shutdown(handle) teardown across the handle shapes,
// and onShutdown() idempotency + signal registration. Signal handlers call
// process.exit, so we never emit a real signal — we invoke the returned handler
// with process.exit stubbed, and always remove listeners in teardown so they
// don't leak across the brittle run.

const test = require('brittle')
const { shutdown, onShutdown } = require('../../index')

test('shutdown - kernel-like handle: drains _cleanup last-registered first, then stops', async (t) => {
  const order = []
  const handle = {
    _cleanup: [async () => order.push('c1'), async () => order.push('c2')],
    stop: () => { order.push('stop'); return Promise.resolve() }
  }
  const registered = [...handle._cleanup]
  await shutdown(handle)
  t.alike(order, ['c2', 'c1', 'stop'], 'cleanups before stop, in reverse registration order')
  t.is(handle.__mdkShutdownDone, true)
  t.ok(handle._cleanup.length === registered.length && handle._cleanup.every((fn, i) => fn === registered[i]),
    'the cleanup list itself is left as registered, not reversed in place')

  await shutdown(handle) // idempotent
  t.alike(order, ['c2', 'c1', 'stop'], 'second call is a no-op')
})

test('shutdown - a Gateway registered after a Worker stops before it, and a failing cleanup does not stop the rest', async (t) => {
  // The teardown guide's pattern: the Worker's stop is pushed, then startGateway({ kernel }) pushes the Gateway's.
  const order = []
  const kernel = {
    _cleanup: [
      async () => order.push('trusted-keys admitter'),
      async () => { order.push('worker'); throw new Error('boom') },
      async () => order.push('gateway')
    ],
    stop: async () => { order.push('kernel') }
  }
  await shutdown(kernel)
  t.alike(order, ['gateway', 'worker', 'trusted-keys admitter', 'kernel'])
})

test('shutdown - runtime-worker-like handle: promise stop()', async (t) => {
  let stopped = false
  const handle = { stop: async () => { stopped = true } }
  await shutdown(handle)
  t.is(stopped, true)
  t.is(handle.__mdkShutdownDone, true)
})

test('shutdown - gateway-like handle: callback stop()', async (t) => {
  let stopped = false
  const handle = { stop: (cb) => { stopped = true; cb() } }
  await shutdown(handle)
  t.is(stopped, true)
  t.is(handle.__mdkShutdownDone, true)
})

test('shutdown - tolerates null and partial handles', async (t) => {
  await shutdown(null) // no throw
  await shutdown({}) // no stop, no cleanup
  t.pass('null and empty handles are safe')
})

test('onShutdown - runs cleanup once and registers SIGINT + SIGTERM', async (t) => {
  const realExit = process.exit
  const intBefore = process.listenerCount('SIGINT')
  const termBefore = process.listenerCount('SIGTERM')

  process.exit = () => {} // swallow; handler continues past it

  let cleanups = 0
  const handler = onShutdown(async () => { cleanups++ })

  t.is(process.listenerCount('SIGINT'), intBefore + 1, 'registered a SIGINT listener')
  t.is(process.listenerCount('SIGTERM'), termBefore + 1, 'registered a SIGTERM listener')

  t.teardown(() => {
    process.exit = realExit
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
  })

  await handler()
  await handler() // duplicate signal / manual re-invoke
  t.is(cleanups, 1, 'cleanup ran exactly once (idempotent)')
})

test('onShutdown - handlers share one shutdown: all run, last-registered first, then one exit', async (t) => {
  const realExit = process.exit
  const order = []
  process.exit = () => { order.push('exit') }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const slow = onShutdown(async () => { await sleep(50); order.push('slow') }, { forceMs: 5000 })
  const fast = onShutdown(async () => { order.push('fast') })
  t.teardown(() => {
    process.exit = realExit
    for (const h of [slow, fast]) {
      process.removeListener('SIGINT', h)
      process.removeListener('SIGTERM', h)
    }
  })

  await Promise.all([fast(), slow()]) // one signal reaches every handler
  t.alike(order, ['fast', 'slow', 'exit'], 'the slow cleanup is not cut off, and the process exits once')
})

test('onShutdown - an emitted signal runs every handler, though Node detaches each once listener before calling it', async (t) => {
  const realExit = process.exit
  const order = []
  let exited
  const done = new Promise((resolve) => { exited = resolve })
  process.exit = () => { order.push('exit'); exited() }
  t.teardown(() => { process.exit = realExit })

  // SIGUSR2 keeps the emitted signal away from the test runner's own handlers.
  onShutdown(async () => { order.push('first-registered') }, { signals: ['SIGUSR2'] })
  onShutdown(async () => { order.push('last-registered') }, { signals: ['SIGUSR2'] })
  process.emit('SIGUSR2')
  await done

  t.alike(order, ['last-registered', 'first-registered', 'exit'], 'the invoked handler keeps its own cleanup')
  t.is(process.listenerCount('SIGUSR2'), 0, 'both once listeners are gone')
})

test('onShutdown - a handler removed from its signals before shutdown does not run', async (t) => {
  const realExit = process.exit
  process.exit = () => {}
  const ran = []
  const kept = onShutdown(async () => { ran.push('kept') })
  const removed = onShutdown(async () => { ran.push('removed') })
  for (const sig of ['SIGINT', 'SIGTERM']) process.removeListener(sig, removed)
  t.teardown(() => {
    process.exit = realExit
    process.removeListener('SIGINT', kept)
    process.removeListener('SIGTERM', kept)
  })

  await kept()
  t.alike(ran, ['kept'], 'removing the handler cancelled its cleanup')
})

test('onShutdown - swallows a throwing cleanup and still exits', async (t) => {
  const realExit = process.exit
  let exits = 0
  process.exit = () => { exits++ }

  const handler = onShutdown(async () => { throw new Error('boom') })
  t.teardown(() => {
    process.exit = realExit
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
  })

  await handler() // must not reject
  t.ok(exits >= 1, 'still reached process.exit despite the cleanup error')
})

test('onShutdown - a cleanup still running at forceMs force-exits with code 1', async (t) => {
  const realExit = process.exit
  const codes = []
  let forced
  const forcedP = new Promise((resolve) => { forced = resolve })
  process.exit = (code) => { codes.push(code); if (code === 1) forced() }

  // Hangs until the force timer fires, then resolves so the shared shutdown
  // finishes and clears its latch for later tests.
  const handler = onShutdown(() => forcedP, { forceMs: 20 })
  t.teardown(() => {
    process.exit = realExit
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
  })

  // The force timer is unref'd; keep the loop alive until it fires.
  const keepAlive = setInterval(() => {}, 1000)
  await handler()
  clearInterval(keepAlive)
  t.is(codes[0], 1, 'the force timer exits non-zero, so a supervisor sees the cut-off cleanup')
})

test('onShutdown - rejects a forceMs that is not a finite number >= 0, registering nothing', async (t) => {
  const intBefore = process.listenerCount('SIGINT')
  for (const forceMs of ['5000', NaN, Infinity, -1, null, 2 ** 31]) {
    t.exception(() => onShutdown(() => {}, { forceMs }), /ERR_SHUTDOWN_FORCE_MS_INVALID/, `forceMs ${String(forceMs)}`)
  }
  t.is(process.listenerCount('SIGINT'), intBefore, 'no signal handler was registered')
})

test('onShutdown - accepts forceMs at the bounds, 0 and Node\'s timer limit 2^31 - 1', async (t) => {
  for (const forceMs of [0, 2 ** 31 - 1]) {
    const handler = onShutdown(() => {}, { forceMs })
    process.removeListener('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
    t.pass(`forceMs ${forceMs} accepted`)
  }
})

test('getKernel / startGateway - reject an invalid shutdownForceMs before starting anything', async (t) => {
  const { getKernel, startGateway } = require('../../index')
  await t.exception(getKernel({ handleSignals: true, shutdownForceMs: '5000' }), /ERR_SHUTDOWN_FORCE_MS_INVALID: shutdownForceMs/)
  await t.exception(startGateway({ handleSignals: true, shutdownForceMs: -1 }), /ERR_SHUTDOWN_FORCE_MS_INVALID: shutdownForceMs/)
  await t.exception(getKernel({ handleSignals: true, shutdownForceMs: 2 ** 31 }), /ERR_SHUTDOWN_FORCE_MS_INVALID: shutdownForceMs/)
})
