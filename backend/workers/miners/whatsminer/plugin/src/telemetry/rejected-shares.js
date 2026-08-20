'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  const rejected = parseInt(stats.rejected, 10)
  if (Number.isFinite(rejected)) return rejected

  const pools = await ctx.device.fetchDeviceData(ctx.device.getPools)
  return pools.reduce((total, pool) => total + (parseInt(pool.rejected, 10) || 0), 0)
}
