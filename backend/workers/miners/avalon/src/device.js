'use strict'

const { id, opts, config, logger } = require('@tetherto/mdk-worker/device')
const TcpFacility = require('@tetherto/svc-facs-tcp')
const AvalonMiner = require('../lib/avalon.miner')
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('../lib/utils/constants')

const DEFAULT_PORT = 4028

// WorkerRuntimeV2 loads this module once per device into a private registry,
// so the miner built here is that device's for the life of the process. The
// client is lazy (a socket per request, closed on reply), matching the legacy
// connect-on-demand behaviour. opts is the seed device's own config; config is
// the worker-level block shared by every device (default pools, conf).
const address = opts.address || opts.host
if (!address || !opts.password) {
  throw new Error('ERR_DEVICE_CONFIG_INVALID: address and password are required')
}

// getRPC is stateless — one facility per device is cheap.
const tcpFac = new TcpFacility({}, {}, {})

const type = opts.type || config.type || 'miner-av-a1346'
const conf = { ...config.conf, ...opts.conf }
if (!conf.pools && config.pools) conf.pools = config.pools

const device = new AvalonMiner({
  ...opts,
  address,
  port: opts.port || DEFAULT_PORT,
  socketer: {
    readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
    rpc: (rpcOpts) => tcpFac.getRPC(rpcOpts)
  },
  conf,
  id,
  nominalEfficiencyWThs: opts.nominalEfficiencyWThs || DEFAULT_NOMINAL_EFFICIENCY_WTHS[type] || 0,
  type
})

device.on('error', (e) => {
  logger('device error: %s', e.message)
})

module.exports = device
