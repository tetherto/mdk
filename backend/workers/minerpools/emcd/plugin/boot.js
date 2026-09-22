'use strict'

const { WorkerRuntime } = require('@tetherto/mdk-worker')
const EmcdMinerpoolManager = require('../lib/emcd.minerpool.manager')
const plugin = require('.')

/**
 * Boots an EMCD worker on the WorkerRuntime.
 *
 * The pool is one logical device whose deviceId equals `workerId`. All
 * configured accounts are aggregated behind that single device.
 *
 * @param {object} opts
 * @param {string} opts.workerId     one runtime process = one workerId
 * @param {string} opts.rack         rack identifier (pool store prefix)
 * @param {string} opts.storeDir     persistent store directory
 * @param {object} [opts.conf]       `{ emcd: { apiKey, apiSecret, accounts, apiUrl } }`
 * @param {string} [opts.root]       config root for the optional config/emcd.json overlay
 * @param {string} [opts.kernelTopic] Kernel discovery topic (hex)
 * @param {Array}  [opts.bootstrap]  DHT bootstrap override for hermetic tests
 */
async function startEmcdWorker (opts = {}) {
  assertBootOptions(opts)

  const pool = new EmcdMinerpoolManager(opts.conf, {
    rack: opts.rack,
    storeDir: opts.storeDir,
    root: opts.root
  })
  const services = { pool }

  let runtime
  const stop = async () => {
    try {
      await runtime?.stop()
    } finally {
      await new Promise(resolve => pool.stop(resolve))
    }
  }

  try {
    await pool.init()
    runtime = new WorkerRuntime(plugin, {
      workerId: opts.workerId,
      kernelTopic: opts.kernelTopic || null,
      bootstrap: opts.bootstrap || null,
      store: pool.store_s1,
      services,
      devices: [{ deviceId: opts.workerId, config: { pool } }]
    })
    await runtime.start()
  } catch (err) {
    await stop()
    throw err
  }

  return { runtime, pool, services, stop }
}

function assertBootOptions ({ workerId, rack, storeDir }) {
  if (!workerId) {
    throw new Error('ERR_WORKER_ID_REQUIRED')
  }
  if (!rack) {
    throw new Error('ERR_RACK_REQUIRED')
  }
  if (!storeDir) {
    throw new Error('ERR_STORE_DIR_REQUIRED')
  }
}

module.exports = { startEmcdWorker }
