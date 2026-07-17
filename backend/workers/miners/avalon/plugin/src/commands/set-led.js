'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setLED(params.enabled)
}
