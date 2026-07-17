'use strict'

module.exports = async (ctx) => (await ctx.device.getSummary()).power_mode
