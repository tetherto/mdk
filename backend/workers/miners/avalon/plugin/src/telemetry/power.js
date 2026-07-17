'use strict'

module.exports = async (ctx) => {
  const estats = await ctx.device.fetchDeviceData(ctx.device.getEStats)
  return parseFloat(estats.object_power_consumption) || 0
}
