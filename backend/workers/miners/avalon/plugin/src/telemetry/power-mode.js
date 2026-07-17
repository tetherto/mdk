'use strict'

const { POWER_MODE } = require('../../../../../../core/mdk').constants

module.exports = async (ctx) => {
  const estats = await ctx.device.fetchDeviceData(ctx.device.getEStats)
  if (estats.soft_off !== '0') return POWER_MODE.SLEEP
  if (estats.work_mode === '1') return POWER_MODE.HIGH
  return POWER_MODE.NORMAL
}
