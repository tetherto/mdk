'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getStats)
  return parseInt(stats.elapsed, 10) || 0
}
