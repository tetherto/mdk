'use strict'

const async = require('async')

const buildDataProxy = (orks = [], jRequestImpl = async () => ({})) => {
  const eachLimit = async (method, params, errorHandler = null) => {
    const results = []
    await async.eachLimit(orks, 2, async (store) => {
      try {
        const res = await jRequestImpl(store.rpcPublicKey, method, params, {})
        if (errorHandler) errorHandler(res, results)
        else results.push(res)
      } catch (err) {
        if (errorHandler) errorHandler({ error: err.message }, results)
        else results.push({ error: err.message })
      }
    })
    return results
  }

  const mapLimit = async (method, params) => {
    return async.mapLimit(orks, 2, async (store) => {
      return jRequestImpl(store.rpcPublicKey, method, params, {})
    })
  }

  const mapAllPages = async (method, params, pageLimit = 100) => {
    return async.mapLimit(orks, 2, async (store) => {
      const allItems = []
      let offset = 0
      while (true) {
        const batch = await jRequestImpl(store.rpcPublicKey, method, { ...params, limit: pageLimit, offset }, {})
        if (!Array.isArray(batch) || batch.length === 0) break
        allItems.push(...batch)
        if (batch.length < pageLimit) break
        offset += pageLimit
      }
      return allItems
    })
  }

  return {
    requestData: eachLimit,
    requestDataMap: mapLimit,
    requestDataAllPages: mapAllPages
  }
}

const withDataProxy = (ctx) => {
  const orks = ctx.conf?.orks || []
  const jRequestImpl = ctx.net_r0?.jRequest || (async () => ({}))
  return { ...ctx, dataProxy: buildDataProxy(orks, jRequestImpl) }
}

const createMockCtxWithOrks = (orks = [{ rpcPublicKey: 'key1' }], jRequestImpl = async () => ({})) => {
  return withDataProxy({
    conf: { orks },
    net_r0: { jRequest: jRequestImpl }
  })
}

const createMockCtxWithOrksAndNet = (orks, netImpl) => {
  return {
    conf: {
      orks
    },
    net_r0: netImpl
  }
}

const createMockAuthCtx = (authLib = {}, userService = {}, globalDataLib = {}) => {
  return {
    authLib,
    userService,
    globalDataLib,
    auth_a0: {
      conf: {
        roles: {},
        roleManagement: {}
      }
    }
  }
}

const createMockUserInfo = (userId = 'user123', email = 'user@example.com', roles = '["user"]') => {
  return {
    _info: {
      user: {
        userId,
        metadata: {
          email,
          roles
        }
      },
      authToken: 'test-token'
    }
  }
}

const createMockReq = (query = {}, body = {}, userInfo = null) => {
  const req = {
    query,
    body
  }
  if (userInfo) {
    req._info = userInfo
  }
  return req
}

const createMockReqWithUser = (query = {}, body = {}, userId = 'user123', email = 'user@example.com', roles = '["user"]') => {
  return {
    query,
    body,
    _info: {
      user: {
        userId,
        metadata: {
          email,
          roles
        }
      },
      authToken: 'test-token'
    }
  }
}

const createMockAuthCtxWithRoles = (roles = { admin: {} }, roleManagement = { admin: ['admin', 'user'] }) => {
  return {
    auth_a0: {
      conf: {
        roles,
        roleManagement
      }
    }
  }
}

const createMockUserCtx = (userService = {}, authCtx = null) => {
  const baseCtx = { userService }
  if (authCtx) {
    return { ...baseCtx, ...authCtx }
  }
  return { ...baseCtx, ...createMockAuthCtxWithRoles() }
}

const createRoutesForTest = (routesPath) => {
  const mockCtx = {}
  return require(routesPath)(mockCtx)
}

module.exports = {
  buildDataProxy,
  withDataProxy,
  createMockCtxWithOrks,
  createMockCtxWithOrksAndNet,
  createMockAuthCtx,
  createMockUserInfo,
  createMockReq,
  createMockReqWithUser,
  createMockAuthCtxWithRoles,
  createMockUserCtx,
  createRoutesForTest
}
