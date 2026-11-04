'use strict'

// Minimal WorkerRuntimeV2 host for the external `ocean-mdk-worker` contract
// plugin (git+https://github.com/OCEAN-xyz/mdk-wrk-minerpool-ocean.git),
// which replaced the retired in-repo @tetherto/mdk-worker-ocean package.
//
// The external plugin has no startOceanPoolWorker export, no pool store and
// no ext_data surface — it is a plain mdk-contract.json plugin loaded by
// directory. It polls the Ocean API itself (once a minute) and serves the
// results on its `stats` / `stats_history` channels. The pool is one logical
// device whose deviceId is the workerId, configured by device opts.
const path = require('path')
const debug = require('debug')('mdk:example:ocean-adapter')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('ocean-mdk-worker/package.json'))

/**
 * opts:
 *   workerId     (required) one runtime process = one workerId
 *   storeDir     (required) persistent DHT/RPC identity directory
 *   pool         (required) device opts: { apiUrl, accounts, apiRetry?, datumApiUrl? }
 *   env          worker env (DATUM_USER / DATUM_PASSWORD for the authenticated DATUM channels)
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   allowedKeys  public keys admitted to the worker's RPC
 *   bootstrap    private HyperDHT bootstrap list (site.deploy.json `dht`)
 *   dhtHost      interface the Worker's DHT node binds
 */
async function startOceanWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')
  if (!opts.pool) throw new Error('ERR_POOL_CONFIG_REQUIRED')

  const runtime = new WorkerRuntimeV2(PKG_DIR, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    storeDir: opts.storeDir,
    allowedKeys: opts.allowedKeys || [],
    allowAll: opts.allowAll === true,
    env: opts.env || {},
    bootstrap: opts.bootstrap || null,
    dhtHost: opts.dhtHost || null,
    devices: [{ deviceId: opts.workerId, config: { ...opts.pool } }]
  })

  await runtime.start()

  debug('ocean pool worker %s up (%d accounts)', opts.workerId, (opts.pool.accounts || []).length)

  return {
    runtime,
    stop: () => runtime.stop()
  }
}

module.exports = { startOceanWorker }
