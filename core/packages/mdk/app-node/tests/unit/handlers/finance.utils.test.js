'use strict'

const test = require('brittle')
const {
  validateStartEnd,
  normalizeTimestampMs,
  processTransactions,
  extractCurrentPrice,
  processBlockData
} = require('../../../workers/lib/server/handlers/finance.utils')

// ==================== validateStartEnd ====================

test('validateStartEnd - valid params', (t) => {
  const req = { query: { start: 1700000000000, end: 1700100000000 } }
  const { start, end } = validateStartEnd(req)
  t.is(start, 1700000000000, 'should return start')
  t.is(end, 1700100000000, 'should return end')
  t.pass()
})

test('validateStartEnd - missing start throws', (t) => {
  const req = { query: { end: 1700100000000 } }
  try {
    validateStartEnd(req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END')
  }
  t.pass()
})

test('validateStartEnd - missing end throws', (t) => {
  const req = { query: { start: 1700000000000 } }
  try {
    validateStartEnd(req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END')
  }
  t.pass()
})

test('validateStartEnd - invalid range throws', (t) => {
  const req = { query: { start: 1700100000000, end: 1700000000000 } }
  try {
    validateStartEnd(req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE')
  }
  t.pass()
})

// ==================== normalizeTimestampMs ====================

test('normalizeTimestampMs - falsy input returns 0', (t) => {
  t.is(normalizeTimestampMs(0), 0)
  t.is(normalizeTimestampMs(null), 0)
  t.is(normalizeTimestampMs(undefined), 0)
  t.pass()
})

test('normalizeTimestampMs - seconds to ms conversion', (t) => {
  const ts = normalizeTimestampMs(1700006400)
  t.is(ts, 1700006400000, 'should multiply by 1000')
  t.pass()
})

test('normalizeTimestampMs - ms passthrough', (t) => {
  const ts = normalizeTimestampMs(1700006400000)
  t.is(ts, 1700006400000, 'should leave ms unchanged')
  t.pass()
})

// ==================== processTransactions ====================

test('processTransactions - Ocean data (sats)', (t) => {
  const results = [
    [{ transactions: [{ ts: 1700006400000, satoshis_net_earned: 50000000 }] }]
  ]
  const daily = processTransactions(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].revenueBTC, 0.5, 'should convert sats to BTC')
  t.is(daily[key].feesBTC, undefined, 'should not track fees by default')
  t.pass()
})

test('processTransactions - F2Pool data (BTC)', (t) => {
  const results = [
    [{ transactions: [{ created_at: 1700006400, changed_balance: 0.001 }] }]
  ]
  const daily = processTransactions(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].revenueBTC, 0.001, 'should use changed_balance directly as BTC')
  t.pass()
})

test('processTransactions - with trackFees (Ocean data)', (t) => {
  const results = [
    [{
      transactions: [{
        ts: 1700006400000,
        satoshis_net_earned: 50000000,
        fees_colected_satoshis: 1000000
      }]
    }]
  ]
  const daily = processTransactions(results, { trackFees: true })
  const key = Object.keys(daily)[0]
  t.is(daily[key].revenueBTC, 0.5, 'should convert sats to BTC')
  t.is(daily[key].feesBTC, 0.01, 'should track fees in BTC')
  t.pass()
})

test('processTransactions - with trackFees (F2Pool data)', (t) => {
  const results = [
    [{
      transactions: [{
        created_at: 1700006400,
        changed_balance: 0.001,
        mining_extra: { tx_fee: 0.0001 }
      }]
    }]
  ]
  const daily = processTransactions(results, { trackFees: true })
  const key = Object.keys(daily)[0]
  t.is(daily[key].revenueBTC, 0.001, 'should use changed_balance directly')
  t.is(daily[key].feesBTC, 0.0001, 'should extract tx_fee')
  t.pass()
})

test('processTransactions - seconds timestamps normalized', (t) => {
  const results = [
    [{ transactions: [{ ts: 1700006400, changed_balance: 0.001 }] }]
  ]
  const daily = processTransactions(results)
  t.ok(Object.keys(daily).length > 0, 'should have entries from seconds timestamps')
  t.pass()
})

test('processTransactions - error results skipped', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processTransactions(results)
  t.is(Object.keys(daily).length, 0, 'should be empty for error results')
  t.pass()
})

test('processTransactions - null entries skipped', (t) => {
  const results = [
    [{ transactions: [null, undefined] }]
  ]
  const daily = processTransactions(results)
  t.is(Object.keys(daily).length, 0, 'should be empty for null entries')
  t.pass()
})

test('processTransactions - empty results', (t) => {
  const daily = processTransactions([])
  t.is(Object.keys(daily).length, 0, 'should be empty')
  t.pass()
})

// ==================== extractCurrentPrice ====================

test('extractCurrentPrice - flat entry format (currentPrice)', (t) => {
  const results = [
    [{ currentPrice: 42000, blockHeight: 900000 }]
  ]
  t.is(extractCurrentPrice(results), 42000, 'should extract currentPrice')
  t.pass()
})

test('extractCurrentPrice - flat entry format (priceUSD)', (t) => {
  const results = [
    [{ priceUSD: 42000 }]
  ]
  t.is(extractCurrentPrice(results), 42000, 'should extract priceUSD')
  t.pass()
})

test('extractCurrentPrice - nested EBITDA format (numeric)', (t) => {
  const results = [{ data: 42000 }]
  t.is(extractCurrentPrice(results), 42000, 'should extract numeric nested price')
  t.pass()
})

test('extractCurrentPrice - nested EBITDA format (object)', (t) => {
  const results = [{ data: { USD: 42000 } }]
  t.is(extractCurrentPrice(results), 42000, 'should extract USD from nested object')
  t.pass()
})

test('extractCurrentPrice - error results return 0', (t) => {
  const results = [{ error: 'timeout' }]
  t.is(extractCurrentPrice(results), 0, 'should return 0 for error results')
  t.pass()
})

// ==================== processBlockData ====================

test('processBlockData - array items', (t) => {
  const results = [
    [{
      blocks: [{
        ts: 1700006400000,
        blockReward: 6.25,
        blockTotalFees: 0.5,
        blockSize: 1500000
      }]
    }]
  ]
  const daily = processBlockData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].blockReward, 6.25, 'should extract blockReward')
  t.is(daily[key].blockTotalFees, 0.5, 'should extract blockTotalFees')
  t.is(daily[key].blockSize, 1500000, 'should extract blockSize')
  t.pass()
})

test('processBlockData - flat per-ork items (production shape)', (t) => {
  const results = [
    [
      { ts: 1700006400000, blockSize: 1500000, blockHash: 'abc', blockReward: 6.25, blockTotalFees: 0.5 },
      { ts: 1700006400000, blockSize: 1200000, blockHash: 'def', blockReward: 6.25, blockTotalFees: 0.3 }
    ]
  ]
  const daily = processBlockData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].blockReward, 12.5, 'should sum blockReward across same-day items')
  t.is(daily[key].blockTotalFees, 0.8, 'should sum blockTotalFees across same-day items')
  t.is(daily[key].blockSize, 2700000, 'should sum blockSize across same-day items')
  t.pass()
})

test('processBlockData - object-keyed items', (t) => {
  const results = [
    [{ data: { 1700006400000: { blockReward: 6.25, blockTotalFees: 0.5 } } }]
  ]
  const daily = processBlockData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].blockReward, 6.25, 'should extract from object keys')
  t.is(daily[key].blockTotalFees, 0.5, 'should extract fees from object keys')
  t.pass()
})

test('processBlockData - alt field names', (t) => {
  const results = [
    [{
      blocks: [{
        ts: 1700006400000,
        block_reward: 6.25,
        total_fees: 0.5
      }]
    }]
  ]
  const daily = processBlockData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].blockReward, 6.25, 'should handle snake_case field')
  t.is(daily[key].blockTotalFees, 0.5, 'should handle total_fees field')
  t.pass()
})

test('processBlockData - error/empty results', (t) => {
  t.is(Object.keys(processBlockData([{ error: 'timeout' }])).length, 0, 'error results empty')
  t.is(Object.keys(processBlockData([])).length, 0, 'empty results empty')
  t.pass()
})
