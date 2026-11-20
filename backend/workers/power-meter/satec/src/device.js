'use strict'

const { id, opts, config, logger } = require('@tetherto/mdk-worker/device')
const ModbusFacility = require('@tetherto/svc-facs-modbus')
const SatecPowerMeter = require('../lib/satec.powermeter')

// WorkerRuntimeV2 loads this module once per device into a private registry,
// so the instance built here is that device's for the life of the process.
// opts is the seed device's own config (mdk.yaml `devices[].opts`); config is
// the worker-level block shared by every device.
const address = opts.address || opts.host
if (!address || !opts.port || opts.unitId === undefined) {
  throw new Error('ERR_DEVICE_CONFIG_INVALID: address, port and unitId are required')
}

// getClient is stateless per call — one facility per device is cheap and
// keeps the module free of cross-device state.
const modbusFac = new ModbusFacility({}, {}, {})

const device = new SatecPowerMeter({
  ...opts,
  address,
  getClient: modbusFac.getClient.bind(modbusFac),
  conf: { ...config.conf, ...opts.conf },
  // buffer sizing for the 15m power average, from the legacy manager
  collectSnapsItvMs: opts.collectSnapsItvMs || config.collectSnapsItvMs || 60000,
  id
})

device.on('error', (e) => {
  logger('device error: %s', e.message)
})

// The Modbus socket stays open for the life of the process (V2 has no
// disconnect). Unref it on every connect — a reconnect gets a fresh handle —
// so a host that is done, such as the smoke runner, can exit without it.
device.client.client.on('connect', () => device.client.client.unref())

module.exports = device
