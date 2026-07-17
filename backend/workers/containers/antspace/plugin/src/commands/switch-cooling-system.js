'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.switchCoolingSystem(params.enabled)
}
