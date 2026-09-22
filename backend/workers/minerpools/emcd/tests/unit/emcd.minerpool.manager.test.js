'use strict'

const test = require('brittle')
const EmcdMinerpoolManager = require('../../lib/emcd.minerpool.manager')
const defaultState = require('../../mock/initial_states/default')
const { previousDay } = require('../../lib/utils')

function pool (accounts = ['a', 'b']) {
  const manager = new EmcdMinerpoolManager({}, { rack: 'test' })
  const data = defaultState()
  manager.accounts = accounts
  manager.emcdApi = {
    getHashrate: async () => data.hashrate,
    getWorkers: async account => account === 'b' ? [] : data.workers,
    getBalance: async () => data.balance,
    getEarnings: async () => data.earnings,
    getPayouts: async () => data.payouts
  }
  return manager
}

test('counts active workers per account and sums all four metrics', async t => {
  const manager = pool()
  await manager.fetchStats(new Date())
  t.alike(manager.data.statsData.stats.map(s => s.active_workers_count), [1, 0])
  t.alike(manager.data.statsData.stats.map(s => s.worker_count), [2, 0])
  t.is(manager.getMetric('hashrate'), 300e12)
  t.is(manager.getMetric('active_workers_count'), 1)
  t.is(manager.getMetric('balance'), 0.0025)
  t.is(manager.getMetric('estimated_today_income'), 0.00024)
  t.is(manager.data.statsData.stats[0].hashrate_stale_1h, 1e12)
})

for (const status of [403, 404]) {
  test(`/balance ${status} leaves other metrics available and warns once`, async t => {
    const manager = pool()
    let warnings = 0
    manager._logErr = () => warnings++
    manager.emcdApi.getBalance = async () => {
      throw Object.assign(new Error('unavailable'), { status })
    }
    await manager.fetchStats(new Date())
    await manager.fetchStats(new Date())
    t.is(warnings, 1)
    t.is(manager.getMetric('hashrate'), 300e12)
    t.exception(() => manager.getMetric('balance'), /E_POOL_API/)
    t.is(manager.data.statsData.stats[0].balance, null)
    manager.emcdApi.getBalance = async () => defaultState().balance
    await manager.fetchStats(new Date())
    t.is(manager.getMetric('balance'), 0.0025, 'recovers when the endpoint becomes available')
  })
}

test('accepts the documented /balance shape: coin, balance, updatedAt and nothing else', async t => {
  const manager = pool(['a'])
  manager.emcdApi.getBalance = async () => ({ coin: 'btc', balance: '0.00123456', updatedAt: '2026-09-22T07:40:00Z' })
  await manager.fetchStats(new Date())
  t.is(manager.getMetric('balance'), 0.00123456)
  t.is(manager.data.statsData.stats[0].unsettled, null)
})

test('a balance in another coin is rejected instead of being reported as BTC', async t => {
  const manager = pool(['a'])
  manager.emcdApi.getBalance = async () => ({ coin: 'ltc', balance: '2', updatedAt: '2026-09-22T07:40:00Z' })
  await t.exception(manager.fetchStats(new Date()), /ERR_EMCD_DATA balance.coin/)
})

test('does not publish partial account totals, stale data or uninitialized zeros', async t => {
  const manager = pool()
  t.exception(() => manager.getMetric('hashrate'), /E_POOL_API/)
  await manager.fetchStats(new Date())
  const previous = manager.data.statsData
  manager.emcdApi.getBalance = async account => {
    if (account === 'b') {
      throw Object.assign(new Error('upstream failed'), { status: 500 })
    }
    return defaultState().balance
  }
  await t.exception(manager.fetchStats(new Date()), /upstream failed/)
  t.is(manager.data.statsData, previous)
  t.exception(() => manager.getMetric('hashrate'), /E_POOL_API/)
  manager.emcdApi.getBalance = async () => defaultState().balance
  await manager.fetchStats(new Date(Date.now() - 181000))
  t.exception(() => manager.getMetric('hashrate'), /stale/)
})

test('monthly payout caches are account-specific, cache zeros and refresh on month rollover', async t => {
  const manager = pool()
  const calls = []
  manager.emcdApi.getPayouts = async (account, from, to) => {
    calls.push({ account, from, to })
    return account === 'a' ? [{ time: '2026-09-01T00:00:00Z', amount: 2 }] : []
  }
  const time = new Date('2026-09-22T05:00:00Z')
  const a = await manager.getYearlyBalances('a', time)
  const b = await manager.getYearlyBalances('b', time)
  t.is(a[0].balance, 2)
  t.is(b[0].balance, 0)
  await manager.getYearlyBalances('b', time)
  t.is(calls.length, 2)
  t.alike(calls[0], { account: 'a', from: '2025-10-01', to: '2026-09-23' })
  await manager.getYearlyBalances('b', new Date('2026-10-01T00:00:00Z'))
  t.is(calls.length, 3)
})

test('failed history requests are retried without caching a fabricated zero', async t => {
  const manager = pool()
  manager.emcdApi.getPayouts = async () => {
    throw new Error('unavailable')
  }
  await t.exception(manager.getYearlyBalances('a'), /unavailable/)
  manager.emcdApi.getPayouts = async () => []
  t.is((await manager.getYearlyBalances('a')).length, 12)
})

test('overlapping polls share one fetch and release the slot after completion', async t => {
  const manager = pool(['a'])
  let calls = 0
  manager.emcdApi.getHashrate = async () => {
    calls++; return defaultState().hashrate
  }
  const a = manager.fetchStats(new Date())
  const b = manager.fetchStats(new Date())
  t.is(a, b)
  await Promise.all([a, b])
  t.is(calls, 1)
  await manager.fetchStats(new Date())
  t.is(calls, 2)
})

test('daily payouts use the previous UTC day and never overwrite storage on partial failure', async t => {
  const manager = pool()
  const writes = []
  manager._saveToDb = async (db, ts, value) => writes.push({ ts, value })
  const now = new Date()
  await manager.fetchTransactions(now)
  t.is(writes[0].ts, previousDay(now).start)
  t.is(writes[0].value.transactions.length, 2)
  t.is(writes[0].value.transactions[0].type, 'payout')
  manager.emcdApi.getPayouts = async account => {
    if (account === 'b') {
      throw new Error('unavailable')
    }
    return []
  }
  await t.exception(manager.fetchTransactions(now), /unavailable/)
  t.is(writes.length, 1)
  t.exception(() => manager._aggrTransactions(), /AGGREGATION_UNSUPPORTED/)
})

test('daily queries filter next-day rows and combine split earnings for yesterday', async t => {
  const manager = pool(['a'])
  const time = new Date('2026-09-22T00:00:00Z')
  manager.emcdApi.getEarnings = async (account, from, to) => {
    t.is(from, '2026-09-21')
    t.is(to, '2026-09-22')
    return [
      { date: '2026-09-22', totalAmount: 100 },
      { date: '2026-09-21', totalAmount: 2 },
      { date: '2026-09-21', totalAmount: 3 }
    ]
  }
  await manager.fetchStats(time)
  t.is(manager.data.statsData.stats[0].revenue_24h, 5)
  manager.emcdApi.getPayouts = async (account, from, to) => {
    t.is(from, '2026-09-21')
    t.is(to, '2026-09-22')
    return [
      { time: '2026-09-21T23:59:59Z', amount: 1, txId: null },
      { time: '2026-09-22T00:00:00Z', amount: 2, txId: 'next-day' }
    ]
  }
  manager._saveToDb = async (db, ts, data) => {
    t.is(data.transactions.length, 1)
    t.is(data.transactions[0].changed_balance, 1)
    t.is(data.transactions[0].id, null, 'a payout may have no blockchain transaction ID')
  }
  await manager.fetchTransactions(time)
})

test('a failed account does not replace the worker list or its stored count', async t => {
  const manager = pool()
  let writes = 0
  manager._saveToDb = async () => writes++
  await manager.fetchWorkers(new Date())
  const previous = manager.data.workersData
  manager.emcdApi.getWorkers = async account => {
    if (account === 'b') {
      throw new Error('unavailable')
    }
    return []
  }
  await t.exception(manager.fetchWorkers(new Date()), /unavailable/)
  t.is(manager.data.workersData, previous)
  t.is(writes, 1)
})
