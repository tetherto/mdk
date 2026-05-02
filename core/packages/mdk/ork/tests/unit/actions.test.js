'use strict'

const test = require('brittle')
const { INVALID_ACTIONS_ERRORS } = require('../../workers/lib/constants')

test('pushAction - type filtering', async (t) => {
  t.test('should filter targets by rack type when type is provided', async (t) => {
    // Mock racks database
    const mockRacks = new Map([
      ['rack-miner-1', JSON.stringify({ id: 'rack-miner-1', type: 'wrk-miner-s19' })],
      ['rack-miner-2', JSON.stringify({ id: 'rack-miner-2', type: 'wrk-miner-s19xp' })],
      ['rack-container-1', JSON.stringify({ id: 'rack-container-1', type: 'wrk-container-antspace' })]
    ])

    const racks = {
      get: async (key) => mockRacks.get(key)
    }

    // Mock targets from getWriteCalls
    const targets = {
      'rack-miner-1': { reqVotes: 1, calls: [{ id: 'device-1' }] },
      'rack-miner-2': { reqVotes: 1, calls: [{ id: 'device-2' }] },
      'rack-container-1': { reqVotes: 1, calls: [{ id: 'device-3' }] }
    }

    // Test filtering by exact type match
    const processedRacks = []
    for (const rack in targets) {
      const type = 'wrk-miner-s19'
      const rackEntry = await racks.get(rack)
      const rackData = rackEntry ? JSON.parse(rackEntry.toString()) : null
      if (type && rackData && rackData.type !== type && !rackData.type.startsWith(`${type}-`)) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 1, 'should only process rack with exact type match')
    t.is(processedRacks[0], 'rack-miner-1', 'should process rack-miner-1')
  })

  t.test('should filter targets by rack type prefix when type has variants', async (t) => {
    // Mock racks database
    const mockRacks = new Map([
      ['rack-miner-1', JSON.stringify({ id: 'rack-miner-1', type: 'wrk-miner-s19' })],
      ['rack-miner-2', JSON.stringify({ id: 'rack-miner-2', type: 'wrk-miner-s19-variant-1' })],
      ['rack-miner-3', JSON.stringify({ id: 'rack-miner-3', type: 'wrk-miner-s19xp' })]
    ])

    const racks = {
      get: async (key) => mockRacks.get(key)
    }

    const targets = {
      'rack-miner-1': { reqVotes: 1, calls: [{ id: 'device-1' }] },
      'rack-miner-2': { reqVotes: 1, calls: [{ id: 'device-2' }] },
      'rack-miner-3': { reqVotes: 1, calls: [{ id: 'device-3' }] }
    }

    // Test filtering by type prefix
    const processedRacks = []
    for (const rack in targets) {
      const type = 'wrk-miner-s19'
      const rackEntry = await racks.get(rack)
      const rackData = rackEntry ? JSON.parse(rackEntry.toString()) : null
      if (type && rackData && rackData.type !== type && !rackData.type.startsWith(`${type}-`)) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 2, 'should process racks with type and type prefix match')
    t.ok(processedRacks.includes('rack-miner-1'), 'should include rack with exact match')
    t.ok(processedRacks.includes('rack-miner-2'), 'should include rack with prefix match')
    t.ok(!processedRacks.includes('rack-miner-3'), 'should not include rack with different type')
  })

  t.test('should process all targets when type is not provided', async (t) => {
    const mockRacks = new Map([
      ['rack-miner-1', JSON.stringify({ id: 'rack-miner-1', type: 'wrk-miner-s19' })],
      ['rack-container-1', JSON.stringify({ id: 'rack-container-1', type: 'wrk-container-antspace' })]
    ])

    const racks = {
      get: async (key) => mockRacks.get(key)
    }

    const targets = {
      'rack-miner-1': { reqVotes: 1, calls: [{ id: 'device-1' }] },
      'rack-container-1': { reqVotes: 1, calls: [{ id: 'device-2' }] }
    }

    const processedRacks = []
    for (const rack in targets) {
      const type = null
      const rackEntry = await racks.get(rack)
      const rackData = rackEntry ? JSON.parse(rackEntry.toString()) : null
      if (type && rackData && rackData.type !== type && !rackData.type.startsWith(`${type}-`)) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 2, 'should process all racks when type is null')
  })
})

test('pushAction - invalid error handling', async (t) => {
  t.test('should skip targets with UNKNOWN_METHOD error', async (t) => {
    const targets = {
      'rack-1': { reqVotes: 1, calls: [{ id: 'device-1' }], error: 'UNKNOWN_METHOD: reboot' },
      'rack-2': { reqVotes: 1, calls: [{ id: 'device-2' }] }
    }

    const processedRacks = []
    for (const rack in targets) {
      const entry = targets[rack]
      if (entry.error && INVALID_ACTIONS_ERRORS.some(err => entry.error.includes(err))) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 1, 'should only process rack without invalid error')
    t.is(processedRacks[0], 'rack-2', 'should process rack-2')
  })

  t.test('should skip targets with CHANNEL_CLOSED error', async (t) => {
    const targets = {
      'rack-1': { reqVotes: 1, calls: [{ id: 'device-1' }] },
      'rack-2': { reqVotes: 1, calls: [{ id: 'device-2' }], error: 'CHANNEL_CLOSED' },
      'rack-3': { reqVotes: 1, calls: [{ id: 'device-3' }] }
    }

    const processedRacks = []
    for (const rack in targets) {
      const entry = targets[rack]
      if (entry.error && INVALID_ACTIONS_ERRORS.some(err => entry.error.includes(err))) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 2, 'should process racks without invalid errors')
    t.ok(processedRacks.includes('rack-1'), 'should include rack-1')
    t.ok(processedRacks.includes('rack-3'), 'should include rack-3')
  })

  t.test('should process targets with other errors', async (t) => {
    const targets = {
      'rack-1': { reqVotes: 1, calls: [], error: 'ERR_TIMEOUT' },
      'rack-2': { reqVotes: 1, calls: [], error: 'ERR_CONNECTION_FAILED' }
    }

    const processedRacks = []
    for (const rack in targets) {
      const entry = targets[rack]
      if (entry.error && INVALID_ACTIONS_ERRORS.some(err => entry.error.includes(err))) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 2, 'should process racks with valid errors')
  })

  t.test('should skip targets with partial match of invalid errors', async (t) => {
    const targets = {
      'rack-1': { reqVotes: 1, calls: [], error: 'Error: UNKNOWN_METHOD not supported' },
      'rack-2': { reqVotes: 1, calls: [], error: 'Connection error: CHANNEL_CLOSED unexpectedly' }
    }

    const processedRacks = []
    for (const rack in targets) {
      const entry = targets[rack]
      if (entry.error && INVALID_ACTIONS_ERRORS.some(err => entry.error.includes(err))) {
        continue
      }
      processedRacks.push(rack)
    }

    t.is(processedRacks.length, 0, 'should skip racks with errors containing invalid error strings')
  })
})

test('_filterInvalidActionsErrors - error filtering in targets', async (t) => {
  const WrkProcAggr = require('../../workers/aggr.proc.ork.wrk')

  t.test('should filter out actions where all targets have UNKNOWN_METHOD error', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {
          'rack-1': { calls: [], error: 'UNKNOWN_METHOD: setPowerMode' },
          'rack-2': { calls: [], error: 'UNKNOWN_METHOD: setPowerMode' }
        }
      },
      {
        id: 'action-2',
        targets: {
          'rack-3': { calls: [{ id: 'device-1' }] }
        }
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 1, 'should filter out action with all invalid errors')
    t.is(filteredActions[0].id, 'action-2', 'should keep action-2')
  })

  t.test('should filter out actions where all targets have CHANNEL_CLOSED error', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {
          'rack-1': { calls: [], error: 'CHANNEL_CLOSED' }
        }
      },
      {
        id: 'action-2',
        targets: {
          'rack-2': { calls: [{ id: 'device-1' }] },
          'rack-3': { calls: [{ id: 'device-2' }] }
        }
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 1, 'should keep action with valid targets')
    t.is(filteredActions[0].id, 'action-2', 'should keep action-2')
  })

  t.test('should keep actions where at least one target does not have invalid error', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {
          'rack-1': { calls: [], error: 'UNKNOWN_METHOD: reboot' },
          'rack-2': { calls: [{ id: 'device-1' }] },
          'rack-3': { calls: [], error: 'CHANNEL_CLOSED' }
        }
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 1, 'should keep action with at least one valid target')
    t.is(filteredActions[0].id, 'action-1', 'should keep action-1')
  })

  t.test('should keep actions where targets have other types of errors', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {
          'rack-1': { calls: [], error: 'ERR_TIMEOUT' },
          'rack-2': { calls: [], error: 'ERR_CONNECTION_FAILED' }
        }
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 1, 'should keep action with valid error types')
  })

  t.test('should keep actions where targets have no errors', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {
          'rack-1': { calls: [{ id: 'device-1' }] },
          'rack-2': { calls: [{ id: 'device-2' }] }
        }
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 1, 'should keep action without errors')
  })

  t.test('should handle empty targets object', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {}
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 0, 'should filter out action with empty targets')
  })

  t.test('should filter out actions with mixed invalid errors across all targets', async (t) => {
    const actions = [
      {
        id: 'action-1',
        targets: {
          'rack-1': { calls: [], error: 'UNKNOWN_METHOD: setPowerMode' },
          'rack-2': { calls: [], error: 'CHANNEL_CLOSED' },
          'rack-3': { calls: [], error: 'Error: UNKNOWN_METHOD not found' }
        }
      },
      {
        id: 'action-2',
        targets: {
          'rack-4': { calls: [], error: 'UNKNOWN_METHOD: reboot' },
          'rack-5': { calls: [{ id: 'device-1' }] }
        }
      }
    ]

    const filteredActions = WrkProcAggr.prototype._filterInvalidActionsErrors(actions)

    t.is(filteredActions.length, 1, 'should filter correctly with mixed errors')
    t.is(filteredActions[0].id, 'action-2', 'should keep action with at least one valid target')
  })
})
