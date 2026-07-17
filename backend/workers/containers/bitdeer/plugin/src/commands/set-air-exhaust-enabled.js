'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setAirExhaustEnabled(params.status)
}
