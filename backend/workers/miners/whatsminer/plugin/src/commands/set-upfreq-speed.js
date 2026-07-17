'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setUpfreqSpeed(params.speed)
}
