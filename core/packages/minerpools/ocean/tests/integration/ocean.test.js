'use strict'

const test = require('brittle')
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createServer } = require('../../mock/server')
const { OCEAN_POOL } = require('../../index')

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

test('setup: start mock server and temp store', async (t) => {
  mockServerPort = await freePort()
  storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocean-test-'))

  mockHandle = createServer({
    port: mockServerPort,
    host: '127.0.0.1',
    delay: 0
  })

  await new Promise((resolve) => setTimeout(resolve, 150))
  t.pass(`mock on ${mockServerPort}, store ${storeDir}`)
})

test('MinerPoolOcean: fetchWorkers then getWorkers adds poolType', async (t) => {
  const pool = new OCEAN_POOL(
    {
      ocean: {
        accounts: ['test'],
        apiUrl: `http://127.0.0.1:${mockServerPort}`
      }
    },
    { rack: 'rack-1', storeDir, root: storeDir }
  )
  await pool.init()
  await pool.fetchWorkers(new Date())
  const res = await pool.getWorkers({ offset: 0, limit: 100 })
  t.ok(res.workers.length > 0, 'workers from mock')
  t.ok(res.workers.every((w) => w.poolType === 'ocean'), 'poolType on each row')
  await new Promise((resolve) => pool.stop(resolve))
})

test('MinerPoolOcean: getWrkExtData stats key returns live stats with poolType', async (t) => {
  const pool = new OCEAN_POOL(
    {
      ocean: {
        accounts: ['test'],
        apiUrl: `http://127.0.0.1:${mockServerPort}`
      }
    },
    { rack: 'rack-2', storeDir, root: storeDir }
  )
  await pool.init()
  await pool.fetchStats(new Date())
  const data = await pool.getWrkExtData({
    query: { key: 'stats' }
  })
  t.ok(data.stats)
  t.ok(data.stats.length > 0)
  t.ok(data.stats.every((s) => s.poolType === 'ocean'))
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
