'use strict'

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const net = require('net')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..')
const WORKERS = path.join(REPO_ROOT, 'backend', 'workers', 'minerpools')

const { createServer: createF2Mock } = require(path.join(WORKERS, 'f2pool', 'mock', 'server'))
const { F2_POOL } = require(path.join(WORKERS, 'f2pool'))

function freePort () {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

function closeMockApp (handle) {
  if (!handle || !handle.app || typeof handle.app.close !== 'function') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const done = (err) => (err ? reject(err) : resolve())
    const ret = handle.app.close(done)
    if (ret && typeof ret.then === 'function') ret.then(() => resolve(), reject)
  })
}

function stopPool (pool) {
  return new Promise((resolve) => pool.stop(resolve))
}

function tmpDir (prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

test('F2_POOL: fetchStats returns stats array with expected fields', async (t) => {
  const port = await freePort()
  const ACCOUNT = 'test-miner'
  const handle = createF2Mock({ host: '127.0.0.1', port, usernames: ACCOUNT })
  const storeDir = tmpDir('mdk-test-f2pool-stats-')

  const pool = new F2_POOL(
    { f2pool: { accounts: [ACCOUNT], apiUrl: `http://127.0.0.1:${port}`, apiSecret: 'secret-key' } },
    { rack: 'test', storeDir, root: storeDir }
  )
  await pool.init()
  pool._logErr = () => {}
  t.teardown(async () => {
    await stopPool(pool)
    await closeMockApp(handle)
    fs.rmSync(storeDir, { recursive: true, force: true })
  })

  await pool.fetchStats(new Date())
  const view = await pool.getWrkExtData({ query: { key: 'stats' } })

  t.ok(view, 'stats view returned')
  t.ok(Array.isArray(view.stats), 'stats is an array')
  t.ok(view.stats.length > 0, 'at least one stats row')

  const row = view.stats[0]
  t.ok('balance' in row || 'worker_count' in row || 'hashrate' in row || 'hashrate_24h' in row, 'stats row has expected fields')
})

test('F2_POOL: fetchWorkers returns workers list', async (t) => {
  const port = await freePort()
  const ACCOUNT = 'test-miner'
  const handle = createF2Mock({ host: '127.0.0.1', port, usernames: ACCOUNT })
  const storeDir = tmpDir('mdk-test-f2pool-workers-')

  const pool = new F2_POOL(
    { f2pool: { accounts: [ACCOUNT], apiUrl: `http://127.0.0.1:${port}`, apiSecret: 'secret-key' } },
    { rack: 'test', storeDir, root: storeDir }
  )
  await pool.init()
  pool._logErr = () => {}
  t.teardown(async () => {
    await stopPool(pool)
    await closeMockApp(handle)
    fs.rmSync(storeDir, { recursive: true, force: true })
  })

  await pool.fetchWorkers(new Date())
  const view = await pool.getWorkers({ offset: 0, limit: 50 })

  t.ok(view, 'workers view returned')
  t.ok(Array.isArray(view.workers), 'workers is an array')
})

test('F2_POOL: fetchTransactions returns queryable ext data', async (t) => {
  const port = await freePort()
  const ACCOUNT = 'test-miner'
  const handle = createF2Mock({ host: '127.0.0.1', port, usernames: ACCOUNT })
  const storeDir = tmpDir('mdk-test-f2pool-tx-')

  const pool = new F2_POOL(
    { f2pool: { accounts: [ACCOUNT], apiUrl: `http://127.0.0.1:${port}`, apiSecret: 'secret-key' } },
    { rack: 'test', storeDir, root: storeDir }
  )
  await pool.init()
  pool._logErr = () => {}
  t.teardown(async () => {
    await stopPool(pool)
    await closeMockApp(handle)
    fs.rmSync(storeDir, { recursive: true, force: true })
  })

  await pool.fetchTransactions()

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const txView = await pool.getWrkExtData({
    query: { key: 'transactions', start: dayStart.getTime(), end: Date.now() }
  })

  t.ok(txView !== undefined, 'transactions ext data returned')
})

test('F2_POOL: full fetch cycle matches f2pool/index.js example output shape', async (t) => {
  const port = await freePort()
  const ACCOUNT = 'test-miner'
  const handle = createF2Mock({ host: '127.0.0.1', port, usernames: ACCOUNT })
  const storeDir = tmpDir('mdk-test-f2pool-full-')

  const pool = new F2_POOL(
    { f2pool: { accounts: [ACCOUNT], apiUrl: `http://127.0.0.1:${port}`, apiSecret: 'secret-key' } },
    { rack: 'test', storeDir, root: storeDir }
  )
  await pool.init()
  pool._logErr = () => {}
  t.teardown(async () => {
    await stopPool(pool)
    await closeMockApp(handle)
    fs.rmSync(storeDir, { recursive: true, force: true })
  })

  const now = new Date()
  await pool.fetchWorkers(now)
  await pool.fetchStats(now)
  await pool.fetchTransactions()

  const statsView = await pool.getWrkExtData({ query: { key: 'stats' } })
  const workersView = await pool.getWorkers({ offset: 0, limit: 50 })

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const txView = await pool.getWrkExtData({
    query: { key: 'transactions', start: dayStart.getTime(), end: Date.now() }
  })

  t.ok(Array.isArray(statsView.stats), 'stats populated after full cycle')
  t.ok(Array.isArray(workersView.workers), 'workers populated after full cycle')
  t.ok(txView !== undefined, 'transactions populated after full cycle')
})
