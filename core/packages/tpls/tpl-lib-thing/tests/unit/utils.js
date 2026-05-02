'use strict'

const test = require('brittle')
const {
  isValidSnap,
  isOffline,
  getLogsCountForTimeRange,
  getLogMaxHeight,
  getJsonChanges,
  aggregateLogs,
  getThingSorter,
  applyFilters,
  projection
} = require('../../lib/utils')

// ---------------------------------------------------------------------------
// isValidSnap
// ---------------------------------------------------------------------------

test('isValidSnap returns true when snap has both stats and config', (t) => {
  t.ok(isValidSnap({ stats: {}, config: {} }))
})

test('isValidSnap returns false when stats is missing', (t) => {
  t.absent(isValidSnap({ config: {} }))
})

test('isValidSnap returns false when config is missing', (t) => {
  t.absent(isValidSnap({ stats: {} }))
})

// ---------------------------------------------------------------------------
// isOffline
// ---------------------------------------------------------------------------

test('isOffline returns true for null snap', (t) => {
  t.ok(isOffline(null))
})

test('isOffline returns true when status is offline', (t) => {
  t.ok(isOffline({ stats: { status: 'offline' } }))
})

test('isOffline returns true when stats.status is missing', (t) => {
  t.ok(isOffline({ stats: {} }))
})

test('isOffline returns false when status is ok', (t) => {
  t.absent(isOffline({ stats: { status: 'ok' } }))
})

// ---------------------------------------------------------------------------
// getLogMaxHeight
// ---------------------------------------------------------------------------

test('getLogMaxHeight returns ceil(logKeepCount * 1.5)', (t) => {
  t.is(getLogMaxHeight(3), 5)
  t.is(getLogMaxHeight(4), 6)
  t.is(getLogMaxHeight(1), 2)
})

test('getLogMaxHeight defaults to logKeepCount 3 when not provided', (t) => {
  t.is(getLogMaxHeight(), 5)
})

// ---------------------------------------------------------------------------
// getLogsCountForTimeRange
// ---------------------------------------------------------------------------

const gLibStats = require('../../../../mdk/lib-stats')
const realTimeframes = gLibStats.defaults.timeframes

test('getLogsCountForTimeRange returns 0 when no timeframes', (t) => {
  t.is(getLogsCountForTimeRange(0, Date.now(), 'stat-5m', null), 0)
})

test('getLogsCountForTimeRange returns 0 for unknown key', (t) => {
  t.is(getLogsCountForTimeRange(0, Date.now(), 'stat-unknown', realTimeframes), 0)
})

test('getLogsCountForTimeRange calculates count for minute interval', (t) => {
  const start = 0
  const end = 60 * 60 * 1000 // 1 hour = 12 five-minute intervals
  const count = getLogsCountForTimeRange(start, end, 'stat-5m', realTimeframes)
  t.ok(count >= 12, 'at least 12 log entries for 1-hour window with 5-minute interval')
})

test('getLogsCountForTimeRange handles missing start (defaults to 0)', (t) => {
  const count = getLogsCountForTimeRange(undefined, 5 * 60 * 1000, 'stat-5m', realTimeframes)
  t.ok(typeof count === 'number')
})

// ---------------------------------------------------------------------------
// getJsonChanges
// ---------------------------------------------------------------------------

test('getJsonChanges returns empty object for identical inputs', (t) => {
  const result = getJsonChanges({ a: 1 }, { a: 1 })
  t.alike(result, {})
})

test('getJsonChanges detects primitive value change', (t) => {
  const result = getJsonChanges({ a: 1 }, { a: 2 })
  t.alike(result.a, { oldValue: 1, newValue: 2 })
})

test('getJsonChanges detects added key', (t) => {
  const result = getJsonChanges({}, { b: 'new' })
  t.alike(result.b, { oldValue: undefined, newValue: 'new' })
})

test('getJsonChanges detects removed key', (t) => {
  const result = getJsonChanges({ b: 'old' }, {})
  t.alike(result.b, { oldValue: 'old', newValue: undefined })
})

test('getJsonChanges detects nested object change', (t) => {
  const result = getJsonChanges({ a: { x: 1 } }, { a: { x: 2 } })
  t.alike(result['a.x'], { oldValue: 1, newValue: 2 })
})

test('getJsonChanges detects array additions and deletions', (t) => {
  const result = getJsonChanges({ tags: ['a', 'b'] }, { tags: ['b', 'c'] })
  t.alike(result.tags, { additions: ['c'], deletions: ['a'] })
})

test('getJsonChanges returns empty for identical arrays', (t) => {
  const result = getJsonChanges({ tags: ['a'] }, { tags: ['a'] })
  t.alike(result, {})
})

// ---------------------------------------------------------------------------
// aggregateLogs
// ---------------------------------------------------------------------------

test('aggregateLogs returns empty array for empty input', (t) => {
  t.alike(aggregateLogs([], '1H'), [])
})

test('aggregateLogs returns empty array for null input', (t) => {
  t.alike(aggregateLogs(null, '1H'), [])
})

test('aggregateLogs groups logs into time buckets and sums numeric fields', (t) => {
  const now = Date.now()
  const logs = [
    { ts: now, val: 10 },
    { ts: now + 1000, val: 20 }
  ]
  const result = aggregateLogs(logs, '1H')
  t.is(result.length, 1)
  t.is(result[0].val, 30)
})

test('aggregateLogs calculates average when shouldCalculateAvg is true', (t) => {
  const now = Date.now()
  const logs = [
    { ts: now, val: 10 },
    { ts: now + 1000, val: 20 }
  ]
  const result = aggregateLogs(logs, '1H', true)
  t.is(result.length, 1)
  t.is(result[0].val, 15)
})

test('aggregateLogs handles single log in bucket', (t) => {
  const now = Date.now()
  const logs = [{ ts: now, val: 5 }]
  const result = aggregateLogs(logs, '1H')
  t.is(result.length, 1)
  t.is(result[0].val, 5)
})

test('aggregateLogs splits logs across multiple buckets', (t) => {
  const base = 0
  const oneDay = 24 * 60 * 60 * 1000
  const logs = [
    { ts: base, val: 10 },
    { ts: base + oneDay + 1000, val: 20 }
  ]
  const result = aggregateLogs(logs, '1D')
  t.is(result.length, 2)
})

test('aggregateLogs throws for invalid groupRange format', (t) => {
  const logs = [{ ts: Date.now(), val: 1 }]
  t.exception(() => aggregateLogs(logs, 'INVALID'), /ERR_INVALID_GROUP_RANGE_FORMAT/)
})

// ---------------------------------------------------------------------------
// getThingSorter
// ---------------------------------------------------------------------------

test('getThingSorter returns 1 when sortBy is empty', (t) => {
  t.is(getThingSorter({ a: 1 }, { a: 2 }, {}), 1)
})

test('getThingSorter sorts ascending by numeric string', (t) => {
  const a = { code: 'THG-0001' }
  const b = { code: 'THG-0002' }
  const result = getThingSorter(a, b, { code: 1 })
  t.ok(result < 0, 'a should sort before b')
})

test('getThingSorter sorts descending', (t) => {
  const a = { code: 'THG-0001' }
  const b = { code: 'THG-0002' }
  const result = getThingSorter(a, b, { code: -1 })
  t.ok(result > 0, 'a should sort after b in descending order')
})

test('getThingSorter handles undefined values by putting them last', (t) => {
  const a = { code: undefined }
  const b = { code: 'THG-0001' }
  const result = getThingSorter(a, b, { code: 1 })
  t.ok(result > 0, 'undefined sorts after defined')
})

test('getThingSorter handles nested dot paths', (t) => {
  const a = { info: { pos: 'A1' } }
  const b = { info: { pos: 'B1' } }
  const result = getThingSorter(a, b, { 'info.pos': 1 })
  t.ok(result < 0, 'A1 sorts before B1')
})

// ---------------------------------------------------------------------------
// applyFilters
// ---------------------------------------------------------------------------

const things = [
  { id: '1', info: { name: 'Alpha' }, tags: ['t-a'] },
  { id: '2', info: { name: 'Beta' }, tags: ['t-b'] },
  { id: '3', info: { name: 'Gamma' }, tags: ['t-a'] }
]

test('applyFilters with no filters returns all ids', (t) => {
  const result = applyFilters(things, {})
  t.alike(result.sort(), ['1', '2', '3'])
})

test('applyFilters filters by query', (t) => {
  const result = applyFilters(things, { query: { 'info.name': 'Beta' } })
  t.alike(result, ['2'])
})

test('applyFilters returns objects when returnObjects is true', (t) => {
  const result = applyFilters(things, { query: { 'info.name': 'Alpha' } }, true)
  t.is(result.length, 1)
  t.is(result[0].id, '1')
})

test('applyFilters respects limit', (t) => {
  const result = applyFilters(things, { limit: 2 })
  t.is(result.length, 2)
})

test('applyFilters respects offset', (t) => {
  const result = applyFilters(things, { offset: 1, limit: 10 })
  t.is(result.length, 2)
})

test('applyFilters applies sort', (t) => {
  const result = applyFilters(things, { sort: { 'info.name': -1 } })
  t.is(result[0], '3') // Gamma first in descending order
})

test('applyFilters with $in query', (t) => {
  const result = applyFilters(things, { query: { id: { $in: ['1', '3'] } } })
  t.alike(result.sort(), ['1', '3'])
})

// ---------------------------------------------------------------------------
// projection
// ---------------------------------------------------------------------------

test('projection selects specified fields', (t) => {
  const data = [{ a: 1, b: 2, c: 3 }]
  const result = projection(data, { a: 1 })
  t.ok(result[0].a !== undefined)
})

test('projection returns all fields for empty projection', (t) => {
  const data = [{ a: 1, b: 2 }]
  const result = projection(data, {})
  t.ok(result[0].a !== undefined)
  t.ok(result[0].b !== undefined)
})
