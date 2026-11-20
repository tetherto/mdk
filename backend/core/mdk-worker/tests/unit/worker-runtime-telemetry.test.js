'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { WorkerRuntime } = require('../..')
const { rollup } = require('../../lib/telemetry')
const simPlugin = require('../fixtures/sim-plugin')
const polling = require('../fixtures/sim-plugin-polling')
const { ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION } = require('../../../kernel/lib/protocol/actions')

const DEVICES = [
  { deviceId: 'SIM-001', config: { hashrate: 100, power: 3000, password: 'hunter2' }, info: { rack: 'r1' } },
  { deviceId: 'SIM-002', config: { hashrate: 140, power: 3200, status: 'sleeping', password: 'hunter2' } }
]

function tmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-runtime-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }), { order: 1 })
  return dir
}

function req (query, deviceId = null) {
  return {
    id: 'req-1',
    version: PROTOCOL_VERSION,
    type: MESSAGE_TYPES.REQUEST,
    action: ACTIONS.TELEMETRY_PULL,
    sender: 'kernel:kernel:test',
    target: null,
    deviceId,
    timestamp: Date.now(),
    payload: { query }
  }
}

// Mirrors worker-runtime.test.js: open contexts and the collector directly,
// never the HRPC/DHT side of start().
async function createPolling (t, opts = {}) {
  polling._reset()
  const runtime = new WorkerRuntime(polling, { workerId: 'poll-rack', devices: DEVICES, telemetryStoreDir: tmpDir(t), ...opts })
  await runtime._openContexts()
  await runtime._startTelemetry()
  t.teardown(async () => {
    await runtime._stopTelemetry()
    await runtime._closeContexts()
  })
  return runtime
}

// A handler call precedes the store write, so reads that race the poller
// wait for the point itself.
async function untilStored (runtime, deviceId, predicate = () => true) {
  for (let i = 0; i < 200; i++) {
    const point = await runtime._telemetry.store.latest(deviceId)
    if (point && predicate(point)) return point
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`device ${deviceId} has no matching stored point`)
}

async function untilPolled (deviceId, times) {
  for (let i = 0; i < 200; i++) {
    if ((polling._calls.stats[deviceId] || 0) >= times) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`device ${deviceId} not polled ${times} times`)
}

test('config precedence: mdk.yaml config overrides the contract, and is validated', (t) => {
  const fromContract = new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t) })
  t.is(fromContract._telemetry.config.telemetryPollIntervalMs, 60000)
  t.is(fromContract._telemetry.config.aggregateCacheTtlMs, 60000)

  const overridden = new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: 10000, telemetryRetention: { rawMs: 1 } } })
  t.is(overridden._telemetry.config.telemetryPollIntervalMs, 10000)
  t.alike(overridden._telemetry.config.telemetryRetention, { rawMs: 1, rollupIntervalMs: 300000, keepMs: 2592000000 }, 'a partial retention override keeps the other defaults')

  const simDefaults = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: 5000 } })
  t.alike(simDefaults._telemetry.config.telemetryRetention, { rawMs: 86400000, rollupIntervalMs: 300000, keepMs: 2592000000 })
  const layered = new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryRetention: { rawMs: 1000 } } })
  t.alike(layered._telemetry.config.telemetryRetention, { rawMs: 1000, rollupIntervalMs: 300000, keepMs: 2592000000 }, 'contract keys survive a partial override')
  for (const bad of [{ rawMs: 0 }, { keepMs: '30d' }, { rawMs: 10, keepMs: 5 }, { rollupIntervalMs: 10, keepMs: 5 }, '30d', { rawms: 5 }]) {
    t.exception(
      () => new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: 5000, telemetryRetention: bad } }),
      /ERR_TELEMETRY_RETENTION_INVALID/, JSON.stringify(bad)
    )
  }

  t.exception(
    () => new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: '10s' } }),
    /ERR_TELEMETRY_POLL_INTERVAL_INVALID/
  )
  t.exception(
    () => new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES }),
    /ERR_TELEMETRY_STORE_REQUIRED/
  )
  t.exception(
    () => new WorkerRuntime(polling, { workerId: 'w', devices: [{ deviceId: 'a\0b', config: {} }], telemetryStoreDir: tmpDir(t) }),
    /ERR_DEVICE_ID_INVALID/
  )

  const off = new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, config: { telemetryPollIntervalMs: null } })
  t.is(off._telemetry, null, 'an operator can turn a vendor default off')
})

test('a handler that fails while a sibling answers stores an error marker for its metrics only', async (t) => {
  const devices = [{ deviceId: 'SIM-009', config: { hashrate: 1, power: 1, failStats: true } }]
  const runtime = await createPolling(t, { devices, config: { telemetryPollIntervalMs: 10 } })
  await untilPolled('SIM-009', 1)
  await runtime._telemetry.poller.stop()
  const res = await runtime.handleRequest(req({ type: 'snapshot' }))
  t.alike(res.payload.devices['SIM-009'].metrics, {
    hashrate_rt: { error: 'ERR_DEVICE_TIMEOUT: simulated' },
    power: { error: 'ERR_DEVICE_TIMEOUT: simulated' },
    status: { value: 'mining' }
  })
  const health = await runtime.handleRequest(req({ type: 'health' }, 'SIM-009'))
  t.is(health.payload.value.reachable, true)
  t.is(health.payload.value.lastError, 'ERR_DEVICE_TIMEOUT: simulated')
})

test('a plugin without telemetryPollIntervalMs has no collector; a config value enables it', async (t) => {
  const off = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES })
  t.is(off._telemetry, null)
  await off._openContexts()
  const res = await off.handleRequest(req({ type: 'snapshot' }))
  t.is(res.payload.error, 'ERR_TELEMETRY_STORE_DISABLED: snapshot')

  const on = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: 5000 } })
  t.is(on._telemetry.config.telemetryPollIntervalMs, 5000)
})

test('the collector sweeps every device on the interval and snapshot reads from the store', async (t) => {
  const runtime = await createPolling(t, { config: { telemetryPollIntervalMs: 10 } })
  await untilPolled('SIM-001', 2)
  await untilPolled('SIM-002', 2)
  await runtime._telemetry.poller.stop()
  const callsBefore = JSON.stringify(polling._calls)

  const res = await runtime.handleRequest(req({ type: 'snapshot' }))
  t.is(res.action, ACTIONS.TELEMETRY_RESPONSE)
  const { devices, snapshotTs } = res.payload
  t.alike(Object.keys(devices).sort(), ['SIM-001', 'SIM-002'])
  t.alike(devices['SIM-001'].metrics, { hashrate_rt: { value: 100 }, power: { value: 3000 }, status: { value: 'mining' } })
  t.alike(devices['SIM-002'].metrics, { hashrate_rt: { value: 140 }, power: { value: 3200 }, status: { value: 'sleeping' } })
  t.ok(Number.isInteger(devices['SIM-001'].ts) && Number.isInteger(devices['SIM-002'].ts))
  t.is(snapshotTs, Math.max(devices['SIM-001'].ts, devices['SIM-002'].ts))
  t.is(JSON.stringify(polling._calls), callsBefore, 'a snapshot read made no device call')
  t.is(polling._calls.stats['SIM-001'], polling._calls.status['SIM-001'], 'one call per distinct handler per sweep')

  const one = await runtime.handleRequest(req({ type: 'snapshot', metrics: ['power'] }, 'SIM-002'))
  t.alike(one.payload.devices, { 'SIM-002': { ts: devices['SIM-002'].ts, metrics: { power: { value: 3200 } } } })
  t.is(one.payload.deviceId, 'SIM-002')

  const missing = await runtime.handleRequest(req({ type: 'snapshot' }, 'SIM-404'))
  t.is(missing.payload.error, 'ERR_DEVICE_NOT_FOUND: SIM-404')

  const health = await runtime.handleRequest(req({ type: 'health' }, 'SIM-001'))
  t.is(health.payload.value.reachable, true)
  t.is(health.payload.value.lastSuccessAt, devices['SIM-001'].ts, 'one timestamp per device sweep')
})

test('aggregate runs a typed op spec over the latest points and caches the answer', async (t) => {
  const runtime = await createPolling(t, { config: { telemetryPollIntervalMs: 10, aggregateCacheTtlMs: 60000 } })
  await untilStored(runtime, 'SIM-001')
  await untilStored(runtime, 'SIM-002')

  const ops = {
    hashrate_total: { op: 'sum', src: 'metrics.hashrate_rt' },
    mining: { op: 'cnt', filter: { src: 'metrics.status', eq: 'mining' } },
    by_status: { op: 'group_sum', src: 'metrics.power', group: 'metrics.status' }
  }
  const res = (await runtime.handleRequest(req({ type: 'aggregate', ops }))).payload
  t.alike(res.ops, { hashrate_total: 240, mining: 1, by_status: { mining: 3000, sleeping: 3200 } }, 'in-process answers have the wire shape')
  t.is(res.deviceCount, 2)
  t.alike(res.partial.hashrate_total, { res: 240 })

  const bad = (await runtime.handleRequest(req({ type: 'aggregate', ops: { x: { op: 'avg', src: 'metrics.status' } } }))).payload
  t.is(bad.error, 'ERR_AGGREGATE_OP_TYPE: x: avg on string metrics.status')
  const none = (await runtime.handleRequest(req({ type: 'aggregate' }))).payload
  t.is(none.error, 'ERR_AGGREGATE_SPEC_INVALID: ops must be a non-empty object')

  const gen = runtime._telemetry.cache.gen
  await runtime.handleRequest({ ...req({}), action: ACTIONS.COMMAND_REQUEST, deviceId: 'SIM-001', payload: { commandId: 'c1', command: 'setPower', params: { watts: 100 } } })
  await untilStored(runtime, 'SIM-001', (point) => point.data.power === 100)
  // The clear follows the put; wait for it rather than race it.
  for (let i = 0; i < 200 && runtime._telemetry.cache.gen === gen; i++) await new Promise((resolve) => setTimeout(resolve, 5))
  const again = (await runtime.handleRequest(req({ type: 'aggregate', ops }))).payload
  t.alike(again.ops.by_status, { mining: 100, sleeping: 3200 }, 'a stored point drops the cached answer before the TTL')
  await runtime._telemetry.poller.stop()
  const store = runtime._telemetry.store
  let reads = 0
  const latest = store.latest
  store.latest = (...args) => { reads++; return latest.apply(store, args) }
  await runtime.handleRequest(req({ type: 'aggregate', ops }))
  reads = 0
  await runtime.handleRequest(req({ type: 'aggregate', ops }))
  t.is(reads, 0, 'an identical spec is served from the cache without a store read')
  store.latest = latest
  const one = (await runtime.handleRequest(req({ type: 'aggregate', ops: { total: { op: 'sum', src: 'metrics.power' } } }, 'SIM-001'))).payload
  t.alike(one.ops, { total: 100 }, 'a device-scoped spec is its own cache key')
  t.absent(one.partial, 'the pre-tally pack is for Worker-scoped reads only')
  const grouped = (await runtime.handleRequest(req({ type: 'aggregate', ops: { by_rack: { op: 'group_cnt', group: 'info.rack' } } }))).payload
  t.alike(grouped.ops.by_rack, { r1: 1 }, 'info.* reads the label block; a device without the label is left out')
  const leak = (await runtime.handleRequest(req({ type: 'aggregate', ops: { by_pw: { op: 'group_cnt', group: 'device.password' } } }))).payload
  t.ok(leak.error.startsWith('ERR_AGGREGATE_GROUP_INVALID'), 'the config block (connection details, credentials) is never a source')
})

test('aggregate answers expire with the cache TTL', async (t) => {
  const runtime = await createPolling(t, { config: { telemetryPollIntervalMs: 10, aggregateCacheTtlMs: 0 } })
  await untilStored(runtime, 'SIM-001')
  await runtime._telemetry.poller.stop()
  const ops = { total: { op: 'sum', src: 'metrics.power' } }
  const first = (await runtime.handleRequest(req({ type: 'aggregate', ops }, 'SIM-001'))).payload
  t.alike(first.ops, { total: 3000 })
  // Written behind the collector's back, so nothing clears the cache.
  await runtime._telemetry.store.put('SIM-001', Date.now(), { hashrate_rt: 100, power: 200, status: 'mining' })
  const cached = (await runtime.handleRequest(req({ type: 'aggregate', ops }, 'SIM-001'))).payload
  t.alike(cached.ops, { total: 3000 }, 'served from the cache within the TTL')
  await new Promise((resolve) => setTimeout(resolve, 15))
  const later = (await runtime.handleRequest(req({ type: 'aggregate', ops }, 'SIM-001'))).payload
  t.alike(later.ops, { total: 200 }, 'a TTL of one poll interval recomputes after it')

  t.exception(
    () => new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { aggregateCacheTtlMs: '10s' } }),
    /ERR_AGGREGATE_CACHE_TTL_INVALID/
  )
})

test('retention runs alongside polling: old points thin into buckets and expire', async (t) => {
  const runtime = await createPolling(t, { config: { telemetryPollIntervalMs: 5, telemetryRetention: { rawMs: 60, rollupIntervalMs: 20, keepMs: 400 } } })
  await untilPolled('SIM-001', 40)
  await runtime._telemetry.poller.stop()
  await runtime._telemetry.rollup.stop()
  // One more pass at a clock the assertions share, so a point between the
  // pass's `now` and the test's cannot sit raw past the window.
  const now = Date.now()
  const { store, config, cursors } = runtime._telemetry
  await rollup(store, ['SIM-001', 'SIM-002'], polling.contract.capabilities.telemetry, config.telemetryRetention, cursors, now)

  const points = await store.range('SIM-001', 0, now)
  const old = points.filter((p) => p.ts < now - 80)
  t.ok(old.length > 0 && old.every((p) => p.n >= 1 && p.ts % 20 === 0), `${old.length} rolled bucket points`)
  t.ok(points.some((p) => !p.n), 'recent raw points remain')
  t.is(points[0].ts >= now - 400, true)
})

test('a device that fails every sweep is unreachable, stores error markers and is left out of aggregates', async (t) => {
  const devices = [...DEVICES, { deviceId: 'SIM-003', config: { hashrate: 0, power: 0, fail: true } }]
  const runtime = await createPolling(t, { devices, config: { telemetryPollIntervalMs: 10 } })
  await untilPolled('SIM-003', 2)
  await untilStored(runtime, 'SIM-003')
  await runtime._telemetry.poller.stop()

  const res = await runtime.handleRequest(req({ type: 'snapshot' }))
  const dead = res.payload.devices['SIM-003']
  t.ok(Number.isInteger(dead.ts), 'the sweep that got no answer is still a point')
  t.alike(Object.keys(dead.metrics).sort(), ['hashrate_rt', 'power', 'status'])
  t.ok(Object.values(dead.metrics).every((m) => typeof m.error === 'string'), 'every metric is an error marker')
  const agg = (await runtime.handleRequest(req({ type: 'aggregate', ops: { n: { op: 'cnt' }, total: { op: 'sum', src: 'metrics.power' } } }))).payload
  t.alike({ ops: agg.ops, deviceCount: agg.deviceCount }, { ops: { n: 2, total: 6200 }, deviceCount: 2 }, 'a point with no reading counts for nothing')
  const health = await runtime.handleRequest(req({ type: 'health' }, 'SIM-003'))
  t.is(health.payload.value.reachable, false)
  t.is(health.payload.value.lastError, 'ERR_DEVICE_TIMEOUT: simulated', 'first failure wins; the raw message of the second never leaves the process')
  t.is(polling._calls.status['SIM-003'] > 0, true, 'the other handler still ran')
})

test('stored points survive a runtime restart, and the restarted runtime sweeps at once', async (t) => {
  const dir = tmpDir(t)
  const first = await createPolling(t, { telemetryStoreDir: dir, config: { telemetryPollIntervalMs: 10 } })
  await untilStored(first, 'SIM-001')
  await untilStored(first, 'SIM-002')
  await first._telemetry.poller.stop()
  const before = (await first.handleRequest(req({ type: 'snapshot' }))).payload
  await first._stopTelemetry()

  const second = await createPolling(t, { telemetryStoreDir: dir, config: { telemetryPollIntervalMs: 60000 } })
  const kept = await second._telemetry.store.range('SIM-001', 0, before.devices['SIM-001'].ts)
  t.ok(kept.length > 0 && kept[kept.length - 1].ts === before.devices['SIM-001'].ts, 'the earlier series is still there')
  await untilStored(second, 'SIM-001', (point) => point.ts > before.devices['SIM-001'].ts)
  t.pass('the first sweep did not wait for the 60 s interval')
})

test('the capability payload carries the poll interval in force', async (t) => {
  const capability = async (runtime) => (await runtime.handleRequest({ ...req({}), action: ACTIONS.CAPABILITY_REQUEST })).payload.contract.telemetryPollIntervalMs
  t.is(await capability(new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t) })), 60000, 'the contract default')
  t.is(await capability(new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: 5000 } })), 5000, 'an mdk.yaml override')
  t.is(await capability(new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, config: { telemetryPollIntervalMs: null } })), undefined, 'no key when polling is off')
  t.is(await capability(new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryPollIntervalMs: 7000 } })), 7000, 'a config value on a contract without the key')
  t.is(polling.contract.telemetryPollIntervalMs, 60000, 'the plugin contract itself is untouched')
})

// ---- archive ----

const MIN = 60000
const ARCHIVE_RETENTION = { rawMs: 10 * MIN, rollupIntervalMs: 5 * MIN, keepMs: 60 * MIN }

function cmd (runtime, command, params, deviceId = 'SIM-001') {
  return runtime.handleRequest({
    ...req({}, deviceId),
    action: ACTIONS.COMMAND_REQUEST,
    payload: { commandId: 'c', command, params }
  })
}

test('archive is off by default: no restoreTelemetry is published and the archive query is refused', async (t) => {
  const runtime = await createPolling(t, { config: { telemetryPollIntervalMs: 10000 } })
  t.absent(runtime._publishedContract.capabilities.commands.find((c) => c.name === 'restoreTelemetry'))
  const listed = (await runtime.handleRequest(req({ type: 'archive' }, 'SIM-001'))).payload
  t.is(listed.error, 'ERR_TELEMETRY_ARCHIVE_DISABLED: archive')
  const restored = await cmd(runtime, 'restoreTelemetry', { from: 0, to: 1 })
  t.is(restored.payload.status, 'FAILED')
  t.is(restored.payload.error, 'ERR_UNKNOWN_COMMAND: restoreTelemetry', 'without the archive the command is not a built-in')

  t.exception(
    () => new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: tmpDir(t), config: { telemetryArchive: 'yes' } }),
    /ERR_TELEMETRY_ARCHIVE_INVALID: yes/
  )
  t.exception(
    () => new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, store: { getBee () {} }, config: { telemetryArchive: true } }),
    /ERR_TELEMETRY_ARCHIVE_DIR_REQUIRED/
  )
  const defaulted = new WorkerRuntime(polling, { workerId: 'w', devices: DEVICES, telemetryStoreDir: '/tmp/x/telemetry', config: { telemetryArchive: true } })
  t.is(defaulted._telemetry.archiveDir, '/tmp/x/telemetry-archive', 'the archive sits beside the telemetry store by default')
})

test('archive: rollup archives raw points, the archive query lists them, restoreTelemetry puts them back at full resolution', async (t) => {
  const archiveDir = tmpDir(t)
  const runtime = await createPolling(t, {
    telemetryArchiveDir: archiveDir,
    config: { telemetryPollIntervalMs: 10000, telemetryArchive: true, telemetryRetention: ARCHIVE_RETENTION }
  })
  await runtime._telemetry.poller.stop()
  await runtime._telemetry.rollup.stop()
  t.ok(runtime._publishedContract.capabilities.commands.find((c) => c.name === 'restoreTelemetry'), 'published so the Kernel dispatches it')

  const now = Date.now()
  const start = now - 30 * MIN
  const { store } = runtime._telemetry
  await store.del('SIM-001', 0, now)
  for (let m = 0; m < 20; m++) await store.put('SIM-001', start + m * MIN, { hashrate_rt: 100 + m, power: 3000, status: 'mining' })
  // Both passes run at `now`: on the wall clock the bucket straddling the raw
  // window (never archived, so never marked restored) could close between them.
  const rollupAt = (at) => {
    const realNow = Date.now
    Date.now = () => at
    try { return runtime._rollupTelemetry() } finally { Date.now = realNow }
  }
  await rollupAt(now)

  // A rolled point sits at its bucket's start, which can precede the first raw point.
  const readFrom = start - 5 * MIN
  const rolled = (await runtime.handleRequest(req({ type: 'snapshot', from: readFrom, to: now }, 'SIM-001'))).payload
  const rolledPoints = rolled.devices['SIM-001'].metrics.hashrate_rt.points.filter((p) => p.n)
  const archivedCount = rolledPoints.reduce((n, p) => n + p.n, 0)
  t.ok(rolledPoints.length >= 2 && archivedCount >= 10, 'the closed buckets are rolled; the one straddling the raw window waits')

  const listed = (await runtime.handleRequest(req({ type: 'archive' }, 'SIM-001'))).payload
  t.is(listed.deviceId, 'SIM-001')
  t.ok(listed.days.length >= 1 && listed.days.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day) && d.bytes > 0), 'day files')
  t.is((await runtime.handleRequest(req({ type: 'archive' }))).payload.error, 'ERR_DEVICE_ID_REQUIRED: archive')

  const restored = await cmd(runtime, 'restoreTelemetry', { from: start, to: start + 19 * MIN })
  t.is(restored.payload.status, 'SUCCESS', restored.payload.error)
  t.is(restored.payload.result.restored, archivedCount, 'every archived point of the range is back')
  t.is(restored.payload.result.buckets, rolledPoints.length)

  const raw = (await runtime.handleRequest(req({ type: 'snapshot', from: readFrom, to: now }, 'SIM-001'))).payload
  const rawPoints = raw.devices['SIM-001'].metrics.hashrate_rt.points
  t.alike(rawPoints.map((p) => p.value), Array.from({ length: 20 }, (_, m) => 100 + m), 'full resolution again, in order')
  t.ok(rawPoints.every((p) => !p.n), 'and the rolled points of those buckets are gone')

  const again = await cmd(runtime, 'restoreTelemetry', { from: start, to: start + 19 * MIN })
  t.is(again.payload.result.restored, archivedCount, 'a second restore is idempotent')
  t.is((await runtime.handleRequest(req({ type: 'snapshot', from: readFrom, to: now }, 'SIM-001'))).payload.devices['SIM-001'].metrics.hashrate_rt.points.length, 20)

  // A restart scans from 0 again: the restored range is marked and stays raw.
  const bytesBefore = (await runtime.handleRequest(req({ type: 'archive' }, 'SIM-001'))).payload.days.map((d) => d.bytes)
  runtime._telemetry.cursors.clear()
  await rollupAt(now)
  const afterRestart = (await runtime.handleRequest(req({ type: 'snapshot', from: readFrom, to: now }, 'SIM-001'))).payload.devices['SIM-001'].metrics.hashrate_rt.points
  t.is(afterRestart.filter((p) => !p.n).length, 20, 'still raw after a rollup pass with fresh cursors')
  t.alike((await runtime.handleRequest(req({ type: 'archive' }, 'SIM-001'))).payload.days.map((d) => d.bytes), bytesBefore, 'and nothing was archived twice')

  t.is((await cmd(runtime, 'restoreTelemetry', { from: now - 61 * MIN, to: now })).payload.error, `ERR_TELEMETRY_RESTORE_RANGE: from ${now - 61 * MIN} is older than keepMs`)
  t.is((await cmd(runtime, 'restoreTelemetry', { from: start, to: start - 1 })).payload.error, `ERR_RANGE_INVALID: ${start}..${start - 1}`)
  t.is((await cmd(runtime, 'restoreTelemetry', { from: 'x', to: 1 })).payload.status, 'FAILED', 'params are validated against the published entry')
  t.is((await cmd(runtime, 'restoreTelemetry', { from: start, to: now }, 'SIM-999')).payload.error, 'ERR_DEVICE_NOT_FOUND: SIM-999')
  t.is((await cmd(runtime, 'restoreTelemetry', { from: start, to: now }, null)).payload.error, 'ERR_DEVICE_ID_REQUIRED')
})

// A bucket is replaced as a unit: its rolled point is deleted and the archived
// raw points are put back. Reading the archive for only `from..to` therefore
// used to drop whatever of a boundary bucket lay outside the request, so
// restoring one minute of a five-minute bucket erased the other four.
test('archive: restoring part of a bucket keeps the rest of that bucket', async (t) => {
  const runtime = await createPolling(t, {
    telemetryArchiveDir: tmpDir(t),
    config: { telemetryPollIntervalMs: 10000, telemetryArchive: true, telemetryRetention: ARCHIVE_RETENTION }
  })
  await runtime._telemetry.poller.stop()
  await runtime._telemetry.rollup.stop()

  const now = Date.now()
  // A bucket boundary, so the arithmetic below is exact.
  const start = now - 30 * MIN - ((now - 30 * MIN) % (5 * MIN))
  const { store } = runtime._telemetry
  await store.del('SIM-001', 0, now)
  for (let m = 0; m < 20; m++) await store.put('SIM-001', start + m * MIN, { hashrate_rt: 100 + m, power: 3000, status: 'mining' })

  const realNow = Date.now
  Date.now = () => now
  try { await runtime._rollupTelemetry() } finally { Date.now = realNow }

  // One minute inside the first five-minute bucket.
  const restored = await cmd(runtime, 'restoreTelemetry', { from: start + 2 * MIN, to: start + 2 * MIN })
  t.is(restored.payload.status, 'SUCCESS', restored.payload.error)

  const points = (await runtime.handleRequest(req({ type: 'snapshot', from: start, to: start + 4 * MIN }, 'SIM-001')))
    .payload.devices['SIM-001'].metrics.hashrate_rt.points
  t.alike(points.map((p) => p.value), [100, 101, 102, 103, 104], 'the whole bucket is back at full resolution, not just the minute asked for')
  t.ok(points.every((p) => !p.n), 'and the rolled point it replaced is gone')
})

// `from` is checked against keepMs, but aligning it down to a bucket boundary
// can land before the point expiry has already swept past, and that sweep only
// moves forward. Without rewinding its cursor the restored readings would sit
// in the store past keepMs until a restart reset the cursors.
test('archive: restoring below the expiry cursor rewinds it so the sweep covers what came back', async (t) => {
  const runtime = await createPolling(t, {
    telemetryArchiveDir: tmpDir(t),
    config: { telemetryPollIntervalMs: 10000, telemetryArchive: true, telemetryRetention: ARCHIVE_RETENTION }
  })
  await runtime._telemetry.poller.stop()
  await runtime._telemetry.rollup.stop()

  const now = Date.now()
  const start = now - 30 * MIN - ((now - 30 * MIN) % (5 * MIN))
  const { store, cursors } = runtime._telemetry
  await store.del('SIM-001', 0, now)
  for (let m = 0; m < 20; m++) await store.put('SIM-001', start + m * MIN, { hashrate_rt: 100 + m, power: 3000, status: 'mining' })

  const realNow = Date.now
  Date.now = () => now
  try { await runtime._rollupTelemetry() } finally { Date.now = realNow }

  // Expiry has already swept past the bucket the restore will align back into.
  cursors.set('SIM-001', { ...cursors.get('SIM-001'), expired: start + 7 * MIN })
  const restored = await cmd(runtime, 'restoreTelemetry', { from: start + 8 * MIN, to: start + 8 * MIN })
  t.is(restored.payload.status, 'SUCCESS', restored.payload.error)
  t.is(restored.payload.result.from, start + 5 * MIN, 'the read aligned back to the bucket boundary')
  t.is(cursors.get('SIM-001').expired, start + 5 * MIN, 'and the expiry cursor came back with it')
})
