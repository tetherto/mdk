'use strict'

const commandResult = require('./command-result')

module.exports = async (ctx, params) => {
  return commandResult(await ctx.device.setPowerMode(params.mode))
}
