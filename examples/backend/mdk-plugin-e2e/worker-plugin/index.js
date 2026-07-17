'use strict'

const { createClient } = require('./lib/device-client')

// Worker Plugin: contract + connect. The WorkerRuntime builds one context per
// device from connect() and dispatches each contract handler against it.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    const device = createClient(config)
    // Probe once so an unreachable device is held offline from boot.
    await device.getStats()
    return device
  }
}
