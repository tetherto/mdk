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

const { createServer } = require('@tetherto/mdk-worker-spiderpool/mock/server')
const { TEST_ACCESS_KEY, TEST_PRIVATE_KEY } = require('@tetherto/mdk-worker-spiderpool/mock/lib/test-keys')
const { SPIDER_POOL } = require('@tetherto/mdk-worker-spiderpool')

const ths = (hps) => (typeof hps === 'number' ? `${(hps / 1e12).toFixed(2)} TH/s` : 'n/a')

const main = async () => {
  const host = config.mock?.host || '127.0.0.1'
  const port = config.mock?.port || 5064
  const accounts = Array.isArray(config.accounts) && config.accounts.length ? config.accounts : ['spider-test']
  const apiUrl = `http://${host}:${port}`
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-spiderpool-'))

  // The mock serves the SpiderPool REST API with canned data and verifies the
  // real MD5withRSA request signing against a bundled test keypair — no real
  // subaccount or network access is needed.
  const mock = createServer({ host, port, usernames: accounts, delay: 0 })

  // Minerpools are not wired into the Kernel/MDK thing model — SpiderMinerpoolManager
  // is config-driven (accounts + accessKey + privateKey + apiUrl) and is not a
  // ThingManager — so we drive the pool manager directly, exactly as it runs
  // inside a worker process.
  const pool = new SPIDER_POOL(
    { spiderpool: { accounts, apiUrl, accessKey: TEST_ACCESS_KEY, privateKey: TEST_PRIVATE_KEY } },
    { rack: 'rack-spiderpool', storeDir, root: storeDir }
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

  console.log('[mdk-spiderpool]', `SpiderPool mock @ ${apiUrl} — accounts: ${accounts.join(', ')}`)
  console.log('[mdk-spiderpool]', 'Pool snapshot:')
  console.log('[mdk-spiderpool]', `  hashrate:    ${ths(statRow.hashrate ?? statRow.hashrate_24h)}`)
  console.log('[mdk-spiderpool]', `  workers:     ${statRow.worker_count ?? workerList.length} total, ${statRow.active_workers_count ?? 'n/a'} online`)
  console.log('[mdk-spiderpool]', `  balance:     ${statRow.balance ?? 'n/a'} BTC`)
  console.log('[mdk-spiderpool]', `  est. today:  ${statRow.estimated_today_income ?? 'n/a'} BTC`)
  console.log('[mdk-spiderpool]', `  transactions (today): ${txCount}`)

  await new Promise((resolve) => pool.stop(resolve))
  if (mock && mock.app && typeof mock.app.close === 'function') mock.app.close()
  fs.rmSync(storeDir, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('[mdk-site-spiderpool] Fatal:', err)
  process.exit(1)
})
