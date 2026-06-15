'use strict'

const test = require('brittle')
const {
  getEnergyBalance,
  processConsumptionData,
  processPriceData,
  processCostsData,
  calculateSummary,
  getEbitda,
  processTailLogData,
  processEbitdaPrices,
  calculateEbitdaSummary,
  getCostSummary,
  calculateCostSummary,
  getSubsidyFees,
  calculateSubsidyFeesSummary,
  getRevenue,
  calculateRevenueSummary,
  getRevenueSummary,
  calculateDetailedRevenueSummary,
  getHashRevenue,
  processHashrateData,
  processNetworkHashrateData,
  calculateHashRevenueSummary
} = require('../../../workers/lib/server/handlers/finance.handlers')
const { withDataProxy } = require('../helpers/mockHelpers')

// ==================== Energy Balance Tests ====================

test('getEnergyBalance - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'tailLogCustomRangeAggr') {
          return [{ type: 'powermeter', data: [{ ts: dayTs, val: { site_power_w: 5000 } }], error: null }]
        }
        if (method === 'getWrkExtData') {
          if (payload.query && payload.query.key === 'transactions') {
            return [{ ts: dayTs, transactions: [{ ts: dayTs, changed_balance: 0.5 }] }]
          }
          if (payload.query && payload.query.key === 'HISTORICAL_PRICES') {
            return [{ ts: dayTs, priceUSD: 40000 }]
          }
          if (payload.query && payload.query.key === 'current_price') {
            return [{ currentPrice: 40000 }]
          }
          if (payload.query && payload.query.key === 'stats-history') {
            return []
          }
        }
        if (method === 'getGlobalConfig') {
          return { nominalPowerAvailability_MW: 10 }
        }
        return {}
      }
    },
    globalDataLib: {
      getGlobalData: async () => []
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getEnergyBalance(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.pass()
})

test('getEnergyBalance - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [], site: 'test-site' },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  const mockReq = { query: { end: 1700100000000 } }

  try {
    await getEnergyBalance(mockCtx, mockReq, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getEnergyBalance - missing end throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [], site: 'test-site' },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  const mockReq = { query: { start: 1700000000000 } }

  try {
    await getEnergyBalance(mockCtx, mockReq, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getEnergyBalance - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [], site: 'test-site' },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  const mockReq = { query: { start: 1700100000000, end: 1700000000000 } }

  try {
    await getEnergyBalance(mockCtx, mockReq, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getEnergyBalance - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => ({})
    },
    globalDataBee: {
      sub: () => ({
        sub: () => ({
          createReadStream: () => (async function * () {})()
        })
      })
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getEnergyBalance(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.is(result.log.length, 0, 'log should be empty with no data')
  t.pass()
})

test('processConsumptionData - processes daily data from ORK', (t) => {
  const results = [
    [{ type: 'powermeter', data: [{ ts: 1700006400000, val: { site_power_w: 5000 } }], error: null }]
  ]

  const daily = processConsumptionData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key].powerW, 5000, 'should extract power from val')
  t.pass()
})

test('processConsumptionData - processes object-keyed data', (t) => {
  const results = [
    [{ data: { 1700006400000: { site_power_w: 5000 } } }]
  ]

  const daily = processConsumptionData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.pass()
})

test('processConsumptionData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processConsumptionData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.is(Object.keys(daily).length, 0, 'should be empty for error results')
  t.pass()
})

test('processPriceData - processes mempool price data', (t) => {
  const results = [
    [{ ts: 1700006400000, priceUSD: 40000 }]
  ]

  const daily = processPriceData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key], 40000, 'should extract priceUSD')
  t.pass()
})

test('processCostsData - processes dashboard format (energyCostsUSD)', (t) => {
  const costs = [
    { region: 'site1', year: 2023, month: 11, energyCostsUSD: 30000, operationalCostsUSD: 6000 }
  ]

  const result = processCostsData(costs)
  t.ok(result['2023-11'], 'should have month key')
  t.is(result['2023-11'].energyCostPerDay, 1000, 'should have daily energy cost (30000/30)')
  t.is(result['2023-11'].operationalCostPerDay, 200, 'should have daily operational cost (6000/30)')
  t.pass()
})

test('processCostsData - processes app-node format (energyCost)', (t) => {
  const costs = [
    { site: 'site1', year: 2023, month: 11, energyCost: 30000, operationalCost: 6000 }
  ]

  const result = processCostsData(costs)
  t.ok(result['2023-11'], 'should have month key')
  t.is(result['2023-11'].energyCostPerDay, 1000, 'should have daily energy cost (30000/30)')
  t.is(result['2023-11'].operationalCostPerDay, 200, 'should have daily operational cost (6000/30)')
  t.pass()
})

test('processCostsData - handles non-array input', (t) => {
  const result = processCostsData(null)
  t.ok(typeof result === 'object', 'should return object')
  t.is(Object.keys(result).length, 0, 'should be empty')
  t.pass()
})

test('calculateSummary - calculates from log entries', (t) => {
  const log = [
    { revenueBTC: 0.5, revenueUSD: 20000, energyCostUSD: 4000, totalCostUSD: 5000, profitUSD: 15000, consumptionMWh: 100, sitePowerMW: 4 },
    { revenueBTC: 0.3, revenueUSD: 12000, energyCostUSD: 2400, totalCostUSD: 3000, profitUSD: 9000, consumptionMWh: 60, sitePowerMW: 2 }
  ]

  const summary = calculateSummary(log)
  t.is(summary.totalRevenueBTC, 0.8, 'should sum BTC revenue')
  t.is(summary.totalRevenueUSD, 32000, 'should sum USD revenue')
  t.is(summary.totalCostUSD, 8000, 'should sum costs')
  t.is(summary.totalProfitUSD, 24000, 'should sum profit')
  t.is(summary.totalConsumptionMWh, 160, 'should sum consumption')
  t.is(summary.avgPowerConsumption, 3, 'avgPowerConsumption averages sitePowerMW (4+2)/2')
  t.ok(summary.avgCostPerMWh !== null, 'should calculate avg cost per MWh')
  t.ok(summary.avgEnergyCostPerMWh !== null, 'should calculate avg energy cost per MWh')
  t.ok(summary.avgOperationalCostPerMWh !== null, 'should calculate avg operational cost per MWh')
  t.ok(summary.avgRevenuePerMWh !== null, 'should calculate avg revenue per MWh')
  t.pass()
})

test('calculateSummary - handles empty log', (t) => {
  const summary = calculateSummary([])
  t.is(summary.totalRevenueBTC, 0, 'should be zero')
  t.is(summary.totalRevenueUSD, 0, 'should be zero')
  t.is(summary.avgCostPerMWh, null, 'should be null')
  t.pass()
})

function makeMockCtx (days) {
  return withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (_key, method, payload) => {
        if (method === 'tailLogCustomRangeAggr') {
          return [{
            type: 'powermeter',
            data: days.map(d => ({ ts: d.ts, val: { site_power_w: d.powerW } })),
            error: null
          }]
        }
        if (method === 'getWrkExtData') {
          if (payload.query && payload.query.key === 'transactions') {
            return days.map(d => ({ ts: d.ts, transactions: [{ ts: d.ts, changed_balance: d.btc }] }))
          }
          if (payload.query && payload.query.key === 'HISTORICAL_PRICES') {
            return days.map(d => ({ ts: d.ts, priceUSD: d.price }))
          }
          if (payload.query && payload.query.key === 'current_price') {
            return [{ currentPrice: days[0].price }]
          }
          if (payload.query && payload.query.key === 'stats-history') {
            return []
          }
        }
        if (method === 'getGlobalConfig') {
          return { nominalPowerAvailability_MW: 10 }
        }
        return {}
      }
    },
    globalDataLib: { getGlobalData: async () => [] }
  })
}

test('getEnergyBalance daily - per-day entries carry sitePowerMW and per-MW revenue', async (t) => {
  const day1 = Date.UTC(2024, 0, 15)
  const day2 = Date.UTC(2024, 0, 16)
  const days = [
    { ts: day1, powerW: 5_000_000, btc: 0.5, price: 40000 },
    { ts: day2, powerW: 3_000_000, btc: 0.3, price: 40000 }
  ]

  const result = await getEnergyBalance(makeMockCtx(days), {
    query: { start: day1 - 1000, end: day2 + 86400000, period: 'daily' }
  }, {})

  t.is(result.log.length, 2, 'one entry per day')
  for (const e of result.log) {
    t.ok(e.sitePowerMW > 0, 'sitePowerMW present')
    t.ok('energyRevenueBTC_MW' in e && 'energyRevenueUSD_MW' in e, 'per-MW revenue fields present')
  }
  t.is(result.log[0].sitePowerMW, 5, 'first day sitePowerMW = 5')
  t.is(result.log[1].sitePowerMW, 3, 'second day sitePowerMW = 3')
})

test('getEnergyBalance monthly - rates use MEAN, totals use SUM, per-MW is RECOMPUTED', async (t) => {
  const day1 = Date.UTC(2024, 0, 15)
  const day2 = Date.UTC(2024, 0, 16)
  const day3 = Date.UTC(2024, 0, 17)
  const days = [
    { ts: day1, powerW: 5_000_000, btc: 0.5, price: 40000 },
    { ts: day2, powerW: 3_000_000, btc: 0.3, price: 40000 },
    { ts: day3, powerW: 4_000_000, btc: 0.4, price: 40000 }
  ]

  const result = await getEnergyBalance(makeMockCtx(days), {
    query: { start: day1 - 1000, end: day3 + 86400000, period: 'monthly' }
  }, {})

  t.is(result.log.length, 1, 'three days collapse to one monthly bucket')
  const m = result.log[0]
  t.ok(Math.abs(m.revenueBTC - 1.2) < 1e-9, 'revenueBTC summed (~1.2)')
  t.ok(Math.abs(m.revenueUSD - 48000) < 1e-6, 'revenueUSD summed (~48000)')
  t.is(m.sitePowerMW, 4, 'sitePowerMW averaged: (5+3+4)/3')
  t.ok(Math.abs(m.energyRevenueUSD_MW - 12000) < 1e-6, 'per-MW recomputed from sum / mean, not summed daily values')
  t.ok(Math.abs(m.energyRevenueBTC_MW - 0.3) < 1e-9, 'BTC per-MW recomputed')
})

// ==================== EBITDA Tests ====================

test('getEbitda - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'tailLogCustomRangeAggr') {
          return [{ data: { 1700006400000: { site_power_w: 5000, hashrate_mhs_5m_sum_aggr: 100000 } } }]
        }
        if (method === 'getWrkExtData') {
          if (payload.query && payload.query.key === 'transactions') {
            return { data: [{ transactions: [{ ts: 1700006400000, changed_balance: 50000000 }] }] }
          }
          if (payload.query && payload.query.key === 'prices') {
            return { data: [{ prices: [{ ts: 1700006400000, price: 40000 }] }] }
          }
          if (payload.query && payload.query.key === 'current_price') {
            return { data: { USD: 40000 } }
          }
        }
        return {}
      }
    },
    globalDataLib: {
      getGlobalData: async () => []
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getEbitda(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.summary.currentBtcPrice !== undefined, 'summary should have currentBtcPrice')
  t.pass()
})

test('getEbitda - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  try {
    await getEbitda(mockCtx, { query: { end: 1700100000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getEbitda - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  try {
    await getEbitda(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getEbitda - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  const result = await getEbitda(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('processTailLogData - processes power and hashrate', (t) => {
  const results = [
    [{ data: { 1700006400000: { site_power_w: 5000, hashrate_mhs_5m_sum_aggr: 100000 } } }]
  ]

  const daily = processTailLogData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.pass()
})

test('processTailLogData - drills into .val (production shape)', (t) => {
  const results = [
    [
      {
        type: 'powermeter',
        data: [
          { ts: 1700006400000, val: { site_power_w: 5000 } },
          { ts: 1700092800000, val: { site_power_w: 6000 } }
        ]
      },
      {
        type: 'miner',
        data: [
          { ts: 1700006400000, val: { hashrate_mhs_5m_sum_aggr: 100000 } },
          { ts: 1700092800000, val: { hashrate_mhs_5m_sum_aggr: 120000 } }
        ]
      }
    ]
  ]

  const daily = processTailLogData(results)
  t.is(daily[1700006400000].powerW, 5000, 'extracts powerW from .val on day 1')
  t.is(daily[1700006400000].hashrateMhs, 100000, 'extracts hashrateMhs from .val on day 1')
  t.is(daily[1700092800000].powerW, 6000, 'extracts powerW from .val on day 2')
  t.is(daily[1700092800000].hashrateMhs, 120000, 'extracts hashrateMhs from .val on day 2')
  t.pass()
})

test('processTailLogData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processTailLogData(results)
  t.is(Object.keys(daily).length, 0, 'should be empty for errors')
  t.pass()
})

test('processEbitdaPrices - processes valid data', (t) => {
  const results = [
    [{ prices: [{ ts: 1700006400000, price: 40000 }] }]
  ]
  const daily = processEbitdaPrices(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.pass()
})

test('processEbitdaPrices - flat per-ork items with priceUSD (production shape)', (t) => {
  const results = [
    [
      { ts: 1700006400000, priceUSD: 40000 },
      { ts: 1700092800000, priceUSD: 41500 }
    ]
  ]
  const daily = processEbitdaPrices(results)
  t.is(daily[1700006400000], 40000, 'should extract priceUSD for first day')
  t.is(daily[1700092800000], 41500, 'should extract priceUSD for second day')
  t.pass()
})

test('calculateEbitdaSummary - calculates from log entries', (t) => {
  const log = [
    { revenueBTC: 0.5, revenueUSD: 20000, totalCostsUSD: 5000, ebitdaSelling: 15000, ebitdaHodl: 15000 },
    { revenueBTC: 0.3, revenueUSD: 12000, totalCostsUSD: 3000, ebitdaSelling: 9000, ebitdaHodl: 9000 }
  ]

  const summary = calculateEbitdaSummary(log, 40000)
  t.is(summary.totalRevenueBTC, 0.8, 'should sum BTC revenue')
  t.is(summary.totalRevenueUSD, 32000, 'should sum USD revenue')
  t.is(summary.totalCostsUSD, 8000, 'should sum costs')
  t.is(summary.totalEbitdaSelling, 24000, 'should sum selling EBITDA')
  t.is(summary.currentBtcPrice, 40000, 'should include current BTC price')
  t.ok(summary.avgBtcProductionCost !== null, 'should calculate avg production cost')
  t.pass()
})

test('calculateEbitdaSummary - handles empty log', (t) => {
  const summary = calculateEbitdaSummary([], 40000)
  t.is(summary.totalRevenueBTC, 0, 'should be zero')
  t.is(summary.avgBtcProductionCost, null, 'should be null')
  t.is(summary.currentBtcPrice, 40000, 'should include current price')
  t.pass()
})

// ==================== Cost Summary Tests ====================

test('getCostSummary - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'tailLogCustomRangeAggr') {
          return [{ data: { 1700006400000: { site_power_w: 5000 } } }]
        }
        if (method === 'getWrkExtData') {
          return { data: [{ prices: [{ ts: 1700006400000, price: 40000 }] }] }
        }
        return {}
      }
    },
    globalDataLib: {
      getGlobalData: async () => []
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getCostSummary(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.pass()
})

test('getCostSummary - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  try {
    await getCostSummary(mockCtx, { query: { end: 1700100000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getCostSummary - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  try {
    await getCostSummary(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getCostSummary - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  const result = await getCostSummary(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('calculateCostSummary - calculates from log entries', (t) => {
  const log = [
    { energyCostsUSD: 5000, operationalCostsUSD: 1000, totalCostsUSD: 6000, consumptionMWh: 100, btcPrice: 40000 },
    { energyCostsUSD: 3000, operationalCostsUSD: 600, totalCostsUSD: 3600, consumptionMWh: 60, btcPrice: 42000 }
  ]

  const summary = calculateCostSummary(log)
  t.is(summary.totalEnergyCostsUSD, 8000, 'should sum energy costs')
  t.is(summary.totalOperationalCostsUSD, 1600, 'should sum operational costs')
  t.is(summary.totalCostsUSD, 9600, 'should sum total costs')
  t.is(summary.totalConsumptionMWh, 160, 'should sum consumption')
  t.ok(summary.avgAllInCostPerMWh !== null, 'should calculate avg all-in cost')
  t.ok(summary.avgBtcPrice !== null, 'should calculate avg BTC price')
  t.pass()
})

test('calculateCostSummary - handles empty log', (t) => {
  const summary = calculateCostSummary([])
  t.is(summary.totalCostsUSD, 0, 'should be zero')
  t.is(summary.avgAllInCostPerMWh, null, 'should be null')
  t.pass()
})

// ==================== Subsidy Fees Tests ====================

test('getSubsidyFees - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'getWrkExtData') {
          return [{ data: [{ ts: 1700006400000, blockReward: 6.25, blockTotalFees: 0.5 }] }]
        }
        return {}
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getSubsidyFees(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.pass()
})

test('getSubsidyFees - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getSubsidyFees(mockCtx, { query: { end: 1700100000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getSubsidyFees - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getSubsidyFees(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getSubsidyFees - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getSubsidyFees(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('calculateSubsidyFeesSummary - calculates from log entries', (t) => {
  const log = [
    { blockReward: 6.25, blockTotalFees: 0.5, blockSize: 1500000 },
    { blockReward: 6.25, blockTotalFees: 0.3, blockSize: 1300000 }
  ]

  const summary = calculateSubsidyFeesSummary(log)
  t.is(summary.totalBlockReward, 12.5, 'should sum block rewards')
  t.is(summary.totalBlockTotalFees, 0.8, 'should sum block fees')
  t.is(summary.totalBlockSize, 2800000, 'should sum block sizes')
  t.ok(summary.avgBlockReward !== null, 'should calculate avg block reward')
  t.is(summary.avgBlockReward, 6.25, 'should calculate correct avg block reward')
  t.ok(summary.avgBlockTotalFees !== null, 'should calculate avg block fees')
  t.is(summary.avgBlockSize, 1400000, 'should calculate correct avg block size')
  t.pass()
})

test('calculateSubsidyFeesSummary - handles empty log', (t) => {
  const summary = calculateSubsidyFeesSummary([])
  t.is(summary.totalBlockReward, 0, 'should be zero')
  t.is(summary.totalBlockTotalFees, 0, 'should be zero')
  t.is(summary.avgBlockReward, null, 'should be null')
  t.is(summary.avgBlockTotalFees, null, 'should be null')
  t.pass()
})

// ==================== Revenue Tests ====================

test('getRevenue - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'getWrkExtData') {
          return [{ transactions: [{ ts: 1700006400000, changed_balance: 0.5, mining_extra: { tx_fee: 0.001 } }] }]
        }
        return {}
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getRevenue(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.pass()
})

test('getRevenue - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getRevenue(mockCtx, { query: { end: 1700100000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getRevenue - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getRevenue(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getRevenue - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getRevenue(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('getRevenue - pool filter', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return [{ transactions: [{ ts: 1700006400000, changed_balance: 0.5 }] }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, pool: 'f2pool' }
  }

  await getRevenue(mockCtx, mockReq, {})
  t.is(capturedPayload.type, 'minerpool-f2pool', 'should include pool in worker type')
  t.pass()
})

test('calculateRevenueSummary - calculates from log entries', (t) => {
  const log = [
    { revenueBTC: 0.5, feesBTC: 0.01, netRevenueBTC: 0.49 },
    { revenueBTC: 0.3, feesBTC: 0.005, netRevenueBTC: 0.295 }
  ]

  const summary = calculateRevenueSummary(log)
  t.is(summary.totalRevenueBTC, 0.8, 'should sum revenue')
  t.is(summary.totalFeesBTC, 0.015, 'should sum fees')
  t.ok(Math.abs(summary.totalNetRevenueBTC - 0.785) < 1e-10, 'should sum net revenue')
  t.pass()
})

test('calculateRevenueSummary - handles empty log', (t) => {
  const summary = calculateRevenueSummary([])
  t.is(summary.totalRevenueBTC, 0, 'should be zero')
  t.is(summary.totalFeesBTC, 0, 'should be zero')
  t.is(summary.totalNetRevenueBTC, 0, 'should be zero')
  t.pass()
})

// ==================== Revenue Summary Tests ====================

test('getRevenueSummary - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'tailLogCustomRangeAggr') {
          return [{ data: { [dayTs]: { site_power_w: 5000, hashrate_mhs_5m_sum_aggr: 100000 } } }]
        }
        if (method === 'getWrkExtData') {
          if (payload.query && payload.query.key === 'transactions') {
            return [{ transactions: [{ ts: dayTs, changed_balance: 0.5, mining_extra: { tx_fee: 0.001 } }] }]
          }
          if (payload.query && payload.query.key === 'HISTORICAL_PRICES') {
            return [{ data: [{ ts: dayTs, priceUSD: 40000 }] }]
          }
          if (payload.query && payload.query.key === 'current_price') {
            return { data: { USD: 40000 } }
          }
          if (payload.query && payload.query.key === 'HISTORICAL_BLOCKSIZES') {
            return [{ data: [{ ts: dayTs, blockReward: 6.25, blockTotalFees: 0.5 }] }]
          }
          if (payload.query && payload.query.key === 'stats-history') {
            return []
          }
        }
        if (method === 'getGlobalConfig') {
          return { nominalPowerAvailability_MW: 10 }
        }
        return {}
      }
    },
    globalDataLib: {
      getGlobalData: async () => []
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getRevenueSummary(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.summary.currentBtcPrice !== undefined, 'summary should have currentBtcPrice')
  if (result.log.length > 0) {
    const entry = result.log[0]
    t.ok(entry.revenueBTC !== undefined, 'entry should have revenueBTC')
    t.ok(entry.feesBTC !== undefined, 'entry should have feesBTC')
    t.ok(entry.revenueUSD !== undefined, 'entry should have revenueUSD')
    t.ok(entry.ebitdaSelling !== undefined, 'entry should have ebitdaSelling')
    t.ok(entry.ebitdaHodl !== undefined, 'entry should have ebitdaHodl')
    t.ok(entry.blockReward !== undefined, 'entry should have blockReward')
  }
  t.pass()
})

test('getRevenueSummary - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  try {
    await getRevenueSummary(mockCtx, { query: { end: 1700100000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getRevenueSummary - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  try {
    await getRevenueSummary(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getRevenueSummary - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) },
    globalDataLib: { getGlobalData: async () => [] }
  })

  const result = await getRevenueSummary(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('calculateDetailedRevenueSummary - calculates from log entries', (t) => {
  const log = [
    {
      revenueBTC: 0.5,
      revenueUSD: 20000,
      feesBTC: 0.01,
      feesUSD: 400,
      totalCostsUSD: 5000,
      consumptionMWh: 100,
      ebitdaSelling: 15000,
      ebitdaHodl: 15000,
      btcPrice: 40000,
      curtailmentRate: 0.1,
      powerUtilization: 0.8
    },
    {
      revenueBTC: 0.3,
      revenueUSD: 12600,
      feesBTC: 0.005,
      feesUSD: 210,
      totalCostsUSD: 3000,
      consumptionMWh: 60,
      ebitdaSelling: 9600,
      ebitdaHodl: 9600,
      btcPrice: 42000,
      curtailmentRate: 0.15,
      powerUtilization: 0.85
    }
  ]

  const summary = calculateDetailedRevenueSummary(log, 42000)
  t.is(summary.totalRevenueBTC, 0.8, 'should sum BTC revenue')
  t.is(summary.totalRevenueUSD, 32600, 'should sum USD revenue')
  t.is(summary.totalFeesBTC, 0.015, 'should sum fees BTC')
  t.is(summary.totalCostsUSD, 8000, 'should sum costs')
  t.is(summary.totalConsumptionMWh, 160, 'should sum consumption')
  t.is(summary.totalEbitdaSelling, 24600, 'should sum selling EBITDA')
  t.ok(summary.avgCostPerMWh !== null, 'should calculate avg cost per MWh')
  t.ok(summary.avgRevenuePerMWh !== null, 'should calculate avg revenue per MWh')
  t.ok(summary.avgBtcPrice !== null, 'should calculate avg BTC price')
  t.ok(summary.avgCurtailmentRate !== null, 'should calculate avg curtailment rate')
  t.ok(summary.avgPowerUtilization !== null, 'should calculate avg power utilization')
  t.is(summary.currentBtcPrice, 42000, 'should include current BTC price')
  t.pass()
})

test('calculateDetailedRevenueSummary - handles empty log', (t) => {
  const summary = calculateDetailedRevenueSummary([], 42000)
  t.is(summary.totalRevenueBTC, 0, 'should be zero')
  t.is(summary.totalRevenueUSD, 0, 'should be zero')
  t.is(summary.totalFeesBTC, 0, 'should be zero')
  t.is(summary.avgCostPerMWh, null, 'should be null')
  t.is(summary.currentBtcPrice, 42000, 'should include current price')
  t.pass()
})

// ==================== Hash Revenue Tests ====================

test('getHashRevenue - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'tailLogCustomRangeAggr') {
          return [{ data: { [dayTs]: { hashrate_mhs_5m_sum_aggr: 500000000 } } }]
        }
        if (method === 'getWrkExtData') {
          if (payload.query && payload.query.key === 'transactions') {
            return [{ transactions: [{ ts: dayTs, changed_balance: 0.5, mining_extra: { tx_fee: 0.001 } }] }]
          }
          if (payload.query && payload.query.key === 'prices') {
            return [{ prices: [{ ts: dayTs, price: 40000 }] }]
          }
          if (payload.query && payload.query.key === 'current_price') {
            return [{ currentPrice: 40000 }]
          }
          if (payload.query && payload.query.key === 'HISTORICAL_HASHRATE') {
            return [{ data: [{ ts: dayTs, avgHashrateMHs: 500000000000000 }] }]
          }
        }
        return {}
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, period: 'daily' }
  }

  const result = await getHashRevenue(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  if (result.log.length > 0) {
    const entry = result.log[0]
    t.ok(entry.revenueBTC !== undefined, 'entry should have revenueBTC')
    t.ok(entry.feesBTC !== undefined, 'entry should have feesBTC')
    t.ok(entry.revenueUSD !== undefined, 'entry should have revenueUSD')
    t.ok(entry.hashRevenueBTCPerPHsPerDay !== undefined, 'entry should have hashRevenueBTCPerPHsPerDay')
    t.ok(entry.hashRevenueUSDPerPHsPerDay !== undefined, 'entry should have hashRevenueUSDPerPHsPerDay')
    t.ok(entry.hashCostBTCPerPHsPerDay !== undefined, 'entry should have hashCostBTCPerPHsPerDay')
    t.ok(entry.hashCostUSDPerPHsPerDay !== undefined, 'entry should have hashCostUSDPerPHsPerDay')
    t.ok(entry.networkHashPriceBTCPerPHsPerDay !== undefined, 'entry should have networkHashPriceBTCPerPHsPerDay')
    t.ok(entry.networkHashPriceUSDPerPHsPerDay !== undefined, 'entry should have networkHashPriceUSDPerPHsPerDay')
    t.ok(entry.networkHashrateMhs !== undefined, 'entry should have networkHashrateMhs')
  }
  t.pass()
})

test('getHashRevenue - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getHashRevenue(mockCtx, { query: { end: 1700100000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getHashRevenue - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getHashRevenue(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getHashRevenue - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getHashRevenue(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('processHashrateData - processes object-keyed data', (t) => {
  const results = [
    [{ data: { 1700006400000: { hashrate_mhs_5m_sum_aggr: 500000 } } }]
  ]

  const daily = processHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key], 500000, 'should extract hashrate from val')
  t.pass()
})

test('processHashrateData - processes array data', (t) => {
  const results = [
    [{ data: [{ ts: 1700006400000, hashrate_mhs_5m_sum_aggr: 500000 }] }]
  ]

  const daily = processHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  t.pass()
})

test('processHashrateData - drills into .val (production shape)', (t) => {
  const results = [
    [
      {
        type: 'miner',
        data: [
          { ts: 1700006400000, val: { hashrate_mhs_5m_sum_aggr: 500000 } },
          { ts: 1700092800000, val: { hashrate_mhs_5m_sum_aggr: 600000 } }
        ]
      }
    ]
  ]
  const daily = processHashrateData(results)
  t.is(daily[1700006400000], 500000, 'extracts hashrate from .val on day 1')
  t.is(daily[1700092800000], 600000, 'extracts hashrate from .val on day 2')
  t.pass()
})

test('processHashrateData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processHashrateData(results)
  t.is(Object.keys(daily).length, 0, 'should be empty for errors')
  t.pass()
})

test('processNetworkHashrateData - processes array data', (t) => {
  const results = [
    [{ data: [{ ts: 1700006400000, avgHashrateMHs: 500000000000000 }] }]
  ]

  const daily = processNetworkHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key], 500000000000000, 'should extract avgHashrateMHs')
  t.pass()
})

test('processNetworkHashrateData - flat per-ork items (production shape)', (t) => {
  const results = [
    [
      { ts: 1700006400000, avgHashrateMHs: 1019725948656278 },
      { ts: 1700092800000, avgHashrateMHs: 1029591824888537 }
    ]
  ]
  const daily = processNetworkHashrateData(results)
  t.is(daily[1700006400000], 1019725948656278, 'extracts avgHashrateMHs day 1')
  t.is(daily[1700092800000], 1029591824888537, 'extracts avgHashrateMHs day 2')
  t.pass()
})

test('processNetworkHashrateData - processes object-keyed data', (t) => {
  const results = [
    [{ data: { 1700006400000: { avgHashrateMHs: 500000000000000 } } }]
  ]

  const daily = processNetworkHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  t.pass()
})

test('processNetworkHashrateData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processNetworkHashrateData(results)
  t.is(Object.keys(daily).length, 0, 'should be empty for errors')
  t.pass()
})

test('calculateHashRevenueSummary - calculates from log entries', (t) => {
  const log = [
    {
      revenueBTC: 0.5,
      revenueUSD: 20000,
      feesBTC: 0.01,
      feesUSD: 400,
      hashRevenueBTCPerPHsPerDay: 0.001,
      hashRevenueUSDPerPHsPerDay: 40,
      hashCostBTCPerPHsPerDay: 0.00002,
      hashCostUSDPerPHsPerDay: 0.8,
      networkHashPriceBTCPerPHsPerDay: 0.0005,
      networkHashPriceUSDPerPHsPerDay: 20
    },
    {
      revenueBTC: 0.3,
      revenueUSD: 12600,
      feesBTC: 0.005,
      feesUSD: 210,
      hashRevenueBTCPerPHsPerDay: 0.0008,
      hashRevenueUSDPerPHsPerDay: 33.6,
      hashCostBTCPerPHsPerDay: 0.00001,
      hashCostUSDPerPHsPerDay: 0.42,
      networkHashPriceBTCPerPHsPerDay: 0.0004,
      networkHashPriceUSDPerPHsPerDay: 16.8
    }
  ]

  const summary = calculateHashRevenueSummary(log)
  t.is(summary.totalRevenueBTC, 0.8, 'should sum BTC revenue')
  t.is(summary.totalRevenueUSD, 32600, 'should sum USD revenue')
  t.is(summary.totalFeesBTC, 0.015, 'should sum fees BTC')
  t.is(summary.totalFeesUSD, 610, 'should sum fees USD')
  t.ok(summary.avgHashRevenueBTCPerPHsPerDay !== null, 'should calculate avg hash revenue BTC')
  t.ok(summary.avgHashRevenueUSDPerPHsPerDay !== null, 'should calculate avg hash revenue USD')
  t.ok(summary.avgHashCostBTCPerPHsPerDay !== null, 'should calculate avg hash cost BTC')
  t.ok(summary.avgHashCostUSDPerPHsPerDay !== null, 'should calculate avg hash cost USD')
  t.ok(summary.avgNetworkHashPriceBTCPerPHsPerDay !== null, 'should calculate avg network hash price BTC')
  t.ok(summary.avgNetworkHashPriceUSDPerPHsPerDay !== null, 'should calculate avg network hash price USD')
  t.pass()
})

test('calculateHashRevenueSummary - handles empty log', (t) => {
  const summary = calculateHashRevenueSummary([])
  t.is(summary.totalRevenueBTC, 0, 'should be zero')
  t.is(summary.totalRevenueUSD, 0, 'should be zero')
  t.is(summary.totalFeesBTC, 0, 'should be zero')
  t.is(summary.totalFeesUSD, 0, 'should be zero')
  t.is(summary.avgHashRevenueBTCPerPHsPerDay, null, 'should be null')
  t.is(summary.avgHashRevenueUSDPerPHsPerDay, null, 'should be null')
  t.is(summary.avgHashCostBTCPerPHsPerDay, null, 'should be null')
  t.is(summary.avgHashCostUSDPerPHsPerDay, null, 'should be null')
  t.is(summary.avgNetworkHashPriceBTCPerPHsPerDay, null, 'should be null')
  t.is(summary.avgNetworkHashPriceUSDPerPHsPerDay, null, 'should be null')
  t.pass()
})
