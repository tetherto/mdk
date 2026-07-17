'use strict'

module.exports = async (ctx) => {
  const estats = await ctx.device.fetchDeviceData(ctx.device.getEStats)
  return Math.floor((parseFloat(estats.temperature_avg) || 0) * 100) / 100
}
