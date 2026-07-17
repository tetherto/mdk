'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setPowerPct(params.pct)
}
