'use strict'

const test = require('brittle')
const {
  listExplorerRacks,
  aggregateRackStats,
  buildRackList,
  filterByGroups,
  filterBySearch,
  sortRacks
} = require('../../../workers/lib/server/handlers/explorer.handlers')

function createMockRackStats (overrides = {}) {
  return {
    hashrateByRack: {
      'group-1_rack-1': 5000000000, // 5 PH/s
      'group-1_rack-2': 4000000000,
      'group-2_rack-1': 3000000000,
      'group-2_rack-2': 6000000000,
      ...overrides.hashrateByRack
    },
    powerByRack: {
      'group-1_rack-1': 500000,
      'group-1_rack-2': 400000,
      'group-2_rack-1': 300000,
      'group-2_rack-2': 600000,
      ...overrides.powerByRack
    },
    efficiencyByRack: {
      'group-1_rack-1': 6,
      'group-1_rack-2': 6,
      'group-2_rack-1': 6,
      'group-2_rack-2': 6,
      ...overrides.efficiencyByRack
    }
  }
}

function createMockMiningConfig (overrides = {}) {
  return {
    total_groups: 2,
    racks_per_group: 2,
    miners_per_rack: 20,
    ...overrides
  }
}

function createMockDcsThing (miningConfig) {
  return {
    id: 'dcs-1',
    type: 'wrk-dcs-siemens',
    tags: ['t-dcs'],
    last: {
      snap: {
        config: {
          mining: miningConfig
        }
      }
    }
  }
}

function createMockCtx (tailLogData, dcsThing = null) {
  return {
    conf: {
      featureConfig: dcsThing ? { centralDCSSetup: { enabled: true, tag: 't-dcs' } } : {}
    },
    dataProxy: {
      requestDataMap: async (method, payload) => {
        if (method === 'tailLogMulti') return [tailLogData]
        if (method === 'listThings') return dcsThing ? [[dcsThing]] : [[]]
        return [{}]
      }
    }
  }
}

// ==================== aggregateRackStats Tests ====================

test('aggregateRackStats - extracts per-rack hashrate, power, efficiency', (t) => {
  const tailLogResults = [
    [
      [{
        hashrate_mhs_5m_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 5000000000, 'group-1_rack-2': 4000000000 },
        power_w_pdu_rack_group_sum_aggr: { 'group-1_rack-1': 500000, 'group-1_rack-2': 400000 },
        efficiency_w_ths_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 6, 'group-1_rack-2': 6.5 }
      }]
    ]
  ]

  const stats = aggregateRackStats(tailLogResults)
  t.is(stats.hashrateByRack['group-1_rack-1'], 5000000000)
  t.is(stats.powerByRack['group-1_rack-2'], 400000)
  t.is(stats.efficiencyByRack['group-1_rack-2'], 6.5)
  t.pass()
})

test('aggregateRackStats - merges across multiple orks', (t) => {
  const tailLogResults = [
    [[{
      hashrate_mhs_5m_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 3000000000 },
      power_w_pdu_rack_group_sum_aggr: { 'group-1_rack-1': 300000 },
      efficiency_w_ths_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 5 }
    }]],
    [[{
      hashrate_mhs_5m_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 2000000000 },
      power_w_pdu_rack_group_sum_aggr: { 'group-1_rack-1': 200000 },
      efficiency_w_ths_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 7 }
    }]]
  ]

  const stats = aggregateRackStats(tailLogResults)
  t.is(stats.hashrateByRack['group-1_rack-1'], 5000000000, 'hashrate sums across orks')
  t.is(stats.powerByRack['group-1_rack-1'], 500000, 'power sums across orks')
  t.is(stats.efficiencyByRack['group-1_rack-1'], 7, 'efficiency takes max across orks')
  t.pass()
})

test('aggregateRackStats - handles empty results', (t) => {
  const stats = aggregateRackStats([])
  t.alike(stats.hashrateByRack, {})
  t.alike(stats.powerByRack, {})
  t.alike(stats.efficiencyByRack, {})
  t.pass()
})

// ==================== buildRackList Tests ====================

test('buildRackList - builds racks from config', (t) => {
  const config = createMockMiningConfig()
  const stats = createMockRackStats()

  const racks = buildRackList(config, stats)

  t.is(racks.length, 4, 'should create 2 groups * 2 racks = 4 racks')
  t.is(racks[0].id, 'group-1_rack-1')
  t.is(racks[0].name, 'Rack 1')
  t.is(racks[0].group.id, 'group-1')
  t.is(racks[0].group.name, 'Group 1')
  t.is(racks[0].miners_count, 20)
  t.is(racks[0].efficiency.unit, 'W/TH/s')
  t.is(racks[0].hashrate.unit, 'PH/s')
  t.is(racks[0].consumption.unit, 'kW')
  t.pass()
})

test('buildRackList - sequential rack naming across groups', (t) => {
  const config = createMockMiningConfig({ total_groups: 3, racks_per_group: 2 })
  const stats = createMockRackStats()

  const racks = buildRackList(config, stats)

  t.is(racks[0].name, 'Rack 1')
  t.is(racks[1].name, 'Rack 2')
  t.is(racks[2].name, 'Rack 3')
  t.is(racks[3].name, 'Rack 4')
  t.is(racks[4].name, 'Rack 5')
  t.is(racks[5].name, 'Rack 6')
  t.pass()
})

test('buildRackList - handles missing stats gracefully', (t) => {
  const config = createMockMiningConfig({ total_groups: 1, racks_per_group: 1 })
  const stats = { hashrateByRack: {}, powerByRack: {}, efficiencyByRack: {} }

  const racks = buildRackList(config, stats)

  t.is(racks.length, 1)
  t.is(racks[0].efficiency.value, 0)
  t.is(racks[0].hashrate.value, 0)
  t.is(racks[0].consumption.value, 0)
  t.pass()
})

test('buildRackList - handles empty config', (t) => {
  const racks = buildRackList({}, { hashrateByRack: {}, powerByRack: {}, efficiencyByRack: {} })
  t.is(racks.length, 0)
  t.pass()
})

// ==================== filterByGroups Tests ====================

test('filterByGroups - filters to matching groups', (t) => {
  const racks = [
    { id: 'group-1_rack-1', group: { id: 'group-1' } },
    { id: 'group-2_rack-1', group: { id: 'group-2' } },
    { id: 'group-3_rack-1', group: { id: 'group-3' } }
  ]

  const result = filterByGroups(racks, ['group-1', 'group-3'])
  t.is(result.length, 2)
  t.is(result[0].id, 'group-1_rack-1')
  t.is(result[1].id, 'group-3_rack-1')
  t.pass()
})

test('filterByGroups - returns empty for no matches', (t) => {
  const racks = [{ id: 'group-1_rack-1', group: { id: 'group-1' } }]
  const result = filterByGroups(racks, ['group-99'])
  t.is(result.length, 0)
  t.pass()
})

// ==================== filterBySearch Tests ====================

test('filterBySearch - matches rack name case-insensitively', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1' },
    { id: 'group-1_rack-2', name: 'Rack 2' },
    { id: 'group-2_rack-1', name: 'Rack 3' }
  ]

  const result = filterBySearch(racks, 'rack 1')
  t.is(result.length, 1)
  t.is(result[0].name, 'Rack 1')
  t.pass()
})

test('filterBySearch - matches rack id', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1' },
    { id: 'group-2_rack-1', name: 'Rack 3' }
  ]

  const result = filterBySearch(racks, 'group-2')
  t.is(result.length, 1)
  t.is(result[0].id, 'group-2_rack-1')
  t.pass()
})

test('filterBySearch - returns all on empty match', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1' }
  ]

  const result = filterBySearch(racks, 'xyz')
  t.is(result.length, 0)
  t.pass()
})

test('filterBySearch - matches group id case-insensitively', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const result = filterBySearch(racks, 'GROUP-1')
  t.is(result.length, 1)
  t.is(result[0].id, 'group-1_rack-1')
  t.pass()
})

test('filterBySearch - matches group name case-insensitively', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const result = filterBySearch(racks, 'group 2')
  t.is(result.length, 1)
  t.is(result[0].group.name, 'Group 2')
  t.pass()
})

test('filterBySearch - supports comma-separated terms as OR', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-1_rack-2', name: 'Rack 2', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } },
    { id: 'group-3_rack-1', name: 'Rack 4', group: { id: 'group-3', name: 'Group 3' } }
  ]

  const result = filterBySearch(racks, 'Rack 1,Rack 3')
  const ids = result.map(r => r.id).sort()
  t.is(result.length, 2)
  t.alike(ids, ['group-1_rack-1', 'group-2_rack-1'])
  t.pass()
})

test('filterBySearch - trims whitespace around terms', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const result = filterBySearch(racks, '  rack 1  ,   group-2  ')
  const ids = result.map(r => r.id).sort()
  t.is(result.length, 2)
  t.alike(ids, ['group-1_rack-1', 'group-2_rack-1'])
  t.pass()
})

test('filterBySearch - ignores empty terms within comma-separated list', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const result = filterBySearch(racks, ',,rack 1,, ,')
  t.is(result.length, 1)
  t.is(result[0].id, 'group-1_rack-1')
  t.pass()
})

test('filterBySearch - returns all racks when search is undefined', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const result = filterBySearch(racks, undefined)
  t.is(result.length, 2)
  t.alike(result, racks)
  t.pass()
})

test('filterBySearch - returns all racks when search is null', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } }
  ]

  const result = filterBySearch(racks, null)
  t.is(result.length, 1)
  t.alike(result, racks)
  t.pass()
})

test('filterBySearch - returns all racks when search is empty string', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const result = filterBySearch(racks, '')
  t.is(result.length, 2)
  t.alike(result, racks)
  t.pass()
})

test('filterBySearch - returns all racks when search contains only commas/whitespace', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1', group: { id: 'group-1', name: 'Group 1' } }
  ]

  const result = filterBySearch(racks, '  ,, ,  ')
  t.is(result.length, 1)
  t.alike(result, racks)
  t.pass()
})

test('filterBySearch - handles racks without group gracefully', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1' },
    { id: 'group-2_rack-1', name: 'Rack 3', group: { id: 'group-2', name: 'Group 2' } }
  ]

  const byName = filterBySearch(racks, 'Rack 1')
  t.is(byName.length, 1)
  t.is(byName[0].id, 'group-1_rack-1')

  const byGroup = filterBySearch(racks, 'Group 2')
  t.is(byGroup.length, 1)
  t.is(byGroup[0].id, 'group-2_rack-1')
  t.pass()
})

test('filterBySearch - does not match when field is missing and search is non-empty', (t) => {
  const racks = [
    { id: 'group-1_rack-1', name: 'Rack 1' }
  ]

  const result = filterBySearch(racks, 'Group 1')
  t.is(result.length, 0)
  t.pass()
})

// ==================== sortRacks Tests ====================

test('sortRacks - sorts by efficiency descending', (t) => {
  const racks = [
    { efficiency: { value: 5 } },
    { efficiency: { value: 8 } },
    { efficiency: { value: 3 } }
  ]

  sortRacks(racks, { efficiency: -1 })
  t.is(racks[0].efficiency.value, 8)
  t.is(racks[1].efficiency.value, 5)
  t.is(racks[2].efficiency.value, 3)
  t.pass()
})

test('sortRacks - sorts by hashrate ascending', (t) => {
  const racks = [
    { hashrate: { value: 10 } },
    { hashrate: { value: 5 } },
    { hashrate: { value: 15 } }
  ]

  sortRacks(racks, { hashrate: 1 })
  t.is(racks[0].hashrate.value, 5)
  t.is(racks[1].hashrate.value, 10)
  t.is(racks[2].hashrate.value, 15)
  t.pass()
})

test('sortRacks - sorts by group', (t) => {
  const racks = [
    { group: { id: 'group-3' } },
    { group: { id: 'group-1' } },
    { group: { id: 'group-2' } }
  ]

  sortRacks(racks, { group: 1 })
  t.is(racks[0].group.id, 'group-1')
  t.is(racks[1].group.id, 'group-2')
  t.is(racks[2].group.id, 'group-3')
  t.pass()
})

// ==================== listExplorerRacks Tests ====================

test('listExplorerRacks - returns paginated rack list', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 4, racks_per_group: 4 })
  const dcsThing = createMockDcsThing(miningConfig)
  const tailLogData = [
    [{
      hashrate_mhs_5m_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 5000000000 },
      power_w_pdu_rack_group_sum_aggr: { 'group-1_rack-1': 500000 },
      efficiency_w_ths_pdu_rack_group_avg_aggr: { 'group-1_rack-1': 6 }
    }]
  ]

  const ctx = createMockCtx(tailLogData, dcsThing)
  const req = { query: {} }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 16, 'total should be 4 groups * 4 racks')
  t.is(result.data.length, 16, 'default limit should show all when <= 20')
  t.is(result.offset, 0)
  t.is(result.limit, 20)
  t.is(result.hasMore, false)
  t.is(result.data[0].id, 'group-1_rack-1')
  t.is(result.data[0].group.name, 'Group 1')
  t.pass()
})

test('listExplorerRacks - filters by group', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 4, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { group: 'group-2' } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 2, 'should only return racks from group-2')
  result.data.forEach(rack => {
    t.is(rack.group.id, 'group-2')
  })
  t.pass()
})

test('listExplorerRacks - filters by multiple groups', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 4, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { group: 'group-1,group-3' } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 4)
  const groupIds = new Set(result.data.map(r => r.group.id))
  t.ok(groupIds.has('group-1'))
  t.ok(groupIds.has('group-3'))
  t.ok(!groupIds.has('group-2'))
  t.pass()
})

test('listExplorerRacks - applies search filter', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 4, racks_per_group: 4 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { search: 'Rack 1' } }

  const result = await listExplorerRacks(ctx, req)

  // "Rack 1" matches "Rack 1", "Rack 10", "Rack 11", etc.
  t.ok(result.totalCount >= 1)
  result.data.forEach(rack => {
    t.ok(rack.name.toLowerCase().includes('rack 1') || rack.id.toLowerCase().includes('rack 1'))
  })
  t.pass()
})

test('listExplorerRacks - supports comma-separated search terms', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 4, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { search: 'group-1,group-3' } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 4, 'should return racks from both group-1 and group-3')
  const groupIds = new Set(result.data.map(r => r.group.id))
  t.ok(groupIds.has('group-1'))
  t.ok(groupIds.has('group-3'))
  t.ok(!groupIds.has('group-2'))
  t.ok(!groupIds.has('group-4'))
  t.pass()
})

test('listExplorerRacks - search by group name returns matching racks', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 3, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { search: 'Group 2' } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 2)
  result.data.forEach(rack => {
    t.is(rack.group.id, 'group-2')
  })
  t.pass()
})

test('listExplorerRacks - returns all racks when search is missing', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 2, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: {} }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 4, 'all racks returned when no search provided')
  t.pass()
})

test('listExplorerRacks - returns all racks when search is empty string', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 2, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { search: '' } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 4, 'empty search should not filter anything out')
  t.pass()
})

test('listExplorerRacks - combined group + search filter', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 4, racks_per_group: 4 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { group: 'group-2', search: 'rack-1' } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 1)
  t.is(result.data[0].group.id, 'group-2')
  t.ok(result.data[0].id.includes('rack-1'))
  t.pass()
})

test('listExplorerRacks - applies pagination', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 8, racks_per_group: 4 })
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { offset: 5, limit: 3 } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 32)
  t.is(result.data.length, 3)
  t.is(result.offset, 5)
  t.is(result.limit, 3)
  t.is(result.hasMore, true)
  t.pass()
})

test('listExplorerRacks - enforces max limit', async (t) => {
  const miningConfig = createMockMiningConfig()
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { limit: 500 } }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.limit, 100)
  t.pass()
})

test('listExplorerRacks - applies sort', async (t) => {
  const miningConfig = createMockMiningConfig({ total_groups: 2, racks_per_group: 2 })
  const dcsThing = createMockDcsThing(miningConfig)
  const tailLogData = [
    [{
      hashrate_mhs_5m_pdu_rack_group_avg_aggr: {
        'group-1_rack-1': 1000000000,
        'group-1_rack-2': 5000000000,
        'group-2_rack-1': 3000000000,
        'group-2_rack-2': 2000000000
      },
      power_w_pdu_rack_group_sum_aggr: {
        'group-1_rack-1': 100000,
        'group-1_rack-2': 500000,
        'group-2_rack-1': 300000,
        'group-2_rack-2': 200000
      },
      efficiency_w_ths_pdu_rack_group_avg_aggr: {}
    }]
  ]

  const ctx = createMockCtx(tailLogData, dcsThing)
  const req = { query: { sort: '{"hashrate":-1}' } }

  const result = await listExplorerRacks(ctx, req)

  t.ok(result.data[0].hashrate.value >= result.data[1].hashrate.value, 'first rack should have highest hashrate')
  t.pass()
})

test('listExplorerRacks - handles no DCS (empty rack list)', async (t) => {
  const ctx = {
    conf: { featureConfig: {} },
    dataProxy: {
      requestDataMap: async () => [[{}]]
    }
  }
  const req = { query: {} }

  const result = await listExplorerRacks(ctx, req)

  t.is(result.totalCount, 0)
  t.is(result.data.length, 0)
  t.pass()
})

test('listExplorerRacks - throws on invalid sort JSON', async (t) => {
  const miningConfig = createMockMiningConfig()
  const dcsThing = createMockDcsThing(miningConfig)
  const ctx = createMockCtx([[{}]], dcsThing)
  const req = { query: { sort: 'not-json' } }

  try {
    await listExplorerRacks(ctx, req)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err instanceof SyntaxError || err.message.includes('JSON'))
  }
  t.pass()
})
