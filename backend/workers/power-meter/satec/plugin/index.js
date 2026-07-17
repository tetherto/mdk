'use strict'

const debug = require('debug')('mdk:worker:satec')
const ModbusFacility = require('svc-facs-modbus')
const SatecPowerMeter = require('../lib/satec.powermeter')

// getClient is stateless per call — one facility serves every device context.
const modbusFac = new ModbusFacility({}, {}, {})

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.port || config.unitId === undefined) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const powermeter = new SatecPowerMeter({
      ...config,
      getClient: modbusFac.getClient.bind(modbusFac),
      conf: config.conf || {},
      // buffer sizing for the 15m power average, from the legacy manager
      collectSnapsItvMs: config.collectSnapsItvMs || 60000,
      id: deviceId
    })

    powermeter.on('error', (e) => {
      debug('device %s error: %s', deviceId, e.message)
    })

    return powermeter
  },

  disconnect: async (device) => {
    device.close()
  }
}
