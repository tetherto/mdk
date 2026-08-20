'use strict'

const commandResult = require('./command-result')

module.exports = async (ctx) => {
  return commandResult(await ctx.device.reboot())
}
