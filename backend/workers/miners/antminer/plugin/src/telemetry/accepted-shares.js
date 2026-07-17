'use strict'

module.exports = async (ctx) => {
  const pools = await ctx.device.fetchDeviceData(ctx.device.getPools)
  return (pools || []).reduce((acc, pool) => acc + (parseInt(pool.accepted, 10) || 0), 0)
}
