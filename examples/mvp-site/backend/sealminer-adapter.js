'use strict'

// Minimal WorkerRuntimeV2 host for the external `sealminer-mdk-worker`
// contract plugin (git+https://github.com/sealminer/sealminer-mdk-worker.git).
//
// Same shape as antminer-adapter.js: the plugin is a plain mdk-contract.json
// plugin loaded by directory with a device list fixed at construction (see
// its README). This adapter only turns config/devices.json's static
// `sealminers` seed list into a WorkerRuntimeV2 device list; changing the
// device set means editing devices.json and restarting.
const path = require('path')
const debug = require('debug')('mdk:example:sealminer-adapter')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('sealminer-mdk-worker/package.json'))

/**
 * opts:
 *   workerId     (required) one runtime process = one workerId
 *   storeDir     (required) persistent DHT/RPC identity directory
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   bootstrap    private HyperDHT bootstrap list (site.deploy.json `dht`)
 *   dhtHost      interface the Worker's DHT node binds
 *   series       A2 | A3 | A4 — declared rather than inferred from the model
 *   seedDevices  static device list from config/devices.json:
 *                [{ info: { serialNum }, opts: { address, port, series } }]
 */
async function startSealminerWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const devices = (opts.seedDevices || []).map((seed) => ({
    deviceId: seed.info?.serialNum || seed.id,
    config: { ...(opts.series ? { series: opts.series } : {}), ...seed.opts }
  }))

  const runtime = new WorkerRuntimeV2(PKG_DIR, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    bootstrap: opts.bootstrap || null,
    dhtHost: opts.dhtHost || null,
    storeDir: opts.storeDir,
    allowedKeys: opts.allowedKeys || [],
    allowAll: opts.allowAll === true,
    devices
  })

  await runtime.start()

  debug('sealminer worker %s up: %d devices', opts.workerId, devices.length)

  return {
    runtime,
    seeded: devices.length,
    stop: () => runtime.stop()
  }
}

module.exports = { startSealminerWorker }
