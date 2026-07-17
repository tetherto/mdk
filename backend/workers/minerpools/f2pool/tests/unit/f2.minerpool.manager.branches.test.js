'use strict'

const test = require('brittle')
const { F2_POOL } = require('../../index')
const { getMonthlyDateRanges, isCurrentMonth } = require('../../lib/utils')

function newPool () {
  return new F2_POOL(
    { f2pool: { accounts: [], apiSecret: 'x', apiUrl: 'http://localhost' } },
    { rack: 'r1' }
  )
}

test('fetchStats defaults when api returns null payloads', async (t) => {
  const pool = newPool()
  pool.accounts = ['acc1']
  pool.data.workersData = { workers: [] }
  pool.getYearlyBalances = async () => []
  pool.f2poolApi = {
    getBalance: async () => null,
    getHashRateHistory: async () => null
  }
  await pool.fetchStats(new Date())
  const s = pool.data.statsData.stats[0]
  t.is(s.hashrate, 0)
  t.is(s.hashrate_1h, 0)
  t.is(s.hashrate_24h, 0)
  t.is(s.hashrate_stale_1h, 0)
  t.is(s.hashrate_stale_24h, 0)
  t.is(s.balance, undefined)
  t.is(s.worker_count, 0)
})

test('fetchStats treats missing hash_rate fields as zero', async (t) => {
  const pool = newPool()
  pool.accounts = ['acc1']
  pool.data.workersData = { workers: [{ online: true }] }
  pool.getYearlyBalances = async () => []
  const nowSec = Math.floor(Date.now() / 1000)
  pool.f2poolApi = {
    getBalance: async () => ({ balance_info: { total_income: 1, paid: 0 } }),
    getHashRateHistory: async () => ({
      hash_rate_list: [
        { timestamp: nowSec - 100 },
        { timestamp: nowSec - 50 }
      ]
    })
  }
  await pool.fetchStats(new Date())
  const s = pool.data.statsData.stats[0]
  t.is(s.hashrate, 0)
  t.is(s.hashrate_1h, 0)
  t.is(s.hashrate_24h, 0)
  t.is(s.hashrate_stale_1h, 0)
  t.is(s.hashrate_stale_24h, 0)
  t.is(s.active_workers_count, 1)
})

test('getYearlyBalances only refetches current month when cached', async (t) => {
  const pool = newPool()
  const months = Object.keys(getMonthlyDateRanges(12))
  pool.data.yearlyBalances = {}
  for (const m of months) pool.data.yearlyBalances[m] = 5
  let calls = 0
  pool.f2poolApi = {
    getTransactions: async () => {
      calls++
      return [{ changed_balance: 7 }]
    }
  }
  const rows = await pool.getYearlyBalances('u1')
  t.is(calls, 1)
  for (const { month, balance } of rows) {
    if (isCurrentMonth(month)) t.is(balance, 7)
    else t.is(balance, 5)
  }
})
