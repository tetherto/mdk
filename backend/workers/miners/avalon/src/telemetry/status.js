'use strict'

const { STATUS } = require('@tetherto/mdk-core').constants
const read = require('../read')

module.exports = async (params) => {
  const estats = await read.estats(params)
  return estats.soft_off === '0' ? STATUS.MINING : STATUS.SLEEPING
}
