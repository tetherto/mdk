'use strict'

module.exports = async (ctx) => {
  const res = await ctx.device.getSystemData()
  return res.data?.supply_liquid_temp ?? 0
}
