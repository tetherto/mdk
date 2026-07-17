'use strict'

const test = require('brittle')
const SnapsService = require('../../lib/services/snaps.service')
const LogsService = require('../../lib/services/logs.service')
const { createTestStore, createTestBee } = require('../helpers/store')

const META = {
  'dev-1': { id: 'dev-1', type: 'miner-wm', info: { container: 'c1' }, tags: [] },
  'dev-2': { id: 'dev-2', type: 'miner-wm', info: { container: 'maintenance' }, tags: [] }
}

async function createRealLogs (t) {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  return new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf: {} })
}

function stubLogs () {
  return { getBeeTimeLog: async () => null, releaseBeeTimeLog: async () => {} }
}

function createService (opts) {
  return new SnapsService({
    listDeviceIds: opts.listDeviceIds || (() => ['dev-1']),
    getDeviceMeta: (id) => META[id],
    collectSnap: opts.collectSnap,
    processAlerts: opts.processAlerts || (() => null),
    saveAlerts: opts.saveAlerts,
    logs: opts.logs || stubLogs(),
    conf: { storeSnapItvMs: opts.storeSnapItvMs ?? 0, collectSnapRetry: 1, collectSnapTimeoutMs: opts.timeoutMs || 1000 }
  })
}

test('collectSnaps stores snap and alerts in the last map', async (t) => {
  const alerts = [{ name: 'x' }]
  const svc = createService({
    collectSnap: async () => ({ success: true, stats: { status: 'mining' } }),
    processAlerts: () => alerts
  })

  await svc.collectSnaps()

  const last = svc.getLast('dev-1')
  t.is(last.snap.stats.status, 'mining')
  t.is(last.err, null)
  t.is(last.alerts, alerts)
  t.ok(last.ts <= Date.now())
})

test('maintenance devices get an offline snap without a device call', async (t) => {
  let called = 0
  const svc = createService({
    listDeviceIds: () => ['dev-2'],
    collectSnap: async () => { called++; return {} }
  })

  await svc.collectSnaps()

  t.is(called, 0)
  t.is(svc.getLast('dev-2').snap.stats.status, 'offline')
})

test('collectSnap timeout yields an offline snap', async (t) => {
  const svc = createService({
    timeoutMs: 50,
    collectSnap: () => new Promise(() => {})
  })

  await svc.collectSnaps()
  t.is(svc.getLast('dev-1').snap.stats.status, 'offline')
})

test('collectSnap error is recorded as last.err with null snap', async (t) => {
  const svc = createService({
    collectSnap: async () => { throw new Error('ERR_READ_FAILED') }
  })

  await svc.collectSnaps()
  const last = svc.getLast('dev-1')
  t.is(last.snap, null)
  t.is(last.err, 'ERR_READ_FAILED')
})

test('snaps are persisted to thing-5m-<id> when the store interval elapsed', async (t) => {
  const logs = await createRealLogs(t)
  const svc = createService({
    logs,
    collectSnap: async () => ({ success: true, stats: { status: 'mining' } })
  })

  await svc.collectSnaps()

  const log = await logs.getBeeTimeLog('thing-5m-dev-1', 0)
  t.ok(log, 'per-device snap log exists')
  const entries = []
  for await (const chunk of log.createReadStream({})) {
    entries.push(JSON.parse(chunk.value.toString()))
  }
  await logs.releaseBeeTimeLog(log)

  t.is(entries.length, 1)
  t.is(entries[0].snap.stats.status, 'mining')
})

test('saveAlerts runs after every collect pass', async (t) => {
  let saved = 0
  const svc = createService({
    collectSnap: async () => ({ success: true, stats: {} }),
    saveAlerts: async () => { saved++ }
  })

  await svc.collectSnaps()
  t.is(saved, 1)
})

test('listLast merges device meta with last state', async (t) => {
  const svc = createService({
    collectSnap: async () => ({ success: true, stats: { status: 'mining' } })
  })
  await svc.collectSnaps()

  const all = svc.listLast()
  t.is(all.length, 1)
  t.is(all[0].id, 'dev-1')
  t.is(all[0].type, 'miner-wm')
  t.is(all[0].last.snap.stats.status, 'mining')
})

test('constructor applies defaults for optional collaborators', (t) => {
  const svc = new SnapsService({ logs: {}, collectSnap: async () => ({}) })
  t.alike(svc.listDeviceIds(), [])
  t.alike(svc.getDeviceMeta('x'), { id: 'x' })
  t.is(svc.processAlerts('x'), null)
  t.alike(svc.conf, {})
})

test('constructor requires collectSnap', (t) => {
  t.exception(() => new SnapsService({ logs: {} }), /ERR_SNAPS_COLLECT_SNAP_REQUIRED/)
})
