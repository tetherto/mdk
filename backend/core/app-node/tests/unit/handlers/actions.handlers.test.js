'use strict'

const test = require('brittle')

const {
  queryActionsBatch,
  queryActions,
  getAction,
  pushAction,
  pushActionsBatch,
  voteAction,
  cancelActionsBatch
} = require('../../../workers/lib/server/handlers/actions.handlers')
const { createMockCtxWithOrks, createMockReq, withDataProxy } = require('../helpers/mockHelpers')

test('queryActionsBatch - basic functionality', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [
      { rpcPublicKey: 'key1' },
      { rpcPublicKey: 'key2' }
    ],
    async (key, method, payload, opts) => {
      return [{ id: 'action1', result: 'success' }]
    }
  )

  const mockReq = createMockReq({ ids: 'id1,id2,id3' })

  const result = await queryActionsBatch(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result.length > 0, 'should have results')

  t.pass()
})

test('queryActionsBatch - handles errors gracefully', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => {
      throw new Error('Network error')
    }
  )

  const mockReq = createMockReq({ ids: 'id1' })

  const result = await queryActionsBatch(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array even on error')
  t.is(result.length, 0, 'should return empty array on error')

  t.pass()
})

test('queryActions - with queries parameter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async (key, method, payload, opts) => {
      return { actions: [] }
    }
  )

  const mockReq = createMockReq({ queries: '[{"type": "voting", "query": {"status": "pending"}}]' })

  const result = await queryActions(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('queryActions - with invalid queries JSON', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: []
    },
    net_r0: {
      jRequest: async () => ({})
    }
  })

  const mockReq = {
    query: { queries: 'invalid-json' }
  }

  try {
    await queryActions(mockCtx, mockReq)
    t.fail('should throw error for invalid JSON')
  } catch (err) {
    t.is(err.message, 'ERR_QUERIES_INVALID_JSON', 'should throw ERR_QUERIES_INVALID_JSON')
  }

  t.pass()
})

test('queryActions - with groupBatch parameter', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    net_r0: {
      jRequest: async (key, method, payload, opts) => {
        return { actions: [] }
      }
    }
  })

  const mockReq = {
    query: { groupBatch: 'true' }
  }

  const result = await queryActions(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')

  t.pass()
})

test('queryActions - handles network errors', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    net_r0: {
      jRequest: async () => {
        throw new Error('Network error')
      }
    }
  })

  const mockReq = {
    query: {}
  }

  const result = await queryActions(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].error, 'should include error in result')

  t.pass()
})

test('getAction - basic functionality', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    net_r0: {
      jRequest: async (key, method, payload, opts) => {
        return { id: payload.id, type: payload.type }
      }
    }
  })

  const mockReq = {
    params: { id: 'action123', type: 'test' }
  }

  const result = await getAction(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].id === 'action123', 'should return correct action id')

  t.pass()
})

test('getAction - handles errors', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    net_r0: {
      jRequest: async () => {
        throw new Error('Action not found')
      }
    }
  })

  const mockReq = {
    params: { id: 'nonexistent', type: 'test' }
  }

  const result = await getAction(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].error, 'should include error in result')

  t.pass()
})

test('pushAction - requires write permission', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async () => ({ write: false, permissions: [] })
    }
  }

  const mockReq = {
    _info: { authToken: 'token123' }
  }

  try {
    await pushAction(mockCtx, mockReq)
    t.fail('should throw error for missing write permission')
  } catch (err) {
    t.is(err.message, 'ERR_WRITE_PERM_REQUIRED', 'should throw ERR_WRITE_PERM_REQUIRED')
  }

  t.pass()
})

test('pushAction - with valid permissions', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    authLib: {
      getTokenPerms: async () => ({
        write: true,
        permissions: ['actions:write']
      })
    },
    net_r0: {
      jRequest: async (key, method, payload, opts) => {
        return { id: 'new-action', success: true }
      }
    }
  })

  const mockReq = {
    _info: {
      authToken: 'token123',
      user: { metadata: { email: 'test@example.com' } }
    },
    body: {
      query: { status: 'pending' },
      action: 'test-action',
      params: { test: 'value' }
    }
  }

  const result = await pushAction(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].id === 'new-action', 'should return new action id')

  t.pass()
})

test('pushActionsBatch - requires write permission', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async () => ({ write: false, permissions: [] })
    }
  }

  const mockReq = {
    _info: { authToken: 'token123' }
  }

  try {
    await pushActionsBatch(mockCtx, mockReq)
    t.fail('should throw error for missing write permission')
  } catch (err) {
    t.is(err.message, 'ERR_WRITE_PERM_REQUIRED', 'should throw ERR_WRITE_PERM_REQUIRED')
  }

  t.pass()
})

test('pushActionsBatch - validates batchActionsPayload array', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async () => ({ write: true, permissions: [] })
    }
  }

  const mockReq = {
    _info: {
      authToken: 'token123',
      user: { metadata: { email: 'test@example.com' } }
    },
    body: {
      batchActionsPayload: 'not-an-array'
    }
  }

  try {
    await pushActionsBatch(mockCtx, mockReq)
    t.fail('should throw error for invalid batchActionsPayload')
  } catch (err) {
    t.is(err.message, 'ERR_BATCH_ACTIONS_PAYLOAD_INVALID_ARRAY', 'should throw ERR_BATCH_ACTIONS_PAYLOAD_INVALID_ARRAY')
  }

  t.pass()
})

test('pushActionsBatch - with valid data', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    authLib: {
      getTokenPerms: async () => ({
        write: true,
        permissions: ['actions:write']
      })
    },
    net_r0: {
      jRequest: async (key, method, payload, opts) => {
        return { id: 'batch-action', success: true }
      }
    }
  })

  const mockReq = {
    _info: {
      authToken: 'token123',
      user: { metadata: { email: 'test@example.com' } }
    },
    body: {
      batchActionsPayload: [{ action: 'test1' }, { action: 'test2' }],
      batchActionUID: 'batch-123'
    }
  }

  const result = await pushActionsBatch(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].id === 'batch-action', 'should return batch action id')

  t.pass()
})

test('voteAction - requires write permission', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async () => ({ write: false, caps: [] })
    }
  }

  const mockReq = {
    _info: { authToken: 'token123' }
  }

  try {
    await voteAction(mockCtx, mockReq)
    t.fail('should throw error for missing write permission')
  } catch (err) {
    t.is(err.message, 'ERR_WRITE_PERM_REQUIRED', 'should throw ERR_WRITE_PERM_REQUIRED')
  }

  t.pass()
})

test('voteAction - with valid permissions', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    authLib: {
      getTokenPerms: async () => ({
        write: true,
        caps: ['actions:vote']
      })
    },
    net_r0: {
      jRequest: async (key, method, payload, opts) => {
        return { success: true, vote: payload.approve }
      }
    }
  })

  const mockReq = {
    _info: {
      authToken: 'token123',
      user: { metadata: { email: 'test@example.com' } }
    },
    params: { id: 'action123' },
    body: { approve: true }
  }

  const result = await voteAction(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].res.success === true, 'should return successful vote')

  t.pass()
})

test('cancelActionsBatch - requires write permission', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async () => ({ write: false })
    }
  }

  const mockReq = {
    _info: { authToken: 'token123' }
  }

  try {
    await cancelActionsBatch(mockCtx, mockReq)
    t.fail('should throw error for missing write permission')
  } catch (err) {
    t.is(err.message, 'ERR_WRITE_PERM_REQUIRED', 'should throw ERR_WRITE_PERM_REQUIRED')
  }

  t.pass()
})

test('cancelActionsBatch - with valid permissions', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    authLib: {
      getTokenPerms: async () => ({ write: true })
    },
    net_r0: {
      jRequest: async (key, method, payload, opts) => {
        return { success: true, cancelled: payload.ids }
      }
    }
  })

  const mockReq = {
    _info: {
      authToken: 'token123',
      user: { metadata: { email: 'test@example.com' } }
    },
    query: { ids: 'action1,action2' }
  }

  const result = await cancelActionsBatch(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].res.success === true, 'should return successful cancellation')

  t.pass()
})

test('cancelActionsBatch - handles errors', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [
        { rpcPublicKey: 'key1' }
      ]
    },
    authLib: {
      getTokenPerms: async () => ({ write: true })
    },
    net_r0: {
      jRequest: async () => {
        throw new Error('Cancellation failed')
      }
    }
  })

  const mockReq = {
    _info: {
      authToken: 'token123',
      user: { metadata: { email: 'test@example.com' } }
    },
    query: { ids: 'action1' }
  }

  const result = await cancelActionsBatch(mockCtx, mockReq)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(result[0].res.success === false, 'should return failed cancellation')
  t.ok(result[0].res.error, 'should include error message')

  t.pass()
})
