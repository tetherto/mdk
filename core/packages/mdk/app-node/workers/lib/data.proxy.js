'use strict'

const async = require('async')
const { RPC_CONCURRENCY_LIMIT, RPC_PAGE_LIMIT } = require('./constants')

const getRpcTimeout = (conf) => conf?.rpcTimeout || 15000

const _rpcEachLimit = async (ctx, method, params, errorHandler = null) => {
  const results = []
  const concurrency = ctx.conf?.rpcConcurrencyLimit || RPC_CONCURRENCY_LIMIT
  const timeout = getRpcTimeout(ctx.conf)

  await async.eachLimit(ctx.conf.orks, concurrency, async (store) => {
    try {
      const res = await ctx.net_r0.jRequest(store.rpcPublicKey, method, params, { timeout })
      if (errorHandler) {
        errorHandler(res, results)
      } else {
        results.push(res)
      }
    } catch (err) {
      if (errorHandler) {
        errorHandler({ error: err.message }, results)
      } else {
        results.push({ error: err.message })
      }
    }
  })

  return results
}

const _rpcMapLimit = async (ctx, method, params) => {
  const concurrency = ctx.conf?.rpcConcurrencyLimit || RPC_CONCURRENCY_LIMIT
  const timeout = getRpcTimeout(ctx.conf)

  return await async.mapLimit(ctx.conf.orks, concurrency, async (store) => {
    return ctx.net_r0.jRequest(store.rpcPublicKey, method, params, { timeout })
  })
}

const _rpcMapAllPages = async (ctx, method, params, pageLimit = RPC_PAGE_LIMIT) => {
  const concurrency = ctx.conf?.rpcConcurrencyLimit || RPC_CONCURRENCY_LIMIT
  const timeout = getRpcTimeout(ctx.conf)

  return await async.mapLimit(ctx.conf.orks, concurrency, async (store) => {
    const allItems = []
    let offset = 0

    while (true) {
      const batch = await ctx.net_r0.jRequest(
        store.rpcPublicKey,
        method,
        { ...params, limit: pageLimit, offset },
        { timeout }
      )

      if (!Array.isArray(batch) || batch.length === 0) break
      allItems.push(...batch)
      if (batch.length < pageLimit) break
      offset += pageLimit
    }

    return allItems
  })
}

const _orkCall = async (ctx, method, params) => {
  return ctx.ork[method](params)
}

const createDataProxy = (ctx) => {
  return {
    async requestData (method, params, errorHandler = null) {
      if (ctx.isRpcMode === false) return _orkCall(ctx, method, params)
      return _rpcEachLimit(ctx, method, params, errorHandler)
    },

    async requestDataMap (method, params) {
      if (ctx.isRpcMode === false) return _orkCall(ctx, method, params)
      return _rpcMapLimit(ctx, method, params)
    },

    async requestDataAllPages (method, params, pageLimit = RPC_PAGE_LIMIT) {
      if (ctx.isRpcMode === false) return _orkCall(ctx, method, params)
      return _rpcMapAllPages(ctx, method, params, pageLimit)
    }
  }
}

module.exports = {
  createDataProxy
}
