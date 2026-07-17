'use strict'

const os = require('os')
const fs = require('fs')
const path = require('path')

// Prefer a local config copy if present; otherwise fall back to the committed
// example so the project runs clone-and-run with zero setup (and is runnable by
// examples/backend/run-examples.js). The .example file is read+parsed manually
// because require() only treats a .json extension as JSON.
const LOCAL_CONFIG = path.join(__dirname, 'config', 'mdk.config.json')
const EXAMPLE_CONFIG = path.join(__dirname, 'config', 'mdk.config.json.example')
const config = fs.existsSync(LOCAL_CONFIG)
  ? require(LOCAL_CONFIG)
  : JSON.parse(fs.readFileSync(EXAMPLE_CONFIG, 'utf8'))

// This example lives under examples/backend/minerpools/ocean/, so the repo root is
// four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { createServer } = require(path.join(REPO_ROOT, 'backend', 'workers', 'minerpools', 'ocean', 'mock', 'server'))
const { OCEAN_POOL } = require(path.join(REPO_ROOT, 'backend', 'workers', 'minerpools', 'ocean'))

const EXAMPLE_TMP = path.join(os.tmpdir(), 'mdk-site-ocean')
const STORE_DIR = path.join(EXAMPLE_TMP, 'store')

const ths = (hps) => (typeof hps === 'number' ? `${(hps / 1e12).toFixed(2)} TH/s` : 'n/a')

const main = async () => {
  const host = config.mock?.host || '127.0.0.1'
  const port = config.mock?.port || 5020
  const accounts = Array.isArray(config.accounts) && config.accounts.length ? config.accounts : ['test']
  const apiUrl = `http://${host}:${port}`

  fs.mkdirSync(STORE_DIR, { recursive: true })

  // The Ocean mock serves the Ocean.xyz REST API with canned data, so no real
  // pool account or network access is needed.
  const mock = createServer({ host, port, delay: 0 })

  // NOTE: minerpools are not (yet) wired into the Kernel/MDK thing model — the
  // OceanMinerpoolManager is config-driven (accounts + apiUrl) and is not a
  // ThingManager, so there is no Kernel, gateway or registerThing here. We drive
  // the pool manager directly, exactly as it runs inside a worker process.
  const pool = new OCEAN_POOL(
    { ocean: { accounts, apiUrl } },
    { rack: 'rack-ocean', storeDir: STORE_DIR, root: STORE_DIR }
  )
  await pool.init()
  pool._logErr = () => {}

  let shuttingDown = false
  const shutdown = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('[mdk-ocean]', `Received ${signal}, shutting down...`)
    setTimeout(() => process.exit(0), 5000).unref()
    try { await new Promise((resolve) => pool.stop(resolve)) } catch (err) { console.error('[mdk-ocean]', 'pool stop error:', err) }
    try { mock.app.close() } catch (err) { console.error('[mdk-ocean]', 'mock close error:', err) }
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  console.log('[mdk-ocean]', `Ocean mock @ ${apiUrl} — accounts: ${accounts.join(', ')}`)

  // Pull everything the pool exposes from the mock API into the local store.
  const now = new Date()
  await pool.fetchWorkers(now)
  await pool.fetchStats(now)
  await pool.fetchTransactions()
  await pool.fetchBlocks()

  const stats = await pool.getWrkExtData({ query: { key: 'stats' } })
  const workers = await pool.getWorkers({ offset: 0, limit: 50 })
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const txs = await pool.getWrkExtData({ query: { key: 'transactions', start: dayStart.getTime(), end: Date.now() } })
  const blocks = await pool.getWrkExtData({ query: { key: 'blocks', start: 1, end: Date.now() } })

  const statRow = stats?.stats?.[0] || {}
  const workerList = workers?.workers || []
  const blockList = blocks?.blocksData?.blocks || []
  const txCount = (Array.isArray(txs) ? txs : []).reduce((n, bucket) => n + (bucket?.transactions?.length || 0), 0)

  console.log('[mdk-ocean]', 'Pool snapshot:')
  console.log('[mdk-ocean]', `  hashrate (24h):  ${ths(statRow.hashrate_24h ?? statRow.hashrate)}`)
  console.log('[mdk-ocean]', `  workers:         ${statRow.worker_count ?? workerList.length} total, ${statRow.active_workers_count ?? 'n/a'} online`)
  console.log('[mdk-ocean]', `  balance:         ${statRow.balance ?? 'n/a'} BTC`)
  console.log('[mdk-ocean]', `  est. today:      ${statRow.estimated_today_income ?? 'n/a'} BTC`)
  console.log('[mdk-ocean]', `  transactions (today): ${txCount}`)
  console.log('[mdk-ocean]', `  blocks:          ${blockList.length}`)

  console.log('[mdk-ocean]', 'Pool worker is live against the mock. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-ocean] Fatal:', err)
  process.exit(1)
})
