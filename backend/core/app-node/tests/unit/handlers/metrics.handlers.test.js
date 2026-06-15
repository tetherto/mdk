'use strict'

const test = require('brittle')
const {
  getHashrate,
  processHashrateData,
  calculateHashrateSummary,
  getConsumption,
  processConsumptionData,
  calculateConsumptionSummary,
  calculateGroupedConsumptionSummary,
  getEfficiency,
  processEfficiencyData,
  calculateEfficiencySummary,
  getMinerStatus,
  processMinerStatusData,
  calculateMinerStatusSummary,
  sumObjectValues,
  parseEntryTs,
  resolveInterval,
  getIntervalConfig,
  getPowerMode,
  processPowerModeData,
  calculatePowerModeSummary,
  categorizeMiner,
  getPowerModeTimeline,
  processPowerModeTimelineData,
  getTemperature,
  processTemperatureData,
  calculateTemperatureSummary,
  forEachRangeAggrItem,
  getContainerTelemetry,
  processContainerMiners,
  processContainerSensorSnapshot,
  getContainerHistory,
  processContainerHistoryData
} = require('../../../workers/lib/server/handlers/metrics.handlers')
const { withDataProxy } = require('../helpers/mockHelpers')

// ==================== Hashrate Tests ====================

test('getHashrate - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{ type: 'miner', data: [{ ts: dayTs, val: { hashrate_mhs_5m_sum_aggr: 100000 } }], error: null }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000 }
  }

  const result = await getHashrate(mockCtx, mockReq)
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.is(result.log[0].hashrateMhs, 100000, 'should have hashrate value')
  t.ok(result.summary.avgHashrateMhs !== null, 'should have avg hashrate')
  t.is(result.summary.totalHashrateMhs, 100000, 'should have total hashrate')
  t.pass()
})

test('getHashrate - grouped by miner uses type group aggregation', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return [{
          ts: 1700006400000,
          hashrate_mhs_5m_type_group_sum_aggr: { 'S19-Pro': 100000, S21: 23456 }
        }]
      }
    }
  })

  const result = await getHashrate(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, groupBy: 'miner' }
  })

  t.is(capturedPayload.fields.hashrate_mhs_5m_type_group_sum, 1, 'should request type-group source field')
  t.is(capturedPayload.aggrFields.hashrate_mhs_5m_type_group_sum_aggr, 1, 'should request type-group aggregate field')
  t.is(result.log.length, 1, 'should map one grouped row')
  t.alike(result.log[0].hashrateMhs, { 'S19-Pro': 100000, S21: 23456 }, 'should map grouped hashrate value')
  t.is(result.summary.totalHashrateMhs, 123456, 'should have site-wide total')
  t.is(result.summary.avgHashrateMhs, 123456, 'should have site-wide average')
  t.ok(result.summary.groupedBy, 'should have per-miner breakdown')
  t.is(result.summary.groupedBy['S19-Pro'].totalHashrateMhs, 100000, 'should have per-miner total')
  t.is(result.summary.groupedBy.S21.totalHashrateMhs, 23456, 'should have per-miner total')
  t.pass()
})

test('getHashrate - grouped by container uses container group aggregation', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return [{
          ts: 1700006400000,
          hashrate_mhs_5m_container_group_sum_aggr: { 'container-A': 500, 'container-B': 277 }
        }]
      }
    }
  })

  const result = await getHashrate(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, groupBy: 'container' }
  })

  t.is(capturedPayload.fields.hashrate_mhs_5m_container_group_sum, 1, 'should request container-group source field')
  t.is(capturedPayload.aggrFields.hashrate_mhs_5m_container_group_sum_aggr, 1, 'should request container-group aggregate field')
  t.is(result.log.length, 1, 'should map grouped row')
  t.alike(result.log[0].hashrateMhs, { 'container-A': 500, 'container-B': 277 }, 'should map container grouped hashrate value')
  t.is(result.summary.totalHashrateMhs, 777, 'should have site-wide total')
  t.ok(result.summary.groupedBy, 'should have per-container breakdown')
  t.is(result.summary.groupedBy['container-A'].totalHashrateMhs, 500, 'should have per-container total')
  t.is(result.summary.groupedBy['container-B'].totalHashrateMhs, 277, 'should have per-container total')
  t.pass()
})

test('getHashrate - grouped mode handles empty results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => [] }
  })

  const result = await getHashrate(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, groupBy: 'miner' }
  })

  t.is(result.log.length, 0, 'grouped log should be empty when no data is returned')
  t.is(result.summary.avgHashrateMhs, null, 'grouped empty summary should have null avg')
  t.is(result.summary.totalHashrateMhs, 0, 'grouped empty summary should have zero total')
  t.pass()
})

test('getHashrate - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getHashrate(mockCtx, { query: { end: 1700100000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getHashrate - missing end throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getHashrate(mockCtx, { query: { start: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getHashrate - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getHashrate(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getHashrate - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getHashrate(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } })
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.is(result.log.length, 0, 'log should be empty with no data')
  t.is(result.summary.totalHashrateMhs, 0, 'total should be zero')
  t.is(result.summary.avgHashrateMhs, null, 'avg should be null')
  t.pass()
})

test('processHashrateData - processes array data from ORK', (t) => {
  const results = [
    [{ type: 'miner', data: [{ ts: 1700006400000, val: { hashrate_mhs_5m_sum_aggr: 100000 } }], error: null }]
  ]

  const daily = processHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key], 100000, 'should extract hashrate from val')
  t.pass()
})

test('processHashrateData - processes object-keyed data', (t) => {
  const results = [
    [{ data: { 1700006400000: { hashrate_mhs_5m_sum_aggr: 100000 } } }]
  ]

  const daily = processHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  t.pass()
})

test('processHashrateData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processHashrateData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.is(Object.keys(daily).length, 0, 'should be empty for error results')
  t.pass()
})

test('processHashrateData - aggregates multiple orks', (t) => {
  const results = [
    [{ data: { 1700006400000: { hashrate_mhs_5m_sum_aggr: 50000 } } }],
    [{ data: { 1700006400000: { hashrate_mhs_5m_sum_aggr: 30000 } } }]
  ]

  const daily = processHashrateData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key], 80000, 'should sum hashrate from multiple orks')
  t.pass()
})

test('calculateHashrateSummary - calculates from log entries', (t) => {
  const log = [
    { ts: 1700006400000, hashrateMhs: 100000 },
    { ts: 1700092800000, hashrateMhs: 120000 }
  ]

  const summary = calculateHashrateSummary(log)
  t.is(summary.totalHashrateMhs, 220000, 'should sum hashrate')
  t.is(summary.avgHashrateMhs, 110000, 'should average hashrate')
  t.pass()
})

test('calculateHashrateSummary - handles empty log', (t) => {
  const summary = calculateHashrateSummary([])
  t.is(summary.totalHashrateMhs, 0, 'should be zero')
  t.is(summary.avgHashrateMhs, null, 'should be null')
  t.pass()
})

// ==================== Consumption Tests ====================

test('getConsumption - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{ type: 'powermeter', data: [{ ts: dayTs, val: { site_power_w: 5000000 } }], error: null }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000 }
  }

  const result = await getConsumption(mockCtx, mockReq)
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.is(result.log[0].powerW, 5000000, 'should have power value')
  t.is(result.log[0].consumptionMWh, (5000000 * 24) / 1000000, 'should convert to MWh')
  t.ok(result.summary.avgPowerW !== null, 'should have avg power')
  t.ok(result.summary.totalConsumptionMWh > 0, 'should have total consumption')
  t.pass()
})

test('getConsumption - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getConsumption(mockCtx, { query: { end: 1700100000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getConsumption - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getConsumption(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getConsumption - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getConsumption(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } })
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty with no data')
  t.is(result.summary.totalConsumptionMWh, 0, 'total should be zero')
  t.is(result.summary.avgPowerW, null, 'avg should be null')
  t.pass()
})

test('processConsumptionData - processes array data from ORK', (t) => {
  const results = [
    [{ type: 'powermeter', data: [{ ts: 1700006400000, val: { site_power_w: 5000 } }], error: null }]
  ]

  const daily = processConsumptionData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key], 5000, 'should extract power from val')
  t.pass()
})

test('processConsumptionData - processes object-keyed data', (t) => {
  const results = [
    [{ data: { 1700006400000: { site_power_w: 5000 } } }]
  ]

  const daily = processConsumptionData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  t.pass()
})

test('processConsumptionData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processConsumptionData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.is(Object.keys(daily).length, 0, 'should be empty for error results')
  t.pass()
})

test('processConsumptionData - aggregates multiple orks', (t) => {
  const results = [
    [{ data: { 1700006400000: { site_power_w: 3000 } } }],
    [{ data: { 1700006400000: { site_power_w: 2000 } } }]
  ]

  const daily = processConsumptionData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key], 5000, 'should sum power from multiple orks')
  t.pass()
})

test('calculateConsumptionSummary - calculates from log entries', (t) => {
  const log = [
    { ts: 1700006400000, powerW: 5000000, consumptionMWh: 120 },
    { ts: 1700092800000, powerW: 4000000, consumptionMWh: 96 }
  ]

  const summary = calculateConsumptionSummary(log)
  t.is(summary.totalConsumptionMWh, 216, 'should sum consumption')
  t.is(summary.avgPowerW, 4500000, 'should average power')
  t.pass()
})

test('calculateConsumptionSummary - handles empty log', (t) => {
  const summary = calculateConsumptionSummary([])
  t.is(summary.totalConsumptionMWh, 0, 'should be zero')
  t.is(summary.avgPowerW, null, 'should be null')
  t.pass()
})

test('getConsumption - grouped by miner uses type group aggregation', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return [{
          ts: 1700006400000,
          power_w_type_group_sum_aggr: { 'S19-Pro': 3000000, S21: 2000000 }
        }]
      }
    }
  })

  const result = await getConsumption(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, groupBy: 'miner' }
  })

  t.is(capturedPayload.fields.power_w_type_group_sum, 1, 'should request type-group source field')
  t.is(capturedPayload.aggrFields.power_w_type_group_sum_aggr, 1, 'should request type-group aggregate field')
  t.is(result.log.length, 1, 'should map one grouped row')
  t.alike(result.log[0].powerW, { 'S19-Pro': 3000000, S21: 2000000 }, 'should map grouped power value')
  t.ok(result.log[0].consumptionMWh, 'should have consumptionMWh object')
  t.is(result.summary.totalConsumptionMWh, (5000000 * 24) / 1000000, 'should have site-wide total consumption')
  t.ok(result.summary.groupedBy, 'should have per-miner breakdown')
  t.is(result.summary.groupedBy['S19-Pro'].totalConsumptionMWh, (3000000 * 24) / 1000000, 'should have per-miner total')
  t.is(result.summary.groupedBy.S21.totalConsumptionMWh, (2000000 * 24) / 1000000, 'should have per-miner total')
  t.pass()
})

test('getConsumption - grouped by container uses container group aggregation', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return [{
          ts: 1700006400000,
          power_w_container_group_sum_aggr: { 'container-A': 4000000, 'container-B': 1000000 }
        }]
      }
    }
  })

  const result = await getConsumption(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, groupBy: 'container' }
  })

  t.is(capturedPayload.fields.power_w_container_group_sum, 1, 'should request container-group source field')
  t.is(capturedPayload.aggrFields.power_w_container_group_sum_aggr, 1, 'should request container-group aggregate field')
  t.is(result.log.length, 1, 'should map grouped row')
  t.alike(result.log[0].powerW, { 'container-A': 4000000, 'container-B': 1000000 }, 'should map container grouped power value')
  t.is(result.summary.totalConsumptionMWh, (5000000 * 24) / 1000000, 'should have site-wide total consumption')
  t.ok(result.summary.groupedBy, 'should have per-container breakdown')
  t.is(result.summary.groupedBy['container-A'].totalConsumptionMWh, (4000000 * 24) / 1000000, 'should have per-container total')
  t.is(result.summary.groupedBy['container-B'].totalConsumptionMWh, (1000000 * 24) / 1000000, 'should have per-container total')
  t.pass()
})

test('getConsumption - grouped mode handles empty results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => [] }
  })

  const result = await getConsumption(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, groupBy: 'miner' }
  })

  t.is(result.log.length, 0, 'grouped log should be empty when no data is returned')
  t.is(result.summary.avgPowerW, null, 'grouped empty summary should have null avg')
  t.is(result.summary.totalConsumptionMWh, 0, 'grouped empty summary should have zero total')
  t.pass()
})

test('calculateGroupedConsumptionSummary - calculates per-group and site-wide stats', (t) => {
  const log = [
    { ts: 1700006400000, powerW: { 'S19-Pro': 3000000, S21: 2000000 } },
    { ts: 1700092800000, powerW: { 'S19-Pro': 3500000, S21: 1500000 } }
  ]

  const summary = calculateGroupedConsumptionSummary(log, 'miner')
  t.is(summary.totalConsumptionMWh, (10000000 * 24) / 1000000, 'should have site-wide total')
  t.is(summary.avgPowerW, 5000000, 'should have site-wide average')
  t.ok(summary.groupedBy, 'should have per-group breakdown')
  t.is(summary.groupedBy['S19-Pro'].avgPowerW, 3250000, 'should average per-group power')
  t.is(summary.groupedBy['S19-Pro'].totalConsumptionMWh, (6500000 * 24) / 1000000, 'should sum per-group consumption')
  t.is(summary.groupedBy.S21.avgPowerW, 1750000, 'should average per-group power')
  t.pass()
})

test('calculateGroupedConsumptionSummary - handles empty log', (t) => {
  const summary = calculateGroupedConsumptionSummary([], 'miner')
  t.is(summary.avgPowerW, null, 'should be null')
  t.is(summary.totalConsumptionMWh, 0, 'should be zero')
  t.pass()
})

// ==================== Efficiency Tests ====================

test('getEfficiency - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{ type: 'miner', data: [{ ts: dayTs, val: { efficiency_w_ths_avg_aggr: 25.5 } }], error: null }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000 }
  }

  const result = await getEfficiency(mockCtx, mockReq)
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.is(result.log[0].efficiencyWThs, 25.5, 'should have efficiency value')
  t.ok(result.summary.avgEfficiencyWThs !== null, 'should have avg efficiency')
  t.pass()
})

test('getEfficiency - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getEfficiency(mockCtx, { query: { end: 1700100000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getEfficiency - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getEfficiency(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getEfficiency - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getEfficiency(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } })
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty with no data')
  t.is(result.summary.avgEfficiencyWThs, null, 'avg should be null')
  t.pass()
})

test('processEfficiencyData - processes array data from ORK', (t) => {
  const results = [
    [{ type: 'miner', data: [{ ts: 1700006400000, val: { efficiency_w_ths_avg_aggr: 25.5 } }], error: null }]
  ]

  const daily = processEfficiencyData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  const key = Object.keys(daily)[0]
  t.is(daily[key].total, 25.5, 'should extract efficiency total')
  t.is(daily[key].count, 1, 'should track count')
  t.pass()
})

test('processEfficiencyData - processes object-keyed data', (t) => {
  const results = [
    [{ data: { 1700006400000: { efficiency_w_ths_avg_aggr: 25.5 } } }]
  ]

  const daily = processEfficiencyData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.ok(Object.keys(daily).length > 0, 'should have entries')
  t.pass()
})

test('processEfficiencyData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processEfficiencyData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.is(Object.keys(daily).length, 0, 'should be empty for error results')
  t.pass()
})

test('processEfficiencyData - averages across multiple orks', (t) => {
  const results = [
    [{ data: { 1700006400000: { efficiency_w_ths_avg_aggr: 20 } } }],
    [{ data: { 1700006400000: { efficiency_w_ths_avg_aggr: 30 } } }]
  ]

  const daily = processEfficiencyData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].total, 50, 'should sum efficiency totals')
  t.is(daily[key].count, 2, 'should track count from multiple orks')
  t.pass()
})

test('calculateEfficiencySummary - calculates from log entries', (t) => {
  const log = [
    { ts: 1700006400000, efficiencyWThs: 25 },
    { ts: 1700092800000, efficiencyWThs: 27 }
  ]

  const summary = calculateEfficiencySummary(log)
  t.is(summary.avgEfficiencyWThs, 26, 'should average efficiency')
  t.pass()
})

test('calculateEfficiencySummary - handles empty log', (t) => {
  const summary = calculateEfficiencySummary([])
  t.is(summary.avgEfficiencyWThs, null, 'should be null')
  t.pass()
})

// ==================== Miner Status Tests ====================

test('sumObjectValues - sums keyed object values', (t) => {
  t.is(sumObjectValues({ a: 5, b: 3, c: 2 }), 10, 'should sum all values')
  t.is(sumObjectValues({}), 0, 'should return 0 for empty object')
  t.is(sumObjectValues(null), 0, 'should return 0 for null')
  t.is(sumObjectValues(undefined), 0, 'should return 0 for undefined')
  t.is(sumObjectValues({ a: 'not_a_number', b: 5 }), 5, 'should skip non-numeric values')
  t.pass()
})

test('getMinerStatus - happy path', async (t) => {
  const dayTs = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{
          ts: dayTs,
          type_cnt: { 'miner-am-s19xp': 60, 'miner-wm-m30sp': 40 },
          offline_cnt: { offl_hashboard: 5, offl_fan: 3 },
          power_mode_sleep_cnt: { sleep: 10 },
          maintenance_type_cnt: { repair: 2 }
        }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000 }
  }

  const result = await getMinerStatus(mockCtx, mockReq)
  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.is(result.log[0].offline, 8, 'should sum offline counts (5+3)')
  t.is(result.log[0].sleep, 10, 'should sum sleep counts')
  t.is(result.log[0].maintenance, 2, 'should sum maintenance counts')
  t.is(result.log[0].online, 80, 'should derive online (100-8-10-2)')
  t.pass()
})

test('getMinerStatus - missing start throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getMinerStatus(mockCtx, { query: { end: 1700100000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getMinerStatus - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getMinerStatus(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getMinerStatus - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getMinerStatus(mockCtx, { query: { start: 1700000000000, end: 1700100000000 } })
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty with no data')
  t.is(result.summary.avgOnline, null, 'avg online should be null')
  t.is(result.summary.avgOffline, null, 'avg offline should be null')
  t.pass()
})

test('processMinerStatusData - processes daily entries', (t) => {
  const results = [[
    {
      ts: 1700006400000,
      type_cnt: { 'miner-am-s19xp': 60, 'miner-wm-m30sp': 40 },
      offline_cnt: { offl_hashboard: 5 },
      power_mode_sleep_cnt: { sleep: 10 },
      maintenance_type_cnt: { repair: 2 }
    }
  ]]

  const daily = processMinerStatusData(results)
  t.ok(typeof daily === 'object', 'should return object')
  const key = Object.keys(daily)[0]
  t.is(daily[key].offline, 5, 'should extract offline count')
  t.is(daily[key].sleep, 10, 'should extract sleep count')
  t.is(daily[key].maintenance, 2, 'should extract maintenance count')
  t.is(daily[key].online, 83, 'should derive online count (100-5-10-2)')
  t.pass()
})

test('processMinerStatusData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const daily = processMinerStatusData(results)
  t.ok(typeof daily === 'object', 'should return object')
  t.is(Object.keys(daily).length, 0, 'should be empty for error results')
  t.pass()
})

test('processMinerStatusData - aggregates multiple orks same day', (t) => {
  const results = [
    [{
      ts: 1700006400000,
      type_cnt: { 'miner-am-s19xp': 30, 'miner-wm-m30sp': 20 },
      offline_cnt: { offl_fan: 3 },
      power_mode_sleep_cnt: { sleep: 5 },
      maintenance_type_cnt: {}
    }],
    [{
      ts: 1700006400000,
      type_cnt: { 'miner-am-s19xp': 30, 'miner-wm-m30sp': 20 },
      offline_cnt: { offl_hashboard: 2 },
      power_mode_sleep_cnt: {},
      maintenance_type_cnt: { repair: 1 }
    }]
  ]

  const daily = processMinerStatusData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].offline, 5, 'should sum offline across orks (3+2)')
  t.is(daily[key].sleep, 5, 'should sum sleep across orks')
  t.is(daily[key].maintenance, 1, 'should sum maintenance across orks')
  t.is(daily[key].online, 89, 'should derive total online (47+42)')
  t.pass()
})

test('processMinerStatusData - handles entries with aggrFields wrapper', (t) => {
  const results = [[
    {
      ts: 1700006400000,
      type_cnt: { 'miner-am-s19xp': 60, 'miner-wm-m30sp': 40 },
      aggrFields: {
        offline_cnt: { offl_hashboard: 10 },
        power_mode_sleep_cnt: { sleep: 5 },
        maintenance_type_cnt: { repair: 3 }
      }
    }
  ]]

  const daily = processMinerStatusData(results)
  const key = Object.keys(daily)[0]
  t.is(daily[key].offline, 10, 'should extract from aggrFields wrapper')
  t.is(daily[key].sleep, 5, 'should extract sleep from aggrFields')
  t.is(daily[key].maintenance, 3, 'should extract maintenance from aggrFields')
  t.pass()
})

test('calculateMinerStatusSummary - calculates from log entries', (t) => {
  const log = [
    { ts: 1700006400000, online: 80, offline: 10, sleep: 5, maintenance: 5 },
    { ts: 1700092800000, online: 85, offline: 8, sleep: 4, maintenance: 3 }
  ]

  const summary = calculateMinerStatusSummary(log)
  t.is(summary.avgOnline, 82.5, 'should average online')
  t.is(summary.avgOffline, 9, 'should average offline')
  t.is(summary.avgSleep, 4.5, 'should average sleep')
  t.is(summary.avgMaintenance, 4, 'should average maintenance')
  t.pass()
})

test('calculateMinerStatusSummary - handles empty log', (t) => {
  const summary = calculateMinerStatusSummary([])
  t.is(summary.avgOnline, null, 'should be null')
  t.is(summary.avgOffline, null, 'should be null')
  t.is(summary.avgSleep, null, 'should be null')
  t.is(summary.avgMaintenance, null, 'should be null')
  t.pass()
})

// ==================== Interval Utils Tests ====================

test('resolveInterval - auto-selects 1h for <= 2 days', (t) => {
  const twoDays = 2 * 24 * 60 * 60 * 1000
  t.is(resolveInterval(0, twoDays, null), '1h', 'should select 1h for 2 day range')
  t.is(resolveInterval(0, twoDays - 1, null), '1h', 'should select 1h for < 2 day range')
  t.pass()
})

test('resolveInterval - auto-selects 1d for <= 90 days', (t) => {
  const threeDays = 3 * 24 * 60 * 60 * 1000
  const ninetyDays = 90 * 24 * 60 * 60 * 1000
  t.is(resolveInterval(0, threeDays, null), '1d', 'should select 1d for 3 day range')
  t.is(resolveInterval(0, ninetyDays, null), '1d', 'should select 1d for 90 day range')
  t.pass()
})

test('resolveInterval - auto-selects 1w for > 90 days', (t) => {
  const ninetyOneDays = 91 * 24 * 60 * 60 * 1000
  t.is(resolveInterval(0, ninetyOneDays, null), '1w', 'should select 1w for > 90 day range')
  t.pass()
})

test('resolveInterval - uses requested interval when provided', (t) => {
  t.is(resolveInterval(0, 1000, '1w'), '1w', 'should use requested interval')
  t.is(resolveInterval(0, 999999999999, '1h'), '1h', 'should override auto with requested')
  t.pass()
})

test('getIntervalConfig - returns correct configs', (t) => {
  const h = getIntervalConfig('1h')
  t.is(h.key, 'stat-3h', '1h key should be stat-3h')
  t.is(h.groupRange, null, '1h should have no groupRange')

  const d = getIntervalConfig('1d')
  t.is(d.key, 'stat-3h', '1d key should be stat-3h')
  t.is(d.groupRange, '1D', '1d groupRange should be 1D')

  const w = getIntervalConfig('1w')
  t.is(w.key, 'stat-3h', '1w key should be stat-3h')
  t.is(w.groupRange, '1W', '1w groupRange should be 1W')

  t.pass()
})

// ==================== forEachRangeAggrItem Tests ====================

test('forEachRangeAggrItem - handles null entry without crashing', (t) => {
  let called = false
  forEachRangeAggrItem(null, () => { called = true })
  t.is(called, false, 'callback should not be called for null entry')
  forEachRangeAggrItem(undefined, () => { called = true })
  t.is(called, false, 'callback should not be called for undefined entry')
  t.pass()
})

// ==================== parseEntryTs Tests ====================

test('parseEntryTs - handles numeric ts', (t) => {
  t.is(parseEntryTs(1700006400000), 1700006400000, 'should return number as-is')
  t.pass()
})

test('parseEntryTs - handles range string ts', (t) => {
  t.is(parseEntryTs('1770854400000-1771459199999'), 1770854400000, 'should extract start of range')
  t.is(parseEntryTs('1771459200000-1771545599999'), 1771459200000, 'should extract start of range')
  t.pass()
})

test('parseEntryTs - handles plain numeric string', (t) => {
  t.is(parseEntryTs('1700006400000'), 1700006400000, 'should parse numeric string')
  t.pass()
})

test('parseEntryTs - returns null for invalid input', (t) => {
  t.is(parseEntryTs(null), null, 'null returns null')
  t.is(parseEntryTs(undefined), null, 'undefined returns null')
  t.pass()
})

// ==================== Power Mode Tests ====================

test('processPowerModeData - handles range string ts with groupRange', (t) => {
  const results = [[{
    ts: '1700006400000-1700092799999',
    power_mode_group_aggr: { 'cont1-miner1': 'normal' },
    status_group_aggr: { 'cont1-miner1': 'mining' }
  }]]

  const points = processPowerModeData(results, '1D')
  t.ok(Object.keys(points).length > 0, 'should have entries despite range string ts')
  const key = Object.keys(points)[0]
  t.is(points[key].normal, 1, 'should count normal')
  t.pass()
})

test('processTemperatureData - handles range string ts with groupRange', (t) => {
  const results = [[{
    ts: '1700006400000-1700092799999',
    temperature_c_group_max_aggr: { cont1: 65 },
    temperature_c_group_avg_aggr: { cont1: 55 }
  }]]

  const points = processTemperatureData(results, '1D', null)
  t.ok(Object.keys(points).length > 0, 'should have entries despite range string ts')
  const key = Object.keys(points)[0]
  t.is(points[key].containers.cont1.maxC, 65, 'should have temp data')
  t.pass()
})

test('getPowerMode - happy path', async (t) => {
  const ts = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{
          ts,
          power_mode_group_aggr: { 'cont1-miner1': 'normal', 'cont1-miner2': 'low' },
          status_group_aggr: { 'cont1-miner1': 'mining', 'cont1-miner2': 'mining' }
        }]
      }
    }
  })

  const result = await getPowerMode(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.is(result.log[0].normal, 1, 'should count normal miners')
  t.is(result.log[0].low, 1, 'should count low miners')
  t.pass()
})

test('getPowerMode - missing start/end throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getPowerMode(mockCtx, { query: { end: 1700100000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getPowerMode - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getPowerMode(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getPowerMode - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getPowerMode(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.is(result.summary.avgNormal, null, 'avg should be null')
  t.pass()
})

test('categorizeMiner - status overrides power mode', (t) => {
  t.is(categorizeMiner('normal', 'offline'), 'offline', 'offline status should override')
  t.is(categorizeMiner('high', 'error'), 'error', 'error status should override')
  t.is(categorizeMiner('normal', 'maintenance'), 'maintenance', 'maintenance should override')
  t.is(categorizeMiner('high', 'idle'), 'notMining', 'idle should map to notMining')
  t.is(categorizeMiner('high', 'stopped'), 'notMining', 'stopped should map to notMining')
  t.pass()
})

test('categorizeMiner - power mode categories', (t) => {
  t.is(categorizeMiner('low', 'mining'), 'low', 'low mode with mining status')
  t.is(categorizeMiner('high', 'mining'), 'high', 'high mode with mining status')
  t.is(categorizeMiner('sleep', 'mining'), 'sleep', 'sleep mode with mining status')
  t.is(categorizeMiner('normal', 'mining'), 'normal', 'normal mode with mining status')
  t.is(categorizeMiner('normal', ''), 'normal', 'normal mode with empty status')
  t.pass()
})

test('categorizeMiner - unknown power mode passes through raw value', (t) => {
  t.is(categorizeMiner('turbo', 'mining'), 'turbo', 'unknown mode should pass through')
  t.is(categorizeMiner('eco', ''), 'eco', 'unknown mode with empty status should pass through')
  t.pass()
})

test('categorizeMiner - null/undefined power mode defaults to normal', (t) => {
  t.is(categorizeMiner(null, 'mining'), 'normal', 'null mode should default to normal')
  t.is(categorizeMiner(undefined, 'mining'), 'normal', 'undefined mode should default to normal')
  t.is(categorizeMiner('', 'mining'), 'normal', 'empty string mode should default to normal')
  t.pass()
})

test('processPowerModeData - counts modes correctly', (t) => {
  const results = [[{
    ts: 1700006400000,
    power_mode_group_aggr: {
      'cont1-miner1': 'normal',
      'cont1-miner2': 'low',
      'cont1-miner3': 'high'
    },
    status_group_aggr: {
      'cont1-miner1': 'mining',
      'cont1-miner2': 'mining',
      'cont1-miner3': 'offline'
    }
  }]]

  const points = processPowerModeData(results, '1D')
  const key = Object.keys(points)[0]
  t.is(points[key].normal, 1, 'should count 1 normal')
  t.is(points[key].low, 1, 'should count 1 low')
  t.is(points[key].offline, 1, 'miner3 offline overrides high')
  t.is(points[key].high, 0, 'miner3 classified as offline, not high')
  t.pass()
})

test('processPowerModeData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const points = processPowerModeData(results, '1D')
  t.is(Object.keys(points).length, 0, 'should be empty')
  t.pass()
})

test('processPowerModeData - merges across multiple orks', (t) => {
  const results = [
    [{
      ts: 1700006400000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    }],
    [{
      ts: 1700006400000,
      power_mode_group_aggr: { 'cont2-miner1': 'low' },
      status_group_aggr: { 'cont2-miner1': 'mining' }
    }]
  ]

  const points = processPowerModeData(results, '1D')
  const key = Object.keys(points)[0]
  t.is(points[key].normal, 1, 'should count ork1 normal')
  t.is(points[key].low, 1, 'should count ork2 low')
  t.pass()
})

test('calculatePowerModeSummary - calculates averages', (t) => {
  const log = [
    { ts: 1, low: 2, normal: 8, high: 0, sleep: 0, offline: 0, notMining: 0, maintenance: 0, error: 0 },
    { ts: 2, low: 4, normal: 6, high: 0, sleep: 0, offline: 0, notMining: 0, maintenance: 0, error: 0 }
  ]

  const summary = calculatePowerModeSummary(log)
  t.is(summary.avgLow, 3, 'should average low')
  t.is(summary.avgNormal, 7, 'should average normal')
  t.pass()
})

test('calculatePowerModeSummary - handles empty log', (t) => {
  const summary = calculatePowerModeSummary([])
  t.is(summary.avgNormal, null, 'should be null')
  t.is(summary.avgLow, null, 'should be null')
  t.is(summary.avgOffline, null, 'should be null')
  t.pass()
})

// ==================== Power Mode Timeline Tests ====================

test('getPowerModeTimeline - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [
          {
            ts: 1700000000000,
            power_mode_group_aggr: { 'cont1-miner1': 'normal' },
            status_group_aggr: { 'cont1-miner1': 'mining' }
          },
          {
            ts: 1700010800000,
            power_mode_group_aggr: { 'cont1-miner1': 'low' },
            status_group_aggr: { 'cont1-miner1': 'mining' }
          }
        ]
      }
    }
  })

  const result = await getPowerModeTimeline(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.ok(result.log, 'should return log array')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.is(result.log[0].minerId, 'cont1-miner1', 'should have miner ID')
  t.ok(result.log[0].segments.length > 0, 'should have segments')
  t.pass()
})

test('getPowerModeTimeline - default start/end', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ([]) }
  })

  const result = await getPowerModeTimeline(mockCtx, { query: {} })
  t.ok(result.log, 'should return log with defaults')
  t.ok(Array.isArray(result.log), 'should be array')
  t.pass()
})

test('getPowerModeTimeline - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getPowerModeTimeline(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getPowerModeTimeline - empty results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getPowerModeTimeline(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.is(result.log.length, 0, 'should be empty')
  t.pass()
})

test('processPowerModeTimelineData - groups by miner and sorts by ts', (t) => {
  const results = [[
    {
      ts: 1700010800000,
      power_mode_group_aggr: { 'cont1-miner1': 'low' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    },
    {
      ts: 1700000000000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    }
  ]]

  const log = processPowerModeTimelineData(results, null)
  t.is(log.length, 1, 'should group into 1 miner')
  t.is(log[0].minerId, 'cont1-miner1', 'should have correct miner id')
  t.is(log[0].segments[0].powerMode, 'normal', 'first segment should be earlier entry (normal)')
  t.is(log[0].segments[1].powerMode, 'low', 'second segment should be later entry (low)')
  t.pass()
})

test('processPowerModeTimelineData - merges consecutive same-mode segments', (t) => {
  const results = [[
    {
      ts: 1700000000000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    },
    {
      ts: 1700010800000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    },
    {
      ts: 1700021600000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    }
  ]]

  const log = processPowerModeTimelineData(results, null)
  t.is(log[0].segments.length, 1, 'should merge 3 entries into 1 segment')
  t.is(log[0].segments[0].from, 1700000000000, 'segment should start at first entry')
  t.is(log[0].segments[0].to, 1700021600000, 'segment should end at last entry')
  t.pass()
})

test('processPowerModeTimelineData - mode changes create new segments', (t) => {
  const results = [[
    {
      ts: 1700000000000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    },
    {
      ts: 1700010800000,
      power_mode_group_aggr: { 'cont1-miner1': 'low' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    },
    {
      ts: 1700021600000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal' },
      status_group_aggr: { 'cont1-miner1': 'mining' }
    }
  ]]

  const log = processPowerModeTimelineData(results, null)
  t.is(log[0].segments.length, 3, 'should create 3 separate segments')
  t.is(log[0].segments[0].powerMode, 'normal', 'first segment normal')
  t.is(log[0].segments[1].powerMode, 'low', 'second segment low')
  t.is(log[0].segments[2].powerMode, 'normal', 'third segment normal')
  t.pass()
})

test('processPowerModeTimelineData - extracts container from miner id', (t) => {
  const results = [[
    {
      ts: 1700000000000,
      power_mode_group_aggr: { 'container-a-pos1-miner1': 'normal' },
      status_group_aggr: { 'container-a-pos1-miner1': 'mining' }
    }
  ]]

  const log = processPowerModeTimelineData(results, null)
  t.is(log[0].container, 'container-a-pos1', 'should extract container from miner id')
  t.pass()
})

test('getPowerModeTimeline - always uses t-miner tag', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return []
      }
    }
  })

  await getPowerModeTimeline(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, container: 'my-container' }
  })

  t.is(capturedPayload.tag, 't-miner', 'should always use t-miner tag for RPC')
  t.pass()
})

test('getPowerModeTimeline - returns all results without truncation', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        const entries = []
        for (let i = 0; i < 5; i++) {
          entries.push({
            ts: 1700000000000 + i * 10800000,
            power_mode_group_aggr: { [`cont${i}-miner1`]: 'normal' },
            status_group_aggr: { [`cont${i}-miner1`]: 'mining' }
          })
        }
        return entries
      }
    }
  })

  const result = await getPowerModeTimeline(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.is(result.log.length, 5, 'should return all results')
  t.pass()
})

test('processPowerModeTimelineData - filters by container post-RPC', (t) => {
  const results = [[
    {
      ts: 1700000000000,
      power_mode_group_aggr: { 'cont1-miner1': 'normal', 'cont2-miner1': 'low' },
      status_group_aggr: { 'cont1-miner1': 'mining', 'cont2-miner1': 'mining' }
    }
  ]]

  const log = processPowerModeTimelineData(results, 'cont1')
  t.is(log.length, 1, 'should only include miners from cont1')
  t.is(log[0].container, 'cont1', 'should be cont1')
  t.pass()
})

// ==================== Temperature Tests ====================

test('getTemperature - happy path', async (t) => {
  const ts = 1700006400000
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{
          ts,
          temperature_c_group_max_aggr: { container1: 65, container2: 72 },
          temperature_c_group_avg_aggr: { container1: 55, container2: 60 }
        }]
      }
    }
  })

  const result = await getTemperature(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.ok(result.log, 'should return log array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'log should have entries')
  t.ok(result.log[0].containers, 'should have containers object')
  t.is(result.log[0].containers.container1.maxC, 65, 'should have container1 max temp')
  t.is(result.log[0].containers.container2.avgC, 60, 'should have container2 avg temp')
  t.is(result.log[0].siteMaxC, 72, 'should have site max temp')
  t.ok(result.summary.peakTemp !== null, 'should have peak temp')
  t.pass()
})

test('getTemperature - missing start/end throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getTemperature(mockCtx, { query: { end: 1700100000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getTemperature - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getTemperature(mockCtx, { query: { start: 1700100000000, end: 1700000000000 } })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getTemperature - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getTemperature(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000 }
  })

  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.is(result.summary.avgMaxTemp, null, 'avg max should be null')
  t.is(result.summary.avgAvgTemp, null, 'avg avg should be null')
  t.is(result.summary.peakTemp, null, 'peak should be null')
  t.pass()
})

test('processTemperatureData - extracts per-container temps', (t) => {
  const results = [[{
    ts: 1700006400000,
    temperature_c_group_max_aggr: { cont1: 65, cont2: 72 },
    temperature_c_group_avg_aggr: { cont1: 55, cont2: 60 }
  }]]

  const points = processTemperatureData(results, '1D', null)
  const key = Object.keys(points)[0]
  t.is(points[key].containers.cont1.maxC, 65, 'should have cont1 max')
  t.is(points[key].containers.cont2.maxC, 72, 'should have cont2 max')
  t.is(points[key].containers.cont1.avgC, 55, 'should have cont1 avg')
  t.is(points[key].containers.cont2.avgC, 60, 'should have cont2 avg')
  t.pass()
})

test('processTemperatureData - calculates site-wide aggregates', (t) => {
  const results = [[{
    ts: 1700006400000,
    temperature_c_group_max_aggr: { cont1: 65, cont2: 72 },
    temperature_c_group_avg_aggr: { cont1: 55, cont2: 60 }
  }]]

  const points = processTemperatureData(results, '1D', null)
  const key = Object.keys(points)[0]
  t.is(points[key].siteMaxC, 72, 'site max should be highest container max')
  t.is(points[key].siteAvgC, 57.5, 'site avg should average container avgs')
  t.pass()
})

test('processTemperatureData - filters by container', (t) => {
  const results = [[{
    ts: 1700006400000,
    temperature_c_group_max_aggr: { cont1: 65, cont2: 72 },
    temperature_c_group_avg_aggr: { cont1: 55, cont2: 60 }
  }]]

  const points = processTemperatureData(results, '1D', 'cont1')
  const key = Object.keys(points)[0]
  t.ok(points[key].containers.cont1, 'should have cont1')
  t.ok(!points[key].containers.cont2, 'should not have cont2')
  t.is(points[key].siteMaxC, 65, 'site max should be cont1 max')
  t.pass()
})

test('processTemperatureData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const points = processTemperatureData(results, '1D', null)
  t.is(Object.keys(points).length, 0, 'should be empty')
  t.pass()
})

test('calculateTemperatureSummary - calculates averages and peak', (t) => {
  const log = [
    { ts: 1, containers: {}, siteMaxC: 70, siteAvgC: 55 },
    { ts: 2, containers: {}, siteMaxC: 75, siteAvgC: 60 }
  ]

  const summary = calculateTemperatureSummary(log)
  t.is(summary.avgMaxTemp, 72.5, 'should average max temps')
  t.is(summary.avgAvgTemp, 57.5, 'should average avg temps')
  t.is(summary.peakTemp, 75, 'should find peak temp')
  t.pass()
})

test('calculateTemperatureSummary - handles empty log', (t) => {
  const summary = calculateTemperatureSummary([])
  t.is(summary.avgMaxTemp, null, 'should be null')
  t.is(summary.avgAvgTemp, null, 'should be null')
  t.is(summary.peakTemp, null, 'should be null')
  t.pass()
})

test('getTemperature - always uses t-miner tag with container post-filter', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return []
      }
    }
  })

  await getTemperature(mockCtx, {
    query: { start: 1700000000000, end: 1700100000000, container: 'my-container' }
  })

  t.is(capturedPayload.tag, 't-miner', 'should always use t-miner tag for RPC')
  t.pass()
})

// ==================== Container Telemetry Tests ====================

test('getContainerTelemetry - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'listThings') {
          return [{ id: 'miner-1', tags: ['container-bitdeer-9a'] }]
        }
        if (method === 'tailLog') {
          return [{
            ts: 1700006400000,
            container_specific_stats_group_aggr: {
              'bitdeer-9a': { hot_temp_c_w_1_group: 35, tank1_bar_group: 1.2 }
            }
          }]
        }
        return {}
      }
    }
  })

  const mockReq = {
    params: { id: 'bitdeer-9a' },
    query: {}
  }

  const result = await getContainerTelemetry(mockCtx, mockReq)
  t.is(result.id, 'bitdeer-9a', 'should return container id')
  t.ok(Array.isArray(result.miners), 'should return miners array')
  t.is(result.miners.length, 1, 'should have one miner')
  t.ok(result.telemetry, 'should return telemetry data')
  t.is(result.telemetry.hot_temp_c_w_1_group, 35, 'should have sensor values')
  t.pass()
})

test('getContainerTelemetry - missing id throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getContainerTelemetry(mockCtx, { params: {}, query: {} })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_CONTAINER_ID', 'should throw missing id error')
  }
  t.pass()
})

test('getContainerTelemetry - no sensor data returns null telemetry', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => [] }
  })

  const result = await getContainerTelemetry(mockCtx, {
    params: { id: 'bitdeer-9a' },
    query: {}
  })
  t.is(result.telemetry, null, 'telemetry should be null when no data')
  t.ok(Array.isArray(result.miners), 'miners should be array')
  t.is(result.miners.length, 0, 'miners array should be empty')
  t.pass()
})

test('processContainerMiners - extracts miners from results', (t) => {
  const results = [
    [{ id: 'miner-1', tags: ['container-bitdeer-9a'] }],
    [{ id: 'miner-2', tags: ['container-bitdeer-9a'] }]
  ]
  const miners = processContainerMiners(results)
  t.is(miners.length, 2, 'should extract miners from all orks')
  t.pass()
})

test('processContainerMiners - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const miners = processContainerMiners(results)
  t.is(miners.length, 0, 'should return empty array for errors')
  t.pass()
})

test('processContainerSensorSnapshot - extracts matching container', (t) => {
  const results = [[{
    ts: 1700006400000,
    container_specific_stats_group_aggr: {
      'bitdeer-9a': { hot_temp_c_w_1_group: 35 },
      'antspace-2b': { supply_liquid_temp_group: 40 }
    }
  }]]
  const telemetry = processContainerSensorSnapshot(results, 'bitdeer-9a')
  t.ok(telemetry, 'should find matching container')
  t.is(telemetry.hot_temp_c_w_1_group, 35, 'should return correct container data')
  t.pass()
})

test('processContainerSensorSnapshot - returns null when no match', (t) => {
  const results = [[{
    ts: 1700006400000,
    container_specific_stats_group_aggr: {
      'antspace-2b': { supply_liquid_temp_group: 40 }
    }
  }]]
  const telemetry = processContainerSensorSnapshot(results, 'bitdeer-9a')
  t.is(telemetry, null, 'should return null when no matching container')
  t.pass()
})

test('processContainerSensorSnapshot - prefix match fallback', (t) => {
  const results = [[{
    ts: 1700006400000,
    container_specific_stats_group_aggr: {
      'bitdeer-9a-combo': { hot_temp_c_w_1_group: 35 }
    }
  }]]
  const telemetry = processContainerSensorSnapshot(results, 'bitdeer-9a')
  t.ok(telemetry, 'should find via prefix match')
  t.is(telemetry.hot_temp_c_w_1_group, 35, 'should return correct data')
  t.pass()
})

// ==================== Container History Tests ====================

test('getContainerHistory - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{
          ts: 1700006400000,
          container_specific_stats_group_aggr: {
            'bitdeer-9a': { hot_temp_c_w_1_group: 35, tank1_bar_group: 1.2 }
          }
        }, {
          ts: 1700006700000,
          container_specific_stats_group_aggr: {
            'bitdeer-9a': { hot_temp_c_w_1_group: 36, tank1_bar_group: 1.3 }
          }
        }]
      }
    }
  })

  const mockReq = {
    params: { id: 'bitdeer-9a' },
    query: { start: 1700000000000, end: 1700100000000 }
  }

  const result = await getContainerHistory(mockCtx, mockReq)
  t.ok(result.log, 'should return log array')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.is(result.log.length, 2, 'should have 2 entries')
  t.is(result.log[0].hot_temp_c_w_1_group, 35, 'should have sensor values')
  t.ok(result.log[0].ts < result.log[1].ts, 'should be sorted by ts')
  t.pass()
})

test('getContainerHistory - missing id throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getContainerHistory(mockCtx, { params: {}, query: {} })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_CONTAINER_ID', 'should throw missing id error')
  }
  t.pass()
})

test('getContainerHistory - invalid range throws', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  })

  try {
    await getContainerHistory(mockCtx, {
      params: { id: 'bitdeer-9a' },
      query: { start: 1700100000000, end: 1700000000000 }
    })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getContainerHistory - uses defaults when no start/end', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return []
      }
    }
  })

  const result = await getContainerHistory(mockCtx, {
    params: { id: 'bitdeer-9a' },
    query: {}
  })
  t.ok(capturedPayload.start > 0, 'should have default start')
  t.ok(capturedPayload.end > capturedPayload.start, 'end should be after start')
  t.is(capturedPayload.limit, 10080, 'should use default limit')
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty with no data')
  t.pass()
})

test('getContainerHistory - empty results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => [] }
  })

  const result = await getContainerHistory(mockCtx, {
    params: { id: 'bitdeer-9a' },
    query: { start: 1700000000000, end: 1700100000000 }
  })
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('processContainerHistoryData - filters by container id', (t) => {
  const results = [[
    {
      ts: 1700006400000,
      container_specific_stats_group_aggr: {
        'bitdeer-9a': { hot_temp_c_w_1_group: 35 },
        'antspace-2b': { supply_liquid_temp_group: 40 }
      }
    }
  ]]
  const log = processContainerHistoryData(results, 'bitdeer-9a')
  t.is(log.length, 1, 'should have one entry')
  t.is(log[0].hot_temp_c_w_1_group, 35, 'should have correct container data')
  t.ok(!log[0].supply_liquid_temp_group, 'should not include other container data')
  t.pass()
})

test('processContainerHistoryData - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const log = processContainerHistoryData(results, 'bitdeer-9a')
  t.is(log.length, 0, 'should be empty for error results')
  t.pass()
})

test('processContainerHistoryData - sorts by timestamp', (t) => {
  const results = [[
    {
      ts: 1700006700000,
      container_specific_stats_group_aggr: {
        'bitdeer-9a': { hot_temp_c_w_1_group: 36 }
      }
    },
    {
      ts: 1700006400000,
      container_specific_stats_group_aggr: {
        'bitdeer-9a': { hot_temp_c_w_1_group: 35 }
      }
    }
  ]]
  const log = processContainerHistoryData(results, 'bitdeer-9a')
  t.ok(log[0].ts < log[1].ts, 'entries should be sorted ascending')
  t.pass()
})

test('processTemperatureData - rolling avg for same container across entries', (t) => {
  const results = [[
    {
      ts: 1700006400000,
      temperature_c_group_max_aggr: { cont1: 65 },
      temperature_c_group_avg_aggr: { cont1: 55 }
    },
    {
      ts: 1700006400000,
      temperature_c_group_max_aggr: { cont1: 70 },
      temperature_c_group_avg_aggr: { cont1: 60 }
    }
  ]]

  const points = processTemperatureData(results, '1D', null)
  const key = Object.keys(points)[0]
  t.is(points[key].containers.cont1.maxC, 70, 'should take max of both entries')
  t.ok(points[key].containers.cont1.avgC > 55, 'should compute rolling avg')
  t.pass()
})

test('processContainerHistoryData - prefix match fallback', (t) => {
  const results = [[
    {
      ts: 1700006400000,
      container_specific_stats_group_aggr: {
        'bitdeer-9a-sensor1': { humidity: 45 }
      }
    }
  ]]
  const log = processContainerHistoryData(results, 'bitdeer-9a')
  t.is(log.length, 1, 'should match via prefix')
  t.is(log[0].humidity, 45, 'should return prefixed container data')
  t.pass()
})

test('processContainerHistoryData - no match skips entry', (t) => {
  const results = [[
    {
      ts: 1700006400000,
      container_specific_stats_group_aggr: {
        'other-container': { humidity: 45 }
      }
    }
  ]]
  const log = processContainerHistoryData(results, 'bitdeer-9a')
  t.is(log.length, 0, 'should skip non-matching entries')
  t.pass()
})

test('processContainerSensorSnapshot - handles non-object aggrData', (t) => {
  const results = [[
    {
      container_specific_stats_group_aggr: 'invalid'
    }
  ]]
  const result = processContainerSensorSnapshot(results, 'cont1')
  t.is(result, null, 'should return null for non-object aggrData')
  t.pass()
})

test('processTemperatureData - handles non-object maxObj', (t) => {
  const results = [[{
    ts: 1700006400000,
    temperature_c_group_max_aggr: 'invalid',
    temperature_c_group_avg_aggr: {}
  }]]

  const points = processTemperatureData(results, '1D', null)
  const key = Object.keys(points)[0]
  t.is(points[key].siteMaxC, null, 'should not process non-object maxObj')
  t.pass()
})

test('processPowerModeData - handles non-object powerModeObj', (t) => {
  const results = [[{
    ts: 1700006400000,
    power_mode_group_aggr: 'invalid',
    status_group_aggr: {}
  }]]

  const points = processPowerModeData(results, '1D')
  const key = Object.keys(points)[0]
  t.is(points[key].normal, 0, 'should not process non-object powerModeObj')
  t.pass()
})

test('getPowerMode - sets groupRange for multi-day range', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        capturedPayload = params
        return []
      }
    }
  })

  const threeDaysMs = 3 * 24 * 60 * 60 * 1000
  await getPowerMode(mockCtx, {
    query: { start: 1700000000000, end: 1700000000000 + threeDaysMs }
  })

  t.is(capturedPayload.groupRange, '1D', 'should set groupRange for multi-day range')
  t.pass()
})

test('getTemperature - sets groupRange for multi-day range', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        capturedPayload = params
        return []
      }
    }
  })

  const threeDaysMs = 3 * 24 * 60 * 60 * 1000
  await getTemperature(mockCtx, {
    query: { start: 1700000000000, end: 1700000000000 + threeDaysMs }
  })

  t.is(capturedPayload.groupRange, '1D', 'should set groupRange for multi-day range')
  t.pass()
})

test('processPowerModeTimelineData - handles non-object powerModeObj', (t) => {
  const results = [[{
    ts: 1700006400000,
    power_mode_group_aggr: 'invalid',
    status_group_aggr: {}
  }]]

  const log = processPowerModeTimelineData(results, null)
  t.is(log.length, 0, 'should skip non-object powerModeObj entries')
  t.pass()
})
