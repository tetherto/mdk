'use strict'

const commandResult = require('./command-result')

module.exports = async (ctx, params) => {
  if (params.pools !== undefined && !Array.isArray(params.pools)) {
    throw new Error('ERR_INVALID_ARG_TYPE')
  }
  if (Array.isArray(params.pools) && params.pools.length) {
    return commandResult(await ctx.device.setPools(params.pools, params.appendId !== false))
  }
  return commandResult(await ctx.device.setupPools())
}
