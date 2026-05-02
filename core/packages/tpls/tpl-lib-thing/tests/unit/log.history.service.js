'use strict'

const test = require('brittle')
const LogHistoryService = require('../../lib/services/log.history.service')

function makeEntry (data) {
  return { value: Buffer.from(JSON.stringify(data)) }
}

function makeLog (entries = []) {
  const _entries = [...entries]
  return {
    get: async () => null,
    put: async () => {},
    peek: async () => null,
    close: async () => {},
    createReadStream (opts = {}) {
      const { reverse, limit } = opts
      let items = [..._entries]
      if (reverse) items = items.reverse()
      if (limit) items = items.slice(0, limit)
      return (async function * () { for (const e of items) yield e })()
    }
  }
}

const gLibStats = require('../../../../mdk/lib-stats')

function makeService ({
  things = {},
  logEntries = [],
  statTimeframes = gLibStats.defaults.timeframes,
  thingConf = { logKeepCount: 3 },
  tailLogHook0 = async () => {},
  getBeeTimeLog = null,
  releaseBeeTimeLog = async () => {}
} = {}) {
  const log = makeLog(logEntries)

  const logs = {
    getBeeTimeLog: getBeeTimeLog || (async (key, offset, init) => log),
    releaseBeeTimeLog
  }

  return new LogHistoryService({
    logs,
    getThings: () => things,
    statTimeframes,
    thingConf,
    tailLogHook0
  })
}

// ---------------------------------------------------------------------------
// tailLog — validation
// ---------------------------------------------------------------------------

test('tailLog throws ERR_LOG_KEY_NOTFOUND when key is missing', async (t) => {
  const svc = makeService()
  await t.exception(svc.tailLog({ tag: 'thg-1' }), /ERR_LOG_KEY_NOTFOUND/)
})

test('tailLog throws ERR_LOG_TAG_INVALID when tag is missing', async (t) => {
  const svc = makeService()
  await t.exception(svc.tailLog({ key: 'thing-5m' }), /ERR_LOG_TAG_INVALID/)
})

// ---------------------------------------------------------------------------
// tailLog — basic retrieval
// ---------------------------------------------------------------------------

test('tailLog returns array of log entries', async (t) => {
  const entry = makeEntry({ ts: 1000, snap: { success: true } })
  const log = makeLog([entry])
  // return null for offset > 0 so the loop doesn't collect duplicates
  const svc = makeService({
    getBeeTimeLog: async (key, offset) => offset === 0 ? log : null
  })
  const result = await svc.tailLog({ key: 'thing-5m', tag: 'thg-1', limit: 10 })
  t.ok(Array.isArray(result))
  t.is(result.length, 1)
  t.is(result[0].ts, 1000)
})

test('tailLog returns empty array when log is empty', async (t) => {
  const svc = makeService({ logEntries: [] })
  const result = await svc.tailLog({ key: 'thing-5m', tag: 'thg-1', limit: 10 })
  t.ok(Array.isArray(result))
  t.is(result.length, 0)
})

test('tailLog throws ERR_LOG_NOTFOUND when getBeeTimeLog returns null', async (t) => {
  const svc = makeService({ getBeeTimeLog: async () => null })
  await t.exception(svc.tailLog({ key: 'thing-5m', tag: 'thg-1', limit: 10 }), /ERR_LOG_NOTFOUND/)
})

// ---------------------------------------------------------------------------
// tailLog — projection
// ---------------------------------------------------------------------------

test('tailLog applies field projection when fields is provided', async (t) => {
  const entry = makeEntry({ ts: 1000, snap: { success: true }, extra: 'keep_me_out' })
  const svc = makeService({ logEntries: [entry] })
  const result = await svc.tailLog({ key: 'thing-5m', tag: 'thg-1', limit: 10, fields: { ts: 1 } })
  t.ok(Array.isArray(result))
  t.ok(result[0].ts !== undefined)
})

// ---------------------------------------------------------------------------
// tailLog — aggregation
// ---------------------------------------------------------------------------

test('tailLog aggregates entries when groupRange is provided', async (t) => {
  const now = Date.now()
  const entry1 = makeEntry({ ts: now, val: 10 })
  const entry2 = makeEntry({ ts: now + 1000, val: 20 })
  const log = makeLog([entry1, entry2])
  const svc = makeService({
    getBeeTimeLog: async (key, offset) => offset === 0 ? log : null
  })
  const result = await svc.tailLog({ key: 'thing-5m', tag: 'thg-1', limit: 10, groupRange: '1H' })
  t.ok(Array.isArray(result))
  t.is(result.length, 1)
  t.is(result[0].val, 30)
})

// ---------------------------------------------------------------------------
// tailLog — hook
// ---------------------------------------------------------------------------

test('tailLog calls tailLogHook0 with results and req', async (t) => {
  const hookArgs = []
  const entry = makeEntry({ ts: 1000 })
  const svc = makeService({
    logEntries: [entry],
    tailLogHook0: async (res, req) => { hookArgs.push({ res, req }) }
  })
  await svc.tailLog({ key: 'thing-5m', tag: 'thg-1', limit: 10 })
  t.is(hookArgs.length, 1)
  t.ok(Array.isArray(hookArgs[0].res))
})

// ---------------------------------------------------------------------------
// getHistoricalLogs — validation
// ---------------------------------------------------------------------------

test('getHistoricalLogs throws ERR_INFO_HISTORY_LOG_TYPE_INVALID when logType is missing', async (t) => {
  const svc = makeService()
  await t.exception(svc.getHistoricalLogs({ limit: 10 }), /ERR_INFO_HISTORY_LOG_TYPE_INVALID/)
})

// ---------------------------------------------------------------------------
// getHistoricalLogs — alerts
// ---------------------------------------------------------------------------

test('getHistoricalLogs for alerts returns flattened alert array', async (t) => {
  const thingId = 'thg-1'
  const alert = { thingId, name: 'high_temp', uuid: 'u1', createdAt: 1000 }
  const logRow = { u1: alert }
  const entry = makeEntry(logRow)

  const things = { [thingId]: { id: thingId, info: { name: 'Test' }, tags: [], type: 'thing', code: 'T-0001' } }
  const svc = makeService({ logEntries: [entry], things })
  const result = await svc.getHistoricalLogs({ logType: 'alerts', limit: 10 })
  t.ok(Array.isArray(result))
  t.is(result.length, 1)
  t.is(result[0].name, 'high_temp')
  t.ok(result[0].thing, 'alert includes thing info')
  t.absent(result[0].thingId, 'thingId removed from alert')
})

// ---------------------------------------------------------------------------
// getHistoricalLogs — info history
// ---------------------------------------------------------------------------

test('getHistoricalLogs for info returns history entries with thing info', async (t) => {
  const thingId = 'thg-1'
  const histEntry = { id: thingId, ts: 2000, changes: { name: { oldValue: 'A', newValue: 'B' } } }
  const logRow = [histEntry]
  const entry = makeEntry(logRow)

  const things = { [thingId]: { id: thingId, info: { name: 'B' }, tags: [], type: 'thing', code: 'T-0001' } }
  const svc = makeService({ logEntries: [entry], things })
  const result = await svc.getHistoricalLogs({ logType: 'info', limit: 10 })
  t.ok(Array.isArray(result))
  t.is(result.length, 1)
  t.ok(result[0].thing, 'history entry includes thing info')
  t.absent(result[0].id, 'id removed from entry and moved into thing')
})

test('getHistoricalLogs for info throws when log unavailable', async (t) => {
  const svc = makeService({ getBeeTimeLog: async () => null })
  await t.exception(svc.getHistoricalLogs({ logType: 'info', limit: 10 }), /ERR/)
})
