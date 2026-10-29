'use strict'

// Minimal WorkerRuntimeV2 host for the external `whatsminer-mdk-worker`
// contract plugin (git+https://github.com/whatsminer/whatsminer-mdk-worker.git),
// which replaced the retired in-repo @tetherto/mdk-worker-whatsminer package.
//
// The external plugin has no startWhatsminerWorker export, no provisioning
// store, no alerts/stats templates, and no model validation — it is a plain
// mdk-contract.json plugin loaded by directory with a device list fixed at
// construction (see its README). This adapter only recreates the piece
// site.js needs: turning config/devices.json's static seed list into a
// WorkerRuntimeV2 device list. There is no registerThing/updateThing/
// forgetThings equivalent — changing the device set means editing
// devices.json and restarting.
const path = require('path')
const debug = require('debug')('mdk:example:whatsminer-adapter')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('whatsminer-mdk-worker/package.json'))

/**
 * opts:
 *   workerId     (required) one runtime process = one workerId
 *   storeDir     (required) persistent DHT/RPC identity directory
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   bootstrap    private HyperDHT bootstrap list (site.deploy.json `dht`)
 *   dhtHost      interface the Worker's DHT node binds
 *   seedDevices  static device list from config/devices.json:
 *                [{ info: { serialNum }, opts: { address, port, password, conf } }]
 */
async function startWhatsminerWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const devices = (opts.seedDevices || []).map((seed) => ({
    deviceId: seed.info?.serialNum || seed.id,
    config: { ...seed.opts }
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

  debug('whatsminer worker %s up: %d devices', opts.workerId, devices.length)

  return {
    runtime,
    seeded: devices.length,
    stop: () => runtime.stop()
  }
}

module.exports = { startWhatsminerWorker }
