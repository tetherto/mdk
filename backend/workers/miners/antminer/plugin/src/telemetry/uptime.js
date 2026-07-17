'use strict'

module.exports = async (ctx) => {
  const summary = await ctx.device.fetchDeviceData(ctx.device.getSummary)
  return (parseInt(summary.elapsed, 10) || 0) * 1000
}
