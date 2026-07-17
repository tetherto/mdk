'use strict'

const debug = require('debug')('mdk:worker:antminer')
const Antminer = require('../lib/antminer')
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('../lib/utils/constants')

const DEFAULT_PORT = 80

// Worker Plugin: contract + connect/disconnect. The digest HTTP client is
// per-device (credentials differ per miner); requests are on-demand, matching
// the legacy connect-on-demand behavior.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.username || !config.password) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const type = config.type || 'miner-am-s19xp'
    const miner = new Antminer({
      ...config,
      port: config.port || DEFAULT_PORT,
      conf: config.conf || {},
      id: deviceId,
      nominalEfficiencyWThs: config.nominalEfficiencyWThs || DEFAULT_NOMINAL_EFFICIENCY_WTHS[type] || 0,
      // the device client keys model-specific parsing off the short type
      type: type.replace(/^miner-am-/, '')
    })

    await miner._setupClient()

    miner.on('error', (e) => {
      debug('device %s error: %s', deviceId, e.message)
    })

    return miner
  }
}
