'use strict'

const test = require('brittle')
const LogsService = require('../../lib/services/logs.service')
const LogHistoryService = require('../../lib/services/log-history.service')
const { createTestStore, createTestBee } = require('../helpers/store')

const DEVICES = {
  'dev-1': { id: 'dev-1', info: { container: 'c1' }, tags: ['t-miner'], type: 'miner-wm', code: 'WM-0001' }
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
  await t.exception(history.tailLog({ key: 'thing-5m', tag: 'dev-x' }), /ERR_LOG_NOTFOUND/)
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

test('constructor applies defaults for optional collaborators', (t) => {
  const svc = new LogHistoryService({ logs: {} })
  t.is(svc.getDeviceInfo('x'), undefined)
  t.alike(svc.statTimeframes, [])
  t.alike(svc.conf, {})
})

test('constructor requires logs', (t) => {
  t.exception(() => new LogHistoryService({}), /ERR_LOG_HISTORY_LOGS_REQUIRED/)
})
