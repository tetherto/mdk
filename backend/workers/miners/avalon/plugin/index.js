'use strict'

const debug = require('debug')('mdk:worker:avalon')
const TcpFacility = require('@tetherto/svc-facs-tcp')
const AvalonMiner = require('../lib/avalon.miner')
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('../lib/utils/constants')

const DEFAULT_PORT = 4028

// getRPC is stateless — one facility serves every device context.
const tcpFac = new TcpFacility({}, {}, {})

// Worker Plugin: contract + connect/disconnect. The client is lazy (no socket
// until the first request), matching the legacy connect-on-demand behavior.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.password) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const type = config.type || 'miner-av-a1346'
    const miner = new AvalonMiner({
      ...config,
      port: config.port || DEFAULT_PORT,
      socketer: {
        readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
        rpc: (opts) => tcpFac.getRPC(opts)
      },
      conf: config.conf || {},
      id: deviceId,
      nominalEfficiencyWThs: config.nominalEfficiencyWThs || DEFAULT_NOMINAL_EFFICIENCY_WTHS[type] || 0,
      type
    })

    miner.on('error', (e) => {
      debug('device %s error: %s', deviceId, e.message)
    })

    return miner
  },

  disconnect: async (device) => {
    await device.close()
  }
}
