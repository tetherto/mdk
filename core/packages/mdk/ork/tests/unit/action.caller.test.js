'use strict'

const test = require('brittle')
const ActionCaller = require('../../workers/lib/action.caller')
const { ACTION_TYPES } = require('../../workers/lib/constants')

// Mock NetFacility - we'll bypass instanceof checks in tests
class MockNetFacility {
  constructor () {
    this.jRequestCalls = []
  }

  async jRequest (publicKey, method, params, opts) {
    this.jRequestCalls.push({ publicKey, method, params, opts })
    return { calls: [], reqVotes: 1 }
  }
}

// Mock Hyperbee - we'll bypass instanceof checks in tests
class MockHyperbee {
  constructor (data = {}) {
    this.data = data
  }

  async get (key) {
    if (this.data[key]) {
      return { value: Buffer.from(JSON.stringify(this.data[key])) }
    }
    return null
  }

  createReadStream () {
    const entries = Object.entries(this.data).map(([key, value]) => ({
      key,
      value: Buffer.from(JSON.stringify(value))
    }))
    return entries
  }
}

// Helper to create ActionCaller bypassing instanceof checks
function createActionCaller (net, racks, callTargetsLimit, orkInstance, orkActionsConfig, configsDb, actionConfigResolvers) {
  const caller = Object.create(ActionCaller.prototype)
  caller._net = net
  caller._racks = racks
  caller._orkInstance = orkInstance || null
  caller._orkActionsConfig = orkActionsConfig || {}
  caller._configsDb = configsDb || null
  caller._actionConfigResolvers = actionConfigResolvers || {}
  caller.rackActions = new Set([ACTION_TYPES.REGISTER_THING, ACTION_TYPES.UPDATE_THING, ACTION_TYPES.FORGET_THINGS, ACTION_TYPES.RACK_REBOOT])
  caller.orkActions = new Set([ACTION_TYPES.REGISTER_CONFIG, ACTION_TYPES.UPDATE_CONFIG, ACTION_TYPES.DELETE_CONFIG])
  caller._callTargetsLimit = callTargetsLimit || 50
  return caller
}

const enabledOrkConfig = {
  registerConfig: { enabled: true, reqVotes: 2, requiredPerms: ['pool'], approvalPerms: ['pool'] }
}

test('ActionCaller constructor', async (t) => {
  t.test('should create instance with valid parameters', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)
    t.ok(caller, 'should create instance')
    t.is(caller._net, net, 'should store net')
    t.is(caller._racks, racks, 'should store racks')
  })

  t.test('should accept callTargetsLimit parameter', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks, 100)
    t.is(caller._callTargetsLimit, 100, 'should set callTargetsLimit')
  })

  t.test('should have rackActions set', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)
    t.ok(caller.rackActions.has(ACTION_TYPES.REGISTER_THING), 'should include REGISTER_THING')
    t.ok(caller.rackActions.has(ACTION_TYPES.UPDATE_THING), 'should include UPDATE_THING')
    t.ok(caller.rackActions.has(ACTION_TYPES.FORGET_THINGS), 'should include FORGET_THINGS')
    t.ok(caller.rackActions.has(ACTION_TYPES.RACK_REBOOT), 'should include RACK_REBOOT')
  })
})

test('ActionCaller getWriteCalls', async (t) => {
  t.test('should throw error for invalid query', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      await caller.getWriteCalls(null, 'action', [], [])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_QUERY_INVALID', 'should throw correct error')
    }

    try {
      await caller.getWriteCalls('invalid', 'action', [], [])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_QUERY_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error for invalid action', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      await caller.getWriteCalls({}, null, [], [])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ACTION_INVALID', 'should throw correct error')
    }

    try {
      await caller.getWriteCalls({}, 123, [], [])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ACTION_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error for invalid params', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      await caller.getWriteCalls({}, 'action', null, [])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_PARAMS_INVALID', 'should throw correct error')
    }
  })

  t.test('should return empty targets for empty racks', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    const result = await caller.getWriteCalls({}, 'action', [], [])
    t.ok(result.targets, 'should have targets')
    t.ok(Array.isArray(result.requiredPerms), 'should have requiredPerms array')
    t.is(Object.keys(result.targets).length, 0, 'should have no targets')
  })

  t.test('should handle invalid mongo query', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      await caller.getWriteCalls({ $invalid: 'query' }, 'action', [], [])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_QUERY_INVALID', 'should throw correct error')
    }
  })

  t.test('should return ork targets for enabled ORK action', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks, 50, null, enabledOrkConfig, null, {})
    const r = await caller.getWriteCalls({}, ACTION_TYPES.REGISTER_CONFIG, [{ x: 1 }], ['pool:w'])
    t.ok(r.targets.ork.isOrkAction)
    t.is(r.targets.ork.reqVotes, 2)
    t.ok(Array.isArray(r.requiredPerms))
  })

  t.test('should reject disabled ORK action', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks, 50, null, {
      registerConfig: { enabled: false, requiredPerms: ['pool'] }
    }, null, {})

    try {
      await caller.getWriteCalls({}, ACTION_TYPES.REGISTER_CONFIG, [{}], ['pool:w'])
      t.fail('should throw')
    } catch (err) {
      t.is(err.message, 'ERR_ORK_ACTION_NOT_ALLOWED')
    }
  })

  t.test('should reject ORK action when permissions insufficient', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks, 50, null, enabledOrkConfig, null, {})

    try {
      await caller.getWriteCalls({}, ACTION_TYPES.REGISTER_CONFIG, [{}], ['miner:r'])
      t.fail('should throw')
    } catch (err) {
      t.is(err.message, 'ERR_PERMISSION_DENIED')
    }
  })

  t.test('should collect rack targets from getWriteCalls RPC', async (t) => {
    const net = new MockNetFacility()
    net.jRequest = async () => ({ calls: [{ id: 't1', tags: ['x'] }], reqVotes: 3 })
    const racks = new MockHyperbee({
      r1: { id: 'r1', type: 'miner-s19', info: { rpcPublicKey: 'ab' } }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, null, {})
    const r = await caller.getWriteCalls({}, 'reboot', [[]], ['miner:w'])
    t.ok(r.targets.r1)
    t.is(r.targets.r1.reqVotes, 3)
    t.is(r.requiredPerms.length, 1)
  })

  t.test('should record rack error when getWriteCalls RPC fails', async (t) => {
    const net = new MockNetFacility()
    net.jRequest = async () => {
      throw new Error('rpc down')
    }
    const racks = new MockHyperbee({
      r1: { id: 'r1', type: 'miner-s19', info: { rpcPublicKey: 'ab' } }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, null, {})
    const r = await caller.getWriteCalls({}, 'reboot', [[]], ['miner:w'])
    t.is(r.targets.r1.error, 'rpc down')
    t.is(r.targets.r1.calls.length, 0)
  })

  t.test('should only target matching rack for UPDATE_THING', async (t) => {
    const net = new MockNetFacility()
    net.jRequest = async (publicKey, method, params, opts) => {
      net.jRequestCalls.push({ publicKey, method, params, opts })
      return { calls: [{ id: 't1', tags: [] }], reqVotes: 1 }
    }
    const racks = new MockHyperbee({
      r1: { id: 'r1', type: 'miner-s19', info: { rpcPublicKey: 'a1' } },
      r2: { id: 'r2', type: 'miner-s19', info: { rpcPublicKey: 'a2' } }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, null, {})
    const r = await caller.getWriteCalls(
      {},
      ACTION_TYPES.UPDATE_THING,
      [{ rackId: 'r1', id: 'thing-1' }],
      ['miner:w']
    )
    t.ok(r.targets.r1)
    t.absent(r.targets.r2, 'other rack skipped when rackId differs')
    t.is(net.jRequestCalls.length, 1)
  })

  t.test('should call all permitted racks for RACK_REBOOT', async (t) => {
    const net = new MockNetFacility()
    net.jRequest = async (publicKey, method, params, opts) => {
      net.jRequestCalls.push({ publicKey, method, params, opts })
      return { calls: [{ id: 'r1', tags: [] }], reqVotes: 1 }
    }
    const racks = new MockHyperbee({
      r1: { id: 'r1', type: 'miner-s19', info: { rpcPublicKey: 'a1' } },
      r2: { id: 'r2', type: 'miner-s19', info: { rpcPublicKey: 'a2' } }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, null, {})
    const r = await caller.getWriteCalls({}, ACTION_TYPES.RACK_REBOOT, [[]], ['miner:w'])
    t.ok(r.targets.r1 && r.targets.r2)
    t.is(net.jRequestCalls.length, 2)
  })
})

test('ActionCaller _validateRackAction', async (t) => {
  t.test('should not throw for RACK_REBOOT', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      caller._validateRackAction(ACTION_TYPES.RACK_REBOOT, [])
      t.pass('should not throw')
    } catch (err) {
      t.fail('should not throw error')
    }
  })

  t.test('should throw for missing rackId', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      caller._validateRackAction(ACTION_TYPES.REGISTER_THING, [{}])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ACTION_INVALID_MISSING_RACKID', 'should throw correct error')
    }
  })

  t.test('should throw for UPDATE_THING missing id', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      caller._validateRackAction(ACTION_TYPES.UPDATE_THING, [{ rackId: 'rack1' }])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ACTION_INVALID_MISSING_ID', 'should throw correct error')
    }
  })

  t.test('should throw for FORGET_THINGS missing query.id', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      caller._validateRackAction(ACTION_TYPES.FORGET_THINGS, [{ rackId: 'rack1', query: {} }])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ACTION_INVALID_QUERY_ID', 'should throw correct error')
    }
  })

  t.test('should not throw for valid UPDATE_THING', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      caller._validateRackAction(ACTION_TYPES.UPDATE_THING, [{ rackId: 'rack1', id: 'thing1' }])
      t.pass('should not throw')
    } catch (err) {
      t.fail('should not throw error')
    }
  })

  t.test('should not throw for valid FORGET_THINGS', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    try {
      caller._validateRackAction(ACTION_TYPES.FORGET_THINGS, [{ rackId: 'rack1', query: { id: 'thing1' } }])
      t.pass('should not throw')
    } catch (err) {
      t.fail('should not throw error')
    }
  })
})

test('ActionCaller callTargets', async (t) => {
  t.test('should call targets with correct parameters', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      rack1: {
        id: 'rack1',
        info: { rpcPublicKey: 'key1' }
      }
    })
    const caller = createActionCaller(net, racks)

    const targets = {
      rack1: {
        calls: [
          { id: 'thing1', tags: ['tag1'] },
          { id: 'thing2', tags: ['tag2'] }
        ]
      }
    }

    await caller.callTargets('action', ['param1', 'param2'], targets)

    t.is(net.jRequestCalls.length, 2, 'should make 2 calls')
    t.is(net.jRequestCalls[0].method, 'queryThing', 'should use queryThing method')
    t.is(net.jRequestCalls[0].params.id, 'thing1', 'should pass correct thing id')
    t.is(net.jRequestCalls[0].params.method, 'action', 'should pass correct action')
  })

  t.test('should handle errors in calls', async (t) => {
    const net = new MockNetFacility()
    net.jRequest = async () => {
      throw new Error('Network error')
    }
    const racks = new MockHyperbee({
      rack1: {
        id: 'rack1',
        info: { rpcPublicKey: 'key1' }
      }
    })
    const caller = createActionCaller(net, racks)

    const targets = {
      rack1: {
        calls: [{ id: 'thing1', tags: ['tag1'] }]
      }
    }

    await caller.callTargets('action', ['param1'], targets)

    t.is(targets.rack1.calls[0].error, 'Network error', 'should set error on call')
  })

  t.test('should handle empty targets', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks)

    await caller.callTargets('action', ['param1'], {})

    t.is(net.jRequestCalls.length, 0, 'should make no calls')
  })

  t.test('should invoke ork instance method for ORK-level action', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const ork = {
      async registerConfig (payload) {
        return { ok: true, id: payload.id }
      }
    }
    const caller = createActionCaller(net, racks, 50, ork, enabledOrkConfig, null, {})
    const targets = {
      ork: {
        reqVotes: 2,
        calls: [{ id: 'ork', tags: [] }],
        isOrkAction: true,
        approvalPerms: ['pool:w']
      }
    }

    await caller.callTargets(ACTION_TYPES.REGISTER_CONFIG, [{ id: 'cfg-1' }], targets)

    t.is(targets.ork.calls[0].result.ok, true)
    t.is(targets.ork.calls[0].result.id, 'cfg-1')
  })

  t.test('should record error when ork method throws', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const ork = {
      async updateConfig () {
        throw new Error('ork failed')
      }
    }
    const caller = createActionCaller(net, racks, 50, ork, {
      updateConfig: { enabled: true, requiredPerms: ['pool:w'] }
    }, null, {})
    const targets = {
      ork: {
        reqVotes: 1,
        calls: [{ id: 'ork', tags: [] }],
        isOrkAction: true,
        approvalPerms: []
      }
    }

    await caller.callTargets(ACTION_TYPES.UPDATE_CONFIG, [{}], targets)

    t.is(targets.ork.calls[0].error, 'ork failed')
  })

  t.test('should throw when ork instance is missing for ORK action', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks, 50, null, enabledOrkConfig, null, {})
    const targets = {
      ork: {
        reqVotes: 1,
        calls: [{ id: 'ork', tags: [] }],
        isOrkAction: true,
        approvalPerms: []
      }
    }

    try {
      await caller.callTargets(ACTION_TYPES.REGISTER_CONFIG, [{}], targets)
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_ORK_INSTANCE_NOT_SET')
    }
  })

  t.test('should throw when ork method is missing', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const ork = {}
    const caller = createActionCaller(net, racks, 50, ork, enabledOrkConfig, null, {})
    const targets = {
      ork: {
        reqVotes: 1,
        calls: [{ id: 'ork', tags: [] }],
        isOrkAction: true,
        approvalPerms: []
      }
    }

    try {
      await caller.callTargets(ACTION_TYPES.REGISTER_CONFIG, [{}], targets)
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_ORK_METHOD_NOT_FOUND')
    }
  })
})

// Default action config resolvers for testing
// Config is passed as-is to the device worker which handles transformation
const testActionConfigResolvers = {
  setupPools: {
    configIdParam: 'poolConfigId',
    configType: 'pool'
  }
}

test('ActionCaller _resolveActionConfig', async (t) => {
  t.test('should return null if no resolver configured for action', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, {})

    const result = await caller._resolveActionConfig('unknownAction', { someParam: 'value' })

    t.is(result, null, 'should return null for unconfigured action')
  })

  t.test('should return null if configIdParam not in params', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    const result = await caller._resolveActionConfig('setupPools', { otherParam: 'value' })

    t.is(result, null, 'should return null when config ID param is missing')
  })

  t.test('should throw error if configsDb is not available', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const caller = createActionCaller(net, racks, 50, null, {}, null, testActionConfigResolvers)

    try {
      await caller._resolveActionConfig('setupPools', { poolConfigId: 'config-123' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIGS_DB_NOT_AVAILABLE', 'should throw correct error')
    }
  })

  t.test('should throw error if config not found', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    try {
      await caller._resolveActionConfig('setupPools', { poolConfigId: 'non-existent-config' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_NOT_FOUND', 'should throw correct error')
    }
  })

  t.test('should throw error if config status is not approved', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const configsDb = new MockHyperbee({
      'pool:config-123': {
        id: 'config-123',
        poolConfigName: 'Test Pool',
        status: 'pending',
        poolUrls: [
          { url: 'stratum://pool1.example.com:3333', workerName: 'worker1', workerPassword: 'pass1', pool: 'pool1' }
        ]
      }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    try {
      await caller._resolveActionConfig('setupPools', { poolConfigId: 'config-123' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_NOT_APPROVED', 'should throw correct error')
    }
  })

  t.test('should return full config object for device worker to transform', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const configsDb = new MockHyperbee({
      'pool:config-123': {
        id: 'config-123',
        poolConfigName: 'Test Pool',
        status: 'approved',
        poolUrls: [
          { url: 'stratum://pool1.example.com:3333', workerName: 'worker1', workerPassword: 'pass1', pool: 'pool1' },
          { url: 'stratum://pool2.example.com:3333', workerName: 'worker2', workerPassword: 'pass2', pool: 'pool2' }
        ]
      }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    const result = await caller._resolveActionConfig('setupPools', { poolConfigId: 'config-123' })

    t.ok(Array.isArray(result), 'should return an array')
    t.is(result.length, 1, 'should have 1 element')
    t.ok(result[0].config, 'first element should have config object')
    t.is(result[0].config.id, 'config-123', 'should have correct config id')
    t.is(result[0].config.poolConfigName, 'Test Pool', 'should have config name')
    t.is(result[0].config.poolUrls.length, 2, 'should have poolUrls array')
    t.is(result[0].config.poolUrls[0].url, 'stratum://pool1.example.com:3333', 'should have original url')
    t.is(result[0].config.poolUrls[0].workerName, 'worker1', 'should have original workerName (not transformed)')
  })

  t.test('should work with custom action config resolvers', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee()
    const configsDb = new MockHyperbee({
      'firmware:fw-456': {
        id: 'fw-456',
        firmwareName: 'Test Firmware',
        status: 'approved',
        files: [
          { filename: 'firmware.bin', checksum: 'abc123', size: 1024 },
          { filename: 'config.txt', checksum: 'def456', size: 512 }
        ]
      }
    })

    // Custom resolver for a hypothetical updateFirmware action
    const customResolvers = {
      updateFirmware: {
        configIdParam: 'firmwareConfigId',
        configType: 'firmware'
      }
    }

    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, customResolvers)

    const result = await caller._resolveActionConfig('updateFirmware', { firmwareConfigId: 'fw-456' })

    t.ok(Array.isArray(result), 'should return an array')
    t.ok(result[0].config, 'should have config object')
    t.is(result[0].config.id, 'fw-456', 'should have correct config id')
    t.is(result[0].config.firmwareName, 'Test Firmware', 'should have firmware name')
    t.is(result[0].config.files.length, 2, 'should have files array')
  })
})

test('ActionCaller _callThing with config resolution', async (t) => {
  t.test('should resolve config and pass full config object to target', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      'miner-rack1': {
        id: 'miner-rack1',
        info: { rpcPublicKey: 'rpc-key-123' }
      }
    })
    const configsDb = new MockHyperbee({
      'pool:pool-config-456': {
        id: 'pool-config-456',
        poolConfigName: 'Mining Pool Config',
        status: 'approved',
        poolUrls: [
          { url: 'stratum://f2pool.com:3333', workerName: 'account.worker', workerPassword: 'x', pool: 'f2pool' },
          { url: 'stratum://antpool.com:3333', workerName: 'account2.worker', workerPassword: 'y', pool: 'antpool' }
        ]
      }
    })
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    await caller._callThing('miner-rack1', 'miner-uuid-1', ACTION_TYPES.SETUP_POOLS, [{ poolConfigId: 'pool-config-456' }])

    t.is(net.jRequestCalls.length, 1, 'should make 1 call')
    t.is(net.jRequestCalls[0].method, 'queryThing', 'should use queryThing method')
    t.is(net.jRequestCalls[0].params.id, 'miner-uuid-1', 'should pass correct miner id')
    t.is(net.jRequestCalls[0].params.method, ACTION_TYPES.SETUP_POOLS, 'should pass setupPools method')

    const resolvedParams = net.jRequestCalls[0].params.params
    t.ok(Array.isArray(resolvedParams), 'params should be an array')
    t.is(resolvedParams.length, 1, 'params should have 1 element')
    t.ok(resolvedParams[0].config, 'first param should have config object')
    t.is(resolvedParams[0].config.id, 'pool-config-456', 'should have config id')
    t.is(resolvedParams[0].config.poolConfigName, 'Mining Pool Config', 'should have config name')
    t.is(resolvedParams[0].config.poolUrls.length, 2, 'should have 2 pools in config')
    t.is(resolvedParams[0].config.poolUrls[0].url, 'stratum://f2pool.com:3333', 'should have original pool url')
    t.is(resolvedParams[0].config.poolUrls[0].workerName, 'account.worker', 'should have original workerName (device worker transforms)')
  })

  t.test('should pass params directly if no configIdParam in params', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      'miner-rack1': {
        id: 'miner-rack1',
        info: { rpcPublicKey: 'rpc-key-123' }
      }
    })
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    const directPools = [
      { url: 'stratum://direct.pool.com:3333', worker_name: 'direct_worker', worker_password: 'abc' }
    ]

    await caller._callThing('miner-rack1', 'miner-uuid-1', ACTION_TYPES.SETUP_POOLS, [directPools])

    t.is(net.jRequestCalls.length, 1, 'should make 1 call')
    const resolvedParams = net.jRequestCalls[0].params.params
    t.is(resolvedParams[0], directPools, 'should pass pools directly without transformation')
  })

  t.test('should handle actions without resolver normally', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      'miner-rack1': {
        id: 'miner-rack1',
        info: { rpcPublicKey: 'rpc-key-123' }
      }
    })
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    await caller._callThing('miner-rack1', 'miner-uuid-1', ACTION_TYPES.REBOOT, ['normal', 'params'])

    t.is(net.jRequestCalls.length, 1, 'should make 1 call')
    t.is(net.jRequestCalls[0].params.method, ACTION_TYPES.REBOOT, 'should pass reboot method')
    const resolvedParams = net.jRequestCalls[0].params.params
    t.alike(resolvedParams, ['normal', 'params'], 'should pass params unchanged')
  })

  t.test('should throw error if config not found', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      'miner-rack1': {
        id: 'miner-rack1',
        info: { rpcPublicKey: 'rpc-key-123' }
      }
    })
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    try {
      await caller._callThing('miner-rack1', 'miner-uuid-1', ACTION_TYPES.SETUP_POOLS, [{ poolConfigId: 'non-existent' }])
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_NOT_FOUND', 'should throw correct error')
    }
  })

  t.test('should handle action with empty params object', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      'miner-rack1': {
        id: 'miner-rack1',
        info: { rpcPublicKey: 'rpc-key-123' }
      }
    })
    const configsDb = new MockHyperbee({})
    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, testActionConfigResolvers)

    // Empty params object - no poolConfigId
    await caller._callThing('miner-rack1', 'miner-uuid-1', ACTION_TYPES.SETUP_POOLS, [{}])

    t.is(net.jRequestCalls.length, 1, 'should make 1 call')
    const resolvedParams = net.jRequestCalls[0].params.params
    t.alike(resolvedParams, [{}], 'should pass empty object as-is')
  })

  t.test('should work with custom resolvers for different actions', async (t) => {
    const net = new MockNetFacility()
    const racks = new MockHyperbee({
      'container-rack1': {
        id: 'container-rack1',
        info: { rpcPublicKey: 'rpc-key-789' }
      }
    })
    const configsDb = new MockHyperbee({
      'temperature:temp-config-1': {
        id: 'temp-config-1',
        name: 'Summer Settings',
        status: 'approved',
        settings: [
          { zone: 'inlet', targetTemp: 25, maxTemp: 30 },
          { zone: 'outlet', targetTemp: 35, maxTemp: 45 }
        ]
      }
    })

    const customResolvers = {
      setTemperatureSettings: {
        configIdParam: 'tempConfigId',
        configType: 'temperature'
      }
    }

    const caller = createActionCaller(net, racks, 50, null, {}, configsDb, customResolvers)

    await caller._callThing('container-rack1', 'container-uuid-1', 'setTemperatureSettings', [{ tempConfigId: 'temp-config-1' }])

    t.is(net.jRequestCalls.length, 1, 'should make 1 call')
    const resolvedParams = net.jRequestCalls[0].params.params
    t.ok(resolvedParams[0].config, 'should have config object')
    t.is(resolvedParams[0].config.id, 'temp-config-1', 'should have config id')
    t.is(resolvedParams[0].config.name, 'Summer Settings', 'should have config name')
    t.is(resolvedParams[0].config.settings.length, 2, 'should have 2 temperature settings')
    t.is(resolvedParams[0].config.settings[0].zone, 'inlet', 'should have original zone (device worker transforms)')
    t.is(resolvedParams[0].config.settings[0].targetTemp, 25, 'should have original targetTemp')
  })
})
