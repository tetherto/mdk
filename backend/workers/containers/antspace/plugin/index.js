'use strict'

const debug = require('debug')('mdk:worker:antspace')
const HttpFacility = require('@bitfinex/bfx-facs-http')
const AntspaceHydro = require('../lib/antspace.hydro')
const AntspaceImmersion = require('../lib/antspace.immersion')

const MODEL_CLASSES = {
  hk3: AntspaceHydro,
  immersion: AntspaceImmersion
}

// The facility is a stateless HTTP client — one serves every device context.
const httpFac = new HttpFacility({}, {}, {})

module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.port) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const model = config.model || (config.type || '').split('-').pop()
    const ContainerClass = MODEL_CLASSES[model]
    if (!ContainerClass) throw new Error(`ERR_MODEL_INVALID: ${model}`)

    const container = new ContainerClass({
      ...config,
      client: httpFac,
      conf: config.conf || {},
      id: deviceId
    })

    container.on('error', (e) => {
      debug('device %s error: %s', deviceId, e.message)
    })

    return container
  }
}
