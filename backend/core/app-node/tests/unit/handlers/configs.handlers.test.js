'use strict'

const test = require('brittle')
const { getConfigs } = require('../../../workers/lib/server/handlers/configs.handlers')
const { RPC_METHODS } = require('../../../workers/lib/constants')
const { createMockCtxWithOrks } = require('../helpers/mockHelpers')

test('getConfigs - happy path', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, payload) => {
      if (method === 'getConfigs') {
        return [
          { id: 'config1', name: 'Pool Config 1', url: 'stratum://pool1.example.com' },
          { id: 'config2', name: 'Pool Config 2', url: 'stratum://pool2.example.com' }
        ]
      }
      if (method === RPC_METHODS.LIST_THINGS) return []
      return []
    }
  )

  const mockReq = {
    params: { type: 'pool' },
    query: {}
  }

  const result = await getConfigs(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should have 2 configs')
  t.is(result[0].id, 'config1', 'should have correct config id')
  t.pass()
})

test('getConfigs - with query filter', async (t) => {
  let capturedPayload = null
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, payload) => {
      if (method === 'getConfigs') capturedPayload = payload
      if (method === 'getConfigs') return [{ id: 'config1', active: true }]
      if (method === RPC_METHODS.LIST_THINGS) return []
      return []
    }
  )

  const mockReq = {
    params: { type: 'pool' },
    query: { query: '{"active":true}' }
  }

  await getConfigs(mockCtx, mockReq)
  t.ok(capturedPayload.query, 'should pass query in payload')
  t.is(capturedPayload.query.active, true, 'should parse query JSON correctly')
  t.pass()
})

test('getConfigs - with fields projection', async (t) => {
  let capturedPayload = null
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, payload) => {
      if (method === 'getConfigs') capturedPayload = payload
      if (method === 'getConfigs') return [{ name: 'Config 1' }]
      if (method === RPC_METHODS.LIST_THINGS) return []
      return []
    }
  )

  const mockReq = {
    params: { type: 'pool' },
    query: { fields: '{"name":1,"url":1}' }
  }

  await getConfigs(mockCtx, mockReq)
  t.ok(capturedPayload.fields, 'should pass fields in payload')
  t.is(capturedPayload.fields.name, 1, 'should parse fields JSON correctly')
  t.is(capturedPayload.fields.url, 1, 'should include url field')
  t.pass()
})

test('getConfigs - with both query and fields', async (t) => {
  let capturedPayload = null
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, payload) => {
      if (method === 'getConfigs') capturedPayload = payload
      if (method === 'getConfigs') return [{ name: 'Config 1' }]
      if (method === RPC_METHODS.LIST_THINGS) return []
      return []
    }
  )

  const mockReq = {
    params: { type: 'pool' },
    query: {
      query: '{"active":true}',
      fields: '{"name":1}'
    }
  }

  await getConfigs(mockCtx, mockReq)
  t.ok(capturedPayload.query, 'should pass query in payload')
  t.ok(capturedPayload.fields, 'should pass fields in payload')
  t.is(capturedPayload.type, 'pool', 'should pass type in payload')
  t.pass()
})

test('getConfigs - invalid config type throws', async (t) => {
  const mockCtx = createMockCtxWithOrks([], async () => ([]))

  const mockReq = {
    params: { type: 'invalid_type' },
    query: {}
  }

  try {
    await getConfigs(mockCtx, mockReq)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_CONFIG_TYPE_INVALID', 'should throw config type invalid error')
  }
  t.pass()
})

test('getConfigs - missing config type throws', async (t) => {
  const mockCtx = createMockCtxWithOrks([], async () => ([]))

  const mockReq = {
    params: {},
    query: {}
  }

  try {
    await getConfigs(mockCtx, mockReq)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_CONFIG_TYPE_INVALID', 'should throw config type invalid error')
  }
  t.pass()
})

test('getConfigs - invalid query JSON throws', async (t) => {
  const mockCtx = createMockCtxWithOrks([{ rpcPublicKey: 'key1' }], async () => ([]))

  const mockReq = {
    params: { type: 'pool' },
    query: { query: 'not valid json' }
  }

  try {
    await getConfigs(mockCtx, mockReq)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_QUERY_INVALID_JSON', 'should throw query invalid JSON error')
  }
  t.pass()
})

test('getConfigs - invalid fields JSON throws', async (t) => {
  const mockCtx = createMockCtxWithOrks([{ rpcPublicKey: 'key1' }], async () => ([]))

  const mockReq = {
    params: { type: 'pool' },
    query: { fields: '{invalid}' }
  }

  try {
    await getConfigs(mockCtx, mockReq)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_FIELDS_INVALID_JSON', 'should throw fields invalid JSON error')
  }
  t.pass()
})

test('getConfigs - empty ork results', async (t) => {
  const mockCtx = createMockCtxWithOrks([{ rpcPublicKey: 'key1' }], async () => ([]))

  const mockReq = {
    params: { type: 'pool' },
    query: {}
  }

  const result = await getConfigs(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 0, 'should be empty')
  t.pass()
})

test('getConfigs - handles error results from orks', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => ({ error: 'timeout' })
  )

  const mockReq = {
    params: { type: 'pool' },
    query: {}
  }

  const result = await getConfigs(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 0, 'should be empty when ork returns error')
  t.pass()
})

test('getConfigs - aggregates results from multiple orks', async (t) => {
  let callCount = 0
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }, { rpcPublicKey: 'key2' }],
    async (key, method) => {
      callCount++
      if (method === 'getConfigs') return [{ id: `config${callCount}`, name: `Config ${callCount}` }]
      if (method === RPC_METHODS.LIST_THINGS) return []
      return []
    }
  )

  const mockReq = {
    params: { type: 'pool' },
    query: {}
  }

  const result = await getConfigs(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should aggregate results from both orks')
  t.pass()
})
