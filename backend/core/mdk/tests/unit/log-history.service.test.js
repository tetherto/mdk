'use strict'

const test = require('brittle')
const LogsService = require('../../lib/services/logs.service')
const LogHistoryService = require('../../lib/services/log-history.service')
const { createTestStore, createTestBee } = require('../helpers/store')

const DEVICES = {
  'dev-1': { id: 'dev-1', info: { container: 'c1' }, tags: ['t-miner'], type: 'miner-wm', code: 'WM-0001' },
  'dev-2': { id: 'dev-2', info: { container: 'c1' }, tags: ['t-miner'], type: 'miner-wm', code: 'WM-0002' }
}

async function createServices (t, conf = { logKeepCount: 3 }) {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  const logs = new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf })
  const history = new LogHistoryService({
    logs,
    getDeviceInfo: (id) => DEVICES[id],
    statTimeframes: [['5m', '0 */5 * * * *']],
    conf
  })
  return { logs, history }
}

test('tailLog validates key and tag', async (t) => {
  const { history } = await createServices(t)
  await t.exception(history.tailLog({ tag: 'x' }), /ERR_LOG_KEY_NOTFOUND/)
  await t.exception(history.tailLog({ key: 'thing-5m' }), /ERR_LOG_TAG_INVALID/)
})

test('tailLog throws ERR_LOG_NOTFOUND for missing log', async (t) => {
  const { history } = await createServices(t)
  await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-1' }), /ERR_LOG_NOTFOUND/)
})

test('tailLog only opens device-scoped snapshot logs and stat logs', async (t) => {
  const { logs, history } = await createServices(t)
  const base = Date.now()
  await logs.saveLogData('thing-5m-dev-1', base, { ts: base, n: 0 }, 0, true)
  await logs.saveLogData('stat-5m-t-miner', base, { ts: base, s: 1 }, 0, true)
  await logs.saveLogData('thing-alerts', base, { a: 1 }, 0, true)

  // Unknown device tag, non-log keys and malformed names are refused.
  await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-x' }), /ERR_LOG_TAG_FORBIDDEN/)
  await t.exception(history.tailLog({ key: 'thing', tag: 'alerts' }), /ERR_LOG_KEY_INVALID/)
  await t.exception(history.tailLog({ key: 'meta', tag: 'x' }), /ERR_LOG_KEY_INVALID/)
  await t.exception(history.tailLog({ key: 'stat-5m', tag: '../x' }), /ERR_LOG_TAG_INVALID/)
  await t.exception(history.tailLog({ key: 'stat 5m', tag: 't-miner' }), /ERR_LOG_KEY_INVALID/)

  // Device-scoped: the snapshot log is derived from thingId, whatever tag says.
  const own = await history.tailLog({ key: 'thing-5m', tag: 'dev-x', thingId: 'dev-1' })
  t.is(own[0].n, 0)

  // Device-scoped stat reads are limited to the device's own tags.
  t.is((await history.tailLog({ key: 'stat-5m', tag: 't-miner', thingId: 'dev-1' }))[0].s, 1)
  await t.exception(history.tailLog({ key: 'stat-5m', tag: 't-container', thingId: 'dev-1' }), /ERR_LOG_TAG_FORBIDDEN/)
  await t.exception(history.tailLog({ key: 'stat-5m', tag: 't-miner', thingId: 'dev-x' }), /ERR_LOG_TAG_FORBIDDEN/)

  // Worker-scoped aggregate read.
  t.is((await history.tailLog({ key: 'stat-5m', tag: 't-miner' }))[0].s, 1)
})

test('tailLog / getHistoricalLogs bound offset, limit and range', async (t) => {
  const { logs, history } = await createServices(t)
  const base = 1700000000000
  for (let i = 0; i < 3; i++) {
    await logs.saveLogData('thing-5m-dev-1', base + i, { ts: base + i, n: i }, 0, true)
  }

  for (const offset of [-1, 1.5, '2.5', 100, 'x']) {
    await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-1', offset }), /ERR_LOG_OFFSET_INVALID/, `offset ${offset}`)
    await t.exception(history.getHistoricalLogs({ logType: 'info', offset }), /ERR_LOG_OFFSET_INVALID/, `hist offset ${offset}`)
  }
  await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-1', limit: -5 }), /ERR_LOG_LIMIT_INVALID/)
  await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-1', start: 'abc' }), /ERR_LOG_START_INVALID/)
  await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-1', end: -1 }), /ERR_LOG_END_INVALID/)

  const capped = new LogHistoryService({ logs, getDeviceInfo: (id) => DEVICES[id], conf: { logKeepCount: 3, logMaxLimit: 2 } })
  t.is((await capped.tailLog({ key: 'thing-5m', tag: 'dev-1', limit: 1000 })).length, 2, 'limit capped at conf.logMaxLimit')
  t.is((await capped.tailLog({ key: 'thing-5m', tag: 'dev-1', start: base })).length, 2, 'range read capped too')
})

test('LogsService.getBeeTimeLog never mints a core for an invalid offset', async (t) => {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  const logs = new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf: { logKeepCount: 3 } })
  await logs.saveLogData('k1', 1, { a: 1 }, 0, true)

  let created = 0
  const orig = store.getBee.bind(store)
  store.getBee = (...args) => { created++; return orig(...args) }

  await t.exception(logs.getBeeTimeLog('k1', -3), /ERR_LOG_OFFSET_INVALID/)
  await t.exception(logs.getBeeTimeLog('k1', 0.5), /ERR_LOG_OFFSET_INVALID/)
  t.is(await logs.getBeeTimeLog('k1', 1000), null)
  t.is(await logs.getBeeTimeLog('unknown-key', 0), null)
  t.is(created, 0, 'no bee opened')
})

test('tailLog returns newest-first entries written by LogsService', async (t) => {
  const { logs, history } = await createServices(t)

  const base = Date.now()
  for (let i = 0; i < 5; i++) {
    await logs.saveLogData('thing-5m-dev-1', base + i * 1000, { ts: base + i * 1000, n: i }, 0, true)
  }

  const res = await history.tailLog({ key: 'thing-5m', tag: 'dev-1', limit: 3 })
  t.is(res.length, 3)
  t.is(res[0].n, 4, 'newest first')
  t.is(res[2].n, 2)
})

test('tailLog range query with start/end', async (t) => {
  const { logs, history } = await createServices(t)

  const base = 1700000000000
  for (let i = 0; i < 5; i++) {
    await logs.saveLogData('thing-5m-dev-1', base + i * 1000, { ts: base + i * 1000, n: i }, 0, true)
  }

  const res = await history.tailLog({ key: 'thing-5m', tag: 'dev-1', start: base + 1000, end: base + 3000 })
  t.alike(res.map((e) => e.n).sort(), [1, 2, 3])
})

test('tailLog walks rotated logs to fill the limit', async (t) => {
  const { logs, history } = await createServices(t)

  const base = Date.now()
  await logs.saveLogData('thing-5m-dev-1', base, { ts: base, n: 0 }, 0, true)
  await logs.rotateBeeLog('thing-5m-dev-1')
  await logs.saveLogData('thing-5m-dev-1', base + 1000, { ts: base + 1000, n: 1 })

  const res = await history.tailLog({ key: 'thing-5m', tag: 'dev-1', limit: 2 })
  t.is(res.length, 2)
  t.alike(res.map((e) => e.n), [1, 0])
})

test('getHistoricalLogs requires logType and resolves device info', async (t) => {
  const { logs, history } = await createServices(t)

  await t.exception(history.getHistoricalLogs({}), /ERR_INFO_HISTORY_LOG_TYPE_INVALID/)

  const now = Date.now()
  await logs.saveLogData('thing-history-log', now, [
    { ts: now, changes: { 'info.pos': { oldValue: '1', newValue: '2' } }, id: 'dev-1' }
  ], 0, true)

  const res = await history.getHistoricalLogs({ logType: 'info' })
  t.is(res.length, 1)
  t.alike(res[0].changes, { 'info.pos': { oldValue: '1', newValue: '2' } })
  t.is(res[0].thing.id, 'dev-1')
  t.is(res[0].thing.code, 'WM-0001')
})

test('getHistoricalLogs alerts flattens grouped alert entries', async (t) => {
  const { logs, history } = await createServices(t)

  const now = Date.now()
  await logs.saveLogData('thing-alerts', now, {
    'uuid-1': { name: 'overheat', severity: 'high', createdAt: now, uuid: 'uuid-1', thingId: 'dev-1' }
  }, 0, true)

  const res = await history.getHistoricalLogs({ logType: 'alerts', limit: 10 })
  t.is(res.length, 1)
  t.is(res[0].name, 'overheat')
  t.is(res[0].thing.id, 'dev-1')
  t.is(res[0].thingId, undefined, 'thingId replaced by thing')
})

test('getHistoricalLogs scoped to a device returns that device\'s entries only, limit counted after the filter', async (t) => {
  const { logs, history } = await createServices(t)

  const now = Date.now()
  await logs.saveLogData('thing-alerts', now, {
    'uuid-1': { name: 'overheat', createdAt: now, uuid: 'uuid-1', thingId: 'dev-1' },
    'uuid-2': { name: 'offline', createdAt: now, uuid: 'uuid-2', thingId: 'dev-2' },
    'uuid-3': { name: 'fan', createdAt: now, uuid: 'uuid-3', thingId: 'dev-2' }
  }, 0, true)
  await logs.saveLogData('thing-history-log', now, [
    { ts: now, changes: { 'info.pos': { oldValue: '1', newValue: '2' } }, id: 'dev-1' },
    { ts: now, changes: { 'info.pos': { oldValue: '3', newValue: '4' } }, id: 'dev-2' }
  ], 0, true)

  const alerts = await history.getHistoricalLogs({ logType: 'alerts', limit: 10, thingId: 'dev-2' })
  t.alike(alerts.map((a) => a.name), ['offline', 'fan'])
  t.ok(alerts.every((a) => a.thing.id === 'dev-2'), 'no dev-1 alert through dev-2')
  const one = await history.getHistoricalLogs({ logType: 'alerts', limit: 1, thingId: 'dev-2' })
  t.is(one.length, 1, 'the limit applies to the device\'s own entries')
  t.is(one[0].thing.id, 'dev-2')

  const info = await history.getHistoricalLogs({ logType: 'info', thingId: 'dev-1' })
  t.is(info.length, 1)
  t.is(info[0].thing.id, 'dev-1')
  t.alike(info[0].changes, { 'info.pos': { oldValue: '1', newValue: '2' } })

  t.is((await history.getHistoricalLogs({ logType: 'alerts', limit: 10 })).length, 3, 'Worker-scoped: every device')
  t.is((await history.getHistoricalLogs({ logType: 'info' })).length, 2)
})

test('constructor applies defaults for optional collaborators', (t) => {
  const svc = new LogHistoryService({ logs: {} })
  t.is(svc.getDeviceInfo('x'), undefined)
  t.alike(svc.statTimeframes, [])
  t.alike(svc.conf, {})
})

test('constructor requires logs', (t) => {
  t.exception(() => new LogHistoryService({}), /ERR_LOG_HISTORY_LOGS_REQUIRED/)
})
