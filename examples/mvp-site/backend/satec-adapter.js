'use strict'

// Minimal WorkerRuntimeV2 host for the @tetherto/mdk-worker-satec contract
// plugin. The package is a plain mdk-contract.json plugin loaded by directory
// with a device list fixed at construction: this adapter turns
// config/devices.json's static `powermeters` list into that device list.
// Changing the meter set means editing devices.json and restarting.
const path = require('path')
const debug = require('debug')('mdk:example:satec-adapter')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('@tetherto/mdk-worker-satec/package.json'))

/**
 * opts:
 *   workerId     (required) one runtime process = one workerId
 *   storeDir     (required) persistent DHT/RPC identity directory
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   bootstrap    private HyperDHT bootstrap list (site.deploy.json `dht`)
 *   dhtHost      interface the Worker's DHT node binds
 *   config       worker-level block every device reads (collectSnapsItvMs, conf)
 *   seedDevices  static device list from config/devices.json:
 *                [{ info: { serialNum }, opts: { address, port, unitId } }]
 */
async function startSatecWorker (opts) {
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
    config: opts.config || {},
    devices
  })

  await runtime.start()

  debug('satec worker %s up: %d devices', opts.workerId, devices.length)

  return {
    runtime,
    seeded: devices.length,
    stop: () => runtime.stop()
  }
}

module.exports = { startSatecWorker }
