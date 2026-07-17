'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getStats)
  return Math.floor((parseFloat(stats.mhs_av) || 0) / 10000) / 100
}
