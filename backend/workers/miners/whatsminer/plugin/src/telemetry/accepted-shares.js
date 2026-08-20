'use strict'

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  const accepted = parseInt(stats.accepted, 10)
  if (Number.isFinite(accepted)) return accepted

  const pools = await ctx.device.fetchDeviceData(ctx.device.getPools)
  return pools.reduce((total, pool) => total + (parseInt(pool.accepted, 10) || 0), 0)
}
