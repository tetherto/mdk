'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  return Math.floor((parseFloat(stats.hs_rt) || 0) / 10000) / 100
}
