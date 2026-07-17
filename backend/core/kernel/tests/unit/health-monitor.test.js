'use strict'

const test = require('brittle')
const { HealthMonitor } = require('../../lib/modules/health-monitor')
const { HEALTH_STATES } = require('../../lib/modules/health-monitor/states')

function createMockRegistry (workers) {
  const healthStates = {}
  return {
    getReadyWorkers () { return workers },
    updateHealthState (workerId, state) { healthStates[workerId] = state },
    getHealthStates () { return healthStates }
  }
}

function createMockChannel (shouldFail) {
  return {
    async send () {
      if (shouldFail) throw new Error('ERR_CHANNEL_TIMEOUT')
      return { payload: { status: 'OK' } }
    }
  }
}

test('health-monitor - successful ping marks worker HEALTHY', async (t) => {
  const registry = createMockRegistry([
    { workerId: 'w1', channel: { request: async () => ({}) } }
  ])
  const hm = new HealthMonitor({ registry, workerChannel: createMockChannel(false), failureThreshold: 3 })
  hm.start()

  await hm.pingAll()

  const health = hm.getHealth('w1')
  t.is(health.state, HEALTH_STATES.HEALTHY)
  t.is(health.consecutiveFailures, 0)
  t.ok(health.lastPing > 0)
  t.is(registry.getHealthStates().w1, HEALTH_STATES.HEALTHY)
})

test('health-monitor - 1 failure marks SICK', async (t) => {
  const registry = createMockRegistry([
    { workerId: 'w1', channel: { request: async () => ({}) } }
  ])
  const hm = new HealthMonitor({ registry, workerChannel: createMockChannel(true), failureThreshold: 3 })
  hm.start()

  await hm.pingAll()

  t.is(hm.getHealth('w1').state, HEALTH_STATES.SICK)
  t.is(hm.getHealth('w1').consecutiveFailures, 1)
  t.is(registry.getHealthStates().w1, HEALTH_STATES.SICK)
})

test('health-monitor - 3 failures marks DEAD', async (t) => {
  const registry = createMockRegistry([
    { workerId: 'w1', channel: { request: async () => ({}) } }
  ])
  const hm = new HealthMonitor({ registry, workerChannel: createMockChannel(true), failureThreshold: 3 })
  hm.start()

  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.SICK)

  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.SICK)
  t.is(hm.getHealth('w1').consecutiveFailures, 2)

  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.DEAD)
  t.is(hm.getHealth('w1').consecutiveFailures, 3)
  t.is(registry.getHealthStates().w1, HEALTH_STATES.DEAD)
})

test('health-monitor - success after SICK resets to HEALTHY', async (t) => {
  const failCount = { n: 0 }
  const registry = createMockRegistry([
    { workerId: 'w1', channel: { request: async () => ({}) } }
  ])
  const wc = {
    async send () {
      failCount.n++
      if (failCount.n <= 2) throw new Error('fail')
      return { payload: { status: 'OK' } }
    }
  }
  const hm = new HealthMonitor({ registry, workerChannel: wc, failureThreshold: 3 })
  hm.start()

  await hm.pingAll()
  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.SICK)

  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.HEALTHY)
  t.is(hm.getHealth('w1').consecutiveFailures, 0)
})

test('health-monitor - null channel records failure', async (t) => {
  const registry = createMockRegistry([
    { workerId: 'w1', channel: null }
  ])
  const hm = new HealthMonitor({ registry, workerChannel: createMockChannel(false), failureThreshold: 3 })
  hm.start()

  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.SICK)
})

test('health-monitor - pingAll does nothing when stopped', async (t) => {
  const registry = createMockRegistry([
    { workerId: 'w1', channel: { request: async () => ({}) } }
  ])
  const hm = new HealthMonitor({ registry, workerChannel: createMockChannel(false), failureThreshold: 3 })

  await hm.pingAll()
  t.is(hm.getHealth('w1').state, HEALTH_STATES.UNKNOWN, 'no ping when not running')
})

test('health-monitor - getHealth returns UNKNOWN for unknown worker', (t) => {
  const hm = new HealthMonitor({ registry: { getReadyWorkers: () => [] }, workerChannel: {}, failureThreshold: 3 })
  const health = hm.getHealth('nonexistent')
  t.is(health.state, HEALTH_STATES.UNKNOWN)
  t.is(health.consecutiveFailures, 0)
})
