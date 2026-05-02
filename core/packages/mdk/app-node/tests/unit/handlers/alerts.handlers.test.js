'use strict'

const test = require('brittle')
const {
  getSiteAlerts,
  getAlertsHistory,
  extractAlertsFromThings,
  matchesSearch,
  applySort,
  buildSeveritySummary,
  flattenHistoryAlert
} = require('../../../workers/lib/server/handlers/alerts.handlers')
const { matchesFilter, deduplicateAlerts } = require('../../../workers/lib/utils')
const { createMockCtxWithOrks } = require('../helpers/mockHelpers')

// ==================== extractAlertsFromThings Tests ====================

test('extractAlertsFromThings - extracts alerts with device info', (t) => {
  const things = [
    {
      id: 'miner-1',
      type: 'miner',
      code: 'S19',
      info: { container: 'container-A' },
      last: {
        alerts: [
          { severity: 'high', name: 'Fan failure' },
          { severity: 'low', name: 'Temp warning' }
        ]
      }
    }
  ]

  const result = extractAlertsFromThings(things)
  t.is(result.length, 2, 'should extract 2 alerts')
  t.is(result[0].id, 'miner-1', 'should enrich with device id')
  t.is(result[0].type, 'miner', 'should enrich with device type')
  t.is(result[0].code, 'S19', 'should enrich with device code')
  t.is(result[0].container, 'container-A', 'should enrich with container')
  t.is(result[0].severity, 'high', 'should preserve alert severity')
})

test('extractAlertsFromThings - skips things without alerts', (t) => {
  const things = [
    { id: 'miner-1', last: {} },
    { id: 'miner-2', last: { alerts: null } },
    { id: 'miner-3' }
  ]

  const result = extractAlertsFromThings(things)
  t.is(result.length, 0, 'should return empty array')
})

test('extractAlertsFromThings - skips invalid alert entries', (t) => {
  const things = [
    {
      id: 'miner-1',
      type: 'miner',
      code: 'S19',
      last: {
        alerts: [null, 'string', [], { severity: 'high' }]
      }
    }
  ]

  const result = extractAlertsFromThings(things)
  t.is(result.length, 1, 'should only include valid object alerts')
})

// ==================== matchesFilter Tests ====================

test('matchesFilter - returns true when no filter', (t) => {
  t.ok(matchesFilter({ severity: 'high' }, null, ['severity']), 'null filter should match')
  t.ok(matchesFilter({ severity: 'high' }, undefined, ['severity']), 'undefined filter should match')
})

test('matchesFilter - matches exact value', (t) => {
  const item = { severity: 'high', type: 'miner' }
  t.ok(matchesFilter(item, { severity: 'high' }, ['severity', 'type']), 'should match')
  t.ok(!matchesFilter(item, { severity: 'low' }, ['severity', 'type']), 'should not match')
})

test('matchesFilter - matches array values', (t) => {
  const item = { severity: 'high' }
  t.ok(matchesFilter(item, { severity: ['high', 'critical'] }, ['severity']), 'should match when in array')
  t.ok(!matchesFilter(item, { severity: ['low', 'medium'] }, ['severity']), 'should not match when not in array')
})

test('matchesFilter - ignores fields not in allowedFields', (t) => {
  const item = { severity: 'high', secret: 'value' }
  t.ok(matchesFilter(item, { secret: 'wrong' }, ['severity']), 'should ignore non-allowed fields')
})

// ==================== matchesSearch Tests ====================

test('matchesSearch - returns true when no search', (t) => {
  t.ok(matchesSearch({ id: 'test' }, '', ['id']), 'empty search should match')
  t.ok(matchesSearch({ id: 'test' }, null, ['id']), 'null search should match')
})

test('matchesSearch - case-insensitive substring match', (t) => {
  const item = { id: 'Miner-ABC-123', code: 'S19' }
  t.ok(matchesSearch(item, 'abc', ['id', 'code']), 'should match case-insensitive')
  t.ok(matchesSearch(item, 'S19', ['id', 'code']), 'should match code field')
  t.ok(!matchesSearch(item, 'xyz', ['id', 'code']), 'should not match')
})

test('matchesSearch - handles null/undefined fields', (t) => {
  const item = { id: 'test', code: null }
  t.ok(matchesSearch(item, 'test', ['id', 'code', 'missing']), 'should handle null fields')
})

// ==================== applySort Tests ====================

test('applySort - returns items when no sort', (t) => {
  const items = [{ a: 2 }, { a: 1 }]
  const result = applySort(items, null)
  t.is(result[0].a, 2, 'should preserve order')
})

test('applySort - sorts ascending', (t) => {
  const items = [{ ts: 3 }, { ts: 1 }, { ts: 2 }]
  const result = applySort(items, { ts: 1 })
  t.is(result[0].ts, 1, 'first should be smallest')
  t.is(result[2].ts, 3, 'last should be largest')
})

test('applySort - sorts descending', (t) => {
  const items = [{ ts: 1 }, { ts: 3 }, { ts: 2 }]
  const result = applySort(items, { ts: -1 })
  t.is(result[0].ts, 3, 'first should be largest')
  t.is(result[2].ts, 1, 'last should be smallest')
})

test('applySort - does not mutate original', (t) => {
  const items = [{ ts: 2 }, { ts: 1 }]
  applySort(items, { ts: 1 })
  t.is(items[0].ts, 2, 'original should be unchanged')
})

// ==================== buildSeveritySummary Tests ====================

test('buildSeveritySummary - counts by severity', (t) => {
  const alerts = [
    { severity: 'critical' },
    { severity: 'high' },
    { severity: 'high' },
    { severity: 'medium' },
    { severity: 'low' },
    { severity: 'low' },
    { severity: 'low' }
  ]

  const result = buildSeveritySummary(alerts)
  t.is(result.critical, 1, 'should count critical')
  t.is(result.high, 2, 'should count high')
  t.is(result.medium, 1, 'should count medium')
  t.is(result.low, 3, 'should count low')
  t.is(result.total, 7, 'should count total')
})

test('buildSeveritySummary - empty alerts', (t) => {
  const result = buildSeveritySummary([])
  t.is(result.total, 0, 'total should be 0')
  t.is(result.critical, 0, 'critical should be 0')
})

// ==================== deduplicateAlerts Tests ====================

test('deduplicateAlerts - removes duplicates by uuid', (t) => {
  const alerts = [
    { uuid: 'a', name: 'first' },
    { uuid: 'b', name: 'second' },
    { uuid: 'a', name: 'duplicate' }
  ]

  const result = deduplicateAlerts(alerts)
  t.is(result.length, 2, 'should remove duplicate')
  t.is(result[0].name, 'first', 'should keep first occurrence')
})

test('deduplicateAlerts - keeps alerts without uuid', (t) => {
  const alerts = [
    { name: 'no-uuid-1' },
    { name: 'no-uuid-2' }
  ]

  const result = deduplicateAlerts(alerts)
  t.is(result.length, 2, 'should keep all without uuid')
})

test('deduplicateAlerts - empty array', (t) => {
  const result = deduplicateAlerts([])
  t.is(result.length, 0, 'should return empty array')
})

// ==================== getSiteAlerts Tests ====================

test('getSiteAlerts - happy path', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      {
        id: 'miner-1',
        type: 'miner',
        code: 'S19',
        info: { container: 'cont-A' },
        last: {
          alerts: [
            { severity: 'high', name: 'Fan failure' },
            { severity: 'low', name: 'Temp warning' }
          ]
        }
      },
      {
        id: 'miner-2',
        type: 'miner',
        code: 'S21',
        info: { container: 'cont-B' },
        last: {
          alerts: [
            { severity: 'critical', name: 'Overheat' }
          ]
        }
      }
    ]
  )

  const mockReq = { query: {} }
  const result = await getSiteAlerts(mockCtx, mockReq)

  t.ok(result.alerts, 'should return alerts')
  t.ok(result.summary, 'should return summary')
  t.ok(typeof result.total === 'number', 'should return total')
  t.is(result.total, 3, 'should have 3 total alerts')
  t.is(result.summary.critical, 1, 'should count 1 critical')
  t.is(result.summary.high, 1, 'should count 1 high')
  t.is(result.summary.low, 1, 'should count 1 low')
})

test('getSiteAlerts - empty results', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => []
  )

  const mockReq = { query: {} }
  const result = await getSiteAlerts(mockCtx, mockReq)

  t.is(result.total, 0, 'should have 0 total')
  t.is(result.alerts.length, 0, 'should have empty alerts')
  t.is(result.summary.total, 0, 'summary total should be 0')
})

test('getSiteAlerts - applies filter', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      {
        id: 'miner-1',
        type: 'miner',
        code: 'S19',
        info: { container: 'cont-A' },
        last: { alerts: [{ severity: 'high', name: 'Alert 1' }] }
      },
      {
        id: 'miner-2',
        type: 'miner',
        code: 'S21',
        info: { container: 'cont-B' },
        last: { alerts: [{ severity: 'low', name: 'Alert 2' }] }
      }
    ]
  )

  const mockReq = { query: { filter: JSON.stringify({ severity: 'high' }) } }
  const result = await getSiteAlerts(mockCtx, mockReq)

  t.is(result.total, 1, 'should filter to 1 alert')
  t.is(result.alerts[0].severity, 'high', 'should only include high severity')
})

test('getSiteAlerts - applies text search', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      {
        id: 'miner-ABC',
        type: 'miner',
        code: 'S19',
        info: { container: 'cont-A' },
        last: { alerts: [{ severity: 'high' }] }
      },
      {
        id: 'miner-XYZ',
        type: 'miner',
        code: 'S21',
        info: { container: 'cont-B' },
        last: { alerts: [{ severity: 'low' }] }
      }
    ]
  )

  const mockReq = { query: { search: 'ABC' } }
  const result = await getSiteAlerts(mockCtx, mockReq)

  t.is(result.total, 1, 'should find 1 match')
  t.is(result.alerts[0].id, 'miner-ABC', 'should match by id')
})

test('getSiteAlerts - applies pagination', async (t) => {
  const things = []
  for (let i = 0; i < 5; i++) {
    things.push({
      id: `miner-${i}`,
      type: 'miner',
      code: 'S19',
      info: { container: 'cont-A' },
      last: { alerts: [{ severity: 'high', name: `Alert ${i}` }] }
    })
  }

  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => things
  )

  const mockReq = { query: { offset: '2', limit: '2' } }
  const result = await getSiteAlerts(mockCtx, mockReq)

  t.is(result.total, 5, 'total should be all alerts')
  t.is(result.alerts.length, 2, 'should return limited alerts')
})

// ==================== flattenHistoryAlert Tests ====================

test('flattenHistoryAlert - flattens nested thing structure', (t) => {
  const alert = {
    name: 'hashrate_low',
    severity: 'medium',
    uuid: 'abc',
    createdAt: 1000,
    thing: {
      id: 'miner-1',
      type: 'miner-am-s19xp',
      code: 'AM-S19XP-0104',
      tags: ['t-miner'],
      info: { container: 'cont-A', pos: '1-2_c3' }
    }
  }

  const result = flattenHistoryAlert(alert)
  t.is(result.deviceId, 'miner-1', 'should flatten thing.id to deviceId')
  t.is(result.deviceType, 'miner-am-s19xp', 'should flatten thing.type to deviceType')
  t.is(result.code, 'AM-S19XP-0104', 'should flatten thing.code to code')
  t.is(result.container, 'cont-A', 'should flatten thing.info.container to container')
  t.is(result.position, '1-2_c3', 'should flatten thing.info.pos to position')
  t.ok(Array.isArray(result.tags), 'should flatten thing.tags to tags')
  t.is(result.severity, 'medium', 'should preserve top-level fields')
  t.ok(!result.thing, 'should remove nested thing object')
})

test('flattenHistoryAlert - handles missing thing', (t) => {
  const alert = { name: 'test', severity: 'low', uuid: 'x' }
  const result = flattenHistoryAlert(alert)
  t.is(result.deviceId, undefined, 'deviceId should be undefined')
  t.is(result.container, undefined, 'container should be undefined')
  t.is(result.severity, 'low', 'should preserve severity')
})

// ==================== getAlertsHistory Tests ====================

const makeHistoryAlert = (uuid, createdAt, severity, thingOverrides = {}) => ({
  uuid,
  createdAt,
  severity,
  name: `alert-${uuid}`,
  description: 'Test alert',
  thing: {
    id: `thing-${uuid}`,
    type: 'miner-am-s19xp',
    code: `CODE-${uuid}`,
    tags: ['t-miner'],
    info: { container: 'cont-A', pos: '1-1' },
    ...thingOverrides
  }
})

test('getAlertsHistory - happy path', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      makeHistoryAlert('a', 1000, 'high'),
      makeHistoryAlert('b', 2000, 'low')
    ]
  )

  const mockReq = {
    query: { start: 1, end: 3000 }
  }

  const result = await getAlertsHistory(mockCtx, mockReq)

  t.ok(result.alerts, 'should return alerts')
  t.ok(typeof result.total === 'number', 'should return total')
  t.is(result.total, 2, 'should have 2 alerts')
  t.ok(result.alerts[0].deviceId, 'should have flattened deviceId')
  t.ok(result.alerts[0].code, 'should have flattened code')
  t.ok(!result.alerts[0].thing, 'should not have nested thing')
})

test('getAlertsHistory - deduplicates by uuid', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      makeHistoryAlert('a', 1000, 'high'),
      makeHistoryAlert('a', 2000, 'high'),
      makeHistoryAlert('b', 3000, 'low')
    ]
  )

  const mockReq = {
    query: { start: 1, end: 5000 }
  }

  const result = await getAlertsHistory(mockCtx, mockReq)

  t.is(result.total, 2, 'should deduplicate to 2 alerts')
})

test('getAlertsHistory - default sort newest first', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      makeHistoryAlert('a', 1000, 'high'),
      makeHistoryAlert('b', 3000, 'high'),
      makeHistoryAlert('c', 2000, 'high')
    ]
  )

  const mockReq = {
    query: { start: 1, end: 5000 }
  }

  const result = await getAlertsHistory(mockCtx, mockReq)

  t.is(result.alerts[0].createdAt, 3000, 'newest should be first')
  t.is(result.alerts[2].createdAt, 1000, 'oldest should be last')
})

test('getAlertsHistory - applies filter on flattened fields', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => [
      makeHistoryAlert('a', 1000, 'high'),
      makeHistoryAlert('b', 2000, 'low')
    ]
  )

  const mockReq = {
    query: {
      start: 1,
      end: 5000,
      filter: JSON.stringify({ severity: 'high' })
    }
  }

  const result = await getAlertsHistory(mockCtx, mockReq)

  t.is(result.total, 1, 'should filter to 1 alert')
  t.is(result.alerts[0].severity, 'high', 'should only include high severity')
})

test('getAlertsHistory - applies pagination', async (t) => {
  const alerts = []
  for (let i = 0; i < 5; i++) {
    alerts.push(makeHistoryAlert(`u${i}`, i * 1000, 'medium'))
  }

  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => alerts
  )

  const mockReq = {
    query: { start: 1, end: 10000, offset: '1', limit: '2' }
  }

  const result = await getAlertsHistory(mockCtx, mockReq)

  t.is(result.total, 5, 'total should be all alerts')
  t.is(result.alerts.length, 2, 'should return limited alerts')
})

test('getAlertsHistory - empty results', async (t) => {
  const mockCtx = createMockCtxWithOrks(
    [{ rpcPublicKey: 'key1' }],
    async () => []
  )

  const mockReq = {
    query: { start: 1, end: 5000 }
  }

  const result = await getAlertsHistory(mockCtx, mockReq)

  t.is(result.total, 0, 'should have 0 total')
  t.is(result.alerts.length, 0, 'should have empty alerts')
})

test('getAlertsHistory - throws on invalid date range', async (t) => {
  const mockCtx = createMockCtxWithOrks()
  const mockReq = {
    query: { start: 5000, end: 1000 }
  }

  try {
    await getAlertsHistory(mockCtx, mockReq)
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_DATE_RANGE', 'should throw date range error')
  }
})
