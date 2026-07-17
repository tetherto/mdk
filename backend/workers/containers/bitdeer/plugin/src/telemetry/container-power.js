'use strict'

module.exports = async (ctx) => {
  const power = await ctx.device.getContainerPowerInformation()
  const totalPower = power?.totalPower
  return Number.isFinite(totalPower) ? totalPower * 1000 : 0
}
