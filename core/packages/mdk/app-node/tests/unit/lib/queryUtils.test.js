'use strict'

const test = require('brittle')
const {
  getNestedValue,
  mapFilterFields,
  mapSortFields,
  buildSearchQuery,
  flattenOrkResults,
  sortItems,
  parseRacks,
  paginateResults
} = require('../../../workers/lib/server/lib/queryUtils')

const FIELD_MAP = {
  status: 'last.snap.stats.status',
  hashrate: 'last.snap.stats.hashrate_mhs',
  container: 'info.container',
  ip: 'opts.address'
}

// --- getNestedValue ---

test('getNestedValue - gets simple key', (t) => {
  t.is(getNestedValue({ a: 1 }, 'a'), 1)
  t.pass()
})

test('getNestedValue - gets nested key', (t) => {
  t.is(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c'), 42)
  t.pass()
})

test('getNestedValue - returns undefined for missing path', (t) => {
  t.is(getNestedValue({ a: 1 }, 'a.b.c'), undefined)
  t.pass()
})

test('getNestedValue - handles null object', (t) => {
  t.is(getNestedValue(null, 'a'), undefined)
  t.pass()
})

// --- mapFilterFields ---

test('mapFilterFields - maps simple equality', (t) => {
  const result = mapFilterFields({ status: 'error' }, FIELD_MAP)
  t.is(result['last.snap.stats.status'], 'error')
  t.pass()
})

test('mapFilterFields - maps range operators', (t) => {
  const result = mapFilterFields({ hashrate: { $gt: 0 } }, FIELD_MAP)
  t.ok(result['last.snap.stats.hashrate_mhs'])
  t.is(result['last.snap.stats.hashrate_mhs'].$gt, 0)
  t.pass()
})

test('mapFilterFields - maps $and arrays', (t) => {
  const result = mapFilterFields({
    $and: [
      { status: 'error' },
      { hashrate: { $gt: 0 } }
    ]
  }, FIELD_MAP)
  t.ok(Array.isArray(result.$and))
  t.is(result.$and.length, 2)
  t.ok(result.$and[0]['last.snap.stats.status'])
  t.ok(result.$and[1]['last.snap.stats.hashrate_mhs'])
  t.pass()
})

test('mapFilterFields - maps $or arrays', (t) => {
  const result = mapFilterFields({
    $or: [{ status: 'error' }, { status: 'offline' }]
  }, FIELD_MAP)
  t.ok(Array.isArray(result.$or))
  t.is(result.$or[0]['last.snap.stats.status'], 'error')
  t.is(result.$or[1]['last.snap.stats.status'], 'offline')
  t.pass()
})

test('mapFilterFields - passes through unknown keys', (t) => {
  const result = mapFilterFields({ 'last.snap.model': 'S19XP' }, FIELD_MAP)
  t.is(result['last.snap.model'], 'S19XP')
  t.pass()
})

test('mapFilterFields - handles null/undefined filter', (t) => {
  t.is(mapFilterFields(null, FIELD_MAP), null)
  t.is(mapFilterFields(undefined, FIELD_MAP), undefined)
  t.pass()
})

test('mapFilterFields - handles $in operator in value', (t) => {
  const result = mapFilterFields({ status: { $in: ['error', 'offline'] } }, FIELD_MAP)
  t.ok(result['last.snap.stats.status'].$in)
  t.is(result['last.snap.stats.status'].$in.length, 2)
  t.pass()
})

test('mapFilterFields - handles combined AND/OR', (t) => {
  const result = mapFilterFields({
    container: 'bitdeer-4b',
    $or: [{ status: 'error' }, { status: 'offline' }]
  }, FIELD_MAP)
  t.is(result['info.container'], 'bitdeer-4b')
  t.ok(Array.isArray(result.$or))
  t.pass()
})

// --- mapSortFields ---

test('mapSortFields - maps sort keys', (t) => {
  const result = mapSortFields({ hashrate: -1, status: 1 }, FIELD_MAP)
  t.is(result['last.snap.stats.hashrate_mhs'], -1)
  t.is(result['last.snap.stats.status'], 1)
  t.pass()
})

test('mapSortFields - passes through unknown keys', (t) => {
  const result = mapSortFields({ 'info.pos': 1 }, FIELD_MAP)
  t.is(result['info.pos'], 1)
  t.pass()
})

test('mapSortFields - handles null', (t) => {
  t.is(mapSortFields(null, FIELD_MAP), null)
  t.pass()
})

// --- buildSearchQuery ---

test('buildSearchQuery - builds multi-field OR regex', (t) => {
  const result = buildSearchQuery('192.168', ['id', 'opts.address', 'code'])
  t.ok(result.$or)
  t.is(result.$or.length, 3)
  t.is(result.$or[0].id.$regex, '192.168')
  t.is(result.$or[0].id.$options, 'i')
  t.is(result.$or[1]['opts.address'].$regex, '192.168')
  t.pass()
})

// --- flattenOrkResults ---

test('flattenOrkResults - flattens multiple ork arrays', (t) => {
  const results = [[{ id: 'a' }, { id: 'b' }], [{ id: 'c' }]]
  const flat = flattenOrkResults(results)
  t.is(flat.length, 3)
  t.is(flat[0].id, 'a')
  t.is(flat[2].id, 'c')
  t.pass()
})

test('flattenOrkResults - handles empty arrays', (t) => {
  t.is(flattenOrkResults([]).length, 0)
  t.is(flattenOrkResults([[], []]).length, 0)
  t.pass()
})

test('flattenOrkResults - handles non-array ork results', (t) => {
  const results = [{ error: 'timeout' }, [{ id: 'a' }]]
  const flat = flattenOrkResults(results)
  t.is(flat.length, 1)
  t.is(flat[0].id, 'a')
  t.pass()
})

// --- sortItems ---

test('sortItems - sorts ascending', (t) => {
  const items = [{ v: 3 }, { v: 1 }, { v: 2 }]
  sortItems(items, { v: 1 })
  t.is(items[0].v, 1)
  t.is(items[1].v, 2)
  t.is(items[2].v, 3)
  t.pass()
})

test('sortItems - sorts descending', (t) => {
  const items = [{ v: 1 }, { v: 3 }, { v: 2 }]
  sortItems(items, { v: -1 })
  t.is(items[0].v, 3)
  t.is(items[1].v, 2)
  t.is(items[2].v, 1)
  t.pass()
})

test('sortItems - sorts by nested path', (t) => {
  const items = [
    { a: { b: 3 } },
    { a: { b: 1 } },
    { a: { b: 2 } }
  ]
  sortItems(items, { 'a.b': 1 })
  t.is(items[0].a.b, 1)
  t.is(items[2].a.b, 3)
  t.pass()
})

test('sortItems - handles null sort', (t) => {
  const items = [{ v: 2 }, { v: 1 }]
  sortItems(items, null)
  t.is(items[0].v, 2)
  t.pass()
})

test('sortItems - null values sort last', (t) => {
  const items = [{ v: null }, { v: 2 }, { v: 1 }]
  sortItems(items, { v: 1 })
  t.is(items[0].v, 1)
  t.is(items[1].v, 2)
  t.is(items[2].v, null)
  t.pass()
})

test('sortItems - multi-key sort', (t) => {
  const items = [
    { a: 1, b: 2 },
    { a: 1, b: 1 },
    { a: 2, b: 1 }
  ]
  sortItems(items, { a: 1, b: 1 })
  t.is(items[0].b, 1)
  t.is(items[1].b, 2)
  t.is(items[2].a, 2)
  t.pass()
})

// --- paginateResults ---

test('paginateResults - first page', (t) => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }))
  const result = paginateResults(items, 0, 10)
  t.is(result.data.length, 10)
  t.is(result.totalCount, 100)
  t.is(result.offset, 0)
  t.is(result.limit, 10)
  t.is(result.hasMore, true)
  t.is(result.data[0].id, 0)
  t.pass()
})

test('paginateResults - middle page', (t) => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }))
  const result = paginateResults(items, 20, 10)
  t.is(result.data.length, 10)
  t.is(result.data[0].id, 20)
  t.is(result.offset, 20)
  t.is(result.hasMore, true)
  t.pass()
})

test('paginateResults - last page', (t) => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i }))
  const result = paginateResults(items, 20, 10)
  t.is(result.data.length, 5)
  t.is(result.totalCount, 25)
  t.is(result.hasMore, false)
  t.pass()
})

test('paginateResults - empty results', (t) => {
  const result = paginateResults([], 0, 10)
  t.is(result.data.length, 0)
  t.is(result.totalCount, 0)
  t.is(result.hasMore, false)
  t.pass()
})

test('paginateResults - offset beyond total', (t) => {
  const items = [{ id: 1 }]
  const result = paginateResults(items, 50, 10)
  t.is(result.data.length, 0)
  t.is(result.totalCount, 1)
  t.is(result.hasMore, false)
  t.pass()
})

// ==================== parseRacks Tests ====================

test('parseRacks - parses comma-separated racks', (t) => {
  const result = parseRacks({ query: { racks: 'group-1,group-2,group-3' } })
  t.alike(result, ['group-1', 'group-2', 'group-3'], 'should split on commas')
  t.pass()
})

test('parseRacks - trims whitespace', (t) => {
  const result = parseRacks({ query: { racks: 'group-1 , group-2 , group-3' } })
  t.alike(result, ['group-1', 'group-2', 'group-3'], 'should trim spaces')
  t.pass()
})

test('parseRacks - returns undefined when no racks', (t) => {
  t.is(parseRacks({ query: {} }), undefined, 'missing racks returns undefined')
  t.is(parseRacks({ query: { racks: '' } }), undefined, 'empty string returns undefined')
  t.pass()
})

test('parseRacks - single rack', (t) => {
  const result = parseRacks({ query: { racks: 'group-1' } })
  t.alike(result, ['group-1'], 'single rack returns array with one element')
  t.pass()
})
