'use strict'

module.exports = async (ctx) => (await ctx.device.getStats()).powerW
