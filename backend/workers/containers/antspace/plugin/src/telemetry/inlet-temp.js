'use strict'

module.exports = async (ctx) => {
  const res = await ctx.device.getSystemData()
  return res.data?.return_liquid_temp ?? 0
}
