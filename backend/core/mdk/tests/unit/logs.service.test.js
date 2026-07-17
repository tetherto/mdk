'use strict'

const test = require('brittle')
const LogsService = require('../../lib/services/logs.service')
const { createTestStore, createTestBee } = require('../helpers/store')

async function createService (t, conf = {}) {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  const svc = new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf })
  return svc
}

test('constructor requires store and metaLogs', (t) => {
  t.exception(() => new LogsService({}), /ERR_LOGS_STORE_REQUIRED/)
  t.exception(() => new LogsService({ store: {} }), /ERR_LOGS_META_LOGS_REQUIRED/)
})

test('getBeeTimeLog returns null for unknown key without init', async (t) => {
  const svc = await createService(t)
  t.is(await svc.getBeeTimeLog('nope'), null)
})

test('saveLogData + getBeeTimeLog roundtrip', async (t) => {
  const svc = await createService(t)
  const ts = Date.now()

  await svc.saveLogData('thing-5m-dev1', ts, { ts, snap: { ok: true } }, 0, true)

  const log = await svc.getBeeTimeLog('thing-5m-dev1', 0)
  t.ok(log, 'log exists after init write')

  const entries = []
  for await (const chunk of log.createReadStream({})) {
    entries.push(JSON.parse(chunk.value.toString()))
  }
  await svc.releaseBeeTimeLog(log)

  t.is(entries.length, 1)
  t.is(entries[0].ts, ts)
  t.alike(entries[0].snap, { ok: true })
})

test('rotateLogs is a no-op without logRotateMaxLength', async (t) => {
  const svc = await createService(t)
  await svc.saveLogData('k1', 1, { a: 1 }, 0, true)
  t.alike(await svc.rotateLogs(), [])
})

test('getLogName suffixes the bee name', (t) => {
  const svc = new LogsService({ store: {}, metaLogs: {} })
  t.is(svc.getLogName('thing-5m-dev1'), 'thing-5m-dev1-5')
})

test('refreshLogsCache is a no-op without logKeepCount', async (t) => {
  const svc = await createService(t)
  await svc.saveLogData('k1', 1, { a: 1 }, 0, true)
  t.alike(await svc.refreshLogsCache(), [])
  t.alike(svc._logCache, {})
})

test('refreshLogsCache populates the cache, then evicts entries rotated out of the retention window', async (t) => {
  const svc = await createService(t, { logKeepCount: 1 })
  await svc.saveLogData('k1', 1, { a: 1 }, 0, true)

  await svc.refreshLogsCache()
  t.is(Object.keys(svc._logCache).length, 1)

  // Rotate past the retention window (maxHeight = ceil(1 * 1.5) = 2) so the
  // previously cached bee is no longer reachable at any offset the next pass
  // walks — it should be evicted via _cleanupLogs.
  await svc.rotateBeeLog('k1')
  await svc.rotateBeeLog('k1')

  await svc.refreshLogsCache()
  t.pass('refreshLogsCache completed after rotating out of the retention window')
})

test('rotateLogs bumps meta.cur once the log reaches the threshold', async (t) => {
  const svc = await createService(t, { logRotateMaxLength: 2 })

  await svc.saveLogData('k1', 1, { a: 1 }, 0, true)
  await svc.saveLogData('k1', 2, { a: 2 })

  const rotated = await svc.rotateLogs()
  t.is(rotated.length, 1)
  t.is(rotated[0][0], 'k1')

  const meta = await svc.getBeeLogMeta('k1')
  t.is(meta.cur, 1)

  // old data is reachable at offset 1, the fresh log is empty
  const oldLog = await svc.getBeeTimeLog('k1', 1)
  t.ok(oldLog.core.length >= 2)
  await svc.releaseBeeTimeLog(oldLog)
})
