'use strict'

module.exports = async (ctx) => {
  return ctx.device.resetCoolingSystem()
}
