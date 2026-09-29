'use strict'

const fs = require('fs')
const path = require('path')
const debug = require('debug')('mdk:example:full-site:remote-ocean')
const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const WorkerRuntime = require('../../../backend/core/mdk-worker/lib/worker-runtime')
const plugin = require('../../../backend/workers/minerpools/ocean/plugin')

const HRPC_ERR = '[HRPC_ERR]='
const DEFAULT_REFRESH_MS = 15000
const DEFAULT_TIMEOUT_MS = 15000

// The remote's firewall is a public-key allowlist (hp-svc-facs-net buildFirewall),
// so this side needs a *stable* identity: a random keypair per boot would be rejected
// after the first restart. The seed is persisted next to the rest of the example state.
function clientKeyPair (seedFile) {
  let seed
  if (fs.existsSync(seedFile)) {
    seed = Buffer.from(fs.readFileSync(seedFile, 'utf8').trim(), 'hex')
  } else {
    seed = require('crypto').randomBytes(32)
    fs.mkdirSync(path.dirname(seedFile), { recursive: true })
    fs.writeFileSync(seedFile, seed.toString('hex'))
  }
  return DHT.keyPair(seed)
}

/**
 * Read-only proxy for the remote pool worker. Implements the slice of
 * OceanMinerpoolManager the runtime and the ocean plugin actually touch:
 *
 *   getWrkExtData(req) — the `pool` telemetry builtin (service-builtins.js), which is
 *                        what the site plugin's overview (`stats`) and history
 *                        (`stats-history`) controllers call.
 *   getWorkers(query)  — same shape the local manager returns.
 *   data               — the plugin's contract telemetry handlers (hashrate, balance,
 *                        workers_online, estimated_earnings) read `device.data.*`
 *                        synchronously, so it is kept warm by refresh().
 */
class RemoteOceanPool {
  constructor (conf, ctx) {
    conf = conf || {}
    if (!conf.serverKey) throw new Error('ERR_REMOTE_SERVER_KEY_REQUIRED')

    this.isRemote = true
    this.serverKey = Buffer.from(conf.serverKey, 'hex')
    this.refreshMs = conf.refreshMs || DEFAULT_REFRESH_MS
    this.timeoutMs = conf.timeoutMs || DEFAULT_TIMEOUT_MS
    this.seedFile = (ctx && ctx.seedFile) || null

    this._rpc = null
    this._dht = null
    this._timer = null

    // Same initial shape as PoolService, so a handler reading `.stats` before the
    // first refresh lands gets an empty list rather than a TypeError.
    this.data = {
      statsData: {},
      workersData: { ts: 0, workers: [] }
    }
  }

  async init () {
    const keyPair = clientKeyPair(this.seedFile)
    this.clientKey = keyPair.publicKey.toString('hex')

    this._dht = new DHT({ keyPair })
    this._rpc = new RPC({ dht: this._dht, keyPair })

    debug('bridge client key %s → remote %s…', this.clientKey.slice(0, 16), this.serverKey.toString('hex').slice(0, 16))

    // Fail loudly at boot rather than leaving an empty pool card in the UI: if the
    // remote is down or this key is not on its allowlist, that is the one thing the
    // operator has to fix, and the message says exactly how.
    await this.refresh()

    this._timer = setInterval(() => {
      this.refresh().catch((e) => debug('refresh failed: %s', e.message))
    }, this.refreshMs)
    this._timer.unref()
  }

  async _request (query) {
    let res
    try {
      res = await this._rpc.request(
        this.serverKey,
        'getWrkExtData',
        Buffer.from(JSON.stringify({ query })),
        { timeout: this.timeoutMs }
      )
    } catch (err) {
      // CHANNEL_CLOSED is what a firewall rejection looks like from this side — the
      // remote accepts the connection then drops it, with no protocol-level reason.
      if (err.code === 'CHANNEL_CLOSED' || /channel closed/i.test(err.message)) {
        throw new Error(
          `ERR_REMOTE_POOL_REJECTED: ${this.serverKey.toString('hex').slice(0, 16)}… closed the channel. ` +
          `Add "${this.clientKey}" to r0.allow in the pool worker's config/facs/net.config.json and restart it.`
        )
      }
      throw err
    }

    const parsed = JSON.parse(res.toString())
    if (typeof parsed === 'string' && parsed.startsWith(HRPC_ERR)) {
      throw new Error(`ERR_REMOTE_POOL: ${parsed.slice(HRPC_ERR.length)}`)
    }
    return parsed
  }

  // The runtime's pool builtin calls this with the query the gateway sent, so every
  // key the remote supports (stats, stats-history, workers, blocks, transactions, and
  // the DATUM keys this worker adds) passes straight through untouched.
  async getWrkExtData (req) {
    const query = req && req.query
    if (!query) throw new Error('ERR_QUERY_INVALID')
    if (!query.key) throw new Error('ERR_KEY_INVALID')

    const data = await this._request(query)

    // Opportunistically warm the handler cache off traffic we were making anyway.
    if (query.key === 'stats' && data && Array.isArray(data.stats)) this.data.statsData = data

    return data
  }

  async getWorkers (query) {
    return this._request({ key: 'workers', offset: 0, limit: 100, ...(query || {}) })
  }

  async refresh () {
    const stats = await this._request({ key: 'stats' })
    if (stats && Array.isArray(stats.stats)) this.data.statsData = stats

    const workers = await this._request({ key: 'workers', offset: 0, limit: 1000 })
    if (workers && Array.isArray(workers.workers)) this.data.workersData = workers

    debug('refreshed: %d account(s), %d worker(s)',
      (this.data.statsData.stats || []).length,
      (this.data.workersData.workers || []).length)
  }

  async stop () {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
  }
}

/**
 * Drop-in replacement for startOceanPoolWorker that backs the pool device with the
 * remote worker instead of a local manager + mock. Same opts and same returned handle,
 * so backend/site.js's bootWorker path is unchanged.
 *
 * opts:
 *   workerId  (required) one runtime process = one workerId
 *   storeDir  (required) persistent store directory (runtime RPC/DHT seeds)
 *   conf      { ocean: { serverKey, refreshMs, timeoutMs } }
 *   rack      accepted for parity with startOceanPoolWorker; unused (the remote
 *             worker owns its own rack and store)
 *   kernelTopic / bootstrap  forwarded to the runtime
 */
async function startRemoteOceanPoolWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const pool = new RemoteOceanPool((opts.conf || {}).ocean, {
    seedFile: opts.seedFile || path.join(opts.storeDir, '.bridge-client-seed')
  })
  await pool.init()

  const services = { pool }
  const runtime = new WorkerRuntime(plugin, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    bootstrap: opts.bootstrap || null,
    storeDir: opts.storeDir,
    services,
    devices: [{ deviceId: opts.workerId, config: { pool } }]
  })

  await runtime.start()

  debug('remote ocean pool worker %s up (bridged to %s…)', opts.workerId, pool.serverKey.toString('hex').slice(0, 16))

  return {
    runtime,
    pool,
    services,
    stop: async () => {
      await runtime.stop()
      await pool.stop()
    }
  }
}

module.exports = { RemoteOceanPool, startRemoteOceanPoolWorker, clientKeyPair }
