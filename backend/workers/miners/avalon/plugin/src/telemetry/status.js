'use strict'

const { STATUS } = require('../../../../../../core/mdk').constants

module.exports = async (ctx) => {
  const estats = await ctx.device.fetchDeviceData(ctx.device.getEStats)
  return estats.soft_off === '0' ? STATUS.MINING : STATUS.SLEEPING
}
