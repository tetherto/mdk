'use strict'

const test = require('brittle')
const {
  getContainers,
  getCabinets,
  getCabinetById,
  groupIntoCabinets,
  buildMingoFilter,
  queryAndPaginate
} = require('../../../workers/lib/server/handlers/devices.handlers')
const { flattenRpcResults } = require('../../../workers/lib/utils')
const { createMockCtxWithOrks } = require('../helpers/mockHelpers')

test('flattenRpcResults - flattens multi-ork arrays', (t) => {
  const results = [
    [{ id: 'm1', ip: '10.0.0.1' }, { id: 'm2', ip: '10.0.0.2' }],
    [{ id: 'm3', ip: '10.0.0.3' }]
  ]
  const items = flattenRpcResults(results)
  t.is(items.length, 3, 'should flatten all items')
  t.pass()
})

test('flattenRpcResults - deduplicates by id', (t) => {
  const results = [
    [{ id: 'm1', ip: '10.0.0.1' }],
    [{ id: 'm1', ip: '10.0.0.1' }]
  ]
  const items = flattenRpcResults(results)
  t.is(items.length, 1, 'should deduplicate by id')
  t.pass()
})

test('flattenRpcResults - handles error results', (t) => {
  const results = [{ error: 'timeout' }, [{ id: 'm1' }]]
  const items = flattenRpcResults(results)
  t.is(items.length, 1, 'should skip error results')
  t.pass()
})

test('flattenRpcResults - handles null input', (t) => {
  const items = flattenRpcResults(null)
  t.is(items.length, 0, 'should return empty array')
  t.pass()
})

test('flattenRpcResults - handles empty input', (t) => {
  const items = flattenRpcResults([])
  t.is(items.length, 0, 'should return empty array')
  t.pass()
})

test('flattenRpcResults - handles nested data property', (t) => {
  const results = [
    { data: [{ id: 'm1' }, { id: 'm2' }] }
  ]
  const items = flattenRpcResults(results)
  t.is(items.length, 2, 'should extract from data property')
  t.pass()
})

test('buildMingoFilter - no filter no search returns empty object', (t) => {
  const result = buildMingoFilter(null, null)
  t.alike(result, {}, 'should return empty object')
  t.pass()
})

test('buildMingoFilter - filter only returns filter as-is', (t) => {
  const filter = { type: 's19' }
  const result = buildMingoFilter(filter, null)
  t.alike(result, filter, 'should return filter directly')
  t.pass()
})

test('buildMingoFilter - search only returns $or filter', (t) => {
  const result = buildMingoFilter(null, 'alpha')
  t.ok(result.$or, 'should have $or')
  t.is(result.$or.length, 2, 'should have 2 search conditions')
  t.pass()
})

test('buildMingoFilter - filter and search combined with $and', (t) => {
  const filter = { $or: [{ type: 's19' }, { type: 's21' }] }
  const result = buildMingoFilter(filter, 'alpha')
  t.ok(result.$and, 'should wrap in $and')
  t.is(result.$and.length, 2, 'should have filter and search')
  t.ok(result.$and[0].$or, 'first should be user filter with $or')
  t.ok(result.$and[1].$or, 'second should be search filter with $or')
  t.pass()
})

test('queryAndPaginate - filters and paginates', (t) => {
  const items = [
    { id: 'm1', type: 's19' },
    { id: 'm2', type: 's21' },
    { id: 'm3', type: 's19' }
  ]
  const result = queryAndPaginate(items, {
    filter: { type: 's19' },
    fields: null,
    sort: null,
    search: null,
    offset: 0,
    limit: 1
  })
  t.is(result.total, 2, 'total should be filtered count')
  t.is(result.page.length, 1, 'page should respect limit')
  t.pass()
})

test('getContainers - happy path', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      { id: 'c1', type: 'bitdeer-d40' },
      { id: 'c2', type: 'antbox-hydro' }
    ]
  )

  const result = await getContainers(mockCtx, { query: {} })
  t.ok(result.containers, 'should return containers array')
  t.is(result.containers.length, 2, 'should have 2 containers')
  t.is(result.total, 2, 'should report total')
  t.pass()
})

test('getContainers - with filter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      { id: 'c1', type: 'bitdeer-d40', status: 'online' },
      { id: 'c2', type: 'antbox-hydro', status: 'offline' }
    ]
  )

  const result = await getContainers(mockCtx, { query: { filter: '{"status":"online"}' } })
  t.is(result.containers.length, 1, 'should filter containers')
  t.is(result.containers[0].status, 'online', 'should match filter')
  t.pass()
})

test('getContainers - empty results', async (t) => {
  const mockCtx = createMockCtxWithOrks([{ rpcPublicKey: 'key1' }], async () => [])

  const result = await getContainers(mockCtx, { query: {} })
  t.is(result.containers.length, 0, 'should return empty array')
  t.is(result.total, 0, 'total should be 0')
  t.pass()
})

test('getCabinets - happy path with grouping', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      { id: 'd1', info: { pos: 'cab-A/slot1' }, tags: ['t-powermeter'] },
      { id: 'd2', info: { pos: 'cab-A/slot2' }, tags: ['t-sensor-temp'] },
      { id: 'd3', info: { pos: 'cab-B/slot1' }, tags: ['t-powermeter'] }
    ]
  )

  const result = await getCabinets(mockCtx, { query: {} })
  t.ok(result.cabinets, 'should return cabinets array')
  t.is(result.cabinets.length, 2, 'should group into 2 cabinets')
  t.is(result.total, 2, 'should report total')

  const cabA = result.cabinets.find(c => c.id === 'cab-A')
  t.ok(cabA, 'should have cab-A')
  t.is(cabA.devices.length, 2, 'cab-A should have 2 devices')
  t.pass()
})

test('getCabinets - empty results', async (t) => {
  const mockCtx = createMockCtxWithOrks([{ rpcPublicKey: 'key1' }], async () => [])

  const result = await getCabinets(mockCtx, { query: {} })
  t.is(result.cabinets.length, 0, 'should return empty array')
  t.is(result.total, 0, 'total should be 0')
  t.pass()
})

test('getCabinets - with pagination', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      { id: 'd1', info: { pos: 'cab-A/slot1' } },
      { id: 'd2', info: { pos: 'cab-B/slot1' } },
      { id: 'd3', info: { pos: 'cab-C/slot1' } }
    ]
  )

  const result = await getCabinets(mockCtx, { query: { offset: '0', limit: '2' } })
  t.is(result.total, 3, 'total should reflect all cabinets')
  t.is(result.cabinets.length, 2, 'should return limited results')
  t.pass()
})

test('getCabinetById - happy path', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      { id: 'd1', info: { pos: 'cab-A/slot1' } },
      { id: 'd2', info: { pos: 'cab-A/slot2' } },
      { id: 'd3', info: { pos: 'cab-B/slot1' } }
    ]
  )

  const result = await getCabinetById(mockCtx, { params: { id: 'cab-A' }, query: {} })
  t.ok(result.cabinet, 'should return cabinet')
  t.is(result.cabinet.id, 'cab-A', 'should match requested id')
  t.is(result.cabinet.devices.length, 2, 'should have 2 devices')
  t.pass()
})

test('getCabinetById - not found', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [{ id: 'd1', info: { pos: 'cab-A/slot1' } }]
  )

  try {
    await getCabinetById(mockCtx, { params: { id: 'nonexistent' }, query: {} })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_CABINET_NOT_FOUND', 'should throw not found error')
    t.is(err.statusCode, 404, 'should have 404 status code')
  }
  t.pass()
})

test('groupIntoCabinets - groups by pos root', (t) => {
  const devices = [
    { id: 'd1', info: { pos: 'cab-A/slot1' } },
    { id: 'd2', info: { pos: 'cab-A/slot2' } },
    { id: 'd3', info: { pos: 'cab-B/slot1' } }
  ]

  const cabinets = groupIntoCabinets(devices)
  t.is(cabinets.length, 2, 'should create 2 groups')

  const cabA = cabinets.find(c => c.id === 'cab-A')
  t.ok(cabA, 'should have cab-A')
  t.is(cabA.devices.length, 2, 'cab-A should have 2 devices')
  t.is(cabA.type, 'cabinet', 'should have type cabinet')
  t.pass()
})

test('groupIntoCabinets - handles devices without pos', (t) => {
  const devices = [
    { id: 'd1' },
    { id: 'd2', info: {} }
  ]

  const cabinets = groupIntoCabinets(devices)
  t.ok(cabinets.length > 0, 'should still group devices')
  t.pass()
})

test('groupIntoCabinets - empty input', (t) => {
  const cabinets = groupIntoCabinets([])
  t.is(cabinets.length, 0, 'should return empty array')
  t.pass()
})
