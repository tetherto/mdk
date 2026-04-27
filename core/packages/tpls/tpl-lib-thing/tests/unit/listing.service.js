'use strict'

const test = require('brittle')
const ListingService = require('../../lib/services/listing.service')

function makeService (things = {}, { rackId = 'rack-1', selectThingInfo = () => ({}) } = {}) {
  return new ListingService({
    getThings: () => things,
    rackId,
    selectThingInfo
  })
}

const baseThg = {
  id: 'thg-1',
  code: 'THG-0001',
  type: 'thing',
  tags: ['t-thing'],
  info: { name: 'Alpha', pos: 'A1' },
  comments: [],
  last: { snap: { success: true } }
}

// ---------------------------------------------------------------------------
// prepThingInfo
// ---------------------------------------------------------------------------

test('prepThingInfo returns core fields', (t) => {
  const svc = makeService({ 'thg-1': baseThg })
  const info = svc.prepThingInfo(baseThg)
  t.is(info.id, 'thg-1')
  t.is(info.code, 'THG-0001')
  t.is(info.type, 'thing')
  t.alike(info.tags, baseThg.tags)
  t.alike(info.info, baseThg.info)
  t.is(info.rack, 'rack-1')
  t.alike(info.comments, [])
})

test('prepThingInfo omits last when opts.status is falsy', (t) => {
  const svc = makeService()
  const info = svc.prepThingInfo(baseThg)
  t.absent(Object.prototype.hasOwnProperty.call(info, 'last'))
})

test('prepThingInfo includes last when opts.status is true', (t) => {
  const svc = makeService()
  const info = svc.prepThingInfo(baseThg, { status: true })
  t.alike(info.last, baseThg.last)
})

test('prepThingInfo merges extra fields from selectThingInfo', (t) => {
  const svc = makeService({}, { selectThingInfo: () => ({ extra: 42 }) })
  const info = svc.prepThingInfo(baseThg)
  t.is(info.extra, 42)
})

// ---------------------------------------------------------------------------
// filterThings
// ---------------------------------------------------------------------------

const thingsMap = {
  'thg-1': { id: 'thg-1', code: 'A-0001', type: 'thing', tags: ['t-a'], info: { name: 'Alpha' }, comments: [], last: {} },
  'thg-2': { id: 'thg-2', code: 'A-0002', type: 'thing', tags: ['t-b'], info: { name: 'Beta' }, comments: [], last: {} },
  'thg-3': { id: 'thg-3', code: 'A-0003', type: 'thing', tags: ['t-a'], info: { name: 'Gamma' }, comments: [], last: {} }
}

test('filterThings with empty req returns all ids', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.filterThings({})
  t.alike(result.sort(), ['thg-1', 'thg-2', 'thg-3'])
})

test('filterThings with query filters correctly', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.filterThings({ query: { 'info.name': 'Beta' } })
  t.alike(result, ['thg-2'])
})

test('filterThings returns objects when returnObjects is true', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.filterThings({ query: { 'info.name': 'Alpha' } }, true)
  t.is(result.length, 1)
  t.is(result[0].id, 'thg-1')
})

test('filterThings respects limit', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.filterThings({ limit: 1 })
  t.is(result.length, 1)
})

test('filterThings respects offset', (t) => {
  const svc = makeService(thingsMap)
  const all = svc.filterThings({})
  const paged = svc.filterThings({ offset: 1, limit: 100 })
  t.is(paged.length, all.length - 1)
})

// ---------------------------------------------------------------------------
// listThings
// ---------------------------------------------------------------------------

test('listThings returns default limit of 100', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.listThings({})
  t.ok(result.length <= 100)
  t.is(result.length, Object.keys(thingsMap).length)
})

test('listThings maps things to prepThingInfo shape', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.listThings({})
  t.ok(result.every(item => 'id' in item && 'rack' in item))
})

test('listThings passes status option to prepThingInfo', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.listThings({ status: true })
  t.ok(result.every(item => 'last' in item))
})

test('listThings with limit 1 returns only one item', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.listThings({ limit: 1 })
  t.is(result.length, 1)
})

test('listThings filters by query', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.listThings({ query: { 'info.name': 'Gamma' } })
  t.is(result.length, 1)
  t.is(result[0].id, 'thg-3')
})

test('listThings returns empty array when no things match', (t) => {
  const svc = makeService(thingsMap)
  const result = svc.listThings({ query: { 'info.name': 'nonexistent' } })
  t.alike(result, [])
})
