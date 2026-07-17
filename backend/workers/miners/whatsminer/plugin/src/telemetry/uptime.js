'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  return parseFloat(stats.uptime) || parseFloat(stats.elapsed) || 0
}
