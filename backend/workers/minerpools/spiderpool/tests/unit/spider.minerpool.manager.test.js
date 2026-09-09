'use strict'

const test = require('brittle')
const SpiderMinerpoolManager = require('../../lib/spider.minerpool.manager')

function makeManager (apiStub) {
  const mgr = new SpiderMinerpoolManager(
    { spiderpool: { accounts: ['spider1'], apiUrl: 'http://x', accessKey: 'k', privateKey: 'p' } },
    { rack: 'rack-test' }
  )
  // wire what init() would set up, without booting facilities
  mgr.accounts = ['spider1']
  mgr.spiderApi = apiStub
  mgr._logErr = () => {}
  mgr._saveToDb = async (db, ts, data) => { mgr._saved = { db, ts, data } }
  return mgr
}

test('getHttpUrl returns the configured api url', (t) => {
  const mgr = makeManager({})
  t.is(mgr.getHttpUrl(), 'http://x')
})

test('fetchStats maps SpiderPool profit and hashrate fields', async (t) => {
  const mgr = makeManager({
    getProfitInfo: async () => ({
      yesterdayProfit: 0.615,
      unpaidProfit: 0.575,
      totalProfit: 26.02,
      dayEstimateProfit: 0.58
    }),
    getFullHashRate: async () => ({
      hashRate10: '1000',
      hashRateHour: '2000',
      staleRateHour: '0.01',
      hashRateDay: '3000',
      staleRateDay: '0.02'
    }),
    getPaymentRecords: async () => [{ paymentMoney: 0.1 }, { paymentMoney: 0.2 }]
  })
  mgr.data.workersData = { ts: 0, workers: [{ online: 1 }, { online: 0 }] }

  await mgr.fetchStats(new Date())

  const stat = mgr.data.statsData.stats[0]
  t.is(stat.username, 'spider1')
  t.is(stat.balance, 26.02)
  t.is(stat.unsettled, 0.575)
  t.is(stat.revenue_24h, 0.615)
  t.is(stat.estimated_today_income, 0.58)
  t.is(stat.hashrate, 1000)
  t.is(stat.hashrate_1h, 2000)
  t.is(stat.hashrate_24h, 3000)
  t.is(stat.hashrate_stale_1h, 20)
  t.is(stat.hashrate_stale_24h, 60)
  t.is(stat.worker_count, 2)
  t.is(stat.active_workers_count, 1)
  t.is(stat.yearlyBalances.length, 12)
  t.ok(stat.yearlyBalances.every(b => Math.abs(b.balance - 0.3) < 1e-9))
})

test('fetchStats reports zeros for a subaccount with no miners yet', async (t) => {
  // a brand new subaccount returns empty/null payloads rather than an error
  const mgr = makeManager({
    getProfitInfo: async () => ({ yesterdayProfit: 0, unpaidProfit: 0, totalProfit: 0, dayEstimateProfit: 0 }),
    getFullHashRate: async () => null,
    getPaymentRecords: async () => []
  })

  await mgr.fetchStats(new Date())

  const stat = mgr.data.statsData.stats[0]
  t.is(stat.balance, 0)
  t.is(stat.hashrate, 0)
  t.is(stat.hashrate_1h, 0)
  t.is(stat.hashrate_24h, 0)
  t.is(stat.worker_count, 0)
  t.is(stat.active_workers_count, 0)
  t.ok(stat.yearlyBalances.every(b => b.balance === 0))
})

test('fetchWorkers maps workers and saves the count', async (t) => {
  const mgr = makeManager({
    getWorkers: async () => [{
      workerName: 'w-1',
      minuteHashRate: '10',
      hourHashRate: '20',
      hourStaleRate: '0',
      dayHashRate: '30',
      dayStaleRate: '0',
      lastShareTime: 1,
      status: 'online'
    }]
  })

  await mgr.fetchWorkers(new Date())

  t.is(mgr.data.workersData.workers.length, 1)
  t.is(mgr.data.workersData.workers[0].name, 'w-1')
  t.is(mgr.data.workersData.workers[0].online, 1)
  t.is(mgr._saved.data.count, 1)
})

test('fetchWorkers keeps going when one account fails', async (t) => {
  const mgr = makeManager({
    getWorkers: async (subaccount) => {
      if (subaccount === 'bad') throw new Error('boom')
      return [{ workerName: 'w-1', status: 'online' }]
    }
  })
  mgr.accounts = ['bad', 'spider1']

  await mgr.fetchWorkers(new Date())
  t.is(mgr.data.workersData.workers.length, 1)
})

test('fetchTransactions maps payment records to transactions', async (t) => {
  const mgr = makeManager({
    getPaymentRecords: async () => [{
      paymentDate: 1564531200000,
      paymentAddress: 'addr',
      paymentMoney: 0.0666348,
      txId: 'tx-1'
    }]
  })

  await mgr.fetchTransactions()

  const { transactions } = mgr._saved.data
  t.is(transactions.length, 1)
  t.is(transactions[0].username, 'spider1')
  t.is(transactions[0].id, 'tx-1')
  t.is(transactions[0].type, 'payout')
  t.is(transactions[0].changed_balance, 0.0666348)
  t.is(transactions[0].created_at, 1564531200)
  t.is(transactions[0].address, 'addr')
})

test('getYearlyBalances tolerates api errors with zero balances', async (t) => {
  const mgr = makeManager({
    getPaymentRecords: async () => { throw new Error('down') }
  })
  const balances = await mgr.getYearlyBalances('spider1')
  t.is(balances.length, 12)
  t.ok(balances.every(b => b.balance === 0))
})
