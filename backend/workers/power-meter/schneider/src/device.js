'use strict'

const { id, opts, config, logger } = require('@tetherto/mdk-worker/device')
const ModbusFacility = require('@tetherto/svc-facs-modbus')
const P3U30PowerMeter = require('../lib/models/p3u30.powermeter')
const PM5340PowerMeter = require('../lib/models/pm5340.powemeter')

// WorkerRuntimeV2 loads this module once per device into a private registry,
// so the instance built here is that device's for the life of the process.
// opts is the seed device's own config (mdk.yaml `devices[].opts`); config is
// the worker-level block shared by every device.
const MODEL_CLASSES = {
  p3u30: P3U30PowerMeter,
  pm5340: PM5340PowerMeter
}

const address = opts.address || opts.host
if (!address || !opts.port || opts.unitId === undefined) {
  throw new Error('ERR_DEVICE_CONFIG_INVALID: address, port and unitId are required')
}

// `model` on the device, else the legacy type tag's last segment
// (powermeter-schneider-pm5340), else the worker-level default.
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
  conf: { ...config.conf, ...opts.conf },
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
