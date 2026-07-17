'use strict'

const debug = require('debug')('mdk:worker:bitdeer')
const Bitdeer = require('../lib/bitdeer')

// Worker Plugin: unlike the socket-per-device transports, bitdeer devices are
// MQTT publishers into a broker the BOOT owns (one broker per worker process).
// The boot injects the live aedes instance into each device config as
// config.server; connect() only wires the per-container subscriber.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.containerId || !config.server) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const container = new Bitdeer({
      ...config,
      conf: config.conf || {},
      id: deviceId
    })

    container.on('error', (e) => {
      debug('device %s error: %s', deviceId, e.message)
    })

    return container
  }
}
