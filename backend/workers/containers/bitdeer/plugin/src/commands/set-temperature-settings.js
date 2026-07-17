'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setTemperatureSettings(params.settings)
}
