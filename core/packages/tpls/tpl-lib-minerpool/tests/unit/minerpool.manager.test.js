'use strict'

const test = require('brittle')
const MinerpoolManager = require('../../lib/minerpool.manager')
const { SCHEDULER_TIMES, BTC_SATS, HOUR_MS } = require('../../lib/utils/constants')

const WTYPE = 'tpl-test'

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

function newManager () {
  return new MinerpoolManager(
    { wtype: WTYPE, baseUrl: 'http://localhost' },
    { rack: 'r1' }
  )
}

test('constructor throws when rack is missing', (t) => {
  t.exception(
    () => new MinerpoolManager({ wtype: WTYPE }, {}),
    /ERR_PROC_RACK_UNDEFINED/
  )
})

test('constructor sets prefix and initial data', (t) => {
  const m = newManager()
  t.is(m.prefix, `${WTYPE}-r1`)
  t.ok(Array.isArray(m.data.workersData.workers))
  t.is(m.data.workersData.workers.length, 0)
})

test('getHttpUrl returns conf.baseUrl', (t) => {
  const m = newManager()
  t.is(m.getHttpUrl(), 'http://localhost')
})

test('filterWorkers respects offset, limit, and max 100', (t) => {
  const m = newManager()
  const w = Array.from({ length: 120 }, (_, i) => ({ n: i }))
  t.is(m.filterWorkers(w, 0, 50).length, 50)
  t.is(m.filterWorkers(w, 10, 200).length, 100)
  t.is(m.filterWorkers(w, 115, 10).length, 5)
})

test('appendPoolType tags rows with wtype', (t) => {
  const m = newManager()
  const out = m.appendPoolType([{ name: 'a' }])
  t.is(out[0].poolType, WTYPE)
  t.is(out[0].name, 'a')
})

test('_getIntervalMs maps interval keys', (t) => {
  const m = newManager()
  t.is(m._getIntervalMs('1D'), 24 * 60 * 60 * 1000)
  t.is(m._getIntervalMs('3h'), 3 * 60 * 60 * 1000)
  t.is(m._getIntervalMs('30m'), 30 * 60 * 1000)
  t.is(m._getIntervalMs('5m'), 5 * 60 * 1000)
  t.is(m._getIntervalMs(undefined), 5 * 60 * 1000)
})

test('_avg rolling average', (t) => {
  const m = newManager()
  t.is(m._avg(0, 10, 1), 10)
  t.is(m._avg(10, 20, 2), 15)
})

test('_aggrByInterval buckets stats by interval', (t) => {
  const m = newManager()
  const intervalMs = 5 * 60 * 1000
  const data = [
    { ts: intervalMs * 2, stats: [{ hashrate: 100, username: 'u' }] },
    { ts: intervalMs * 2 + 1000, stats: [{ hashrate: 200, username: 'u' }] }
  ]
  const out = m._aggrByInterval(data, '5m')
  t.ok(Array.isArray(out))
  t.ok(out.length >= 1)
})

test('_saveToDb writes JSON buffer at key', async (t) => {
  const m = newManager()
  const calls = []
  const db = {
    put: async (key, buf) => {
      calls.push({ key, json: JSON.parse(buf.toString()) })
    }
  }
  await m._saveToDb(db, 42, { a: 1 })
  t.is(calls.length, 1)
  t.is(calls[0].json.a, 1)
})

test('getDbData reads stream entries', async (t) => {
  const m = newManager()
  const db = makeReadStreamDb([{ row: 1 }, { row: 2 }])
  const out = await m.getDbData(db, { start: 10, end: 20 })
  t.is(out.length, 2)
  t.is(out[0].row, 1)
})

test('getDbData throws when start or end missing', async (t) => {
  const m = newManager()
  await t.exception(m.getDbData({}, { end: 1 }), /ERR_START_INVALID/)
  await t.exception(m.getDbData({}, { start: 1 }), /ERR_END_INVALID/)
})

test('_projection filters array and single object', (t) => {
  const m = newManager()
  const rows = [{ a: 1, b: 2 }, { a: 3 }]
  const arr = m._projection(rows, { a: 1 })
  t.is(arr.length, 2)
  t.is(arr[0].a, 1)
  const one = m._projection({ x: 9, y: 8 }, { x: 1 })
  t.is(one.x, 9)
  t.is(one.y, undefined)
})

test('_aggrTransactions empty hourly when no time range', (t) => {
  const m = newManager()
  const out = m._aggrTransactions([], { start: 100, end: 50 })
  t.ok(Array.isArray(out.hourlyRevenues))
  t.is(out.hourlyRevenues.length, 0)
})

test('_aggrTransactions distributes revenue across hours', (t) => {
  const m = newManager()
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + 2 * HOUR_MS
  const data = [{
    transactions: [{ satoshis_net_earned: BTC_SATS }]
  }]
  const out = m._aggrTransactions(data, { start, end })
  t.ok(out.hourlyRevenues.length >= 1)
  t.ok(out.hourlyRevenues[0].revenue > 0)
})

test('getWorkers without start/end uses in-memory workers', async (t) => {
  const m = newManager()
  m.data.workersData = {
    workers: [{ name: 'w1' }, { name: 'w2' }]
  }
  const res = await m.getWorkers({ offset: 0, limit: 10 })
  t.is(res.workers.length, 2)
  t.is(res.workers[0].poolType, WTYPE)
})

test('getWorkers with start/end aggregates from db', async (t) => {
  const m = newManager()
  m.workersDb = makeReadStreamDb([
    { ts: 1, workers: [{ name: 'a' }, { name: 'b' }] }
  ])
  const res = await m.getWorkers({ start: 1, end: 2, offset: 0, limit: 10 })
  t.is(res.length, 1)
  t.is(res[0].workers[0].poolType, WTYPE)
})

test('getWorkers filters by name when provided', async (t) => {
  const m = newManager()
  m.workersDb = makeReadStreamDb([
    { ts: 1, workers: [{ name: 'keep' }, { name: 'drop' }] }
  ])
  const res = await m.getWorkers({ start: 1, end: 2, name: 'keep' })
  t.is(res[0].workers.length, 1)
  t.is(res[0].workers[0].name, 'keep')
})

test('getWrkExtData requires query and key', async (t) => {
  const m = newManager()
  await t.exception(m.getWrkExtData({}), /ERR_QUERY_INVALID/)
  await t.exception(m.getWrkExtData({ query: {} }), /ERR_KEY_INVALID/)
})

test('getWrkExtData transactions and hourly aggregation', async (t) => {
  const m = newManager()
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + HOUR_MS
  m.transactionsDb = makeReadStreamDb([{
    transactions: [{ satoshis_net_earned: BTC_SATS }]
  }])
  const data = await m.getWrkExtData({
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
  const m = newManager()
  m.workersCountDb = makeReadStreamDb([{ ts: 1, count: 3 }])
  const data = await m.getWrkExtData({
    query: { key: 'workers-count', start: 1, end: 2 }
  })
  t.is(data[0].count, 3)
})

test('getWrkExtData workers delegates', async (t) => {
  const m = newManager()
  m.data.workersData = { workers: [{ name: 'x' }] }
  const data = await m.getWrkExtData({
    query: { key: 'workers', offset: 0, limit: 10 }
  })
  t.is(data.workers.length, 1)
})

test('getWrkExtData stats appends pool type', async (t) => {
  const m = newManager()
  m.data.statsData = {
    stats: [{ username: 'u', balance: 1 }]
  }
  const data = await m.getWrkExtData({ query: { key: 'stats' } })
  t.is(data.stats[0].poolType, WTYPE)
})

test('getWrkExtData stats-history with interval', async (t) => {
  const m = newManager()
  const intervalMs = 5 * 60 * 1000
  m.statsDb = makeReadStreamDb([
    {
      ts: intervalMs * 2,
      stats: [{ hashrate: 50, username: 'u' }]
    }
  ])
  const data = await m.getWrkExtData({
    query: {
      key: 'stats-history',
      start: 1,
      end: 9999999999999,
      interval: '5m'
    }
  })
  t.ok(Array.isArray(data))
  t.is(data[0].stats[0].poolType, WTYPE)
})

test('getWrkExtData default key reads this.data', async (t) => {
  const m = newManager()
  m.data.blocks = [{ id: 1 }]
  const data = await m.getWrkExtData({ query: { key: 'blocks' } })
  t.is(data[0].id, 1)
})

test('getWrkExtData applies fields projection', async (t) => {
  const m = newManager()
  m.data.blocks = [{ id: 1, noise: 2 }]
  const data = await m.getWrkExtData({
    query: { key: 'blocks', fields: { id: 1 } }
  })
  t.is(data.length, 1)
  t.is(data[0].id, 1)
  t.is(data[0].noise, undefined)
})

test('getWrkExtData uses _getWrkExtDataExtra when defined', async (t) => {
  class M extends MinerpoolManager {
    async _getWrkExtDataExtra (key) {
      if (key === 'custom') return { custom: true }
      return undefined
    }
  }
  const m = new M(
    { wtype: WTYPE, baseUrl: 'http://x' },
    { rack: 'r1' }
  )
  const data = await m.getWrkExtData({ query: { key: 'custom' } })
  t.is(data.custom, true)
})

test('fetchData dispatches scheduler keys', async (t) => {
  const m = newManager()
  const calls = []
  m.fetchStats = async () => { calls.push('stats') }
  m.fetchWorkers = async () => { calls.push('workers') }
  m.saveStats = async () => { calls.push('saveStats') }
  m.saveWorkers = async () => { calls.push('saveWorkers') }
  m.fetchTransactions = async () => { calls.push('tx') }
  m.fetchBlocks = async () => { calls.push('blocks') }
  const time = new Date()
  await m.fetchData(SCHEDULER_TIMES._1M.key, time)
  await m.fetchData(SCHEDULER_TIMES._5M.key, time)
  await m.fetchData(SCHEDULER_TIMES._1D.key, time)
  t.ok(calls.includes('stats'))
  t.ok(calls.includes('workers'))
  t.ok(calls.includes('saveStats'))
  t.ok(calls.includes('saveWorkers'))
  t.ok(calls.includes('tx'))
  t.ok(calls.includes('blocks'))
})

test('fetchData swallows errors from inner fetch', async (t) => {
  const m = newManager()
  m._logErr = () => {}
  m.fetchStats = async () => {
    throw new Error('boom')
  }
  await m.fetchData(SCHEDULER_TIMES._1M.key, new Date())
  t.pass()
})

test('saveStats persists stats snapshot', async (t) => {
  const m = newManager()
  const saved = []
  m.statsDb = {}
  m._saveToDb = async (db, ts, payload) => {
    saved.push({ db, ts, payload })
  }
  m.data.statsData = { stats: [{ username: 'u' }] }
  const time = new Date('2024-06-01T12:34:56.789Z')
  await m.saveStats(time)
  t.is(saved.length, 1)
  t.is(saved[0].db, m.statsDb)
  t.is(saved[0].payload.stats.length, 1)
})

test('saveWorkers persists workers snapshot', async (t) => {
  const m = newManager()
  const saved = []
  m.workersDb = {}
  m._saveToDb = async (db, ts, payload) => {
    saved.push({ db, ts, payload })
  }
  m.data.workersData = { workers: [{ name: 'w' }] }
  const time = new Date('2024-06-01T12:34:56.789Z')
  await m.saveWorkers(time)
  t.is(saved.length, 1)
  t.is(saved[0].db, m.workersDb)
  t.is(saved[0].payload.workers.length, 1)
})
