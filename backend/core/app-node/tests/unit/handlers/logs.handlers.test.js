'use strict'

const test = require('brittle')
const {
  tailLogRoute,
  tailLogMultiRoute,
  tailLogRangeAggrRoute,
  getHistoryLogRoute
} = require('../../../workers/lib/server/handlers/logs.handlers')
const { createMockCtxWithOrks, createMockReq } = require('../helpers/mockHelpers')

test('tailLogRoute - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [
      { rpcPublicKey: 'key1' },
      { rpcPublicKey: 'key2' }
    ],
    async (key, method, query) => {
      t.is(method, 'tailLog', 'should call tailLog')
      return [{ id: 1 }]
    }
  )
  const mockReq = createMockReq()

  const result = await tailLogRoute(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should merge logs')

  t.pass()
})

test('tailLogRoute - with fields parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.fields, 'should parse fields')
      return []
    }
  )
  const mockReq = createMockReq({ fields: '{"id":1,"name":1}' })

  await tailLogRoute(mockCtx, mockReq, {})

  t.pass()
})

test('tailLogRoute - with aggrFields parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.aggrFields, 'should parse aggrFields')
      return []
    }
  )
  const mockReq = createMockReq({ aggrFields: '{"field1":1}' })

  await tailLogRoute(mockCtx, mockReq, {})

  t.pass()
})

test('tailLogRoute - with aggrTimes parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(Array.isArray(query.aggrTimes), 'should parse aggrTimes as array')
      return []
    }
  )
  const mockReq = createMockReq({ aggrTimes: '[1,2,3]' })

  await tailLogRoute(mockCtx, mockReq, {})

  t.pass()
})

test('tailLogRoute - with invalid aggrTimes (not array)', async (t) => {
  const mockReq = createMockReq({ aggrTimes: '{"not":"array"}' })

  try {
    await tailLogRoute({ conf: { orks: [] } }, mockReq, {})
    t.fail('should throw error for invalid aggrTimes')
  } catch (err) {
    t.is(err.message, 'ERR_AGGRTIMES_INVALID_ARRAY', 'should throw ERR_AGGRTIMES_INVALID_ARRAY')
  }

  t.pass()
})

test('tailLogMultiRoute - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.is(method, 'tailLogMulti', 'should call tailLogMulti')
      return []
    }
  )
  const mockReq = createMockReq()

  const result = await tailLogMultiRoute(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('tailLogMultiRoute - with keys parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(Array.isArray(query.keys), 'should parse keys as array')
      return []
    }
  )
  const mockReq = createMockReq({ keys: '["key1","key2"]' })

  await tailLogMultiRoute(mockCtx, mockReq, {})

  t.pass()
})

test('tailLogMultiRoute - with invalid keys (not array)', async (t) => {
  const mockReq = createMockReq({ keys: '{"not":"array"}' })

  try {
    await tailLogMultiRoute({ conf: { orks: [] } }, mockReq, {})
    t.fail('should throw error for invalid keys')
  } catch (err) {
    t.is(err.message, 'ERR_KEYS_INVALID_ARRAY', 'should throw ERR_KEYS_INVALID_ARRAY')
  }

  t.pass()
})

test('tailLogMultiRoute - with fields and aggrFields', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.fields, 'should parse fields')
      t.ok(query.aggrFields, 'should parse aggrFields')
      return []
    }
  )
  const mockReq = createMockReq({ fields: '{"id":1}', aggrFields: '{"field1":1}' })

  await tailLogMultiRoute(mockCtx, mockReq, {})

  t.pass()
})

test('tailLogMultiRoute - with invalid aggrTimes', async (t) => {
  const mockReq = createMockReq({ aggrTimes: '{"not":"array"}' })

  try {
    await tailLogMultiRoute({ conf: { orks: [] } }, mockReq, {})
    t.fail('should throw error for invalid aggrTimes')
  } catch (err) {
    t.is(err.message, 'ERR_AGGRTIMES_INVALID_ARRAY', 'should throw ERR_AGGRTIMES_INVALID_ARRAY')
  }

  t.pass()
})

test('tailLogRangeAggrRoute - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.is(method, 'tailLogCustomRangeAggr', 'should call tailLogCustomRangeAggr')
      return []
    }
  )
  const mockReq = createMockReq()

  const result = await tailLogRangeAggrRoute(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('getHistoryLogRoute - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [
      { rpcPublicKey: 'key1' },
      { rpcPublicKey: 'key2' }
    ],
    async (key, method, query) => {
      t.is(method, 'getHistoricalLogs', 'should call getHistoricalLogs')
      return [{ id: 1 }]
    }
  )
  const mockReq = createMockReq()

  const result = await getHistoryLogRoute(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should merge logs')

  t.pass()
})

test('getHistoryLogRoute - with fields parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.fields, 'should parse fields')
      return []
    }
  )
  const mockReq = createMockReq({ fields: '{"id":1}' })

  await getHistoryLogRoute(mockCtx, mockReq)

  t.pass()
})

test('getHistoryLogRoute - with query parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.query, 'should parse query')
      return []
    }
  )
  const mockReq = createMockReq({ query: '{"id":1}' })

  await getHistoryLogRoute(mockCtx, mockReq)

  t.pass()
})
