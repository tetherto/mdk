'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  return parseInt(stats.accepted, 10) || 0
}
