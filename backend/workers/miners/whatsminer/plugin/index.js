'use strict'

const debug = require('debug')('mdk:worker:whatsminer')
const TcpFacility = require('@tetherto/svc-facs-tcp')
const Whatsminer = require('../lib/whatsminer')
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('../lib/utils/constants')

// getRPC is stateless — one facility serves every device context.
const tcpFac = new TcpFacility({}, {}, {})

// Worker Plugin: contract + connect/disconnect. The WorkerRuntime builds one
// context per device from connect() and dispatches contract handlers against
// it. The client is lazy (no socket until the first request), matching the
// legacy connect-on-demand behavior: an unreachable miner surfaces per-request
// errors instead of holding the context offline from boot.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.port || !config.password) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }

    const type = config.type || 'miner-wm'
    const miner = new Whatsminer({
      ...config,
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
