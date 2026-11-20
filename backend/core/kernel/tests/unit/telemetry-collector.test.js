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
    getReadyWorkers () { return workerDevices },
    resolveWorker (workerId) {
      const w = workerDevices.find(w => w.workerId === workerId)
      return w ? { workerId, channel: w.channel } : null
    },
    isRoutable (workerId) {
      const w = workerDevices.find(w => w.workerId === workerId)
      return Boolean(w) && w.routable !== false
    }
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

test('telemetry - pull answers ERR_DEVICE_NOT_FOUND for unknown device', async (t) => {
  const tc = createCollector([])
  const data = await tc.pull('unknown')
  t.alike(data, { error: 'ERR_DEVICE_NOT_FOUND' })
})

test('telemetry - pull answers ERR_WORKER_NOT_ROUTABLE for device with no channel', async (t) => {
  const tc = createCollector([
    { workerId: 'w1', deviceIds: ['wm001'], channel: null }
  ])
  const data = await tc.pull('wm001')
  t.alike(data, { error: 'ERR_WORKER_NOT_ROUTABLE' })
})

test('telemetry - pull answers ERR_WORKER_UNREACHABLE on send error, and notifies nobody', async (t) => {
  const tc = createCollector(
    [{ workerId: 'w1', deviceIds: ['wm001'], channel: {} }],
    () => { throw new Error('ERR_CHANNEL_TIMEOUT') }
  )
  let notified = false
  tc.subscribe('wm001', () => { notified = true })
  const data = await tc.pull('wm001')
  t.alike(data, { error: 'ERR_WORKER_UNREACHABLE' })
  t.absent(notified)
})

test('telemetry - pull passes on a Worker refusal sent without an envelope', async (t) => {
  const tc = createCollector(
    [{ workerId: 'w1', deviceIds: ['wm001'], channel: {} }],
    () => ({ error: 'ERR_WORKER_CALLER_NOT_ALLOWED' })
  )
  t.alike(await tc.pull('wm001'), { error: 'ERR_WORKER_CALLER_NOT_ALLOWED' })
})

test('telemetry - pull answers ERR_WORKER_RESPONSE_INVALID for a reply with neither payload nor error', async (t) => {
  const tc = createCollector(
    [{ workerId: 'w1', deviceIds: ['wm001'], channel: {} }],
    () => null
  )
  t.alike(await tc.pull('wm001'), { error: 'ERR_WORKER_RESPONSE_INVALID' })
})

test('telemetry - pull returns and notifies a Worker device error as before', async (t) => {
  const payload = { deviceId: 'wm001', error: 'ERR_DEVICE_UNAVAILABLE', timestamp: 1 }
  const tc = createCollector(
    [{ workerId: 'w1', deviceIds: ['wm001'], channel: {} }],
    () => ({ payload })
  )
  let notified = null
  tc.subscribe('wm001', (data) => { notified = data })
  t.alike(await tc.pull('wm001'), payload)
  t.alike(notified, payload)
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

test('telemetry - pullAll skips workers that collect their own telemetry', async (t) => {
  const pulledDevices = []
  const tc = createCollector(
    [
      { workerId: 'w1', deviceIds: ['wm001', 'wm002'], channel: {}, pollsTelemetry: true },
      { workerId: 'w2', deviceIds: ['wm003'], channel: {} }
    ],
    (ch, env) => {
      pulledDevices.push(env.deviceId)
      return { payload: { metrics: {} } }
    }
  )

  await tc.pullAll()
  t.alike(pulledDevices, ['wm003'], 'a polling worker is not polled a second time by the Kernel')
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

test('telemetry - pullState answers ERR_DEVICE_NOT_FOUND for unknown device', async (t) => {
  const tc = createCollector([])
  const data = await tc.pullState('unknown')
  t.alike(data, { error: 'ERR_DEVICE_NOT_FOUND' })
})

test('telemetry - pullState answers ERR_WORKER_UNREACHABLE on send error', async (t) => {
  const registry = {
    resolveWorkerForDevice () { return { workerId: 'w1', channel: {} } }
  }
  const workerChannel = {
    async send () { throw new Error('timeout') }
  }
  const tc = new TelemetryCollector({ registry, workerChannel })

  const data = await tc.pullState('wm001')
  t.alike(data, { error: 'ERR_WORKER_UNREACHABLE' })
})

function snapshotWorkers () {
  return [
    { workerId: 'w1', deviceIds: ['wm001', 'wm002'], channel: { id: 'c1' } },
    { workerId: 'w2', deviceIds: ['wm003'], channel: { id: 'c2' } }
  ]
}

function snapshotResponse (channel) {
  if (channel.id === 'c1') {
    return { payload: { devices: { wm001: { hashrate: 90 }, wm002: { hashrate: 91 } }, snapshotTs: 1000 } }
  }
  return { payload: { devices: { wm003: { hashrate: 92 } }, snapshotTs: 2000 } }
}

test('telemetry - pullWorkers merges devices and takes the max snapshotTs', async (t) => {
  const tc = createCollector(snapshotWorkers(), snapshotResponse)

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result, {
    devices: { wm001: { hashrate: 90 }, wm002: { hashrate: 91 }, wm003: { hashrate: 92 } },
    snapshotTs: 2000
  })
  t.absent('errors' in result, 'no errors key when every worker answers')
})

test('telemetry - pullWorkers forwards the query without workers, deviceId null', async (t) => {
  const sent = []
  const tc = createCollector(snapshotWorkers(), (channel, env) => {
    sent.push(env)
    return snapshotResponse(channel)
  })

  await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'], metrics: ['hashrate'], from: 1, to: 2, granularity: '1m' })
  t.is(sent.length, 2)
  for (const env of sent) {
    t.is(env.action, 'telemetry.pull')
    t.is(env.type, 'request')
    t.is(env.deviceId, null)
    t.alike(env.payload, { query: { type: 'snapshot', metrics: ['hashrate'], from: 1, to: 2, granularity: '1m' } })
  }
  t.alike(sent.map(e => e.payload.deviceId), [undefined, undefined])
})

test('telemetry - pullWorkers reports an unknown worker and keeps the others', async (t) => {
  const tc = createCollector(snapshotWorkers(), snapshotResponse)

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w2', 'ghost'] })
  t.alike(result.devices, { wm003: { hashrate: 92 } })
  t.is(result.snapshotTs, 2000)
  t.alike(result.errors, { ghost: 'ERR_WORKER_NOT_FOUND' })
})

test('telemetry - pullWorkers reports a non-routable worker', async (t) => {
  const workers = snapshotWorkers()
  workers[0].routable = false
  const tc = createCollector(workers, snapshotResponse)

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result.devices, { wm003: { hashrate: 92 } })
  t.alike(result.errors, { w1: 'ERR_WORKER_NOT_ROUTABLE' })
})

test('telemetry - pullWorkers reports a worker with no channel as non-routable', async (t) => {
  const workers = snapshotWorkers()
  workers[1].channel = null
  const tc = createCollector(workers, snapshotResponse)

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result.devices, { wm001: { hashrate: 90 }, wm002: { hashrate: 91 } })
  t.alike(result.errors, { w2: 'ERR_WORKER_NOT_ROUTABLE' })
})

test('telemetry - pullWorkers reports a throwing channel as unreachable', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') throw new Error('timeout')
    return snapshotResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result.devices, { wm001: { hashrate: 90 }, wm002: { hashrate: 91 } })
  t.is(result.snapshotTs, 1000)
  t.alike(result.errors, { w2: 'ERR_WORKER_UNREACHABLE' })
})

test('telemetry - pullWorkers surfaces a worker error payload', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c1') return { payload: { error: 'ERR_SNAPSHOT_STORE_EMPTY' } }
    return snapshotResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result.devices, { wm003: { hashrate: 92 } })
  t.alike(result.errors, { w1: 'ERR_SNAPSHOT_STORE_EMPTY' })
})

test('telemetry - pullWorkers reports a worker that answers with no payload', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return {}
    return snapshotResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result.devices, { wm001: { hashrate: 90 }, wm002: { hashrate: 91 } })
  t.alike(result.errors, { w2: 'ERR_WORKER_RESPONSE_INVALID' })
})

test('telemetry - pullWorkers surfaces a worker\'s bare pre-dispatch refusal', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return { error: 'ERR_WORKER_CALLER_NOT_ALLOWED' }
    return snapshotResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w2'] })
  t.alike(result.devices, { wm001: { hashrate: 90 }, wm002: { hashrate: 91 } })
  t.alike(result.errors, { w2: 'ERR_WORKER_CALLER_NOT_ALLOWED' })
})

test('telemetry - pullWorkers reports an empty answer from an unmerged query type', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return null
    return { payload: { devices: [] } }
  })

  const result = await tc.pullWorkers({ type: 'list', workers: ['w1', 'w2'] })
  t.alike(Object.keys(result.workers), ['w1'])
  t.alike(result.errors, { w2: 'ERR_WORKER_RESPONSE_INVALID' })
})

test('telemetry - pullWorkers with no devices answered yields snapshotTs null', async (t) => {
  const tc = createCollector(snapshotWorkers(), () => ({ payload: {} }))

  const result = await tc.pullWorkers({ type: 'snapshot', workers: ['w1'] })
  t.alike(result, { devices: {}, snapshotTs: null })
})

test('telemetry - pullWorkers does not notify device subscribers', async (t) => {
  const tc = createCollector(snapshotWorkers(), snapshotResponse)
  let notified = 0
  tc.subscribe('wm001', () => { notified++ })

  await tc.pullWorkers({ type: 'snapshot', workers: ['w1'] })
  t.is(notified, 0)
})

test('telemetry - pullWorkers requires a non-empty workers list', async (t) => {
  const tc = createCollector(snapshotWorkers(), snapshotResponse)
  t.alike(await tc.pullWorkers({ type: 'snapshot', workers: [] }), { error: 'ERR_WORKERS_REQUIRED' })
  t.alike(await tc.pullWorkers({ type: 'snapshot' }), { error: 'ERR_WORKERS_REQUIRED' })
  t.alike(await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 7] }), { error: 'ERR_WORKERS_REQUIRED' })
})

test('telemetry - pullWorkers sends once per distinct worker', async (t) => {
  const sent = []
  const tc = createCollector(
    [{ workerId: 'w1', deviceIds: ['wm001'], channel: {} }],
    (ch, env) => { sent.push(env); return { payload: { devices: { wm001: { metrics: {} } }, snapshotTs: 5 } } }
  )
  const res = await tc.pullWorkers({ type: 'snapshot', workers: ['w1', 'w1'] })
  t.is(sent.length, 1)
  t.alike(res, { devices: { wm001: { metrics: {} } }, snapshotTs: 5 })
})

test('telemetry - pullWorkers answers any other query type per worker, unmerged', async (t) => {
  const sent = []
  const tc = createCollector(snapshotWorkers(), (channel, env) => {
    sent.push(env)
    return channel.id === 'c1'
      ? { payload: { things: [{ id: 'wm001' }, { id: 'wm002' }] } }
      : { payload: { error: 'ERR_QUERY_TYPE_NOT_SUPPORTED: list' } }
  })

  const result = await tc.pullWorkers({ type: 'list', workers: ['w1', 'w2'], status: true })
  t.alike(result, {
    workers: { w1: { things: [{ id: 'wm001' }, { id: 'wm002' }] } },
    errors: { w2: 'ERR_QUERY_TYPE_NOT_SUPPORTED: list' }
  }, 'each worker answers for itself; a refusal is that worker\'s error')
  t.alike(sent.map((e) => [e.deviceId, e.payload.query]), [[null, { type: 'list', status: true }], [null, { type: 'list', status: true }]])

  const typeless = await tc.pullWorkers({ workers: ['w1'] })
  t.alike(Object.keys(typeless.workers), ['w1'], 'no type is forwarded as is: the Worker defaults it')
})

const AGGREGATE_OPS = {
  total: { op: 'sum', src: 'metrics.hashrate' },
  mean: { op: 'avg', src: 'metrics.hashrate' },
  devices: { op: 'cnt' },
  byModel: { op: 'group_sum', src: 'metrics.hashrate', group: 'info.model' }
}

// Pre-tally packs as a worker returns them: w1 saw two devices at 60 + 40
// (model S19), w2 one device at 40 (model S21).
function aggregateResponse (channel) {
  if (channel.id === 'c1') {
    return {
      payload: {
        ops: { total: 100, mean: 50, devices: 2, byModel: { S19: 100 } },
        partial: { total: { res: 100 }, mean: { acc: 100, cnt: 2, res: 0 }, devices: { res: 2 }, byModel: { res: { S19: 100 } } },
        deviceCount: 2
      }
    }
  }
  return {
    payload: {
      ops: { total: 40, mean: 40, devices: 1, byModel: { S21: 40 } },
      partial: { total: { res: 40 }, mean: { acc: 40, cnt: 1, res: 0 }, devices: { res: 1 }, byModel: { res: { S21: 40 } } },
      deviceCount: 1
    }
  }
}

test('telemetry - pullWorkers aggregate merges accumulators across workers and sums deviceCount', async (t) => {
  const tc = createCollector(snapshotWorkers(), aggregateResponse)

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.is(result.deviceCount, 3)
  t.is(result.ops.total, 140, 'sum adds')
  t.is(result.ops.mean, 140 / 3, 'avg is acc/cnt over the fleet, not the average of averages')
  t.is(result.ops.devices, 3, 'cnt adds')
  t.alike({ ...result.ops.byModel }, { S19: 100, S21: 40 }, 'group_sum adds per key')
  t.alike(Object.keys(result.ops).sort(), ['byModel', 'devices', 'mean', 'total'])
  t.absent('errors' in result, 'no errors key when every worker answers')
  t.absent('partial' in result, 'accumulators are not returned')
})

test('telemetry - pullWorkers aggregate keeps one worker\'s spec error and tallies the other', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return { payload: { error: 'ERR_AGGREGATE_SRC_UNKNOWN: total: metrics.hashrate' } }
    return aggregateResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.alike(result.errors, { w2: 'ERR_AGGREGATE_SRC_UNKNOWN: total: metrics.hashrate' })
  t.is(result.deviceCount, 2)
  t.is(result.ops.total, 100)
  t.is(result.ops.mean, 50)
  t.is(result.ops.devices, 2)
  t.alike({ ...result.ops.byModel }, { S19: 100 })
})

test('telemetry - pullWorkers aggregate reports a worker that answers with no payload', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return {}
    return aggregateResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.alike(result.errors, { w2: 'ERR_WORKER_RESPONSE_INVALID' }, 'the partial total is flagged, not passed off as the fleet')
  t.is(result.deviceCount, 2)
  t.is(result.ops.total, 100)
})

test('telemetry - pullWorkers aggregate with no answering worker yields no results', async (t) => {
  const tc = createCollector(snapshotWorkers(), () => { throw new Error('timeout') })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.alike(result.errors, { w1: 'ERR_WORKER_UNREACHABLE', w2: 'ERR_WORKER_UNREACHABLE' })
  t.is(result.deviceCount, 0)
  t.alike(result.ops, {}, 'no zero stands in for a total nobody computed')
})

test('telemetry - pullWorkers aggregate refuses a missing or invalid spec before any send', async (t) => {
  let sends = 0
  const tc = createCollector(snapshotWorkers(), (channel) => { sends++; return aggregateResponse(channel) })

  const invalid = [
    { type: 'aggregate', workers: ['w1'] },
    { type: 'aggregate', workers: ['w1'], ops: {} },
    { type: 'aggregate', workers: ['w1'], ops: [] },
    { type: 'aggregate', workers: ['w1'], ops: 'sum' },
    { type: 'aggregate', workers: ['w1'], ops: { total: null } },
    { type: 'aggregate', workers: ['w1'], ops: { total: { src: 'metrics.hashrate' } } },
    { type: 'aggregate', workers: ['w1'], ops: { total: { op: 7 } } },
    { type: 'aggregate', workers: ['w1'], ops: { total: { op: 'bogus' } } },
    { type: 'aggregate', workers: ['w1'], ops: { total: { op: 'alerts_aggr' } } }
  ]
  for (const query of invalid) {
    t.alike(await tc.pullWorkers(query), { error: 'ERR_AGGREGATE_SPEC_INVALID' }, JSON.stringify(query.ops))
  }
  t.is(sends, 0, 'nothing was sent')
})

test('telemetry - pullWorkers aggregate forwards ops and drops workers from the query', async (t) => {
  const sent = []
  const tc = createCollector(snapshotWorkers(), (channel, env) => {
    sent.push(env)
    return aggregateResponse(channel)
  })

  await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.is(sent.length, 2)
  for (const env of sent) {
    t.is(env.action, 'telemetry.pull')
    t.is(env.deviceId, null)
    t.alike(env.payload, { query: { type: 'aggregate', ops: AGGREGATE_OPS } })
  }
})

test('telemetry - pullWorkers aggregate result is plain-serializable', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return { payload: { error: 'ERR_AGGREGATE_OP_UNKNOWN: total: sum' } }
    return aggregateResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.alike(JSON.parse(JSON.stringify(result)), {
    ops: { total: 100, mean: 50, devices: 2, byModel: { S19: 100 } },
    deviceCount: 2,
    errors: { w2: 'ERR_AGGREGATE_OP_UNKNOWN: total: sum' }
  })
})

const SPEC_OPS = {
  byModel: { op: 'group_avg', src: 'metrics.hashrate', group: 'info.model' },
  boards: { op: 'array_obj_calc', src: 'metrics.boards', objOps: [{ src: 'temp', op: 'sum' }] },
  site: { op: 'nested_obj_concat', src: 'metrics.site', nestedOps: [{ src: 'hr', op: 'sum' }] }
}

function specResponse (channel) {
  if (channel.id === 'c1') {
    return {
      payload: {
        partial: {
          byModel: { res: { S19: { acc: 100, cnt: 2, res: 0 } } },
          boards: { res: { temp: 50 } },
          site: { res: { rack1: { hr: 10 } } }
        },
        deviceCount: 2
      }
    }
  }
  return {
    payload: {
      partial: {
        byModel: { res: { S19: { acc: 40, cnt: 1, res: 0 }, S21: { acc: 30, cnt: 1, res: 0 } } },
        boards: { res: { temp: 20 } },
        site: { res: { rack1: { hr: 5 }, rack2: { hr: 1 } } }
      },
      deviceCount: 1
    }
  }
}

test('telemetry - pullWorkers aggregate merges group_avg, array_obj_calc and nested_obj_concat with the full spec', async (t) => {
  const tc = createCollector(snapshotWorkers(), specResponse)

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: SPEC_OPS })
  t.absent('errors' in result)
  t.is(result.deviceCount, 3)
  t.alike(JSON.parse(JSON.stringify(result.ops)), {
    byModel: { S19: 140 / 3, S21: 30 },
    boards: { temp: 70 },
    site: { rack1: { hr: 15 }, rack2: { hr: 1 } }
  })
})

test('telemetry - pullWorkers aggregate drops a worker whose partial has a non-object op value', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return { payload: { partial: { total: 40, mean: { acc: 40, cnt: 1, res: 0 }, devices: { res: 1 }, byModel: { res: {} } }, deviceCount: 1 } }
    return aggregateResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.alike(result.errors, { w2: 'ERR_AGGREGATE_PARTIAL_INVALID' })
  t.is(result.deviceCount, 2)
  t.alike(JSON.parse(JSON.stringify(result.ops)), { total: 100, mean: 50, devices: 2, byModel: { S19: 100 } })
})

test('telemetry - pullWorkers aggregate drops a worker whose partial is an array or a scalar', async (t) => {
  for (const partial of [[], 'x', 7]) {
    const tc = createCollector(snapshotWorkers(), (channel) => {
      if (channel.id === 'c2') return { payload: { partial, deviceCount: 1 } }
      return aggregateResponse(channel)
    })
    const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
    t.alike(result.errors, { w2: 'ERR_AGGREGATE_PARTIAL_INVALID' }, JSON.stringify(partial))
    t.is(result.deviceCount, 2)
  }
})

test('telemetry - pullWorkers aggregate drops a worker whose partial throws in merge', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return { payload: { partial: { byModel: { res: { S19: null } }, boards: { res: {} }, site: { res: {} } }, deviceCount: 1 } }
    return specResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: SPEC_OPS })
  t.alike(result.errors, { w2: 'ERR_AGGREGATE_PARTIAL_INVALID' })
  t.is(result.deviceCount, 2)
  t.alike(JSON.parse(JSON.stringify(result.ops)), { byModel: { S19: 50 }, boards: { temp: 50 }, site: { rack1: { hr: 10 } } })
})

test('telemetry - pullWorkers aggregate reports a worker that answered without a partial', async (t) => {
  const tc = createCollector(snapshotWorkers(), (channel) => {
    if (channel.id === 'c2') return { payload: { ops: { total: 40 }, deviceCount: 1 } }
    return aggregateResponse(channel)
  })

  const result = await tc.pullWorkers({ type: 'aggregate', workers: ['w1', 'w2'], ops: AGGREGATE_OPS })
  t.alike(result.errors, { w2: 'ERR_AGGREGATE_PARTIAL_MISSING' })
  t.is(result.deviceCount, 2)
  t.is(result.ops.total, 100)
})

test('telemetry - pullWorkers aggregate refuses hostile op names and bad nested ops before any send', async (t) => {
  let sends = 0
  const tc = createCollector(snapshotWorkers(), (channel) => { sends++; return specResponse(channel) })

  const invalid = [
    JSON.parse('{"__proto__":{"op":"sum","src":"metrics.hashrate"}}'),
    JSON.parse('{"constructor":{"op":"cnt"}}'),
    { boards: { op: 'array_obj_calc', src: 'metrics.boards' } },
    { boards: { op: 'array_obj_calc', src: 'metrics.boards', objOps: [] } },
    { boards: { op: 'array_obj_calc', src: 'metrics.boards', objOps: [{ src: 'temp', op: 'avg' }] } },
    { boards: { op: 'array_obj_calc', src: 'metrics.boards', objOps: [{ src: '__proto__', op: 'sum' }] } },
    { boards: { op: 'array_obj_calc', src: 'metrics.boards', objOps: [{ src: 7, op: 'sum' }] } },
    { site: { op: 'nested_obj_concat', src: 'metrics.site' } },
    { site: { op: 'nested_obj_concat', src: 'metrics.site', nestedOps: 'hr' } },
    { site: { op: 'nested_obj_concat', src: 'metrics.site', nestedOps: [{ src: 'hr', op: 'cnt' }] } },
    { site: { op: 'nested_obj_concat', src: 'metrics.site', nestedOps: [null] } }
  ]
  for (const ops of invalid) {
    t.alike(await tc.pullWorkers({ type: 'aggregate', workers: ['w1'], ops }), { error: 'ERR_AGGREGATE_SPEC_INVALID' }, JSON.stringify(ops))
  }
  t.is(sends, 0, 'nothing was sent')
  t.alike(Object.getPrototypeOf((await tc.pullWorkers({ type: 'aggregate', workers: ['w1'], ops: SPEC_OPS })).ops), Object.prototype)
})
