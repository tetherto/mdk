'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { createServer } = require('../../packages/minerpools/ocean/mock/server')
const { OCEAN_POOL } = require('../../packages/minerpools/ocean/index')
const { setTimeout: sleep } = require('timers/promises')

const MOCK_USER = 'test'

const stopMock = (app) => {
  if (!app || typeof app.close !== 'function') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const done = (err) => (err ? reject(err) : resolve())
    const ret = app.close(done)
    if (ret && typeof ret.then === 'function') {
      ret.then(() => resolve(), reject)
    }
  })
}

async function main () {
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-sample-ocean-'))
  let mockHandle

  try {
    const port = 8000
    mockHandle = createServer({
      port,
      host: '127.0.0.1',
      delay: 0
    })
    await sleep(200)

    const pool = new OCEAN_POOL(
      {
        ocean: {
          accounts: [MOCK_USER],
          apiUrl: `http://127.0.0.1:${port}`
        }
      },
      { rack: 'sample-rack', storeDir, root: storeDir }
    )

    await pool.init()

    pool._logErr = () => {}
    const now = new Date()
    await pool.fetchWorkers(now)
    await pool.fetchStats(now)
    await pool.fetchTransactions()
    await pool.fetchBlocks()

    const statsView = await pool.getWrkExtData({ query: { key: 'stats' } })
    const workersView = await pool.getWorkers({ offset: 0, limit: 50 })

    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const txView = await pool.getWrkExtData({
      query: {
        key: 'transactions',
        start: dayStart.getTime(),
        end: Date.now()
      }
    })

    const blocksView = await pool.getWrkExtData({
      query: {
        key: 'blocks',
        start: 1,
        end: Date.now()
      }
    })

    console.log('=== Ocean mock @', `http://127.0.0.1:${port}`, '===\n')
    console.log('--- getWrkExtData(key: stats) ---')
    console.log(JSON.stringify(statsView, null, 2))
    console.log('\n--- getWorkers (after fetchWorkers) ---')
    console.log(JSON.stringify(workersView, null, 2))
    console.log('\n--- getWrkExtData(key: transactions, today) ---')
    console.log(JSON.stringify(txView, null, 2))
    console.log('\n--- getWrkExtData(key: blocks) ---')
    console.log(JSON.stringify(blocksView, null, 2))

    await new Promise((resolve) => pool.stop(resolve))
  } finally {
    await stopMock(mockHandle && mockHandle.app)
    if (fs.existsSync(storeDir)) {
      fs.rmSync(storeDir, { recursive: true, force: true })
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
