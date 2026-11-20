'use strict'

const { POWER_MODE } = require('@tetherto/mdk-core').constants
const read = require('../read')

module.exports = async (params) => {
  const estats = await read.estats(params)
  if (estats.soft_off !== '0') return POWER_MODE.SLEEP
  if (estats.work_mode === '1') return POWER_MODE.HIGH
  return POWER_MODE.NORMAL
}
