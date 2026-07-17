'use strict'

module.exports = async (ctx) => {
  const power = await ctx.device.fetchDeviceData(ctx.device.getPowerValue)
  const summary = await ctx.device.fetchDeviceData(ctx.device.getSummary)
  const watts = parseFloat(power?.power)
  const hashrate = parseFloat(summary.mhs_av)
  if (!watts || !hashrate) return 0
  const efficiency = watts / hashrate * 1000000
  return isNaN(efficiency) ? 0 : +efficiency.toFixed(2)
}
