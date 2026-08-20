'use strict'

const commandResult = require('./command-result')

module.exports = async (ctx, params) => {
  if (typeof params.pct !== 'number' || !Number.isFinite(params.pct)) {
    throw new Error('ERR_INVALID_ARG_TYPE')
  }
  if (params.pct < 0 || params.pct > 200) {
    throw new Error('ERR_POWER_PCT_NOT_SUPPORTED')
  }
  return commandResult(await ctx.device.setPowerPct(params.pct))
}
