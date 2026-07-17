'use strict'

// Worker Plugin for a scheduler-driven pool worker: the "device" is the pool
// service itself, constructed and owned by the boot (it needs facilities and
// init()). connect just hands the runtime the injected instance; ext_data
// queries are served by the runtime's pool builtin from services.pool.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config) => {
    if (!config.pool) throw new Error('ERR_POOL_REQUIRED')
    return config.pool
  }
}
