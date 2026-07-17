'use strict'

const { POWER_MODE } = require('../../../../../../core/mdk').constants

module.exports = async (ctx) => {
  const stats = await ctx.device.fetchDeviceData(ctx.device.getMinerStats)
  return stats.minerMode === 1 ? POWER_MODE.SLEEP : POWER_MODE.NORMAL
}
