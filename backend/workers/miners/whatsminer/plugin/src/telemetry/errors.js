'use strict'

module.exports = async (ctx) => {
  const errors = await ctx.device.fetchDeviceData(ctx.device.getErrors)
  return Array.isArray(errors) ? errors : []
}
