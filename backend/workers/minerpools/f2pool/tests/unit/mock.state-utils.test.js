'use strict'

const test = require('brittle')
const {
  addNewWorker,
  generateAndCacheHashrateHistory,
  generateAndAddToStateRandomTxs,
  generateRandomizedDataWorkers,
  getRandomBalanceInfo
} = require('../../mock/initial_states/utils')

const DAY_SEC = 86400

// The ranges the generator declares for its BTC-denominated fields. Balance
// info draws up to 0.000999999999999999, which satoshi rounding carries to
// 0.001, so its ceiling is not the payout one.
const BTC_MIN = 0.0001
const PAYOUT_MAX = 0.0009
const BALANCE_MAX = 0.001

test('addNewWorker validates name and duplicates', (t) => {
  const workers = []
  t.exception(() => addNewWorker(workers, { host: 'h' }), /ERR_INVALID_NAME/)

  addNewWorker(workers, { name: 'acct.w1', host: '10.0.0.1' })
  t.is(workers.length, 1)
  t.is(workers[0].hash_rate_info.name, 'w1')
  t.is(workers[0].host, '10.0.0.1')

  t.exception(() => addNewWorker(workers, { name: 'acct.w1', host: 'h2' }), /ERR_WORKER_EXISTS/)
})

test('generateAndCacheHashrateHistory initializes and reuses cache', (t) => {
  const state = {}
  const nowSec = Math.floor(Date.now() / 1000)
  const first = generateAndCacheHashrateHistory(nowSec - 7200, nowSec, state)
  t.ok(Array.isArray(first))
  t.ok(first.length > 0)
  t.ok(state.hashrate_history_cache)

  const second = generateAndCacheHashrateHistory(nowSec - 7200, nowSec, state)
  t.is(second, first)

  const other = generateAndCacheHashrateHistory(nowSec - 3600, nowSec, state)
  t.not(other, first)
})

// A reporting app backfills its revenue pages by asking the pool for a long
// range at once, so the generator has to answer with a payout per day whose
// amounts actually differ. They used to be rounded to 2 decimals, which put
// every draw in a sub-0.001 range at zero and handed back `min` every time:
// 400 days of history summed to 400 × 0.0001 and charted as a flat line.
test('a long payout history varies across the declared BTC range', (t) => {
  const state = { transactions_list: {} }
  const end = Math.floor(Date.now() / 1000)
  const start = end - 400 * DAY_SEC

  generateAndAddToStateRandomTxs(start, end, state)
  const rows = Object.values(state.transactions_list)

  t.ok(rows.length >= 400, `one row per UTC day (${rows.length})`)

  const balances = rows.map((row) => row.changed_balance)
  t.ok(
    balances.every((v) => v >= BTC_MIN && v <= PAYOUT_MAX),
    'every payout sits inside the declared range'
  )
  // 8-decimal rounding leaves 80k distinct amounts in that range, so a sample
  // this size collides rarely; half is far below the expected spread and well
  // clear of the single value the 2-decimal rounding produced.
  t.ok(
    new Set(balances).size > rows.length / 2,
    `payouts vary (${new Set(balances).size} distinct across ${rows.length} rows)`
  )

  const splits = rows.map((row) => row.mining_extra)
  t.ok(new Set(splits.map((s) => s.pps)).size > rows.length / 2, 'the pps share varies')
  t.ok(splits.every((s) => s.tx_fee > 0), 'every row carries a transaction-fee share')
  t.ok(
    rows.every((row) => row.mining_extra.settle_date <= end),
    'no row settles after the range it was asked for'
  )
})

test('balance info stays inside its range', (t) => {
  for (let i = 0; i < 200; i++) {
    const info = getRandomBalanceInfo()
    t.ok(info.balance >= BTC_MIN && info.balance <= BALANCE_MAX, 'balance in range')
    t.ok(info.paid >= BTC_MIN && info.paid <= info.total_income, 'paid never exceeds income')
  }
})

// The integer draw scaled a 2-decimal number that could round to exactly 1.00,
// so it overran its own maximum roughly once every two hundred calls — a mock
// worker reported status 2, which F2Pool never returns.
test('generated workers stay inside their value ranges', (t) => {
  const workers = generateRandomizedDataWorkers(2000)

  t.ok(workers.every((w) => w.status === 0 || w.status === 1), 'status is 0 or 1')
  t.ok(workers.every((w) => w.last_share_at >= 0 && w.last_share_at <= 100), 'last_share_at in range')
  t.ok(
    workers.every((w) => w.host.split('.').every((o) => Number(o) >= 0 && Number(o) <= 255)),
    'every host octet is a valid byte'
  )
  // The hashrate draw was quantised to ~100 distinct values across its whole
  // 9e14-wide range, so a mock fleet reported the same few figures.
  t.ok(
    new Set(workers.map((w) => w.hash_rate_info.hash_rate)).size > workers.length / 2,
    'hashrates are spread across the range, not quantised onto a handful'
  )
})
