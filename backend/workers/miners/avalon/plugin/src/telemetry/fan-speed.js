'use strict'

module.exports = async (ctx) => {
  const estats = await ctx.device.fetchDeviceData(ctx.device.getEStats)
  const fan1 = parseFloat(estats.fan1) || 0
  const fan2 = parseFloat(estats.fan2) || 0
  return Math.round((fan1 + fan2) / 2)
}
