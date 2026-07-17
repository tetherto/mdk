'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setLiquidSupplyTemperature(params.temperature)
}
