'use strict'

module.exports = async (ctx) => {
  return ctx.device.fetchDeviceData(ctx.device.getVersion)
}
