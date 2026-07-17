'use strict'

const os = require('os')
const fs = require('fs')
const path = require('path')

// This example lives under examples/backend/minerpools/f2pool/, so the repo root
// is four levels up. Everything is required from backend/ — the canonical source tree.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { createServer } = require(path.join(REPO_ROOT, 'backend', 'workers', 'minerpools', 'f2pool', 'mock', 'server'))
const { F2_POOL } = require(path.join(REPO_ROOT, 'backend', 'workers', 'minerpools', 'f2pool'))

const HOST = '127.0.0.1'
const PORT = 5063
const ACCOUNT = 'haven7346'

const ths = (hps) => (typeof hps === 'number' ? `${(hps / 1e12).toFixed(2)} TH/s` : 'n/a')

const main = async () => {
  const apiUrl = `http://${HOST}:${PORT}`
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-f2pool-'))

  // The mock serves the F2Pool REST API with canned data — no real account or
  // network access is needed.
  const mock = createServer({ host: HOST, port: PORT, usernames: ACCOUNT })

  // Minerpools are not wired into the Kernel/MDK thing model — F2PoolMinerpoolManager
  // is config-driven (accounts + apiUrl) and is not a ThingManager — so we drive
  // the pool manager directly, exactly as it runs inside a worker process.
  const pool = new F2_POOL(
    { f2pool: { accounts: [ACCOUNT], apiUrl, apiSecret: 'secret-key' } },
    { rack: 'rack-f2pool', storeDir, root: storeDir }
  )
  await pool.init()
  pool._logErr = () => {}

  const now = new Date()
  await pool.fetchWorkers(now)
  await pool.fetchStats(now)
  await pool.fetchTransactions()

  const stats = await pool.getWrkExtData({ query: { key: 'stats' } })
  const workers = await pool.getWorkers({ offset: 0, limit: 50 })
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const txs = await pool.getWrkExtData({ query: { key: 'transactions', start: dayStart.getTime(), end: Date.now() } })

  const statRow = stats?.stats?.[0] || {}
  const workerList = workers?.workers || []
  const txCount = (Array.isArray(txs) ? txs : []).reduce((n, bucket) => n + (bucket?.transactions?.length || 0), 0)

  console.log('[mdk-f2pool]', `F2Pool mock @ ${apiUrl} — account: ${ACCOUNT}`)
  console.log('[mdk-f2pool]', 'Pool snapshot:')
  console.log('[mdk-f2pool]', `  hashrate:    ${ths(statRow.hashrate ?? statRow.hashrate_24h)}`)
  console.log('[mdk-f2pool]', `  workers:     ${statRow.worker_count ?? workerList.length} total, ${statRow.active_workers_count ?? 'n/a'} online`)
  console.log('[mdk-f2pool]', `  balance:     ${statRow.balance ?? 'n/a'} BTC`)
  console.log('[mdk-f2pool]', `  transactions (today): ${txCount}`)

  await new Promise((resolve) => pool.stop(resolve))
  if (mock && mock.app && typeof mock.app.close === 'function') mock.app.close()
  fs.rmSync(storeDir, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('[mdk-site-f2pool] Fatal:', err)
  process.exit(1)
})
