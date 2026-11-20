'use strict'

const device = require('../device')
const call = require('../call')

module.exports = async (params) => call(() => {
  if (Array.isArray(params.pools) && params.pools.length) {
    return device.setPools(params.pools, params.appendId !== false)
  }
  return device.setupPools()
})
