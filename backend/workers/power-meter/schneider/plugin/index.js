'use strict'

const debug = require('debug')('mdk:worker:schneider')
const ModbusFacility = require('svc-facs-modbus')
const P3U30PowerMeter = require('../lib/models/p3u30.powermeter')
const PM5340PowerMeter = require('../lib/models/pm5340.powemeter')

const MODEL_CLASSES = {
  p3u30: P3U30PowerMeter,
  pm5340: PM5340PowerMeter
}

// getClient is stateless per call — one facility serves every device context.
const modbusFac = new ModbusFacility({}, {}, {})

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.port || config.unitId === undefined) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const model = config.model || (config.type ? config.type.split('-').pop() : null)
    const ModelClass = MODEL_CLASSES[model]
    if (!ModelClass) throw new Error(`ERR_MODEL_INVALID: ${model}`)

    const powermeter = new ModelClass({
      ...config,
      getClient: modbusFac.getClient.bind(modbusFac),
      conf: config.conf || {},
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
