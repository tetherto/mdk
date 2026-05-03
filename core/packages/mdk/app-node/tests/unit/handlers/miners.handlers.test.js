'use strict'

const test = require('brittle')
const {
  listMiners,
  formatMiner,
  extractPoolWorkers,
  buildOrkProjection
} = require('../../../workers/lib/server/handlers/miners.handlers')
const {
  MINER_FIELD_MAP,
  MINER_PROJECTION_MAP
} = require('../../../workers/lib/constants')

function createMockMiner (overrides = {}) {
  return {
    id: 't-miner-antminer-192-168-1-101',
    type: 'antminer-s19xp',
    code: 'A101',
    tags: ['t-miner'],
    rack: 'rack-0',
    info: {
      container: 'bitdeer-4b',
      pos: 'R3-S12',
      serialNum: 'SN12345',
      macAddress: 'AA:BB:CC:DD:EE:FF'
    },
    opts: { address: '192.168.1.101' },
    last: {
      snap: {
        model: 'S19XP',
        stats: {
          status: 'mining',
          hashrate_mhs: 140000000,
          power_w: 3010,
          temperature_c: 72,
          efficiency_w_ths: 21.5
        },
        config: {
          power_mode: 'normal',
          firmware_ver: '2024.01.15',
          led_status: 'normal',
          pool_config: { url: 'stratum+tcp://pool.example.com', worker: 'worker1' }
        }
      },
      alerts: { critical: 0, high: 0, medium: 1 },
      uptime: 1209600000,
      ts: 1709266500000
    },
    comments: [],
    ...overrides
  }
}

function createMockCtx (miners, opts = {}) {
  return {
    conf: {
      featureConfig: opts.featureConfig || {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        if (method === 'listThings') return [miners]
        if (method === 'getThingsCount') return [opts.thingsCount ?? miners.length]
        if (method === 'getWrkExtData') return opts.poolData || [[]]
        return [{}]
      }
    }
  }
}

// --- formatMiner ---

test('formatMiner - transforms raw miner to clean format', (t) => {
  const raw = createMockMiner()
  const result = formatMiner(raw, null)

  t.is(result.id, 't-miner-antminer-192-168-1-101')
  t.is(result.type, 'antminer-s19xp')
  t.is(result.model, 'S19XP')
  t.is(result.code, 'A101')
  t.is(result.ip, '192.168.1.101')
  t.is(result.container, 'bitdeer-4b')
  t.is(result.rack, 'rack-0')
  t.is(result.position, 'R3-S12')
  t.is(result.status, 'mining')
  t.is(result.hashrate, 140000000)
  t.is(result.power, 3010)
  t.is(result.temperature, 72)
  t.is(result.efficiency, 21.5)
  t.is(result.firmware, '2024.01.15')
  t.is(result.powerMode, 'normal')
  t.is(result.ledStatus, 'normal')
  t.is(result.serialNum, 'SN12345')
  t.is(result.lastSeen, 1709266500000)
  t.pass()
})

test('formatMiner - handles missing nested fields', (t) => {
  const raw = { id: 'test', type: 'miner' }
  const result = formatMiner(raw, null)

  t.is(result.id, 'test')
  t.is(result.hashrate, 0)
  t.is(result.power, 0)
  t.is(result.efficiency, 0)
  t.is(result.status, undefined)
  t.is(result.ip, undefined)
  t.pass()
})

test('formatMiner - enriches with pool hashrate', (t) => {
  const raw = createMockMiner()
  const poolWorkers = {
    't-miner-antminer-192-168-1-101': { hashrate: 139500000 }
  }
  const result = formatMiner(raw, poolWorkers)

  t.is(result.poolHashrate, 139500000)
  t.pass()
})

test('formatMiner - enriches by code fallback', (t) => {
  const raw = createMockMiner()
  const poolWorkers = {
    A101: { hashrate: 139500000 }
  }
  const result = formatMiner(raw, poolWorkers)

  t.is(result.poolHashrate, 139500000)
  t.pass()
})

test('formatMiner - no poolHashrate when no match', (t) => {
  const raw = createMockMiner()
  const poolWorkers = { 'other-id': { hashrate: 100 } }
  const result = formatMiner(raw, poolWorkers)

  t.is(result.poolHashrate, undefined)
  t.pass()
})

// --- extractPoolWorkers ---

test('extractPoolWorkers - builds worker lookup', (t) => {
  const poolData = [
    [
      {
        stats: { hashrate: 100 },
        workers: {
          'miner-1': { hashrate: 50 },
          'miner-2': { hashrate: 50 }
        }
      }
    ]
  ]
  const result = extractPoolWorkers(poolData)

  t.is(result['miner-1'].hashrate, 50)
  t.is(result['miner-2'].hashrate, 50)
  t.pass()
})

test('extractPoolWorkers - handles empty data', (t) => {
  const result = extractPoolWorkers([])
  t.is(Object.keys(result).length, 0)
  t.pass()
})

test('extractPoolWorkers - handles pools without workers', (t) => {
  const poolData = [[{ stats: { hashrate: 100 } }]]
  const result = extractPoolWorkers(poolData)
  t.is(Object.keys(result).length, 0)
  t.pass()
})

// --- listMiners ---

test('listMiners - returns paginated response with formatted miners', async (t) => {
  const miners = [createMockMiner(), createMockMiner({ id: 'miner-2', code: 'A102' })]
  const ctx = createMockCtx(miners)
  const req = { query: {} }

  const result = await listMiners(ctx, req)

  t.ok(result.data)
  t.is(result.data.length, 2)
  t.is(result.totalCount, 2)
  t.is(result.offset, 0)
  t.is(result.limit, 50)
  t.is(result.hasMore, false)
  t.is(result.data[0].id, 't-miner-antminer-192-168-1-101')
  t.is(result.data[0].model, 'S19XP')
  t.pass()
})

test('listMiners - applies pagination', async (t) => {
  const miners = Array.from({ length: 10 }, (_, i) =>
    createMockMiner({ id: `miner-${i}`, code: `A${i}` })
  )
  const ctx = createMockCtx(miners)
  const req = { query: { offset: 2, limit: 3 } }

  const result = await listMiners(ctx, req)

  t.is(result.data.length, 3)
  t.is(result.totalCount, 10)
  t.is(result.offset, 2)
  t.is(result.limit, 3)
  t.is(result.hasMore, true)
  t.pass()
})

test('listMiners - enforces max limit of 200', async (t) => {
  const ctx = createMockCtx([])
  const req = { query: { limit: 500 } }

  const result = await listMiners(ctx, req)

  t.is(result.limit, 200)
  t.pass()
})

test('listMiners - parses filter JSON', async (t) => {
  const capturedCalls = []
  const ctx = {
    conf: {
      featureConfig: {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        capturedCalls.push({ method, payload })
        if (method === 'getThingsCount') return [0]
        return [[]]
      }
    }
  }
  const req = { query: { filter: '{"status":"error"}' } }

  await listMiners(ctx, req)

  const dataCall = capturedCalls.find(c => c.method === 'listThings')
  t.ok(dataCall.payload.query.$and)
  t.is(dataCall.payload.query.$and[0].tags.$in[0], 't-miner')
  t.is(dataCall.payload.query.$and[1]['last.snap.stats.status'], 'error')
  t.pass()
})

test('listMiners - builds search query', async (t) => {
  const capturedCalls = []
  const ctx = {
    conf: {
      featureConfig: {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        capturedCalls.push({ method, payload })
        if (method === 'getThingsCount') return [0]
        return [[]]
      }
    }
  }
  const req = { query: { search: '192.168' } }

  await listMiners(ctx, req)

  const dataCall = capturedCalls.find(c => c.method === 'listThings')
  const lastCondition = dataCall.payload.query.$and[dataCall.payload.query.$and.length - 1]
  t.ok(lastCondition.$or)
  t.ok(lastCondition.$or.some(c => c.id?.$regex === '192.168'))
  t.ok(lastCondition.$or.some(c => c['opts.address']?.$regex === '192.168'))
  t.pass()
})

test('listMiners - handles empty ork results', async (t) => {
  const ctx = createMockCtx([])
  const req = { query: {} }

  const result = await listMiners(ctx, req)

  t.is(result.data.length, 0)
  t.is(result.totalCount, 0)
  t.pass()
})

test('listMiners - throws on invalid filter JSON', async (t) => {
  const ctx = createMockCtx([])
  const req = { query: { filter: 'not-json' } }

  try {
    await listMiners(ctx, req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_FILTER_INVALID_JSON')
  }
  t.pass()
})

test('listMiners - throws on invalid sort JSON', async (t) => {
  const ctx = createMockCtx([])
  const req = { query: { sort: '{invalid' } }

  try {
    await listMiners(ctx, req)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_SORT_INVALID_JSON')
  }
  t.pass()
})

test('MINER_FIELD_MAP - has expected field mappings', (t) => {
  t.is(MINER_FIELD_MAP.status, 'last.snap.stats.status')
  t.is(MINER_FIELD_MAP.hashrate, 'last.snap.stats.hashrate_mhs')
  t.is(MINER_FIELD_MAP.ip, 'opts.address')
  t.is(MINER_FIELD_MAP.container, 'info.container')
  t.is(MINER_FIELD_MAP.model, 'last.snap.model')
  t.pass()
})

test('listMiners - sends limit (offset+limit) to ork data query', async (t) => {
  const capturedCalls = []
  const ctx = {
    conf: {
      featureConfig: {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        capturedCalls.push({ method, payload })
        if (method === 'getThingsCount') return [0]
        return [[]]
      }
    }
  }
  const req = { query: { offset: 10, limit: 25 } }

  await listMiners(ctx, req)

  // Data payload should have limit = offset + limit = 35
  const dataCall = capturedCalls.find(c => c.method === 'listThings')
  t.is(dataCall.payload.limit, 35)
  t.pass()
})

test('listMiners - sends getThingsCount RPC for total count', async (t) => {
  const capturedCalls = []
  const ctx = {
    conf: {
      featureConfig: {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        capturedCalls.push({ method, payload })
        if (method === 'getThingsCount') return [0]
        return [[]]
      }
    }
  }
  const req = { query: {} }

  await listMiners(ctx, req)

  const countCall = capturedCalls.find(c => c.method === 'getThingsCount')
  t.ok(countCall, 'should call getThingsCount')
  t.ok(countCall.payload.query, 'count payload has query')
  t.is(countCall.payload.status, 1, 'count payload has status: 1')
  t.is(countCall.payload.fields, undefined, 'count payload has no fields projection')
  t.is(countCall.payload.limit, undefined, 'count payload has no limit')
  t.pass()
})

test('listMiners - totalCount reflects all matching items, not just overfetched page', async (t) => {
  // Simulate: 50 miners exist, but user requests offset=0, limit=5 → overfetch 5 from ork
  // The count query returns all 50, data query returns 5 (mock returns all, but real ork would limit)
  const allMiners = Array.from({ length: 50 }, (_, i) =>
    createMockMiner({ id: `miner-${i}`, code: `A${i}` })
  )
  const ctx = createMockCtx(allMiners)
  const req = { query: { offset: 0, limit: 5 } }

  const result = await listMiners(ctx, req)

  // totalCount should be 50 (from count query), data should be 5 (sliced)
  t.is(result.totalCount, 50)
  t.is(result.data.length, 5)
  t.is(result.hasMore, true)
  t.pass()
})

test('listMiners - makes one listThings + one getThingsCount RPC call', async (t) => {
  let listThingsCount = 0
  let getThingsCountCount = 0
  const ctx = {
    conf: {
      featureConfig: {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        if (method === 'listThings') { listThingsCount++; return [[]] }
        if (method === 'getThingsCount') { getThingsCountCount++; return [0] }
        return [[]]
      }
    }
  }
  const req = { query: {} }

  await listMiners(ctx, req)

  t.is(listThingsCount, 1, 'one listThings call for data')
  t.is(getThingsCountCount, 1, 'one getThingsCount call for count')
  t.pass()
})

// --- Projection: clean field names ---

test('buildOrkProjection - maps clean names to internal paths', (t) => {
  const result = buildOrkProjection({ firmware: 1, ip: 1 })

  t.is(result.id, 1, 'always includes id')
  t.is(result.code, 1, 'always includes code')
  t.is(result['last.snap.config.firmware_ver'], 1, 'maps firmware')
  t.is(result['opts.address'], 1, 'maps ip')
  t.is(result['last.snap.stats.hashrate_mhs'], undefined, 'does not include unrequested fields')
  t.pass()
})

test('buildOrkProjection - includes sort fields for app-side sorting', (t) => {
  const userFields = { status: 1 }
  const mappedSort = { 'last.snap.stats.hashrate_mhs': -1 }
  const result = buildOrkProjection(userFields, mappedSort)

  t.is(result['last.snap.stats.status'], 1, 'maps requested field')
  t.is(result['last.snap.stats.hashrate_mhs'], 1, 'includes sort field')
  t.pass()
})

test('buildOrkProjection - handles multi-path fields (model needs snap.model + type)', (t) => {
  const result = buildOrkProjection({ model: 1 })

  t.is(result['last.snap.model'], 1, 'includes primary path')
  t.is(result.type, 1, 'includes fallback path')
  t.pass()
})

test('buildOrkProjection - passes through unknown field names as-is', (t) => {
  const result = buildOrkProjection({ 'some.custom.path': 1 })

  t.is(result['some.custom.path'], 1, 'passes through raw path')
  t.pass()
})

test('MINER_PROJECTION_MAP - covers all response fields', (t) => {
  const expectedFields = [
    'id', 'type', 'model', 'code', 'ip', 'container', 'rack', 'position',
    'status', 'hashrate', 'power', 'temperature', 'efficiency', 'uptime',
    'firmware', 'powerMode', 'ledStatus', 'poolConfig', 'alerts',
    'comments', 'serialNum', 'macAddress', 'lastSeen'
  ]
  for (const field of expectedFields) {
    t.ok(MINER_PROJECTION_MAP[field], `should have mapping for ${field}`)
    t.ok(Array.isArray(MINER_PROJECTION_MAP[field]), `${field} should be an array of paths`)
  }
  t.pass()
})

test('formatMiner - only includes requested fields when projection specified', (t) => {
  const raw = createMockMiner()
  const requestedFields = new Set(['firmware', 'ip', 'status'])
  const result = formatMiner(raw, null, requestedFields)

  t.is(result.id, 't-miner-antminer-192-168-1-101', 'always includes id')
  t.is(result.firmware, '2024.01.15', 'includes requested firmware')
  t.is(result.ip, '192.168.1.101', 'includes requested ip')
  t.is(result.status, 'mining', 'includes requested status')
  t.is(result.hashrate, undefined, 'excludes unrequested hashrate')
  t.is(result.power, undefined, 'excludes unrequested power')
  t.is(result.efficiency, undefined, 'excludes unrequested efficiency')
  t.is(result.model, undefined, 'excludes unrequested model')
  t.is(result.container, undefined, 'excludes unrequested container')
  t.pass()
})

test('formatMiner - returns all fields when no projection (null)', (t) => {
  const raw = createMockMiner()
  const result = formatMiner(raw, null, null)

  t.ok(result.hashrate !== undefined, 'includes hashrate')
  t.ok(result.power !== undefined, 'includes power')
  t.ok(result.efficiency !== undefined, 'includes efficiency')
  t.ok(result.firmware !== undefined, 'includes firmware')
  t.ok(result.model !== undefined, 'includes model')
  t.pass()
})

test('listMiners - maps user fields to ork projection and filters response', async (t) => {
  const capturedCalls = []
  const miners = [createMockMiner()]
  const ctx = {
    conf: {
      featureConfig: {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        capturedCalls.push({ method, payload })
        if (method === 'getThingsCount') return [miners.length]
        return [miners]
      }
    }
  }
  const req = { query: { fields: '{"firmware":1,"ip":1}' } }

  const result = await listMiners(ctx, req)

  // Check ork projection was mapped correctly
  const dataCall = capturedCalls.find(c => c.method === 'listThings')
  t.is(dataCall.payload.fields['last.snap.config.firmware_ver'], 1, 'maps firmware to ork path')
  t.is(dataCall.payload.fields['opts.address'], 1, 'maps ip to ork path')
  t.is(dataCall.payload.fields.id, 1, 'always includes id')
  t.is(dataCall.payload.fields.code, 1, 'always includes code')

  // Check response only has requested fields
  const miner = result.data[0]
  t.ok(miner.id, 'always includes id in response')
  t.ok(miner.firmware, 'includes requested firmware')
  t.ok(miner.ip, 'includes requested ip')
  t.is(miner.hashrate, undefined, 'excludes unrequested hashrate')
  t.is(miner.power, undefined, 'excludes unrequested power')
  t.is(miner.efficiency, undefined, 'excludes unrequested efficiency')
  t.pass()
})
