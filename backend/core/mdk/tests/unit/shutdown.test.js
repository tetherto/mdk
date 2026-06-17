'use strict'

// Lifecycle helpers: shutdown(handle) teardown across the three handle shapes,
// and onShutdown() idempotency + signal registration. Signal handlers call
// process.exit, so we never emit a real signal — we invoke the returned handler
// with process.exit stubbed, and always remove listeners in teardown so they
// don't leak across the brittle run.

const test = require('brittle')
const { shutdown, onShutdown } = require('../../index')

test('shutdown - ork-like handle: drains _cleanup in order then stops', async (t) => {
  const order = []
  const handle = {
    _cleanup: [async () => order.push('c1'), async () => order.push('c2')],
    stop: () => { order.push('stop'); return Promise.resolve() }
  }
  await shutdown(handle)
  t.alike(order, ['c1', 'c2', 'stop'], 'cleanups before stop, in registration order')
  t.is(handle.__mdkShutdownDone, true)

  await shutdown(handle) // idempotent
  t.alike(order, ['c1', 'c2', 'stop'], 'second call is a no-op')
})

test('shutdown - worker-like handle: stops manager then adapter', async (t) => {
  const order = []
  const handle = {
    manager: { stop: (cb) => { order.push('manager'); cb() } },
    adapter: { stop: async () => { order.push('adapter') } },
    store: {}
  }
  await shutdown(handle)
  t.alike(order, ['manager', 'adapter'], 'manager flushed before adapter')
})

test('shutdown - app-node-like handle: callback stop()', async (t) => {
  let stopped = false
  const handle = { stop: (cb) => { stopped = true; cb() } }
  await shutdown(handle)
  t.is(stopped, true)
  t.is(handle.__mdkShutdownDone, true)
})

test('shutdown - tolerates null and partial handles', async (t) => {
  await shutdown(null) // no throw
  await shutdown({}) // no stop, no cleanup, no manager/adapter
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
