'use strict'

const debug = require('debug')('mdk:worker:abb')
const ModbusFacility = require('svc-facs-modbus')
const B2XPowerMeter = require('../lib/models/b2x.powermeter')
const M1M20PowerMeter = require('../lib/models/m1m20.powermeter')
const M4M20PowerMeter = require('../lib/models/m4m20.powermeter')
const REU615PowerMeter = require('../lib/models/reu615.powermeter')

// b23 and b24 share the B2X register map, mirroring the legacy type managers.
const MODEL_CLASSES = {
  b23: B2XPowerMeter,
  b24: B2XPowerMeter,
  m1m20: M1M20PowerMeter,
  m4m20: M4M20PowerMeter,
  reu615: REU615PowerMeter
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
