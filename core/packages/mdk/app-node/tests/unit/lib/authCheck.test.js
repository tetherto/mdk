'use strict'

const test = require('brittle')
const LRU = require('lru')
const { authCheck } = require('../../../workers/lib/server/lib/authCheck')

test('authCheck - noAuth mode', async (t) => {
  const mockCtx = {
    noAuth: true
  }

  const mockReq = {
    _info: {}
  }

  await authCheck(mockCtx, mockReq, {})
  t.pass()
})

test('authCheck - missing token', async (t) => {
  const mockCtx = {
    noAuth: false
  }

  const mockReq = {
    headers: {},
    _info: {}
  }

  const mockRep = {
    status: function (code) {
      t.is(code, 401, 'should return 401 status')
      return this
    },
    send: function (data) {
      t.is(data.message, 'ERR_AUTH_FAIL', 'should return ERR_AUTH_FAIL')
      return this
    }
  }

  await authCheck(mockCtx, mockReq, mockRep)
  t.pass()
})

test('authCheck - token from query', async (t) => {
  const mockCtx = {
    noAuth: false,
    conf: {
      ttl: 3600
    },
    authLib: {
      resolveToken: async (token, ips) => {
        t.is(token, 'query-token', 'should use token from query')
        return { userId: 'test-user' }
      }
    }
  }

  const mockReq = {
    headers: {},
    ip: '127.0.0.1',
    _info: {}
  }

  const mockRep = {}

  await authCheck(mockCtx, mockReq, mockRep, 'query-token')
  t.is(mockReq._info.user.userId, 'test-user', 'should set user in req._info')
  t.pass()
})

test('authCheck - cached token', async (t) => {
  const mockCtx = {
    noAuth: false,
    conf: {
      ttl: 3600
    },
    lru_1m: new Map(),
    authLib: {
      resolveToken: async (token, ips) => {
        t.is(token, 'cached-token', 'should use cached token')
        return { userId: 'test-user' }
      }
    }
  }

  const mockReq = {
    headers: {
      authorization: 'Bearer cached-token'
    },
    ip: '127.0.0.1',
    _info: {}
  }

  const mockRep = {}

  // First call to populate cache
  await authCheck(mockCtx, mockReq, mockRep)

  // Second call should use cache (authLib.resolveToken should not be called)
  let resolveTokenCalled = false
  mockCtx.authLib.resolveToken = async () => {
    resolveTokenCalled = true
    return { userId: 'test-user' }
  }

  const mockReq2 = {
    headers: {
      authorization: 'Bearer cached-token'
    },
    ip: '127.0.0.1',
    _info: {}
  }

  await authCheck(mockCtx, mockReq2, mockRep)
  t.ok(!resolveTokenCalled, 'should use cache and not call resolveToken')
  t.pass()
})

test('authCheck - resolveToken returns null', async (t) => {
  const mockCtx = {
    noAuth: false,
    conf: {
      ttl: 3600
    },
    authLib: {
      resolveToken: async () => null
    }
  }

  const mockReq = {
    headers: {
      authorization: 'Bearer invalid-token'
    },
    ip: '127.0.0.1',
    _info: {}
  }

  const mockRep = {
    status: function (code) {
      t.is(code, 401, 'should return 401 status')
      return this
    },
    send: function (data) {
      t.is(data.message, 'ERR_AUTH_FAIL', 'should return ERR_AUTH_FAIL')
      return this
    }
  }

  await authCheck(mockCtx, mockReq, mockRep)
  t.pass()
})

test('authCheck - resolveToken throws error', async (t) => {
  const mockCtx = {
    noAuth: false,
    conf: {
      ttl: 3600
    },
    authLib: {
      resolveToken: async () => {
        throw new Error('Token resolution failed')
      }
    }
  }

  const mockReq = {
    headers: {
      authorization: 'Bearer error-token'
    },
    ip: '127.0.0.1',
    _info: {}
  }

  const mockRep = {}

  try {
    await authCheck(mockCtx, mockReq, mockRep)
    t.fail('should throw error')
  } catch (err) {
    t.is(err.message, 'ERR_AUTH_FAIL', 'should throw ERR_AUTH_FAIL')
  }
  t.pass()
})

test('authCheck - LRU evicts when max capacity reached', async (t) => {
  let resolveTokenCalls = 0
  const mockCtx = {
    noAuth: false,
    conf: { ttl: 3600 },
    lru_1m: new LRU({ max: 1 }),
    authLib: {
      resolveToken: async () => {
        resolveTokenCalls++
        return { userId: 'test-user' }
      }
    }
  }

  const makeReq = (token) => ({
    headers: { authorization: `Bearer ${token}` },
    ip: '127.0.0.1',
    _info: {}
  })

  await authCheck(mockCtx, makeReq('token-a'), {})
  t.is(resolveTokenCalls, 1, 'token-a resolved on first call')

  await authCheck(mockCtx, makeReq('token-b'), {})
  t.is(resolveTokenCalls, 2, 'token-b resolved; evicts token-a at max=1')

  await authCheck(mockCtx, makeReq('token-a'), {})
  t.is(resolveTokenCalls, 3, 'token-a re-resolved after eviction proves LRU is bounded')
})

test('authCheck - no authLib', async (t) => {
  const mockCtx = {
    noAuth: false,
    conf: {
      ttl: 3600
    },
    authLib: null
  }

  const mockReq = {
    headers: {
      authorization: 'Bearer test-token'
    },
    ip: '127.0.0.1',
    _info: {}
  }

  const mockRep = {}

  try {
    await authCheck(mockCtx, mockReq, mockRep)
    t.fail('should throw error when authLib is null')
  } catch (err) {
    t.is(err.message, 'ERR_AUTH_FAIL', 'should throw ERR_AUTH_FAIL')
  }
  t.pass()
})
