'use strict'

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,
  connect: async (config) => {
    if (!config.pool) {
      throw new Error('ERR_POOL_REQUIRED')
    }
    return config.pool
  }
}
