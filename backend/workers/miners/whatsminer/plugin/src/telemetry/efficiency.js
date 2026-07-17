'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  return Math.floor((parseFloat(stats.power_rate) || 0) * 100) / 100
}
