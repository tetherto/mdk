'use strict'

// WorkerRuntime host for the external pool workers `emcd-mdk-worker`,
// `spiderpool-mdk-worker` and `foundry-mdk-worker` (git dependencies, see
// package.json).
//
// Each exports a pool service class and a contract plugin next to its own
// startEmcdWorker/startSpiderpoolWorker/startFoundryWorker. Those boot helpers can't be used
// here: they pass no allowedKeys, and this repo's WorkerRuntime is fail
// closed, so start() would throw ERR_WORKER_ALLOWED_KEYS_REQUIRED. This
// adapter repeats their boot (one logical device whose deviceId is the
// workerId, ext_data served from services.pool) with the trust keys added,
// the same shape as the retired in-repo Ocean worker's startOceanPoolWorker.
//
// Their `@tetherto/mdk/backend/core/...` requires resolve through
// lib/mdk-compat.
const debug = require('debug')('mdk:example:pool-adapter')
const { WorkerRuntime } = require('@tetherto/mdk-worker')

/**
 * opts:
 *   Pool         (required) pool service class (EMCD_POOL, SPIDER_POOL, FOUNDRY_POOL)
 *   plugin       (required) the package's contract plugin
 *   workerId     (required) one runtime process = one workerId
 *   rack         (required) rack identifier (pool store prefix)
 *   storeDir     (required) persistent store directory
 *   conf         pool conf, e.g. { emcd: { apiKey, apiSecret, accounts, apiUrl } }
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   allowedKeys  public keys admitted to the worker's RPC
 *   bootstrap    private HyperDHT bootstrap list (site.deploy.json `dht`), or a testnet's
 *   dhtHost      interface the Worker's DHT node binds
 */
async function startPoolPluginWorker (opts) {
  if (!opts || !opts.Pool || !opts.plugin) throw new Error('ERR_POOL_PLUGIN_REQUIRED')
  if (!opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.rack) throw new Error('ERR_RACK_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  // handleSignals stays off: the caller binds SIGINT/SIGTERM to stop().
  const pool = new opts.Pool(opts.conf || {}, {
    rack: opts.rack,
    storeDir: opts.storeDir,
    root: opts.storeDir
  })

  let runtime
  const stop = async () => {
    try {
      await runtime?.stop()
    } finally {
      await new Promise((resolve) => pool.stop(() => resolve()))
    }
  }

  try {
    await pool.init()
    runtime = new WorkerRuntime(opts.plugin, {
      workerId: opts.workerId,
      kernelTopic: opts.kernelTopic || null,
      bootstrap: opts.bootstrap || null,
      dhtHost: opts.dhtHost || null,
      allowedKeys: opts.allowedKeys || [],
      allowAll: opts.allowAll === true,
      store: pool.store_s1,
      services: { pool },
      devices: [{ deviceId: opts.workerId, config: { pool } }]
    })
    await runtime.start()
  } catch (err) {
    await stop()
    throw err
  }

  debug('%s pool worker %s up (rack %s)', pool.wtype, opts.workerId, opts.rack)

  return { runtime, pool, services: { pool }, stop }
}

module.exports = { startPoolPluginWorker }
