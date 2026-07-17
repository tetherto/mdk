'use strict'

const { POWER_MODE } = require('../../../../../../core/mdk').constants

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  if ((parseFloat(stats.mhs_av) || 0) === 0) return POWER_MODE.SLEEP
  return stats.power_mode?.toLowerCase()
}
