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
