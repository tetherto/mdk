'use strict'

module.exports = async (ctx) => {
  const res = await ctx.device.getSystemData()
  return res.data?.supply_liquid_set_temp ?? res.data?.supply_liquid_temp ?? 0
}
