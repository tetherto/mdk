'use strict'

// Functional check for the running Ocean minerpool example.
//
// While the example (index.js) is running in another terminal — keeping the mock
// Ocean API alive on its port — this spins up its own OCEAN_POOL manager against
// that same mock and pulls stats, workers, transactions and blocks, proving the
// pool worker fetches and stores data correctly.
//
// Minerpools are not (yet) wired into the ORK/MDK thing model, so there is no IPC
// socket to query (unlike the miner/container examples). We exercise the pool
// manager directly, which is how it runs inside a worker process today.
//
// Usage:
//   node index.js          # terminal 1 (leave running — keeps the mock up)
//   node verify.js         # terminal 2

const os = require('os')
const fs = require('fs')
const path = require('path')

const LOCAL_CONFIG = path.join(__dirname, 'config', 'mdk.config.json')
const EXAMPLE_CONFIG = path.join(__dirname, 'config', 'mdk.config.json.example')
const config = fs.existsSync(LOCAL_CONFIG)
  ? require(LOCAL_CONFIG)
  : JSON.parse(fs.readFileSync(EXAMPLE_CONFIG, 'utf8'))

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const { OCEAN_POOL } = require(path.join(REPO_ROOT, 'backend', 'workers', 'minerpools', 'ocean'))

const ths = (hps) => (typeof hps === 'number' ? `${(hps / 1e12).toFixed(2)} TH/s` : 'n/a')

const main = async () => {
  const host = config.mock?.host || '127.0.0.1'
  const port = config.mock?.port || 5020
  const accounts = Array.isArray(config.accounts) && config.accounts.length ? config.accounts : ['test']
  const apiUrl = `http://${host}:${port}`

  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-ocean-verify-'))
  const pool = new OCEAN_POOL(
    { ocean: { accounts, apiUrl } },
    { rack: 'rack-ocean-verify', storeDir, root: storeDir }
  )
  await pool.init()
  pool._logErr = () => {}

  const now = new Date()
  try {
    await pool.fetchWorkers(now)
    await pool.fetchStats(now)
    await pool.fetchTransactions()
    await pool.fetchBlocks()
  } catch (err) {
    console.error(`Could not reach the Ocean mock at ${apiUrl}`)
    console.error('Is the example running? Start it with `node index.js` first.')
    await new Promise((resolve) => pool.stop(resolve))
    fs.rmSync(storeDir, { recursive: true, force: true })
    throw err
  }

  const stats = await pool.getWrkExtData({ query: { key: 'stats' } })
  const workers = await pool.getWorkers({ offset: 0, limit: 50 })
  const blocks = await pool.getWrkExtData({ query: { key: 'blocks', start: 1, end: Date.now() } })

  for (const account of accounts) {
    const row = (stats?.stats || []).find(s => s.username === account) || {}
    const list = (workers?.workers || []).filter(w => w.username === account)
    console.log(`\nOcean account: ${account}`)
    console.log(`  hashrate: 5m=${ths(row.hashrate)} 1h=${ths(row.hashrate_1h)} 24h=${ths(row.hashrate_24h)}`)
    console.log(`  workers:  ${row.worker_count ?? list.length} total, ${row.active_workers_count ?? 'n/a'} online`)
    console.log(`  balance:  ${row.balance ?? 'n/a'} BTC   (est. today ${row.estimated_today_income ?? 'n/a'} BTC)`)
    for (const w of list) {
      console.log(`    └─ ${w.name}  online=${w.online}  ${ths(w.hashrate)}`)
    }
  }

  console.log(`\nblocks found: ${(blocks?.blocksData?.blocks || []).length}`)
  console.log('\nOK — Ocean pool worker is fetching live data from the mock API.\n')

  await new Promise((resolve) => pool.stop(resolve))
  fs.rmSync(storeDir, { recursive: true, force: true })
}

main().catch((err) => { console.error('\nverify failed:', err.message); process.exit(1) })
