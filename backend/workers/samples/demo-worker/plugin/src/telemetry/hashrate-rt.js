'use strict'

module.exports = async (ctx) => (await ctx.device.getSummary()).hashrate_ths
