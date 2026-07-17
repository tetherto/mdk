'use strict'

const { RUNNING_STATUS } = require('../../../../../../core/mdk').constants

module.exports = async (ctx) => {
  const res = await ctx.device.getSystemData()
  const d = res.data || {}
  const running = d.circulating_pump || d.second_pump1 || d.second_pump2
  return running ? RUNNING_STATUS.RUNNING : RUNNING_STATUS.STOPPED
}
