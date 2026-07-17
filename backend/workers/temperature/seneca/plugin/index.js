'use strict'

const debug = require('debug')('mdk:worker:seneca')
const ModbusFacility = require('svc-facs-modbus')
const SenecaSensor = require('../lib/seneca.sensor')

// getClient is stateless per call — one facility serves every device context.
const modbusFac = new ModbusFacility({}, {}, {})

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.port || config.unitId === undefined || config.register === undefined) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const sensor = new SenecaSensor({
      ...config,
      getClient: modbusFac.getClient.bind(modbusFac),
      conf: config.conf || {},
      id: deviceId
    })

    sensor.on('error', (e) => {
      debug('device %s error: %s', deviceId, e.message)
    })

    return sensor
  },

  disconnect: async (device) => {
    device.close()
  }
}
