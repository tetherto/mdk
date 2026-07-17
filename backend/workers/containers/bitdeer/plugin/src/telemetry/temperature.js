'use strict'

module.exports = async (ctx) => {
  const temps = await ctx.device.getTemperatureInformation()
  const temp = temps?.containerTemperature
  return Number.isFinite(temp) ? temp : 0
}
