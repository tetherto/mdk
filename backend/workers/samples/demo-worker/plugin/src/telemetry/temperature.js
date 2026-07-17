'use strict'

module.exports = async (ctx) => (await ctx.device.getSummary()).board_temp_c
