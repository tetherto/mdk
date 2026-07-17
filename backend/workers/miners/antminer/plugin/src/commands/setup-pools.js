'use strict'

module.exports = async (ctx, params) => {
  if (Array.isArray(params.pools) && params.pools.length) {
    return ctx.device.setPools(params.pools, params.appendId !== false)
  }
  return ctx.device.setupPools()
}
