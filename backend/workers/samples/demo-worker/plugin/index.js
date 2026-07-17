'use strict'

const { createClient } = require('./lib/device-client')
const { openDb } = require('../lib/db')

// Worker Plugin: contract + connect. The WorkerRuntime builds one context per
// device from connect() and dispatches each contract handler against it.
// The SQLite handle rides on the device client so handlers can record and
// query the worker's own history via ctx.device.db.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    const device = { ...createClient(config), db: openDb(config.dbPath) }
    // Probe once so an unreachable miner is held offline from boot.
    await device.getSummary()
    return device
  }
}
