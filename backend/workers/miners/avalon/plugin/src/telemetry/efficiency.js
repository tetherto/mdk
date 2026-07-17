'use strict'

module.exports = async (ctx) => {
  const estats = await ctx.device.fetchDeviceData(ctx.device.getEStats)
  const stats = await ctx.device.fetchDeviceData(ctx.device.getStats)
  const power = parseFloat(estats.object_power_consumption)
  const hashrate = parseFloat(stats.mhs_av)
  if (!hashrate) return 0
  const efficiency = power / hashrate * 1000000
  return isNaN(efficiency) ? 0 : +efficiency.toFixed(2)
}
