'use strict'

module.exports = async (ctx) => {
  const pools = await ctx.device.fetchDeviceData(ctx.device.getPools)
  return pools[0]?.url || ''
}
