'use strict'

const test = require('brittle')
const {
  listThingsRoute,
  listRacksRoute,
  getThingSettings,
  saveThingSettings,
  processThingComment,
  getWorkerConfig,
  getThingConfig
} = require('../../../workers/lib/server/handlers/things.handlers')
const { AUTH_PERMISSIONS, AUTH_LEVELS, COMMENT_ACTION } = require('../../../workers/lib/constants')
const { createMockCtxWithOrks, createMockReq } = require('../helpers/mockHelpers')

test('listThingsRoute - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.is(method, 'listThings', 'should call listThings')
      return []
    }
  )
  const mockReq = createMockReq()

  const result = await listThingsRoute(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('listThingsRoute - with query parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.query, 'should parse query')
      return []
    }
  )
  const mockReq = createMockReq({ query: '{"id":1}' })

  await listThingsRoute(mockCtx, mockReq, {})

  t.pass()
})

test('listThingsRoute - with sort parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.sort, 'should parse sort')
      return []
    }
  )
  const mockReq = createMockReq({ sort: '{"id":1}' })

  await listThingsRoute(mockCtx, mockReq, {})

  t.pass()
})

test('listThingsRoute - with fields parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.fields, 'should parse fields')
      return []
    }
  )
  const mockReq = createMockReq({ fields: '{"id":1}' })

  await listThingsRoute(mockCtx, mockReq, {})

  t.pass()
})

test('listRacksRoute - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.is(method, 'listRacks', 'should call listRacks')
      return []
    }
  )
  const mockReq = createMockReq({ type: 'test-type' })

  const result = await listRacksRoute(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('listRacksRoute - with invalid type', async (t) => {
  const mockReq = createMockReq({ type: 123 })

  try {
    await listRacksRoute({ conf: { orks: [] } }, mockReq, {})
    t.fail('should throw error for invalid type')
  } catch (err) {
    t.is(err.message, 'ERR_TYPE_INVALID', 'should throw ERR_TYPE_INVALID')
  }

  t.pass()
})

test('listRacksRoute - with keys parameter', async (t) => {
  const mockReq = createMockReq({ type: 'test-type', keys: 'test' })

  try {
    await listRacksRoute({ conf: { orks: [] } }, mockReq, {})
    t.fail('should throw error for keys parameter')
  } catch (err) {
    t.is(err.message, 'ERR_KEYS_NOT_ALLOWED', 'should throw ERR_KEYS_NOT_ALLOWED')
  }

  t.pass()
})

test('getThingSettings - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, payload) => {
      t.is(method, 'getWrkSettings', 'should call getWrkSettings')
      return { success: true }
    }
  )
  const mockReq = createMockReq({ rackId: 'rack1' })

  const result = await getThingSettings(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].success, 'should return success result')

  t.pass()
})

test('getThingSettings - with error response', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => ({ error: 'test error' })
  )
  const mockReq = createMockReq({ rackId: 'rack1' })

  const result = await getThingSettings(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].error, 'should return error result')

  t.pass()
})

test('saveThingSettings - basic functionality', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async (token) => {
        return { write: true }
      }
    },
    ...createMockCtxWithOrks(
      [{ rpcPublicKey: 'key1' }],
      async (key, method, payload) => {
        t.is(method, 'saveWrkSettings', 'should call saveWrkSettings')
        return { success: true }
      }
    )
  }
  const mockReq = createMockReq(
    {},
    { rackId: 'rack1', entries: {} },
    { authToken: 'token' }
  )

  const result = await saveThingSettings(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].success, 'should return success result')

  t.pass()
})

test('saveThingSettings - without write permission', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async (token) => {
        return { write: false }
      }
    }
  }
  const mockReq = createMockReq({}, {}, { authToken: 'token' })

  try {
    await saveThingSettings(mockCtx, mockReq, {})
    t.fail('should throw error for missing write permission')
  } catch (err) {
    t.is(err.message, 'ERR_WRITE_PERM_REQUIRED', 'should throw ERR_WRITE_PERM_REQUIRED')
  }

  t.pass()
})

test('processThingComment - add comment', async (t) => {
  const mockCtx = {
    authLib: {
      tokenHasPerms: async (token, write, perms) => {
        const expectedPerm = `${AUTH_PERMISSIONS.COMMENTS}:${AUTH_LEVELS.WRITE}`
        t.is(perms[0], expectedPerm, 'should check comments permission')
        return true
      }
    },
    ...createMockCtxWithOrks(
      [{ rpcPublicKey: 'key1' }],
      async (key, method, payload) => {
        t.is(method, COMMENT_ACTION.ADD, 'should call ADD action')
        return { success: true }
      }
    )
  }
  const mockReq = createMockReq(
    {},
    {
      id: 'comment1',
      rackId: 'rack1',
      thingId: 'thing1',
      pos: { x: 0, y: 0 },
      ts: 1234567890,
      comment: 'test comment'
    },
    {
      authToken: 'token',
      user: {
        metadata: {
          email: 'user@example.com'
        }
      }
    }
  )

  const result = await processThingComment(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].success, 'should return success result')

  t.pass()
})

test('processThingComment - without permission', async (t) => {
  const mockCtx = {
    authLib: {
      tokenHasPerms: async () => false
    }
  }
  const mockReq = createMockReq(
    {},
    {},
    {
      authToken: 'token',
      user: {
        metadata: {
          email: 'user@example.com'
        }
      }
    }
  )

  try {
    await processThingComment(mockCtx, mockReq)
    t.fail('should throw error for missing permission')
  } catch (err) {
    t.is(err.message, 'ERR_WRITE_PERM_REQUIRED', 'should throw ERR_WRITE_PERM_REQUIRED')
  }

  t.pass()
})

test('getWorkerConfig - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.is(method, 'getWrkConf', 'should call getWrkConf')
      return {}
    }
  )
  const mockReq = createMockReq()

  const result = await getWorkerConfig(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('getWorkerConfig - with fields parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.ok(query.fields, 'should parse fields')
      return {}
    }
  )
  const mockReq = createMockReq({ fields: '{"id":1}' })

  await getWorkerConfig(mockCtx, mockReq, {})

  t.pass()
})

test('getThingConfig - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, query) => {
      t.is(method, 'getThingConf', 'should call getThingConf')
      return {}
    }
  )
  const mockReq = createMockReq()

  const result = await getThingConfig(mockCtx, mockReq, {})

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})
