'use strict'

module.exports = async (ctx, params) => {
  await ctx.device.setPowerLimit(params.limit_watts)
  return { watts: params.limit_watts, ok: true }
}
