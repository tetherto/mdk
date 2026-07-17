'use strict'

const { STATUS } = require('../../../../../../core/mdk').constants

module.exports = async (ctx) => {
  const errors = await ctx.device.fetchDeviceData(ctx.device.getErrors)
  if (Array.isArray(errors?.errors) && errors.errors.length > 0) return STATUS.ERROR
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  return stats.minerMode === 0 ? STATUS.MINING : STATUS.SLEEPING
}
