'use strict'

const test = require('brittle')
const StatsService = require('../../lib/services/stats.service')
const LogsService = require('../../lib/services/logs.service')
const { createTestStore, createTestBee } = require('../helpers/store')

// Real lib-stats spec: sum hashrate over last.snap, count online devices.
const LIB = {
  conf: { skipTagPrefixes: ['id-', 'code-'] },
  specs: {
    miner: {
      ops: {
        hashrate_total: { op: 'sum', src: 'last.snap.stats.hashrate' },
        online_cnt: {
          op: 'cnt',
          filter: (entry) => entry?.last?.snap?.stats?.status === 'mining'
        }
      }
    }
  }
}

const META = {
  'dev-1': { id: 'dev-1', tags: ['t-miner', 'container-c1', 'id-dev-1'], info: {}, opts: {}, type: 'miner-wm' },
  'dev-2': { id: 'dev-2', tags: ['t-miner', 'container-c1', 'id-dev-2'], info: {}, opts: {}, type: 'miner-wm' }
}

const LAST = {
  'dev-1': { snap: { stats: { hashrate: 100, status: 'mining' } } },
  'dev-2': { snap: { stats: { hashrate: 40, status: 'offline' } } }
}

function makeLogsStub () {
  const writes = []
  return {
    writes,
    getBeeTimeLog: async (key) => ({
      key,
      put: async (k, v) => writes.push([key, k, JSON.parse(v.toString())])
    }),
    releaseBeeTimeLog: async () => {}
  }
}

function createService (opts = {}) {
  return new StatsService({
    lib: opts.lib === undefined ? LIB : opts.lib,
    specTags: ['miner'],
    baseType: 'miner',
    listDeviceIds: () => Object.keys(META),
    getDeviceMeta: (id) => META[id],
    getLast: (id) => LAST[id],
    getRealtimeData: opts.getRealtimeData,
    processAlerts: () => null,
    logs: opts.logs || makeLogsStub(),
    conf: {}
  })
}

test('aggrStats applies spec ops over device last snapshots', (t) => {
  const svc = createService()
  const acc = svc.aggrStats(['dev-1', 'dev-2'])
  t.is(acc.hashrate_total, 140)
  t.is(acc.online_cnt, 1)
})

test('aggrStats without lib returns empty object', (t) => {
  const svc = createService({ lib: null })
  t.alike(svc.aggrStats(['dev-1']), {})
})

test('aggrStats respects the requested id subset', (t) => {
  const svc = createService()
  const acc = svc.aggrStats(['dev-2'])
  t.is(acc.hashrate_total, 40)
  t.is(acc.online_cnt, 0)
})

test('saveRealTimeData aggregates rtd snaps and stores stat-rtd', async (t) => {
  const logs = makeLogsStub()
  const svc = createService({
    logs,
    getRealtimeData: async (id) => ({ stats: { hashrate: id === 'dev-1' ? 10 : 20, status: 'mining' } })
  })

  await svc.saveRealTimeData()

  t.is(logs.writes.length, 1)
  const [key, dataKey, data] = logs.writes[0]
  t.is(key, 'stat-rtd-t-miner')
  t.is(dataKey, 'stat-rtd')
  t.is(data.hashrate_total, 30)
  t.is(data.online_cnt, 2)
})

test('buildStats groups by tags and persists one entry per tag', async (t) => {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  const logs = new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf: {} })

  const svc = createService({ logs })
  const fireTime = new Date()
  await svc.buildStats('stat-5m', fireTime)

  // skipTagPrefixes drops id-*; t-miner and container-c1 remain
  const log = await logs.getBeeTimeLog('stat-5m-container-c1', 0)
  t.ok(log, 'tag log written')
  const entries = []
  for await (const chunk of log.createReadStream({})) {
    entries.push(JSON.parse(chunk.value.toString()))
  }
  await logs.releaseBeeTimeLog(log)

  t.is(entries.length, 1)
  t.is(entries[0].hashrate_total, 140)

  t.is(await logs.getBeeTimeLog('stat-5m-id-dev-1', 0), null, 'skip-prefixed tag not written')
})

test('constructor applies defaults for optional collaborators', (t) => {
  const svc = new StatsService({ logs: {} })
  t.alike(svc.listDeviceIds(), [])
  t.is(svc.getDeviceMeta('x'), null)
  t.is(svc.getLast('x'), undefined)
  t.is(svc.getRealtimeData, null)
  t.is(svc.processAlerts('x'), null)
  t.alike(svc.specTags, [])
  t.is(svc.baseType, 'thing')
  t.alike(svc.conf, {})
})
