'use strict'

module.exports = async (ctx) => {
  const power = await ctx.device.fetchDeviceData(ctx.device.getPowerValue)
  return parseFloat(power?.power) || 0
}
