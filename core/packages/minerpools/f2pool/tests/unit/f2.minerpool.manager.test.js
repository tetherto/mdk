'use strict'

const test = require('brittle')
const { F2_POOL } = require('../../index')
const { POOL_TYPE } = require('../../lib/utils/constants')
const { SCHEDULER_TIMES, BTC_SATS, HOUR_MS } = require('../../../../tpls/tpl-lib-minerpool/lib/utils/constants')

function makeReadStreamDb (entries) {
  return {
    createReadStream () {
      return (async function * () {
        for (const e of entries) {
          yield { value: Buffer.from(JSON.stringify(e)) }
        }
      })()
    }
  }
}

function newPool () {
  return new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
}

test('filterWorkers respects offset, limit, and max 100', (t) => {
  const pool = new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
  const w = Array.from({ length: 120 }, (_, i) => ({ n: i }))
  t.is(pool.filterWorkers(w, 0, 50).length, 50)
  t.is(pool.filterWorkers(w, 10, 200).length, 100)
  t.is(pool.filterWorkers(w, 115, 10).length, 5)
})

test('appendPoolType tags rows', (t) => {
  const pool = new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
  const rows = [{ name: 'a' }]
  const out = pool.appendPoolType(rows)
  t.is(out[0].poolType, POOL_TYPE)
  t.is(out[0].name, 'a')
})

test('_getIntervalMs maps interval keys', (t) => {
  const pool = new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
  t.is(pool._getIntervalMs('1D'), 24 * 60 * 60 * 1000)
  t.is(pool._getIntervalMs('3h'), 3 * 60 * 60 * 1000)
  t.is(pool._getIntervalMs('30m'), 30 * 60 * 1000)
  t.is(pool._getIntervalMs('5m'), 5 * 60 * 1000)
  t.is(pool._getIntervalMs(undefined), 5 * 60 * 1000)
})

test('_avg rolling average', (t) => {
  const pool = new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
  t.is(pool._avg(0, 10, 1), 10)
  t.is(pool._avg(10, 20, 2), 15)
})

test('_aggrByInterval buckets stats by interval', (t) => {
  const pool = new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
  const intervalMs = 5 * 60 * 1000
  const data = [
    {
      ts: intervalMs * 2,
      stats: [{ hashrate: 100, username: 'u' }]
    },
    {
      ts: intervalMs * 2 + 1000,
      stats: [{ hashrate: 200, username: 'u' }]
    }
  ]
  const out = pool._aggrByInterval(data, '5m')
  t.ok(Array.isArray(out))
  t.ok(out.length >= 1)
})

test('getHttpUrl returns f2pool apiUrl', (t) => {
  const pool = newPool()
  t.is(pool.getHttpUrl(), 'http://localhost')
})

test('_saveToDb writes JSON buffer at key', async (t) => {
  const pool = newPool()
  const calls = []
  const db = {
    put: async (key, buf) => {
      calls.push({ key, json: JSON.parse(buf.toString()) })
    }
  }
  await pool._saveToDb(db, 42, { a: 1 })
  t.is(calls.length, 1)
  t.is(calls[0].json.a, 1)
})

test('getDbData reads stream entries', async (t) => {
  const pool = newPool()
  const start = 10
  const end = 20
  const db = makeReadStreamDb([{ row: 1 }, { row: 2 }])
  const out = await pool.getDbData(db, { start, end })
  t.is(out.length, 2)
  t.is(out[0].row, 1)
})

test('getDbData throws when start or end missing', async (t) => {
  const pool = newPool()
  await t.exception(pool.getDbData({}, { end: 1 }), /ERR_START_INVALID/)
  await t.exception(pool.getDbData({}, { start: 1 }), /ERR_END_INVALID/)
})

test('_projection filters array and single object', (t) => {
  const pool = newPool()
  const rows = [{ a: 1, b: 2 }, { a: 3 }]
  const arr = pool._projection(rows, { a: 1 })
  t.is(arr.length, 2)
  t.is(arr[0].a, 1)
  const one = pool._projection({ x: 9, y: 8 }, { x: 1 })
  t.is(one.x, 9)
  t.is(one.y, undefined)
})

test('_aggrTransactions empty hourly when no time range', (t) => {
  const pool = newPool()
  const out = pool._aggrTransactions([], { start: 100, end: 50 })
  t.ok(Array.isArray(out.hourlyRevenues))
  t.is(out.hourlyRevenues.length, 0)
})

test('_aggrTransactions distributes revenue across hours', (t) => {
  const pool = newPool()
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + 2 * HOUR_MS
  const data = [{
    transactions: [{ satoshis_net_earned: BTC_SATS }]
  }]
  const out = pool._aggrTransactions(data, { start, end })
  t.ok(out.hourlyRevenues.length >= 1)
  t.ok(out.hourlyRevenues[0].revenue > 0)
})

test('getWorkers without start/end uses in-memory workers', async (t) => {
  const pool = newPool()
  pool.data.workersData = {
    workers: [{ name: 'w1' }, { name: 'w2' }]
  }
  const res = await pool.getWorkers({ offset: 0, limit: 10 })
  t.is(res.workers.length, 2)
  t.is(res.workers[0].poolType, POOL_TYPE)
})

test('getWorkers with start/end aggregates from db', async (t) => {
  const pool = newPool()
  pool.workersDb = makeReadStreamDb([
    { ts: 1, workers: [{ name: 'a' }, { name: 'b' }] }
  ])
  const res = await pool.getWorkers({ start: 1, end: 2, offset: 0, limit: 10 })
  t.is(res.length, 1)
  t.is(res[0].workers[0].poolType, POOL_TYPE)
})

test('getWorkers filters by name when provided', async (t) => {
  const pool = newPool()
  pool.workersDb = makeReadStreamDb([
    { ts: 1, workers: [{ name: 'keep' }, { name: 'drop' }] }
  ])
  const res = await pool.getWorkers({ start: 1, end: 2, name: 'keep' })
  t.is(res[0].workers.length, 1)
  t.is(res[0].workers[0].name, 'keep')
})

test('getWrkExtData requires query and key', async (t) => {
  const pool = newPool()
  await t.exception(pool.getWrkExtData({}), /ERR_QUERY_INVALID/)
  await t.exception(pool.getWrkExtData({ query: {} }), /ERR_KEY_INVALID/)
})

test('getWrkExtData transactions and hourly aggregation', async (t) => {
  const pool = newPool()
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + HOUR_MS
  pool.transactionsDb = makeReadStreamDb([{
    transactions: [{ satoshis_net_earned: BTC_SATS }]
  }])
  const data = await pool.getWrkExtData({
    query: {
      key: 'transactions',
      start,
      end,
      aggrHourly: true
    }
  })
  t.ok(data.hourlyRevenues)
  t.ok(data.hourlyRevenues.length >= 1)
})

test('getWrkExtData workers-count', async (t) => {
  const pool = newPool()
  pool.workersCountDb = makeReadStreamDb([{ ts: 1, count: 3 }])
  const data = await pool.getWrkExtData({
    query: { key: 'workers-count', start: 1, end: 2 }
  })
  t.is(data[0].count, 3)
})

test('getWrkExtData workers delegates', async (t) => {
  const pool = newPool()
  pool.data.workersData = { workers: [{ name: 'x' }] }
  const data = await pool.getWrkExtData({
    query: { key: 'workers', offset: 0, limit: 10 }
  })
  t.is(data.workers.length, 1)
})

test('getWrkExtData stats appends pool type', async (t) => {
  const pool = newPool()
  pool.data.statsData = {
    stats: [{ username: 'u', balance: 1 }]
  }
  const data = await pool.getWrkExtData({ query: { key: 'stats' } })
  t.is(data.stats[0].poolType, POOL_TYPE)
})

test('getWrkExtData stats-history with interval', async (t) => {
  const pool = newPool()
  const intervalMs = 5 * 60 * 1000
  pool.statsDb = makeReadStreamDb([
    {
      ts: intervalMs * 2,
      stats: [{ hashrate: 50, username: 'u' }]
    }
  ])
  const data = await pool.getWrkExtData({
    query: {
      key: 'stats-history',
      start: 1,
      end: 9999999999999,
      interval: '5m'
    }
  })
  t.ok(Array.isArray(data))
  t.is(data[0].stats[0].poolType, POOL_TYPE)
})

test('getWrkExtData default key reads this.data', async (t) => {
  const pool = newPool()
  pool.data.blocks = [{ id: 1 }]
  const data = await pool.getWrkExtData({ query: { key: 'blocks' } })
  t.is(data[0].id, 1)
})

test('getWrkExtData applies fields projection', async (t) => {
  const pool = newPool()
  pool.data.blocks = [{ id: 1, noise: 2 }]
  const data = await pool.getWrkExtData({
    query: { key: 'blocks', fields: { id: 1 } }
  })
  t.is(data.length, 1)
  t.is(data[0].id, 1)
  t.is(data[0].noise, undefined)
})

test('fetchStats builds stats from api', async (t) => {
  const pool = newPool()
  pool.accounts = ['acc1']
  pool.data.workersData = { workers: [{ online: true }, { online: false }] }
  pool.getYearlyBalances = async () => [{ month: '1-2024', balance: 0 }]
  pool.f2poolApi = {
    getBalance: async () => ({
      balance_info: {
        total_income: 100,
        paid: 40,
        yesterday_income: 10,
        estimated_today_income: 2
      }
    }),
    getHashRateHistory: async () => ({
      hash_rate_list: [
        {
          timestamp: Math.floor(Date.now() / 1000) - 100,
          hash_rate: 1000,
          stale_hash_rate: 1
        }
      ]
    })
  }
  const time = new Date()
  await pool.fetchStats(time)
  t.is(pool.data.statsData.stats.length, 1)
  t.is(pool.data.statsData.stats[0].username, 'acc1')
  t.ok(pool.data.statsData.stats[0].hashrate >= 0)
})

test('fetchWorkers merges users and saves count', async (t) => {
  const pool = newPool()
  pool.accounts = ['a1']
  const saved = []
  pool._saveToDb = async (db, ts, payload) => {
    saved.push({ db, ts, payload })
  }
  pool.f2poolApi = {
    getWorkers: async () => ([
      {
        host: 'h',
        status: 0,
        last_share_at: 't',
        hash_rate_info: {
          name: 'w',
          hash_rate: 1,
          h1_hash_rate: 1,
          h24_hash_rate: 1,
          h1_stale_hash_rate: 0,
          h24_stale_hash_rate: 0
        }
      }
    ])
  }
  await pool.fetchWorkers(new Date())
  t.is(pool.data.workersData.workers.length, 1)
  t.is(saved.length, 1)
  t.is(saved[0].payload.count, 1)
})

test('fetchWorkers logs and continues on user error', async (t) => {
  const pool = newPool()
  pool.accounts = ['bad']
  const errs = []
  pool._logErr = (msg, e) => errs.push({ msg, e })
  pool._saveToDb = async () => {}
  pool.f2poolApi = {
    getWorkers: async () => {
      throw new Error('net')
    }
  }
  await pool.fetchWorkers(new Date())
  t.is(pool.data.workersData.workers.length, 0)
  t.ok(errs[0].msg.includes('bad'))
})

test('fetchTransactions merges daily rows', async (t) => {
  const pool = newPool()
  pool.accounts = ['u1']
  const saved = []
  pool._saveToDb = async (db, ts, payload) => {
    saved.push(payload)
  }
  pool.f2poolApi = {
    getTransactions: async () => ([{ changed_balance: 1, id: 't1' }])
  }
  await pool.fetchTransactions()
  t.is(saved[0].transactions.length, 1)
  t.is(saved[0].transactions[0].username, 'u1')
})

test('fetchTransactions catches per user', async (t) => {
  const pool = newPool()
  pool.accounts = ['u1']
  const errs = []
  pool._logErr = (msg) => errs.push(msg)
  pool._saveToDb = async () => {}
  pool.f2poolApi = {
    getTransactions: async () => {
      throw new Error('x')
    }
  }
  await pool.fetchTransactions()
  t.ok(errs[0].includes('u1'))
})

test('getYearlyBalances fills missing months', async (t) => {
  const pool = newPool()
  pool.accounts = ['u1']
  pool.data.yearlyBalances = {}
  pool.f2poolApi = {
    getTransactions: async () => ([{ changed_balance: 100 }])
  }
  const rows = await pool.getYearlyBalances('u1')
  t.ok(rows.length >= 1)
  t.ok(rows.some(r => r.balance === 100))
})

test('getYearlyBalances logs and zeroes on error', async (t) => {
  const pool = newPool()
  pool.accounts = ['u1']
  pool.data.yearlyBalances = {}
  const errs = []
  pool._logErr = (msg) => errs.push(msg)
  pool.f2poolApi = {
    getTransactions: async () => {
      throw new Error('fail')
    }
  }
  const rows = await pool.getYearlyBalances('u1')
  t.ok(errs.length >= 1)
  t.ok(rows.some(r => r.balance === 0))
})

test('fetchData dispatches scheduler keys', async (t) => {
  const pool = newPool()
  const calls = []
  pool.fetchStats = async () => { calls.push('stats') }
  pool.fetchWorkers = async () => { calls.push('workers') }
  pool.saveStats = async () => { calls.push('saveStats') }
  pool.saveWorkers = async () => { calls.push('saveWorkers') }
  pool.fetchTransactions = async () => { calls.push('tx') }
  const time = new Date()
  await pool.fetchData(SCHEDULER_TIMES._1M.key, time)
  await pool.fetchData(SCHEDULER_TIMES._5M.key, time)
  await pool.fetchData(SCHEDULER_TIMES._1D.key, time)
  t.ok(calls.includes('stats'))
  t.ok(calls.includes('workers'))
  t.ok(calls.includes('saveStats'))
  t.ok(calls.includes('saveWorkers'))
  t.ok(calls.includes('tx'))
})

test('fetchData swallows errors from inner fetch', async (t) => {
  const pool = newPool()
  pool._logErr = () => {}
  pool.fetchStats = async () => {
    throw new Error('boom')
  }
  await pool.fetchData(SCHEDULER_TIMES._1M.key, new Date())
  t.pass()
})

test('saveStats persists stats snapshot', async (t) => {
  const pool = newPool()
  const saved = []
  pool.statsDb = {}
  pool._saveToDb = async (db, ts, payload) => {
    saved.push({ db, ts, payload })
  }
  pool.data.statsData = { stats: [{ username: 'u' }] }
  const time = new Date('2024-06-01T12:34:56.789Z')
  await pool.saveStats(time)
  t.is(saved.length, 1)
  t.is(saved[0].db, pool.statsDb)
  t.is(saved[0].payload.stats.length, 1)
})

test('saveWorkers persists workers snapshot', async (t) => {
  const pool = newPool()
  const saved = []
  pool.workersDb = {}
  pool._saveToDb = async (db, ts, payload) => {
    saved.push({ db, ts, payload })
  }
  pool.data.workersData = { workers: [{ name: 'w' }] }
  const time = new Date('2024-06-01T12:34:56.789Z')
  await pool.saveWorkers(time)
  t.is(saved.length, 1)
  t.is(saved[0].db, pool.workersDb)
  t.is(saved[0].payload.workers.length, 1)
})
