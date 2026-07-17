'use strict'

const test = require('brittle')
const { TelemetryCollector } = require('../../lib/modules/telemetry-collector')

function createCollector (workerDevices, channelResponse) {
  const registry = {
    resolveWorkerForDevice (deviceId) {
      for (const w of workerDevices) {
        if (w.deviceIds.includes(deviceId)) {
          return { workerId: w.workerId, channel: w.channel }
        }
      }
      return null
    },
    getReadyWorkers () { return workerDevices }
  }
  const workerChannel = {
    async send (channel, envelope) {
      if (channelResponse) return channelResponse(channel, envelope)
      return { payload: { deviceId: envelope.deviceId, metrics: { hashrate: 90 } } }
    }
  }
  return new TelemetryCollector({ registry, workerChannel })
}

test('telemetry - pull returns data for known device', async (t) => {
  const tc = createCollector([
    { workerId: 'w1', deviceIds: ['wm001'], channel: {} }
  ])

  const data = await tc.pull('wm001')
  t.ok(data)
  t.is(data.metrics.hashrate, 90)
})

test('telemetry - pull returns null for unknown device', async (t) => {
  const tc = createCollector([])
  const data = await tc.pull('unknown')
  t.absent(data)
})

test('telemetry - pull returns null for device with no channel', async (t) => {
  const tc = createCollector([
    { workerId: 'w1', deviceIds: ['wm001'], channel: null }
  ])
  const data = await tc.pull('wm001')
  t.absent(data)
})

test('telemetry - pull returns null on send error', async (t) => {
  const tc = createCollector(
    [{ workerId: 'w1', deviceIds: ['wm001'], channel: {} }],
    () => { throw new Error('timeout') }
  )
  const data = await tc.pull('wm001')
  t.absent(data)
})

test('telemetry - pullAll fans out to all devices', async (t) => {
  const pulledDevices = []
  const tc = createCollector(
    [
      { workerId: 'w1', deviceIds: ['wm001', 'wm002'], channel: {} },
      { workerId: 'w2', deviceIds: ['wm003'], channel: {} }
    ],
    (ch, env) => {
      pulledDevices.push(env.deviceId)
      return { payload: { metrics: {} } }
    }
  )

  await tc.pullAll()
  t.is(pulledDevices.length, 3)
  t.ok(pulledDevices.includes('wm001'))
  t.ok(pulledDevices.includes('wm002'))
  t.ok(pulledDevices.includes('wm003'))
})

test('telemetry - subscribe gets notified on pull', async (t) => {
  const tc = createCollector([
    { workerId: 'w1', deviceIds: ['wm001'], channel: {} }
  ])

  let notified = null
  tc.subscribe('wm001', (data) => { notified = data })

  await tc.pull('wm001')
  t.ok(notified)
  t.is(notified.metrics.hashrate, 90)
})

test('telemetry - unsubscribe stops notifications', async (t) => {
  const tc = createCollector([
    { workerId: 'w1', deviceIds: ['wm001'], channel: {} }
  ])

  let count = 0
  const unsub = tc.subscribe('wm001', () => { count++ })

  await tc.pull('wm001')
  t.is(count, 1)

  unsub()
  await tc.pull('wm001')
  t.is(count, 1, 'not notified after unsubscribe')
})

test('telemetry - subscriber error does not crash', async (t) => {
  const tc = createCollector([
    { workerId: 'w1', deviceIds: ['wm001'], channel: {} }
  ])

  let secondCalled = false
  tc.subscribe('wm001', () => { throw new Error('bad subscriber') })
  tc.subscribe('wm001', () => { secondCalled = true })

  await tc.pull('wm001')
  t.ok(secondCalled, 'second subscriber still called despite first throwing')
})

test('telemetry - pull forwards query into envelope payload', async (t) => {
  let sentEnvelope = null
  const registry = {
    resolveWorkerForDevice () { return { workerId: 'w1', channel: {} } }
  }
  const workerChannel = {
    async send (ch, env) {
      sentEnvelope = env
      return { payload: { result: 'ok' } }
    }
  }
  const tc = new TelemetryCollector({ registry, workerChannel })

  await tc.pull('wm001', { type: 'metrics', deviceId: 'wm001' })
  t.ok(sentEnvelope, 'envelope was sent')
  t.alike(sentEnvelope.payload.query, { type: 'metrics', deviceId: 'wm001' })
  t.is(sentEnvelope.deviceId, 'wm001')
})

test('telemetry - pullAll with no ready workers resolves without error', async (t) => {
  const tc = createCollector([])
  await tc.pullAll()
  t.pass('resolved cleanly with empty worker list')
})

test('telemetry - pullAll partial failure does not block other devices', async (t) => {
  const results = []
  const tc = createCollector(
    [
      { workerId: 'w1', deviceIds: ['wm001', 'wm002', 'wm003'], channel: {} }
    ],
    (ch, env) => {
      if (env.deviceId === 'wm002') throw new Error('device unreachable')
      results.push(env.deviceId)
      return { payload: { metrics: {} } }
    }
  )

  await tc.pullAll()
  t.is(results.length, 2, 'two devices succeeded')
  t.ok(results.includes('wm001'))
  t.ok(results.includes('wm003'))
  t.absent(results.includes('wm002'), 'failing device not in results')
})

test('telemetry - pullState returns data for known device', async (t) => {
  const registry = {
    resolveWorkerForDevice () { return { workerId: 'w1', channel: {} } }
  }
  const workerChannel = {
    async send (ch, env) {
      t.is(env.action, 'state.pull', 'sends STATE_PULL action')
      return { payload: { state: { wm001: { status: 'online' } } } }
    }
  }
  const tc = new TelemetryCollector({ registry, workerChannel })

  const data = await tc.pullState('wm001')
  t.ok(data)
  t.is(data.state.wm001.status, 'online')
})

test('telemetry - pullState returns null for unknown device', async (t) => {
  const tc = createCollector([])
  const data = await tc.pullState('unknown')
  t.absent(data)
})

test('telemetry - pullState returns null on send error', async (t) => {
  const registry = {
    resolveWorkerForDevice () { return { workerId: 'w1', channel: {} } }
  }
  const workerChannel = {
    async send () { throw new Error('timeout') }
  }
  const tc = new TelemetryCollector({ registry, workerChannel })

  const data = await tc.pullState('wm001')
  t.absent(data)
})
