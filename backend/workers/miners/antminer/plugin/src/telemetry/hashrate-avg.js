'use strict'

module.exports = async (ctx) => {
  const summary = await ctx.device.fetchDeviceData(ctx.device.getSummary)
  return Math.floor((parseFloat(summary.mhs_av) || 0) / 10000) / 100
}
