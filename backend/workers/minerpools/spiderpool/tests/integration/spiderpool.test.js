'use strict'

const test = require('brittle')
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createServer } = require('../../mock/server')
const { SPIDER_POOL } = require('../../index')
const { TEST_ACCESS_KEY, TEST_PRIVATE_KEY } = require('../../mock/lib/test-keys')

let mockHandle
let mockServerPort
let storeDir

function freePort () {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
}

function makeConf () {
  return {
    spiderpool: {
      accounts: ['testuser'],
      accessKey: TEST_ACCESS_KEY,
      privateKey: TEST_PRIVATE_KEY,
      apiUrl: `http://127.0.0.1:${mockServerPort}`
    }
  }
}

test('setup: start mock server and temp store', async (t) => {
  mockServerPort = await freePort()
  storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spiderpool-test-'))

  mockHandle = createServer({
    port: mockServerPort,
    host: '127.0.0.1',
    usernames: 'testuser',
    delay: 0
  })

  await new Promise((resolve) => setTimeout(resolve, 150))
  t.pass(`mock on ${mockServerPort}, store ${storeDir}`)
})

test('SpiderMinerpoolManager: fetchWorkers then getWorkers adds poolType', async (t) => {
  const pool = new SPIDER_POOL(makeConf(), { rack: 'rack-1', storeDir, root: storeDir })
  await pool.init()
  await pool.fetchWorkers(new Date())
  const res = await pool.getWorkers({ offset: 0, limit: 100 })
  t.ok(res.workers.length > 0, 'workers from mock')
  t.ok(res.workers.every((w) => w.poolType === 'spiderpool'), 'poolType on each row')
  t.ok(res.workers.every((w) => typeof w.hashrate === 'number'), 'hashrates parsed to numbers')
  await new Promise((resolve) => pool.stop(resolve))
})

test('SpiderMinerpoolManager: getWrkExtData stats key returns live stats with poolType', async (t) => {
  const pool = new SPIDER_POOL(makeConf(), { rack: 'rack-2', storeDir, root: storeDir })
  await pool.init()
  await pool.fetchStats(new Date())
  const data = await pool.getWrkExtData({
    query: { key: 'stats' }
  })
  t.ok(data.stats)
  t.ok(data.stats.length > 0)
  t.ok(data.stats.every((s) => s.poolType === 'spiderpool'))
  t.ok(data.stats.every((s) => typeof s.hashrate === 'number' && s.hashrate > 0))
  await new Promise((resolve) => pool.stop(resolve))
})

test('SpiderMinerpoolManager: fetchTransactions stores mapped payouts', async (t) => {
  const pool = new SPIDER_POOL(makeConf(), { rack: 'rack-3', storeDir, root: storeDir })
  await pool.init()
  await pool.fetchTransactions()
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const txs = await pool.getWrkExtData({
    query: { key: 'transactions', start: dayStart.getTime(), end: Date.now() }
  })
  t.ok(Array.isArray(txs))
  const rows = txs.reduce((all, bucket) => all.concat(bucket.transactions || []), [])
  t.ok(rows.every((tx) => tx.type === 'payout' && typeof tx.changed_balance === 'number'))
  await new Promise((resolve) => pool.stop(resolve))
})

test('teardown: close mock and remove store dir', async (t) => {
  if (mockHandle && mockHandle.app) {
    await mockHandle.app.close()
  }
  if (storeDir && fs.existsSync(storeDir)) {
    fs.rmSync(storeDir, { recursive: true, force: true })
  }
  t.pass('cleaned up')
})
