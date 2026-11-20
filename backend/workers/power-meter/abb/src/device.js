'use strict'

const { id, opts, config, logger } = require('@tetherto/mdk-worker/device')
const ModbusFacility = require('@tetherto/svc-facs-modbus')
const B2XPowerMeter = require('../lib/models/b2x.powermeter')
const M1M20PowerMeter = require('../lib/models/m1m20.powermeter')
const M4M20PowerMeter = require('../lib/models/m4m20.powermeter')
const REU615PowerMeter = require('../lib/models/reu615.powermeter')

// WorkerRuntimeV2 loads this module once per device into a private registry,
// so the instance built here is that device's for the life of the process.
// opts is the seed device's own config (mdk.yaml `devices[].opts`); config is
// the worker-level block shared by every device.
const MODEL_CLASSES = {
  // b23 and b24 share the B2X register map, mirroring the legacy type managers.
  b23: B2XPowerMeter,
  b24: B2XPowerMeter,
  m1m20: M1M20PowerMeter,
  m4m20: M4M20PowerMeter,
  reu615: REU615PowerMeter
}

const address = opts.address || opts.host
if (!address || !opts.port || opts.unitId === undefined) {
  throw new Error('ERR_DEVICE_CONFIG_INVALID: address, port and unitId are required')
}

// `model` on the device, else the legacy type tag's last segment
// (powermeter-abb-b23), else the worker-level default.
const model = opts.model || (opts.type ? opts.type.split('-').pop() : null) || config.model
const ModelClass = MODEL_CLASSES[model]
if (!ModelClass) throw new Error(`ERR_MODEL_INVALID: ${model} (one of ${Object.keys(MODEL_CLASSES).join(', ')})`)

// getClient is stateless per call — one facility per device is cheap and
// keeps the module free of cross-device state.
const modbusFac = new ModbusFacility({}, {}, {})

const device = new ModelClass({
  ...opts,
  address,
  model,
  getClient: modbusFac.getClient.bind(modbusFac),
  // cacheLimit is how many failed reads the meter may bridge from its last
  // good snapshot. The library treats an unset limit as "forever", which
  // would hide an unreachable meter from the runtime's health channel.
  conf: { cacheLimit: 0, ...config.conf, ...opts.conf },
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
