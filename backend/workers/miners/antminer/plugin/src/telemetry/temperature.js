'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  const outlets = (stats.boards || []).map((b) => parseFloat(b.temp?.outlet)).filter((v) => !isNaN(v))
  if (!outlets.length) return 0
  return Math.max(...outlets)
}
