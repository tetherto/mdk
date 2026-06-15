'use strict'

const test = require('brittle')
const { RPC_METHODS, WORKER_TYPES, MINER_CATEGORIES } = require('../../../workers/lib/constants')
const {
  getPools,
  flattenPoolStats,
  calculatePoolsSummary,
  getPoolBalanceHistory,
  flattenTransactionResults,
  groupByBucket,
  getPoolThingConfig,
  getPoolStatsContainers
} = require('../../../workers/lib/server/handlers/pools.handlers')
const { withDataProxy } = require('../helpers/mockHelpers')

test('getPools - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async (key, method, payload) => {
        if (method === 'getWrkExtData') {
          return [{
            ts: '1770000000000',
            stats: [
              { poolType: 'f2pool', username: 'user1', hashrate: 100000, worker_count: 5, balance: 0.5, timestamp: 1770000000000 },
              { poolType: 'ocean', username: 'user2', hashrate: 200000, worker_count: 10, balance: 1.2, timestamp: 1770000000000 }
            ]
          }]
        }
        return []
      }
    }
  })

  const mockReq = { query: {} }
  const result = await getPools(mockCtx, mockReq, {})
  t.ok(result.pools, 'should return pools array')
  t.ok(result.summary, 'should return summary')
  t.ok(Array.isArray(result.pools), 'pools should be array')
  t.is(result.pools.length, 2, 'should have 2 pools')
  t.is(result.summary.poolCount, 2, 'summary should count 2 pools')
  t.pass()
})

test('getPools - with filter', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async () => [{
        ts: '1770000000000',
        stats: [
          { poolType: 'f2pool', username: 'user1', hashrate: 100000, worker_count: 5, balance: 0.5 },
          { poolType: 'ocean', username: 'user2', hashrate: 200000, worker_count: 10, balance: 0 }
        ]
      }]
    }
  })

  const mockReq = { query: { query: '{"pool":"f2pool"}' } }
  const result = await getPools(mockCtx, mockReq, {})
  t.ok(result.pools, 'should return filtered pools')
  t.is(result.pools.length, 1, 'should have 1 pool after filter')
  t.is(result.pools[0].pool, 'f2pool', 'should match filter')
  t.pass()
})

test('getPools - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ([]) }
  })

  const result = await getPools(mockCtx, { query: {} }, {})
  t.ok(result.pools, 'should return pools array')
  t.is(result.pools.length, 0, 'pools should be empty')
  t.is(result.summary.poolCount, 0, 'pool count should be 0')
  t.pass()
})

test('flattenPoolStats - extracts pools from ext-data stats array', (t) => {
  const results = [
    [{
      ts: '1770000000000',
      stats: [
        { poolType: 'f2pool', username: 'user1', hashrate: 100000, worker_count: 5, balance: 0.5 },
        { poolType: 'ocean', username: 'user2', hashrate: 200000, worker_count: 10, balance: 1.2 }
      ]
    }]
  ]
  const pools = flattenPoolStats(results)
  t.is(pools.length, 2, 'should extract 2 pools')
  t.is(pools[0].pool, 'f2pool', 'should have correct pool type')
  t.is(pools[0].account, 'user1', 'should have correct account')
  t.is(pools[0].hashrate, 100000, 'should have correct hashrate')
  t.is(pools[1].pool, 'ocean', 'should have correct pool type')
  t.pass()
})

test('flattenPoolStats - deduplicates pools across orks', (t) => {
  const results = [
    [{ ts: '1770000000000', stats: [{ poolType: 'f2pool', username: 'user1', hashrate: 100 }] }],
    [{ ts: '1770000000000', stats: [{ poolType: 'f2pool', username: 'user1', hashrate: 200 }] }]
  ]
  const pools = flattenPoolStats(results)
  t.is(pools.length, 1, 'should deduplicate by poolType:username')
  t.pass()
})

test('flattenPoolStats - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const pools = flattenPoolStats(results)
  t.is(pools.length, 0, 'should be empty')
  t.pass()
})

test('flattenPoolStats - handles non-array input', (t) => {
  const pools = flattenPoolStats(null)
  t.is(pools.length, 0, 'should return empty array')
  t.pass()
})

test('calculatePoolsSummary - calculates totals', (t) => {
  const pools = [
    { hashrate: 100, workerCount: 5, balance: 50000 },
    { hashrate: 200, workerCount: 10, balance: 30000 }
  ]

  const summary = calculatePoolsSummary(pools)
  t.is(summary.poolCount, 2, 'should count pools')
  t.is(summary.totalHashrate, 300, 'should sum hashrate')
  t.is(summary.totalWorkers, 15, 'should sum workers')
  t.is(summary.totalBalance, 80000, 'should sum balance')
  t.pass()
})

test('calculatePoolsSummary - handles empty pools', (t) => {
  const summary = calculatePoolsSummary([])
  t.is(summary.poolCount, 0, 'should be zero')
  t.is(summary.totalHashrate, 0, 'should be zero')
  t.pass()
})

test('getPoolBalanceHistory - happy path', async (t) => {
  const mockCtx = withDataProxy({
    conf: {
      orks: [{ rpcPublicKey: 'key1' }]
    },
    net_r0: {
      jRequest: async () => {
        return [{
          ts: '1700006400000',
          transactions: [{
            username: 'user1',
            changed_balance: 0.001,
            mining_extra: { hash_rate: 611000000000000 }
          }]
        }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000, range: '1D' },
    params: {}
  }

  const result = await getPoolBalanceHistory(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.ok(Array.isArray(result.log), 'log should be array')
  t.ok(result.log.length > 0, 'should have entries')
  const entry = result.log[0]
  t.ok(entry.hashrate > 0, 'should include hashrate')
  t.ok(entry.revenue > 0, 'should include revenue')
  t.pass()
})

test('getPoolBalanceHistory - with pool filter', async (t) => {
  let capturedPayload = null
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, payload) => {
        capturedPayload = payload
        return [{
          ts: '1700006400000',
          transactions: [
            { username: 'user1', changed_balance: 0.001 },
            { username: 'user2', changed_balance: 0.002 }
          ]
        }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000 },
    params: { pool: 'user1' }
  }

  const result = await getPoolBalanceHistory(mockCtx, mockReq, {})
  t.ok(result.log, 'should return log array')
  t.is(capturedPayload.query.pool, 'user1', 'should pass pool filter in RPC payload')
  t.pass()
})

test('getPoolBalanceHistory - "all" pool filter returns all pools', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async () => {
        return [{
          ts: '1700006400000',
          transactions: [
            { username: 'user1', changed_balance: 0.001 },
            { username: 'user2', changed_balance: 0.002 }
          ]
        }]
      }
    }
  })

  const mockReq = {
    query: { start: 1700000000000, end: 1700100000000 },
    params: { pool: 'all' }
  }

  const result = await getPoolBalanceHistory(mockCtx, mockReq, {})
  t.ok(result.log.length > 0, 'should return entries for all pools')
  t.pass()
})

test('getPoolBalanceHistory - missing start throws', async (t) => {
  const mockCtx = {
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  }

  try {
    await getPoolBalanceHistory(mockCtx, { query: { end: 1700100000000 }, params: {} }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_START_END', 'should throw missing start/end error')
  }
  t.pass()
})

test('getPoolBalanceHistory - invalid range throws', async (t) => {
  const mockCtx = {
    conf: { orks: [] },
    net_r0: { jRequest: async () => ({}) }
  }

  try {
    await getPoolBalanceHistory(mockCtx, { query: { start: 1700100000000, end: 1700000000000 }, params: {} }, {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw invalid range error')
  }
  t.pass()
})

test('getPoolBalanceHistory - empty ork results', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: { jRequest: async () => ({}) }
  })

  const result = await getPoolBalanceHistory(mockCtx, { query: { start: 1700000000000, end: 1700100000000 }, params: {} }, {})
  t.ok(result.log, 'should return log array')
  t.is(result.log.length, 0, 'log should be empty')
  t.pass()
})

test('flattenTransactionResults - extracts daily entries from ext-data', (t) => {
  const results = [
    [{
      ts: '1700006400000',
      transactions: [
        { username: 'user1', changed_balance: 0.001, mining_extra: { hash_rate: 500000 } },
        { username: 'user2', changed_balance: 0.002, mining_extra: { hash_rate: 600000 } }
      ]
    }]
  ]
  const entries = flattenTransactionResults(results)
  t.is(entries.length, 1, 'should have 1 daily entry')
  t.ok(entries[0].revenue > 0, 'should have revenue')
  t.ok(entries[0].hashrate > 0, 'should have hashrate')
  t.pass()
})

test('flattenTransactionResults - handles error results', (t) => {
  const results = [{ error: 'timeout' }]
  const entries = flattenTransactionResults(results)
  t.is(entries.length, 0, 'should be empty for errors')
  t.pass()
})

test('groupByBucket - groups by daily bucket', (t) => {
  const entries = [
    { ts: 1700006400000, revenue: 100 },
    { ts: 1700050000000, revenue: 200 },
    { ts: 1700092800000, revenue: 300 }
  ]
  const bucketSize = 86400000
  const buckets = groupByBucket(entries, bucketSize)
  t.ok(typeof buckets === 'object', 'should return object')
  t.ok(Object.keys(buckets).length >= 1, 'should have at least one bucket')
  t.pass()
})

test('groupByBucket - handles empty entries', (t) => {
  const buckets = groupByBucket([], 86400000)
  t.is(Object.keys(buckets).length, 0, 'should be empty')
  t.pass()
})

test('groupByBucket - handles missing timestamps', (t) => {
  const entries = [
    { revenue: 100 },
    { ts: 1700006400000, revenue: 200 }
  ]
  const buckets = groupByBucket(entries, 86400000)
  t.ok(Object.keys(buckets).length >= 1, 'should skip items without ts')
  t.pass()
})

test('getPoolThingConfig - thing not found when no rack or info', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method) => {
        if (method === RPC_METHODS.LIST_THINGS) return []
        return []
      }
    }
  })

  const mockReq = { params: { id: 'thing-1' } }

  try {
    await getPoolThingConfig(mockCtx, mockReq)
    t.fail('should have thrown ERR_THING_NOT_FOUND')
  } catch (err) {
    t.is(err.message, 'ERR_THING_NOT_FOUND', 'should throw when thing missing rack/info')
  }
  t.pass()
})

test('getPoolThingConfig - miner thing returns poolConfig and overriddenConfig 0', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        if (method === RPC_METHODS.LIST_THINGS && params?.query?.id) {
          return [{ id: 'miner-1', rack: 'miner-am-s19xp', info: { container: 'unit-1', poolConfig: 'cfg1' } }]
        }
        return []
      }
    }
  })

  const mockReq = { params: { id: 'miner-1' } }
  const result = await getPoolThingConfig(mockCtx, mockReq)

  t.ok(result, 'should return result')
  t.is(result.poolConfig, 'cfg1', 'should return poolConfig from info')
  t.is(result.overriddenConfig, 0, 'should not fetch miners for miner thing')
  t.pass()
})

test('getPoolThingConfig - maintenance container returns overriddenConfig 0', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        if (method === RPC_METHODS.LIST_THINGS && params?.query?.id) {
          return [{ id: 'container-1', rack: 'container-x', info: { container: MINER_CATEGORIES.MAINTENANCE, poolConfig: 'cfg2' } }]
        }
        return []
      }
    }
  })

  const mockReq = { params: { id: 'container-1' } }
  const result = await getPoolThingConfig(mockCtx, mockReq)

  t.is(result.poolConfig, 'cfg2', 'should return poolConfig')
  t.is(result.overriddenConfig, 0, 'should not fetch miners for maintenance container')
  t.pass()
})

test('getPoolThingConfig - container thing returns overriddenConfig count', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        if (method === RPC_METHODS.LIST_THINGS && params?.query?.id) {
          return [{ id: 'container-1', rack: 'container-unit-a', info: { container: 'unit-a', poolConfig: 'shared-cfg' } }]
        }
        if (method === RPC_METHODS.LIST_THINGS && params?.query?.tags) {
          return [
            { id: 'm1', info: { poolConfig: 'shared-cfg' } },
            { id: 'm2', info: { poolConfig: 'shared-cfg' } },
            { id: 'm3', info: { poolConfig: 'other-cfg' } },
            { id: 'm4', info: { poolConfig: 'other-cfg' } }
          ]
        }
        return []
      }
    }
  })

  const mockReq = { params: { id: 'container-1' } }
  const result = await getPoolThingConfig(mockCtx, mockReq)

  t.is(result.poolConfig, 'shared-cfg', 'should return container poolConfig')
  t.is(result.overriddenConfig, 2, 'should count miners with same poolConfig')
  t.pass()
})

test('getPoolThingConfig - container with no poolConfig returns null and zero overriden', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        if (method === RPC_METHODS.LIST_THINGS && params?.query?.id) {
          return [{ id: 'container-2', rack: 'container-unit-b', info: { container: 'unit-b' } }]
        }
        if (method === RPC_METHODS.LIST_THINGS && params?.type === WORKER_TYPES.MINER) {
          return []
        }
        return []
      }
    }
  })

  const mockReq = { params: { id: 'container-2' } }
  const result = await getPoolThingConfig(mockCtx, mockReq)

  t.is(result.poolConfig, null, 'should return null when no poolConfig')
  t.is(result.overriddenConfig, 0, 'should be 0 when no miners match')
  t.pass()
})

// --- getPoolStatsContainers ---

test('getPoolStatsContainers - returns container stats with overriddenConfig', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        if (method !== 'listThings') return []
        if (params?.query?.tags?.$in?.includes('t-container')) {
          return [
            { info: { container: 'unit-a', poolConfig: 'shared-cfg' } },
            { info: { container: 'unit-b', poolConfig: 'other-cfg' } }
          ]
        }
        if (params?.query?.['info.container']?.$in) {
          return [
            { info: { container: 'unit-a', poolConfig: 'shared-cfg' } },
            { info: { container: 'unit-a', poolConfig: 'other-cfg' } },
            { info: { container: 'unit-b', poolConfig: 'other-cfg' } }
          ]
        }
        return []
      }
    }
  })

  const result = await getPoolStatsContainers(mockCtx, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return one entry per container')
  const unitA = result.find(r => r.container === 'unit-a')
  const unitB = result.find(r => r.container === 'unit-b')
  t.ok(unitA, 'should have unit-a')
  t.ok(unitB, 'should have unit-b')
  t.is(unitA.overriddenConfig, 1, 'unit-a should have 1 miner with overridden config')
  t.is(unitB.overriddenConfig, 0, 'unit-b should have 0 overridden')
  t.pass()
})

test('getPoolStatsContainers - container without poolConfig returns overriddenConfig 0', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method, params) => {
        if (method !== 'listThings') return []
        if (params?.query?.tags?.$in?.includes('t-container')) {
          return [
            { info: { container: 'unit-a' } },
            { info: { container: 'unit-b', poolConfig: 'cfg' } }
          ]
        }
        if (params?.query?.['info.container']?.$in) {
          return [{ info: { container: 'unit-b', poolConfig: 'cfg' } }]
        }
        return []
      }
    }
  })

  const result = await getPoolStatsContainers(mockCtx, {})

  t.is(result.length, 2, 'should return two entries')
  const unitA = result.find(r => r.container === 'unit-a')
  const unitB = result.find(r => r.container === 'unit-b')
  t.is(unitA.overriddenConfig, 0, 'container without poolConfig should have overriddenConfig 0')
  t.is(unitB.overriddenConfig, 0, 'unit-b with no overrides should be 0')
  t.pass()
})

test('getPoolStatsContainers - empty containers returns empty array', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method) => {
        if (method === 'listThings') return []
        return []
      }
    }
  })

  const result = await getPoolStatsContainers(mockCtx, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 0, 'should be empty')
  t.pass()
})

test('getPoolStatsContainers - handles empty containers from RPC', async (t) => {
  const mockCtx = withDataProxy({
    conf: { orks: [{ rpcPublicKey: 'key1' }] },
    net_r0: {
      jRequest: async (key, method) => {
        if (method === 'listThings') return []
        return []
      }
    }
  })

  const result = await getPoolStatsContainers(mockCtx, {})

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 0, 'should be empty when no containers')
  t.pass()
})
