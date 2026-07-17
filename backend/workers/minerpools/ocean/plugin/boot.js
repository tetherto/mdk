'use strict'

const debug = require('debug')('mdk:worker:ocean:boot')
const WorkerRuntime = require('../../../../core/mdk-worker/lib/worker-runtime')
const OceanMinerpoolManager = require('../lib/ocean.minerpool.manager')
const plugin = require('.')

/**
 * Boots an Ocean pool worker on the WorkerRuntime. The pool is one logical
 * entity: the runtime exposes a single device whose deviceId is the workerId
 * (the legacy adapter did the same for non-thing workers), and ext_data
 * queries route to services.pool via the runtime builtin.
 *
 * opts:
 *   workerId  (required) one runtime process = one workerId
 *   rack      (required) rack identifier (pool store prefix)
 *   storeDir  (required) persistent store directory
 *   conf      pool conf, e.g. { ocean: { accounts, apiUrl } }
 *   root      optional config root for the legacy config/ocean.json overlay
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   bootstrap DHT bootstrap override for hermetic tests
 */
async function startOceanPoolWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.rack) throw new Error('ERR_RACK_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const pool = new OceanMinerpoolManager(opts.conf || {}, {
    rack: opts.rack,
    storeDir: opts.storeDir,
    root: opts.root
  })
  await pool.init()

  const services = { pool }
  const runtime = new WorkerRuntime(plugin, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    bootstrap: opts.bootstrap || null,
    store: pool.store_s1,
    services,
    devices: [{ deviceId: opts.workerId, config: { pool } }]
  })

  await runtime.start()

  debug('ocean pool worker %s up (rack %s)', opts.workerId, opts.rack)

  return {
    runtime,
    pool,
    services,
    stop: async () => {
      await runtime.stop()
      await new Promise((resolve) => pool.stop(() => resolve()))
    }
  }
}

module.exports = { startOceanPoolWorker }
