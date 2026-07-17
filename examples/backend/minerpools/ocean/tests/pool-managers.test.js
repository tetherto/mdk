'use strict'

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const net = require('net')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..')
const WORKERS = path.join(REPO_ROOT, 'backend', 'workers', 'minerpools')

const { createServer: createOceanMock } = require(path.join(WORKERS, 'ocean', 'mock', 'server'))
const { OCEAN_POOL } = require(path.join(WORKERS, 'ocean'))

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

test('OCEAN_POOL: fetchStats returns stats array with username and hashrate fields', async (t) => {
  const port = await freePort()
  const handle = createOceanMock({ port, host: '127.0.0.1', delay: 0 })
  const storeDir = tmpDir('mdk-test-ocean-stats-')

  const pool = new OCEAN_POOL(
    { ocean: { accounts: ['test'], apiUrl: `http://127.0.0.1:${port}` } },
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
  t.ok(typeof row.username === 'string', 'stats row has username')
  t.ok('hashrate' in row || 'hashrate_24h' in row, 'stats row has a hashrate field')
})

test('OCEAN_POOL: fetchWorkers returns workers list with name and online fields', async (t) => {
  const port = await freePort()
  const handle = createOceanMock({ port, host: '127.0.0.1', delay: 0 })
  const storeDir = tmpDir('mdk-test-ocean-workers-')

  const pool = new OCEAN_POOL(
    { ocean: { accounts: ['test'], apiUrl: `http://127.0.0.1:${port}` } },
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
  t.ok(view.workers.length > 0, 'at least one worker')

  const w = view.workers[0]
  t.ok(typeof w.name === 'string', 'worker has name')
  t.ok('online' in w, 'worker has online field')
})

test('OCEAN_POOL: fetchTransactions and fetchBlocks return queryable ext data', async (t) => {
  const port = await freePort()
  const handle = createOceanMock({ port, host: '127.0.0.1', delay: 0 })
  const storeDir = tmpDir('mdk-test-ocean-txblk-')

  const pool = new OCEAN_POOL(
    { ocean: { accounts: ['test'], apiUrl: `http://127.0.0.1:${port}` } },
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
  await pool.fetchBlocks()

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const txView = await pool.getWrkExtData({
    query: { key: 'transactions', start: dayStart.getTime(), end: Date.now() }
  })
  t.ok(txView !== undefined, 'transactions ext data returned')

  const blocksView = await pool.getWrkExtData({
    query: { key: 'blocks', start: 1, end: Date.now() }
  })
  t.ok(blocksView !== undefined, 'blocks ext data returned')
  t.ok(blocksView.blocksData !== undefined || Array.isArray(blocksView), 'blocks data has expected shape')
})

test('OCEAN_POOL: full fetch cycle matches mdk.client.ocean.js example output shape', async (t) => {
  const port = await freePort()
  const handle = createOceanMock({ port, host: '127.0.0.1', delay: 0 })
  const storeDir = tmpDir('mdk-test-ocean-full-')

  const pool = new OCEAN_POOL(
    { ocean: { accounts: ['test'], apiUrl: `http://127.0.0.1:${port}` } },
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
  await pool.fetchBlocks()

  const statsView = await pool.getWrkExtData({ query: { key: 'stats' } })
  const workersView = await pool.getWorkers({ offset: 0, limit: 50 })

  t.ok(statsView.stats.length > 0, 'stats populated after full cycle')
  t.ok(workersView.workers.length > 0, 'workers populated after full cycle')
})
