'use strict'

module.exports = async (ctx, params) => {
  return ctx.device.setTankEnabled(params.tankIndex, params.status)
}
