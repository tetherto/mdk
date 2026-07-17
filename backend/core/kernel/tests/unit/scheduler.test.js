'use strict'

const test = require('brittle')
const { Scheduler } = require('../../lib/modules/scheduler')

test('scheduler - start() registers default jobs', (t) => {
  const scheduler = new Scheduler({
    telemetryCollector: { pullAll: async () => {} },
    healthMonitor: { pingAll: async () => {} },
    registry: {},
    workerChannel: {},
    cadences: { telemetryPullMs: 10000, healthPingMs: 5000 }
  })

  scheduler.start()
  t.is(scheduler._jobs.size, 2, 'two jobs registered')
  t.ok(scheduler._jobs.has('telemetry.pull'))
  t.ok(scheduler._jobs.has('health.ping'))
  t.ok(scheduler._running)

  scheduler.stop()
  t.is(scheduler._jobs.size, 0, 'jobs cleared on stop')
  t.absent(scheduler._running)
})

test('scheduler - jobs actually fire on interval', async (t) => {
  let calls = 0
  const scheduler = new Scheduler({
    telemetryCollector: { pullAll: async () => {} },
    healthMonitor: { pingAll: async () => {} },
    registry: {},
    workerChannel: {},
    cadences: { telemetryPullMs: 100000, healthPingMs: 100000 }
  })

  scheduler.addJob('test-job', 50, async () => { calls++ })

  await new Promise(resolve => setTimeout(resolve, 180))
  scheduler.stop()

  t.ok(calls >= 2, `job fired ${calls} times in 180ms`)
})

test('scheduler - overlapping execution is prevented', async (t) => {
  let concurrent = 0
  let maxConcurrent = 0

  const scheduler = new Scheduler({
    telemetryCollector: { pullAll: async () => {} },
    healthMonitor: { pingAll: async () => {} },
    registry: {},
    workerChannel: {},
    cadences: { telemetryPullMs: 100000, healthPingMs: 100000 }
  })

  scheduler.addJob('slow-job', 30, async () => {
    concurrent++
    maxConcurrent = Math.max(maxConcurrent, concurrent)
    await new Promise(resolve => setTimeout(resolve, 100))
    concurrent--
  })

  await new Promise(resolve => setTimeout(resolve, 200))
  scheduler.stop()

  t.is(maxConcurrent, 1, 'never ran concurrently')
})

test('scheduler - start() is idempotent', (t) => {
  const scheduler = new Scheduler({
    telemetryCollector: { pullAll: async () => {} },
    healthMonitor: { pingAll: async () => {} },
    registry: {},
    workerChannel: {},
    cadences: { telemetryPullMs: 100000, healthPingMs: 100000 }
  })

  scheduler.start()
  scheduler.start()
  t.is(scheduler._jobs.size, 2, 'still only 2 jobs')
  scheduler.stop()
})

test('scheduler - removeJob clears specific job', (t) => {
  const scheduler = new Scheduler({
    telemetryCollector: { pullAll: async () => {} },
    healthMonitor: { pingAll: async () => {} },
    registry: {},
    workerChannel: {},
    cadences: { telemetryPullMs: 100000, healthPingMs: 100000 }
  })

  scheduler.start()
  t.is(scheduler._jobs.size, 2)

  scheduler.removeJob('health.ping')
  t.is(scheduler._jobs.size, 1)
  t.ok(scheduler._jobs.has('telemetry.pull'))
  t.absent(scheduler._jobs.has('health.ping'))

  scheduler.stop()
})

test('scheduler - handler error does not crash scheduler', async (t) => {
  const scheduler = new Scheduler({
    telemetryCollector: { pullAll: async () => {} },
    healthMonitor: { pingAll: async () => {} },
    registry: {},
    workerChannel: {},
    cadences: { telemetryPullMs: 100000, healthPingMs: 100000 }
  })

  let callsAfterError = 0
  let threw = false

  scheduler.addJob('error-job', 30, async () => {
    if (!threw) { threw = true; throw new Error('test error') }
    callsAfterError++
  })

  await new Promise(resolve => setTimeout(resolve, 150))
  scheduler.stop()

  t.ok(threw, 'error was thrown')
  t.ok(callsAfterError >= 1, 'job continued after error')
})
