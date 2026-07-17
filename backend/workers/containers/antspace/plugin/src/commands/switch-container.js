'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.switchContainer(params.enabled)
}
