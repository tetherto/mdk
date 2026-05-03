'use strict'

const async = require('async')

const requestRpcData = async (ctx, method, params, { timeout = 30000, type = null } = {}) => {
  const entries = await ctx.getRacksEntries()
  const filtered = type ? entries.filter(e => e.type === type || e.type.startsWith(`${type}-`)) : entries
  const results = await async.mapLimit(filtered, 25, async entry => {
    try {
      const res = await ctx.net_r0.jRequest(
        entry.info.rpcPublicKey,
        method,
        params,
        { timeout }
      )
      return Array.isArray(res) ? res : [res]
    } catch (e) {
      return []
    }
  })
  return Array.prototype.concat.apply([], results)
}

const requestLibData = async (ctx, method, params, { type = null } = {}) => {
  const data = []
  for (const [, { lib, type: libType }] of ctx.libMap.entries()) {
    if (type && libType !== type && !libType.startsWith(`${type}-`)) continue
    try {
      const arr = await lib[method](params)
      data.push(...(Array.isArray(arr) ? arr : []))
    } catch (e) {
      console.error(`${method} lib error`, e)
    }
  }
  return data
}

const requestRackData = async (ctx, rackId, method, params, { timeout = 30000 } = {}) => {
  const entries = await ctx.getRacksEntries()
  const entry = entries.find(e => e.id === rackId)
  if (!entry) return null
  return await ctx.net_r0.jRequest(entry.info.rpcPublicKey, method, params, { timeout })
}

const requestLibRackData = async (ctx, rackId, method, params) => {
  const entry = ctx.libMap.get(rackId)
  if (!entry) return null
  return await entry.lib[method](params)
}

const createDataProxy = (ctx) => {
  const { isRpcMode = true } = ctx
  return {
    async requestData (method, params, opts = {}) {
      if (!isRpcMode) {
        return await requestLibData(ctx, method, params, opts)
      }
      return await requestRpcData(ctx, method, params, opts)
    },
    async requestRackData (rackId, method, params, opts = {}) {
      if (!isRpcMode) {
        return await requestLibRackData(ctx, rackId, method, params)
      }
      return await requestRackData(ctx, rackId, method, params, opts)
    }
  }
}

module.exports = {
  createDataProxy
}
