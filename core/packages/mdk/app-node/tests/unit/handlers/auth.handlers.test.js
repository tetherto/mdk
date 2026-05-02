'use strict'

const test = require('brittle')
const { getSiteName, extDataRoute, getUserInfo, newAuthToken, getUserPermissions } = require('../../../workers/lib/server/handlers/auth.handlers')
const { createMockCtxWithOrks } = require('../helpers/mockHelpers')

test('getSiteName - returns site from context', (t) => {
  const mockCtx = {
    conf: {
      site: 'test-site'
    }
  }

  const result = getSiteName(mockCtx)
  t.is(result.site, 'test-site', 'should return site from context')
  t.pass()
})

test('extDataRoute - with query param', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }, { rpcPublicKey: 'key2' }],
    async () => ({ data: 'test' })
  )

  const mockReq = {
    query: {
      type: 'test-type',
      query: '{"field":"value"}'
    }
  }

  const result = await extDataRoute(mockCtx, mockReq, {})
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return results for all orks')
  t.pass()
})

test('extDataRoute - without query param', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => ({ data: 'test' })
  )

  const mockReq = {
    query: {
      type: 'test-type'
    }
  }

  const result = await extDataRoute(mockCtx, mockReq, {})
  t.ok(Array.isArray(result), 'should return array')
  t.pass()
})

test('getUserInfo - returns user from req._info', async (t) => {
  const mockCtx = {}
  const mockReq = {
    _info: {
      user: { userId: 'user123', email: 'test@example.com' }
    }
  }

  const result = await getUserInfo(mockCtx, mockReq)
  t.is(result.userId, 'user123', 'should return user from req._info')
  t.is(result.email, 'test@example.com', 'should return user email')
  t.pass()
})

test('newAuthToken - regenerates token via authLib', async (t) => {
  const mockCtx = {
    conf: {
      ttl: 3600
    },
    authLib: {
      regenerateToken: async (opts) => {
        t.is(opts.ttl, 3600, 'should pass ttl from context')
        t.is(opts.oldToken, 'old-token', 'should pass old token')
        return 'new-token'
      }
    }
  }

  const mockReq = {
    headers: {
      authorization: 'Bearer old-token'
    },
    body: {
      ips: ['127.0.0.1'],
      scope: 'read',
      roles: ['user']
    }
  }

  const result = await newAuthToken(mockCtx, mockReq)
  t.is(result, 'new-token', 'should return new token')
  t.pass()
})

test('getUserPermissions - returns permissions from authLib', async (t) => {
  const mockCtx = {
    authLib: {
      getTokenPerms: async (token) => {
        t.is(token, 'test-token', 'should pass token')
        return ['read', 'write']
      }
    }
  }

  const mockReq = {
    _info: {
      authToken: 'test-token'
    }
  }

  const result = await getUserPermissions(mockCtx, mockReq)
  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return permissions')
  t.ok(result.includes('read'), 'should include read permission')
  t.ok(result.includes('write'), 'should include write permission')
  t.pass()
})
