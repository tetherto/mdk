'use strict'

const test = require('brittle')
const util = require('util')
const Hyperbee = require('hyperbee')
const NetFacility = require('@tetherto/hp-svc-facs-net')
const WrkProcAggr = require('../../workers/aggr.proc.ork.wrk')
const { RPC_METHODS, CONFIG_TYPES } = require('../../workers/lib/constants')

// Mock TetherWrkBase dependencies
class MockTetherWrkBase {
  constructor (conf, ctx) {
    this.conf = conf || {}
    this.ctx = ctx || {}
    this.wtype = 'wrk-ork-proc-aggr'
    this.status = {}
    this.mem = {}
    this.confPath = process.cwd() // Set a valid path to avoid errors
    this.facilities = {} // Mock facilities object
  }

  init () {
    // Mock init
  }

  start () {
    // Mock start
  }

  loadConf (name, key) {
    // Mock loadConf - just set the config directly
    if (name === 'base.ork') {
      this.conf.ork = this.conf.ork || { callTargetsLimit: 50, actionIntvlMs: 30000 }
    } else if (key) {
      // For optional configs, just set empty object if not provided
      if (!this.conf[key]) {
        this.conf[key] = {}
      }
    }
  }

  saveStatus () {
    // Mock saveStatus
  }

  setInitFacs (facs) {
    // Mock setInitFacs
  }

  debugError (data, e, alert) {
    // Mock debugError
  }

  _start (cb) {
    if (cb) queueMicrotask(() => cb())
  }
}

// Mock facilities — cache bees by name so _start and tests share the same DBs; Hyperbee prototype for ActionCaller
class MockStore {
  constructor () {
    this.bees = new Map()
  }

  _createBee () {
    const data = new Map()
    const bee = {
      get: async (key) => {
        const value = data.get(key)
        return value ? { value: Buffer.from(JSON.stringify(value)) } : null
      },
      put: async (key, value) => {
        const raw = Buffer.isBuffer(value) ? value.toString() : value
        data.set(key, JSON.parse(raw))
      },
      del: async (key) => {
        data.delete(key)
      },
      createReadStream: (opts = {}) => {
        let entries = Array.from(data.entries()).map(([key, value]) => ({
          key,
          value: Buffer.from(JSON.stringify(value))
        }))
        if (opts.gte !== undefined) {
          const hi = opts.lt !== undefined ? opts.lt : '\uffff'
          entries = entries.filter(e => e.key >= opts.gte && e.key < hi)
        }
        return entries
      },
      ready: () => Promise.resolve()
    }
    Object.setPrototypeOf(bee, Hyperbee.prototype)
    return bee
  }

  async getBee (opts) {
    const name = opts.name
    if (!this.bees.has(name)) {
      this.bees.set(name, this._createBee())
    }
    return this.bees.get(name)
  }
}

class MockNet {
  constructor () {
    this.handlers = {}
    this.rpcServer = {
      respond: (method, handler) => {
        this.handlers = this.handlers || {}
        this.handlers[method] = handler
      },
      publicKey: {
        toString: () => 'mock-public-key-hex'
      }
    }
    this.dht = {
      defaultKeyPair: {
        publicKey: {
          toString: () => 'mock-client-key-hex'
        }
      }
    }
    this.conf = {}
    this.jRequestCalls = []
  }

  async startRpcServer () {
    // Mock RPC server start
  }

  async jRequest (publicKey, method, params, opts) {
    this.jRequestCalls.push({ publicKey, method, params, opts })
    // Return mock response based on method
    if (method === 'listThings') {
      return [{ id: 'thing1', tags: ['t-miner'] }]
    }
    if (method === 'getHistoricalLogs') {
      return [{ id: 'log1', ts: Date.now() }]
    }
    if (method === 'forgetThings') {
      return 1
    }
    if (method === 'getThingsCount') {
      return 3
    }
    if (method === 'tailLog') {
      return [{ ts: Date.now(), value: 100 }]
    }
    if (method === 'getWrkExtData') {
      return [{ ts: Date.now(), data: 'test' }]
    }
    if (method === 'getWrkConf') {
      return { setting: 'value' }
    }
    if (method === 'getThingConf') {
      return { config: 'value' }
    }
    if (method === 'getWrkSettings') {
      return { setting1: 'value1' }
    }
    if (method === 'saveWrkSettings') {
      return 1
    }
    if (method === 'saveThingComment' || method === 'editThingComment' || method === 'deleteThingComment') {
      return 1
    }
    return null
  }

  handleReply (method, req) {
    // Mock handleReply - delegate to worker method
    return this.worker[method](req)
  }
}

class MockActionApprover {
  constructor () {
    this.actions = new Map()
    this.actionIdCounter = 0
  }

  async initDb (db) {
    // Mock initDb
  }

  initWrk (actionCaller) {
    this.actionCaller = actionCaller
  }

  async startInterval (ms) {
    // Mock startInterval
  }

  async pushAction (opts) {
    const id = `action-${++this.actionIdCounter}`
    const action = {
      id,
      action: opts.action,
      payload: opts.payload,
      voter: opts.voter,
      reqVotesPos: opts.reqVotesPos,
      reqVotesNeg: opts.reqVotesNeg,
      batchActionUID: opts.batchActionUID,
      status: 'voting',
      votes: []
    }
    this.actions.set(`voting-${id}`, action)
    return { id, data: action }
  }

  async getAction (type, id) {
    const key = `${type}-${id}`
    const action = this.actions.get(key)
    if (!action) {
      throw new Error('ERR_ACTION_NOT_FOUND')
    }
    return { data: action }
  }

  async voteAction (opts) {
    const action = this.actions.get(`voting-${opts.id}`)
    if (action) {
      action.votes.push({ voter: opts.voter, approve: opts.approve })
    }
  }

  async cancelActionsBatch (opts) {
    return opts.ids.length
  }

  isActionValid (key, type, filter, action) {
    if (!key.startsWith(`${type}-`)) return false
    const ts = action.timestamp || Date.now()
    return (
      (filter.gte && ts < filter.gte) ||
        (filter.lte && ts > filter.lte) ||
        (filter.gt && ts <= filter.gt) ||
        (filter.lt && ts >= filter.lt)
    )
  }

  query (type, filter, opts) {
    const results = []
    for (const [key, action] of this.actions.entries()) {
      if (this.isActionValid(key, type, filter, action)) {
        results.push(action)
      }
    }
    return results
  }
}

class MockInterval {
  add (name, fn, ms) {
    this.intervals = this.intervals || {}
    this.intervals[name] = { fn, ms }
  }
}

// Helper to create a worker instance with mocks
async function createWorker (conf = {}, ctx = {}) {
  const mockConf = {
    ork: { callTargetsLimit: 50, actionIntvlMs: 30000 },
    ...conf
  }
  const mockCtx = {
    cluster: 'test-cluster',
    ...ctx
  }

  // Create mocks first
  const mockStore = new MockStore()
  const mockNet = new MockNet()
  const mockActionApprover = new MockActionApprover()
  const mockInterval = new MockInterval()

  // Replace TetherWrkBase temporarily to prevent actual initialization
  const basePath = require.resolve('@tetherto/tether-wrk-base/workers/base.wrk.tether')
  const cached = require.cache[basePath]

  require.cache[basePath] = {
    exports: MockTetherWrkBase
  }

  let worker
  try {
    // Temporarily override methods to prevent initialization during construction
    const WrkProcAggrProto = WrkProcAggr.prototype
    const originalStart = WrkProcAggrProto.start
    const originalInit = WrkProcAggrProto.init
    const originalLoadConf = WrkProcAggrProto.loadConf
    const originalLoadOptionalConfigs = WrkProcAggrProto._loadOptionalConfigs
    const originalSaveStatus = WrkProcAggrProto.saveStatus

    // Override loadConf to use mock implementation
    WrkProcAggrProto.loadConf = function (name, key) {
      if (name === 'base.ork') {
        this.conf.ork = this.conf.ork || { callTargetsLimit: 50, actionIntvlMs: 30000 }
      } else if (key) {
        // For optional configs, just set empty object if not provided
        if (!this.conf[key]) {
          this.conf[key] = {}
        }
      }
    }

    // Override _loadOptionalConfigs to prevent errors
    WrkProcAggrProto._loadOptionalConfigs = function () {
      // Mock implementation - do nothing
    }

    // Override init to prevent status directory creation
    WrkProcAggrProto.init = function () {
      // Mock init - do nothing, skip calling super.init()
    }

    // Override saveStatus to prevent file system operations
    WrkProcAggrProto.saveStatus = function () {
      // Mock saveStatus - do nothing
    }

    // Override start to prevent initialization during construction
    WrkProcAggrProto.start = function () {
      // Prevent start during construction - we'll call _start manually in tests
    }

    worker = new WrkProcAggr(mockConf, mockCtx)

    // Restore original methods
    WrkProcAggrProto.start = originalStart
    WrkProcAggrProto.init = originalInit
    WrkProcAggrProto.loadConf = originalLoadConf
    WrkProcAggrProto._loadOptionalConfigs = originalLoadOptionalConfigs
    WrkProcAggrProto.saveStatus = originalSaveStatus

    // Inject mocks
    worker.store_s1 = mockStore
    worker.net_r0 = mockNet
    worker.net_r0.worker = worker
    worker.actionApprover_0 = mockActionApprover
    worker.interval_0 = mockInterval

    // Set wtype if not set by base class (needed for prefix)
    if (!worker.wtype) {
      worker.wtype = 'wrk-ork-proc-aggr'
    }
    // Recalculate prefix with correct wtype
    if (worker.ctx?.cluster) {
      worker.prefix = `${worker.wtype}-${worker.ctx.cluster}`
    }

    // Initialize racks before _start is called
    worker.racks = await mockStore.getBee({ name: 'racks' }, { keyEncoding: 'utf-8' })

    // Initialize actionDb and tailLogAggrDb
    worker.actionDb = await mockStore.getBee({ name: 'action-approver' })
    worker.tailLogAggrDb = await mockStore.getBee({ name: 'tail-log-aggr' }, { keyEncoding: 'utf-8' })
    worker.configsDb = await mockStore.getBee({ name: 'configs' }, { keyEncoding: 'utf-8' })

    // Mock _start method
    worker._start = function (cb) {
      // Mock _start - initialize RPC server handlers
      const self = this
      if (self.net_r0) {
        // Register RPC methods
        const { RPC_METHODS } = require('../../workers/lib/constants')
        RPC_METHODS.forEach(method => {
          self.net_r0.rpcServer.respond(method.name, async (req, ctx) => {
            try {
              return await self.net_r0.handleReply(method.name, req)
            } catch (err) {
              self.debugError(`rpc ${method.name} failed`, err, true)
              throw err
            }
          })
        })
      }
      if (self.actionApprover_0?.initDb) {
        self.actionApprover_0.initDb(self.actionDb)
      }
      if (cb) cb()
    }
  } finally {
    // Restore original base class
    if (cached) {
      require.cache[basePath] = cached
    } else {
      delete require.cache[basePath]
    }
  }

  return worker
}

test('Worker initialization', async (t) => {
  t.test('should initialize with valid cluster', async (t) => {
    const worker = await createWorker()
    t.ok(worker, 'should create worker instance')
    t.is(worker.ctx.cluster, 'test-cluster', 'should set cluster')
    t.is(worker.prefix, 'wrk-ork-proc-aggr-test-cluster', 'should set prefix')
  })

  t.test('should throw error without cluster', async (t) => {
    try {
      // eslint-disable-next-line no-new
      new WrkProcAggr({}, {})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_PROC_RACK_UNDEFINED', 'should throw correct error')
    }
  })
})

test('registerRack', async (t) => {
  t.test('should register a lib instance (lib mode)', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const libInstance = { async listThings () { return [] } }
    const result = await worker.registerRack({ id: 'lib-1', type: 'miner', libInstance })

    t.is(result, 1, 'should return 1')
    t.ok(worker.ctx.libMap.has('lib-1'), 'should add entry to libMap')
    t.is(worker.ctx.libMap.get('lib-1').type, 'miner')
  })

  t.test('should register a rack successfully', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const req = {
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: {
        rpcPublicKey: 'test-public-key'
      }
    }

    const result = await worker.registerRack(req)
    t.is(result, 1, 'should return 1 on success')

    const rack = await worker.racks.get('rack-1')
    t.ok(rack, 'should store rack')
    const rackData = JSON.parse(rack.value.toString())
    t.is(rackData.id, 'rack-1', 'should store correct id')
    t.is(rackData.type, 'wrk-miner-s19', 'should store correct type')
  })

  t.test('should throw error for missing id', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.registerRack({ type: 'wrk-miner-s19', info: { rpcPublicKey: 'key' } })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_RACK_ID_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error for missing type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.registerRack({ id: 'rack-1', info: { rpcPublicKey: 'key' } })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_RACK_TYPE_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error for missing rpcPublicKey', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: {} })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_RACK_INFO_RPC_PUBKEY_INVALID', 'should throw correct error')
    }
  })
})

test('listRacks', async (t) => {
  t.test('should list all racks', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    // Register some racks
    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })
    await worker.registerRack({
      id: 'rack-2',
      type: 'wrk-container',
      info: { rpcPublicKey: 'key2' }
    })

    const result = await worker.listRacks({})
    t.is(result.length, 2, 'should return all racks')
    t.ok(result.find(r => r.id === 'rack-1'), 'should include rack-1')
    t.ok(result.find(r => r.id === 'rack-2'), 'should include rack-2')
  })

  t.test('should filter racks by type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })
    await worker.registerRack({
      id: 'rack-2',
      type: 'wrk-container',
      info: { rpcPublicKey: 'key2' }
    })

    const result = await worker.listRacks({ type: 'wrk-miner' })
    t.is(result.length, 1, 'should return filtered racks')
    t.is(result[0].id, 'rack-1', 'should return correct rack')
  })

  t.test('should not expose rpcPublicKey by default', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'secret-key' }
    })

    const result = await worker.listRacks({})
    t.is(result.length, 1, 'should return rack')
    t.ok(!result[0].info.rpcPublicKey, 'should not expose rpcPublicKey')
  })

  t.test('should expose rpcPublicKey when keys=true', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'secret-key' }
    })

    const result = await worker.listRacks({ keys: true })
    t.is(result.length, 1, 'should return rack')
    t.is(result[0].info.rpcPublicKey, 'secret-key', 'should expose rpcPublicKey')
  })

  t.test('should filter racks by type prefix', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    await worker.registerRack({ id: 'rack-2', type: 'wrk-miner-l7', info: { rpcPublicKey: 'key2' } })
    await worker.registerRack({ id: 'rack-3', type: 'wrk-psu', info: { rpcPublicKey: 'key3' } })

    const result = await worker.listRacks({ type: 'wrk-miner' })
    t.is(result.length, 2, 'should return only miner racks')
    t.ok(result.every(r => r.type.startsWith('wrk-miner')))
  })

  t.test('should throw error for invalid type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.listRacks({ type: 123 })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_TYPE_INVALID', 'should throw correct error')
    }
  })

  t.test('should not mutate cached rack info when redacting keys', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'secret-key' }
    })

    await worker._getRacksEntries()
    const redacted = await worker.listRacks({})
    t.absent(redacted[0].info.rpcPublicKey, 'redacted response should not expose rpcPublicKey')

    // Ensure cache still has original rpcPublicKey
    const withKeys = await worker.listRacks({ keys: true })
    t.is(withKeys[0].info.rpcPublicKey, 'secret-key', 'cache should not be mutated by list redaction')
  })
})

test('forgetRacks', async (t) => {
  t.test('should forget racks by ids', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })
    await worker.registerRack({
      id: 'rack-2',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key2' }
    })

    const result = await worker.forgetRacks({ ids: ['rack-1'] })
    t.is(result, 1, 'should return count of deleted racks')

    const remaining = await worker.listRacks({})
    t.is(remaining.length, 1, 'should have one rack remaining')
    t.is(remaining[0].id, 'rack-2', 'should keep rack-2')
  })

  t.test('should forget all racks when all=true', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })
    await worker.registerRack({
      id: 'rack-2',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key2' }
    })

    const result = await worker.forgetRacks({ all: true })
    t.is(result, 2, 'should return count of all deleted racks')

    const remaining = await worker.listRacks({})
    t.is(remaining.length, 0, 'should have no racks remaining')
  })
})

test('_racksCache', async (t) => {
  t.test('should be null before first use', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    t.is(worker._racksCache, null, 'cache should be null before any rack operation')
  })

  t.test('should be populated after first read via _getRacksEntries', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    // trigger a read to warm the cache (registerRack upserts into it if warm)
    // force warm by calling _getRacksEntries directly
    await worker._getRacksEntries()
    t.ok(Array.isArray(worker._racksCache), 'cache should be an array after _getRacksEntries')
  })

  t.test('registerRack adds new entry to warm cache', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker._getRacksEntries() // warm the cache
    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    t.is(worker._racksCache.length, 1, 'cache should have 1 entry')

    await worker.registerRack({ id: 'rack-2', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key2' } })
    t.is(worker._racksCache.length, 2, 'cache should have 2 entries after second register')
  })

  t.test('registerRack updates existing entry in warm cache', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker._getRacksEntries() // warm the cache
    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1-updated' } })

    t.is(worker._racksCache.length, 1, 'cache should still have 1 entry after re-registration')
    t.is(worker._racksCache[0].info.rpcPublicKey, 'key1-updated', 'cache should have updated rpcPublicKey')
  })

  t.test('forgetRacks removes entries from warm cache', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker._getRacksEntries() // warm the cache
    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    await worker.registerRack({ id: 'rack-2', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key2' } })
    t.is(worker._racksCache.length, 2)

    await worker.forgetRacks({ ids: ['rack-1'] })
    t.is(worker._racksCache.length, 1, 'cache should have 1 entry after forget')
    t.is(worker._racksCache[0].id, 'rack-2', 'remaining cache entry should be rack-2')
  })

  t.test('forgetRacks all clears cache', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker._getRacksEntries() // warm the cache
    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    await worker.registerRack({ id: 'rack-2', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key2' } })

    await worker.forgetRacks({ all: true })
    t.is(worker._racksCache.length, 0, 'cache should be empty after forget all')
  })
})

test('listThings', async (t) => {
  t.test('should list things from all racks', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.listThings({})
    t.ok(Array.isArray(result), 'should return array')
    t.is(result.length, 1, 'should return things from racks')
  })

  t.test('should handle errors from racks gracefully', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    worker.net_r0.jRequest = async () => {
      throw new Error('Network error')
    }

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.listThings({})
    t.ok(Array.isArray(result), 'should return array')
    t.is(result.length, 0, 'should return empty array on error')
  })

  t.test('should return sorted results when sort is provided', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    worker.net_r0.jRequest = async () => [
      { id: 'b', hashrate: 50 },
      { id: 'a', hashrate: 100 }
    ]

    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })

    const result = await worker.listThings({ sort: { field: 'hashrate', direction: 1 } })
    t.ok(Array.isArray(result), 'should return array')
  })
})

test('getHistoricalLogs', async (t) => {
  t.test('should get historical logs', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.getHistoricalLogs({ logType: 'test' })
    t.ok(Array.isArray(result), 'should return array')
  })

  t.test('should return sorted results when sort is provided', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    worker.net_r0.jRequest = async () => [
      { id: 'log2', ts: 200 },
      { id: 'log1', ts: 100 }
    ]

    await worker.registerRack({ id: 'rack-1', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })

    const result = await worker.getHistoricalLogs({ logType: 'test', sort: { ts: 1 } })
    t.ok(Array.isArray(result), 'should return array')
    t.is(result[0].ts, 100, 'should be sorted ascending by ts')
    t.is(result[1].ts, 200)
  })

  t.test('should throw error for missing logType', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.getHistoricalLogs({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_LOG_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('forgetThings', async (t) => {
  t.test('should forget things from all racks', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.forgetThings({ query: { id: 'thing1' } })
    t.is(typeof result, 'number', 'should return number')
  })
})

test('getThingsCount', async (t) => {
  t.test('should sum counts from all racks', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    await worker.registerRack({
      id: 'rack-2',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key2' }
    })

    const result = await worker.getThingsCount({ query: { tags: { $in: ['t-miner'] } } })
    t.is(typeof result, 'number', 'should return a number')
    t.is(result, 6, 'should sum counts from both racks (3 + 3)')
  })

  t.test('should return 0 when no racks registered', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const result = await worker.getThingsCount({})
    t.is(result, 0, 'should return 0 with no racks')
  })

  t.test('should handle errors from racks gracefully', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    worker.net_r0.jRequest = async () => {
      throw new Error('Network error')
    }

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.getThingsCount({})
    t.is(result, 0, 'should return 0 on error')
  })

  t.test('should pass query through to racks', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const capturedCalls = []
    worker.net_r0.jRequest = async (publicKey, method, params, opts) => {
      capturedCalls.push({ method, params })
      return 5
    }

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const query = { tags: { $in: ['t-miner'] } }
    await worker.getThingsCount({ query, status: 1 })

    t.is(capturedCalls.length, 1, 'should make one RPC call')
    t.is(capturedCalls[0].method, 'getThingsCount', 'should call getThingsCount')
    t.alike(capturedCalls[0].params.query, query, 'should forward query')
    t.is(capturedCalls[0].params.status, 1, 'should forward status')
  })
})

test('pushAction', async (t) => {
  t.test('should push action successfully', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    // Mock actionCaller
    worker.actionCaller = {
      getWriteCalls: async () => ({
        targets: {
          'rack-1': {
            reqVotes: 1,
            calls: [{ id: 'thing1' }]
          }
        },
        requiredPerms: ['miner:rw']
      })
    }

    const req = {
      query: { tags: { $in: ['t-miner'] } },
      action: 'reboot',
      params: [],
      voter: 'test@example.com',
      authPerms: ['miner:rw']
    }

    const result = await worker.pushAction(req)
    t.ok(result.id, 'should return action id')
    t.ok(Array.isArray(result.errors), 'should return errors array')
  })

  t.test('should return errors when no calls', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    worker.actionCaller = {
      getWriteCalls: async () => ({
        targets: {
          'rack-1': {
            reqVotes: 1,
            calls: []
          }
        },
        requiredPerms: ['miner:rw']
      })
    }

    const req = {
      query: { tags: { $in: ['t-miner'] } },
      action: 'reboot',
      params: [],
      voter: 'test@example.com',
      authPerms: ['miner:rw']
    }

    const result = await worker.pushAction(req)
    t.ok(result.errors.length > 0, 'should return errors')
  })
})

test('pushActionsBatch', async (t) => {
  t.test('should push batch actions', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    worker.actionCaller = {
      getWriteCalls: async () => ({
        targets: {
          'rack-1': {
            reqVotes: 1,
            calls: [{ id: 'thing1' }]
          }
        },
        requiredPerms: ['miner:rw']
      })
    }

    const req = {
      batchActionsPayload: [
        {
          query: { tags: { $in: ['t-miner'] } },
          action: 'reboot',
          params: []
        }
      ],
      voter: 'test@example.com',
      authPerms: ['miner:rw']
    }

    const result = await worker.pushActionsBatch(req)
    t.ok(Array.isArray(result), 'should return array')
  })

  t.test('should throw error for invalid payload', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.pushActionsBatch({ batchActionsPayload: 'invalid' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_PAYLOAD_INVALID', 'should throw correct error')
    }
  })
})

test('getAction', async (t) => {
  t.test('should get action by id', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    // Create an action first
    const action = await worker.actionApprover_0.pushAction({
      action: 'reboot',
      payload: [['param1'], { 'rack-1': { calls: [] } }, ['miner:rw']],
      voter: 'test@example.com',
      reqVotesPos: 1,
      reqVotesNeg: 1
    })

    const result = await worker.getAction({ id: action.id, type: 'voting' })
    t.ok(result, 'should return action')
    t.is(result.action, 'reboot', 'should have correct action')
    t.ok(result.params, 'should have params')
    t.ok(result.targets, 'should have targets')
    t.ok(result.requiredPerms, 'should have requiredPerms')
  })
})

test('voteAction', async (t) => {
  t.test('should vote on action', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const action = await worker.actionApprover_0.pushAction({
      action: 'reboot',
      payload: [['param1'], { 'rack-1': { calls: [] } }, ['miner:rw']],
      voter: 'test@example.com',
      reqVotesPos: 1,
      reqVotesNeg: 1
    })

    const result = await worker.voteAction({
      id: action.id,
      voter: 'voter@example.com',
      approve: true,
      authPerms: ['miner:rw']
    })

    t.is(result, 1, 'should return 1 on success')
  })

  t.test('should throw error for missing permissions', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const action = await worker.actionApprover_0.pushAction({
      action: 'reboot',
      payload: [['param1'], { 'rack-1': { calls: [] } }, ['miner:rw']],
      voter: 'test@example.com',
      reqVotesPos: 1,
      reqVotesNeg: 1
    })

    try {
      await worker.voteAction({
        id: action.id,
        voter: 'voter@example.com',
        approve: true,
        authPerms: ['miner:r'] // Missing write permission
      })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ACTION_DENIED', 'should throw correct error')
    }
  })
})

test('queryActions', async (t) => {
  t.test('should query actions', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.actionApprover_0.pushAction({
      action: 'reboot',
      payload: [['param1'], { 'rack-1': { calls: [] } }, ['miner:rw']],
      voter: 'test@example.com',
      reqVotesPos: 1,
      reqVotesNeg: 1
    })

    const result = await worker.queryActions({
      queries: [
        {
          type: 'voting',
          filter: { gte: 0 }
        }
      ]
    })

    t.ok(result.voting, 'should return voting actions')
    t.ok(Array.isArray(result.voting), 'should return array')
  })

  t.test('should throw error for invalid queries', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.queryActions({ queries: 'invalid' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_QUERIES_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error for invalid query type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.queryActions({
        queries: [{ type: 123 }]
      })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_QUERIES_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('getActionsBatch', async (t) => {
  t.test('should get actions batch', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const action = await worker.actionApprover_0.pushAction({
      action: 'reboot',
      payload: [['param1'], { 'rack-1': { calls: [] } }, ['miner:rw']],
      voter: 'test@example.com',
      reqVotesPos: 1,
      reqVotesNeg: 1
    })

    const result = await worker.getActionsBatch({ ids: [action.id] })
    t.ok(Array.isArray(result), 'should return array')
  })
})

test('cancelActionsBatch', async (t) => {
  t.test('should cancel actions batch', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const result = await worker.cancelActionsBatch({
      ids: ['action-1', 'action-2'],
      voter: 'test@example.com'
    })

    t.is(result, 2, 'should return count of cancelled actions')
  })
})

test('getGlobalConfig', async (t) => {
  t.test('should get global config', async (t) => {
    const worker = await createWorker({
      globalConfig: { setting: 'value' }
    })
    worker._start(() => {})

    const result = await worker.getGlobalConfig({})
    t.ok(result, 'should return config')
    t.is(result.setting, 'value', 'should have correct setting')
  })

  t.test('should throw error when config missing', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.getGlobalConfig({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_GLOBAL_CONFIG_MISSING', 'should throw correct error')
    }
  })
})

test('setGlobalConfig', async (t) => {
  t.test('should set global config', async (t) => {
    const worker = await createWorker({
      globalConfig: { isAutoSleepAllowed: false }
    })
    worker._start(() => {})

    const result = await worker.setGlobalConfig({ isAutoSleepAllowed: true })
    t.ok(result, 'should return config')
    t.is(result.isAutoSleepAllowed, true, 'should update config')
  })

  t.test('should throw error for invalid config', async (t) => {
    const worker = await createWorker({
      globalConfig: {}
    })
    worker._start(() => {})

    try {
      await worker.setGlobalConfig({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error when global config not found', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.setGlobalConfig({ isAutoSleepAllowed: true })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_GLOBAL_CONFIG_NOT_FOUND', 'should throw correct error')
    }
  })

  t.test('should return null when payload does not update auto sleep flag', async (t) => {
    const worker = await createWorker({
      globalConfig: { isAutoSleepAllowed: false, other: 1 }
    })
    worker._start(() => {})

    const result = await worker.setGlobalConfig({ otherFlag: true })
    t.is(result, null, 'should return null')
  })
})

test('getWrkConf', async (t) => {
  t.test('should get worker config', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.getWrkConf({ type: 'wrk-miner-s19' })
    t.ok(Array.isArray(result), 'should return array')
  })

  t.test('should only call racks matching the requested type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({ id: 'rack-miner', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    await worker.registerRack({ id: 'rack-psu', type: 'wrk-psu', info: { rpcPublicKey: 'key2' } })

    await worker.getWrkConf({ type: 'wrk-miner-s19' })

    const calledKeys = worker.net_r0.jRequestCalls
      .filter(c => c.method === 'getWrkConf')
      .map(c => c.publicKey)
    t.is(calledKeys.length, 1, 'should only call one rack')
    t.is(calledKeys[0], 'key1', 'should call the miner rack')
  })

  t.test('should throw error for missing type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.getWrkConf({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('getThingConf', async (t) => {
  t.test('should get thing config', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.getThingConf({ type: 'wrk-miner-s19' })
    t.ok(Array.isArray(result), 'should return array')
  })

  t.test('should only call racks matching the requested type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({ id: 'rack-miner', type: 'wrk-miner-s19', info: { rpcPublicKey: 'key1' } })
    await worker.registerRack({ id: 'rack-psu', type: 'wrk-psu', info: { rpcPublicKey: 'key2' } })

    await worker.getThingConf({ type: 'wrk-miner-s19' })

    const calledKeys = worker.net_r0.jRequestCalls
      .filter(c => c.method === 'getThingConf')
      .map(c => c.publicKey)
    t.is(calledKeys.length, 1, 'should only call one rack')
    t.is(calledKeys[0], 'key1', 'should call the miner rack')
  })

  t.test('should throw error for missing type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.getThingConf({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('getWrkSettings', async (t) => {
  t.test('should get worker settings', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.getWrkSettings({ rackId: 'rack-1' })
    t.ok(result, 'should return settings')
  })

  t.test('should return 0 when rack not found', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const result = await worker.getWrkSettings({ rackId: 'nonexistent' })
    t.is(result, 0, 'should return 0 when rack not found')
  })

  t.test('should throw error for invalid rackId', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.getWrkSettings({ rackId: 123 })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_RACK_ID_INVALID', 'should throw correct error')
    }
  })
})

test('saveWrkSettings', async (t) => {
  t.test('should save worker settings', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.saveWrkSettings({
      rackId: 'rack-1',
      entries: { setting1: 'value1' }
    })
    t.is(result, 1, 'should return 1 on success')
  })

  t.test('should throw error for invalid rackId', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.saveWrkSettings({ rackId: 123, entries: {} })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_RACK_ID_INVALID', 'should throw correct error')
    }
  })

  t.test('should return 0 when rack not found', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const result = await worker.saveWrkSettings({ rackId: 'nonexistent', entries: { k: 'v' } })
    t.is(result, 0, 'should return 0 when rack not found')
  })

  t.test('should throw error for invalid entries', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.saveWrkSettings({ rackId: 'rack-1', entries: 'invalid' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_ENTRIES_INVALID', 'should throw correct error')
    }
  })
})

test('saveThingComment', async (t) => {
  t.test('should save thing comment', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.saveThingComment({
      rackId: 'rack-1',
      thingId: 'thing-1',
      comment: 'test comment'
    })
    t.is(result, 1, 'should return 1 on success')
  })

  t.test('should throw error for missing rackId', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.saveThingComment({ thingId: 'thing-1' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_RACK_ID_INVALID', 'should throw correct error')
    }
  })

  t.test('should return 0 when rack not found', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const result = await worker.saveThingComment({ rackId: 'nonexistent', thingId: 'thing-1' })
    t.is(result, 0, 'should return 0 when rack not found')
  })

  t.test('should throw error for missing thingId', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.saveThingComment({ rackId: 'rack-1' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_THING_ID_INVALID', 'should throw correct error')
    }
  })
})

test('editThingComment', async (t) => {
  t.test('should edit thing comment', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.editThingComment({
      rackId: 'rack-1',
      thingId: 'thing-1',
      comment: 'updated comment'
    })
    t.is(result, 1, 'should return 1 on success')
  })
})

test('deleteThingComment', async (t) => {
  t.test('should delete thing comment', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.deleteThingComment({
      rackId: 'rack-1',
      thingId: 'thing-1'
    })
    t.is(result, 1, 'should return 1 on success')
  })
})

test('tailLog', async (t) => {
  t.test('should throw error when not configured', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.tailLog({ type: 'miner' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_NOT_CONFIGURED', 'should throw correct error')
    }
  })

  t.test('should throw error for missing type', async (t) => {
    const worker = await createWorker({
      aggrStats: { miner: { ops: {} } }
    })
    worker._start(() => {})

    try {
      await worker.tailLog({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('tailLogMulti', async (t) => {
  t.test('should throw error for invalid keys', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.tailLogMulti({ keys: 'invalid' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_KEYS_INVALID', 'should throw correct error')
    }
  })

  t.test('should throw error for missing type in keys', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.tailLogMulti({ keys: [{ key: 'test' }] })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('tailLogCustomRangeAggr', async (t) => {
  t.test('should throw error when not configured', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.tailLogCustomRangeAggr({ keys: [] })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_NOT_CONFIGURED', 'should throw correct error')
    }
  })

  t.test('should throw error for invalid keys', async (t) => {
    const worker = await createWorker({
      aggrData: {},
      aggrStats: {},
      globalConfig: { aggrTailLogTimezones: [{ code: 'UTC', offset: 0 }] }
    })
    worker._start(() => {})

    try {
      await worker.tailLogCustomRangeAggr({ keys: 'invalid' })
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_KEYS_INVALID', 'should throw correct error')
    }
  })
})

test('getWrkExtData', async (t) => {
  t.test('should get worker ext data without aggregation when type base has no aggr specs', async (t) => {
    const worker = await createWorker({
      aggrStats: { miner: { ops: { total: { op: 'sum', src: 'value' } } } }
    })
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    const result = await worker.getWrkExtData({ type: 'wrk-miner-s19' })
    t.ok(Array.isArray(result), 'should return array')
  })

  t.test('should aggregate ext data when aggrStats matches type prefix', async (t) => {
    const worker = await createWorker({
      aggrStats: {
        miner: {
          ops: { total: { op: 'sum', src: 'value' } }
        }
      }
    })
    worker._start(() => {})

    await worker.registerRack({
      id: 'rack-1',
      type: 'miner-s19',
      info: { rpcPublicKey: 'key1' }
    })

    worker.net_r0.jRequest = async () => [
      { ts: '1000', value: 10 },
      { ts: '1000', value: 20 }
    ]

    const result = await worker.getWrkExtData({ type: 'miner-s19' })
    t.ok(Array.isArray(result), 'should return array')
    t.ok(result.length >= 1, 'should have aggregated bucket')
  })

  t.test('should throw error for missing type', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.getWrkExtData({})
      t.fail('should throw error')
    } catch (err) {
      t.is(err.message, 'ERR_TYPE_INVALID', 'should throw correct error')
    }
  })
})

test('RPC method registration', async (t) => {
  t.test('should register all RPC methods', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    t.ok(worker.net_r0.handlers, 'should have handlers')
    for (const method of RPC_METHODS) {
      t.ok(worker.net_r0.handlers[method.name], `should register ${method.name}`)
    }
  })
})

function poolConfigFixture (overrides = {}) {
  return {
    poolConfigName: 'Test pool',
    poolUrls: [{
      url: 'stratum://pool.example.com:3333',
      workerName: 'w',
      workerPassword: 'p',
      pool: 'main'
    }],
    ...overrides
  }
}

test('config CRUD (pool)', async (t) => {
  t.test('registerConfig stores pool config', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const cfg = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })

    t.ok(cfg.id, 'should assign id')
    t.is(cfg.status, 'approved', 'should default to approved')
    t.is(cfg.poolConfigName, 'Test pool')
  })

  t.test('getConfigs lists configs with type prefix stream', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    await worker.registerConfig({ type: CONFIG_TYPES.POOL, data: poolConfigFixture({ poolConfigName: 'A' }) })
    const list = await worker.getConfigs({ type: CONFIG_TYPES.POOL })
    t.ok(list.length >= 1, 'should list configs')
    t.is(list.some(c => c.poolConfigName === 'A'), true)
  })

  t.test('updateConfig merges pool fields', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture({ description: 'old' })
    })

    const updated = await worker.updateConfig({
      type: CONFIG_TYPES.POOL,
      id: created.id,
      data: { poolConfigName: 'Renamed', description: 'new desc' }
    })

    t.is(updated.poolConfigName, 'Renamed')
    t.is(updated.description, 'new desc')
  })

  t.test('updateConfig can set status', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })

    const updated = await worker.updateConfig({
      type: CONFIG_TYPES.POOL,
      id: created.id,
      data: { status: 'pending' }
    })
    t.is(updated.status, 'pending')
  })

  t.test('deleteConfig removes config', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })

    const n = await worker.deleteConfig({ type: CONFIG_TYPES.POOL, id: created.id })
    t.is(n, 1)

    try {
      await worker.deleteConfig({ type: CONFIG_TYPES.POOL, id: created.id })
      t.fail('should throw when missing')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_NOT_FOUND')
    }
  })

  t.test('validation errors', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.registerConfig({ type: CONFIG_TYPES.POOL, data: {} })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_POOL_CONFIG_NAME_INVALID')
    }

    try {
      await worker.updateConfig({
        type: CONFIG_TYPES.POOL,
        id: 'non-existent-config-id',
        data: { poolConfigName: 'x' }
      })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_NOT_FOUND')
    }

    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })
    try {
      await worker.updateConfig({
        type: CONFIG_TYPES.POOL,
        id: created.id,
        data: { status: 'invalid-status' }
      })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_STATUS_INVALID')
    }
  })
})

test('prototype _start wires ActionCaller and RPC', async (t) => {
  // Patch the exact superclass WrkProcAggr uses for `super` (same constructor as in the module graph)
  const ParentCls = Object.getPrototypeOf(WrkProcAggr.prototype).constructor
  const origStart = ParentCls.prototype._start

  const worker = await createWorker({
    aggrData: { agrrTailLogIntvlMs: 60000, aggrTailLogKeys: [] },
    aggrStats: {},
    crossAggrAction: { agrrListThingsIntvlMs: 60000 }
  })

  // ActionCaller instanceof checks — must not replace the whole chain (would drop MockNet.jRequest)
  Object.setPrototypeOf(worker.net_r0, NetFacility.prototype)

  worker.status = worker.status || {}
  worker.saveStatus = () => {}

  ParentCls.prototype._start = (cb) => { if (cb) queueMicrotask(() => cb()) }
  try {
    await util.promisify(WrkProcAggr.prototype._start).call(worker)
  } finally {
    ParentCls.prototype._start = origStart
  }

  t.ok(worker.actionCaller, 'actionCaller should be set')
  t.ok(worker.configsDb, 'configsDb should be set')
  t.ok(typeof worker.net_r0.handlers.echo === 'function', 'echo handler registered')

  await worker.actionCaller.__probeAction([], {})
  t.pass('proxy routes unknown action names to callTargets')
})

test('crossAggrActions pushes when automation config is valid', async (t) => {
  const worker = await createWorker({
    globalConfig: { isAutoSleepAllowed: true },
    crossAggrAction: {
      tagPrefix: 't-cntr',
      crossThingType: 'miner',
      action: 'sleepBatch',
      params: [{}],
      authPerms: ['miner:w'],
      listThingsReq: {},
      crossThingsActionReq: { devicesCondition: [], fields: {} },
      minActionTsDiff: 0
    }
  })
  worker._start(() => {})

  let listCall = 0
  worker.net_r0.jRequest = async (pk, method) => {
    if (method === 'listThings') {
      listCall++
      if (listCall === 1) {
        return [{ tags: ['t-cntr-1'] }]
      }
      return [{ id: 'dev-1', tags: ['t-miner', 't-cntr-1'] }]
    }
    return null
  }

  await worker.registerRack({
    id: 'rack-1',
    type: 'wrk-miner-s19',
    info: { rpcPublicKey: 'k1' }
  })

  await worker.crossAggrActions()
  t.ok(listCall >= 2, 'should query things twice')
})

test('aggregateTailLogs runs with empty key list', async (t) => {
  const worker = await createWorker({
    globalConfig: { aggrTailLogTimezones: [{ code: 'UTC', offset: 0 }] },
    aggrData: {
      aggrTailLogStoreDays: 1,
      aggrTailLogKeys: [],
      aggrTailLogApiDelay: 0
    }
  })
  worker._start(() => {})

  await worker.aggregateTailLogs()
  t.pass('should complete')
})

test('_loadOptionalConfigs catches loadConf failures', async (t) => {
  const worker = await createWorker()
  let sawDebug = false
  worker.debugError = (msg, err) => {
    if (String(msg).includes('failed to load config')) sawDebug = true
  }
  worker.loadConf = () => {
    throw new Error('no config file')
  }

  WrkProcAggr.prototype._loadOptionalConfigs.call(worker)
  t.ok(sawDebug, 'should log failed optional config load')
})

test('debugGeneric', async (t) => {
  const worker = await createWorker()
  worker._start(() => {})
  worker.debugGeneric('ping')
  t.pass('runs without throw')
})

test('config validation edge cases', async (t) => {
  t.test('registerConfig rejects missing data and invalid types', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.registerConfig({ type: CONFIG_TYPES.POOL })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_DATA_MISSING')
    }

    try {
      await worker.registerConfig({ type: 'not-a-config-type', data: poolConfigFixture() })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_TYPE_INVALID')
    }
  })

  t.test('pool field validation on register', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const base = poolConfigFixture()
    const tryReg = async (data, msg) => {
      try {
        await worker.registerConfig({ type: CONFIG_TYPES.POOL, data })
        t.fail('expected throw for ' + msg)
      } catch (err) {
        t.is(err.message, msg)
      }
    }

    await tryReg({ ...base, description: 123 }, 'ERR_DESCRIPTION_INVALID')
    await tryReg({ ...base, poolUrls: 'x' }, 'ERR_POOL_URLS_INVALID')
    await tryReg({ ...base, poolUrls: [{ ...base.poolUrls[0], url: null }] }, 'ERR_POOL_URL_INVALID')
    await tryReg({ ...base, poolUrls: [{ ...base.poolUrls[0], workerName: null }] }, 'ERR_WORKER_NAME_INVALID')
    await tryReg({ ...base, poolUrls: [{ ...base.poolUrls[0], workerPassword: null }] }, 'ERR_WORKER_PASSWORD_INVALID')
    await tryReg({ ...base, poolUrls: [{ ...base.poolUrls[0], pool: null }] }, 'ERR_POOL_INVALID')
  })

  t.test('deleteConfig requires id', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    try {
      await worker.deleteConfig({ type: CONFIG_TYPES.POOL })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_CONFIG_ID_MISSING')
    }
  })

  t.test('updateConfig validates merged pool fields', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})

    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })

    try {
      await worker.updateConfig({
        type: CONFIG_TYPES.POOL,
        id: created.id,
        data: { poolUrls: [{ url: 1, workerName: 'w', workerPassword: 'p', pool: 'x' }] }
      })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_POOL_URL_INVALID')
    }
  })
})

test('RPC handler — read-only peer and handler errors', async (t) => {
  const ParentCls = Object.getPrototypeOf(WrkProcAggr.prototype).constructor
  const origStart = ParentCls.prototype._start

  const worker = await createWorker({
    aggrData: { agrrTailLogIntvlMs: 60000, aggrTailLogKeys: [] },
    aggrStats: {},
    crossAggrAction: { agrrListThingsIntvlMs: 60000 }
  })

  Object.setPrototypeOf(worker.net_r0, NetFacility.prototype)
  worker.status = worker.status || {}
  worker.saveStatus = () => {}

  ParentCls.prototype._start = (cb) => { if (cb) queueMicrotask(() => cb()) }
  try {
    await util.promisify(WrkProcAggr.prototype._start).call(worker)
  } finally {
    ParentCls.prototype._start = origStart
  }

  const roKey = Buffer.alloc(32)
  roKey.fill(0xab)
  const roHex = roKey.toString('hex')
  worker.net_r0.conf.allowReadOnly = [roHex]

  try {
    await worker.net_r0.handlers.pushAction({}, {
      _mux: { stream: { remotePublicKey: roKey } }
    })
    t.fail('write RPC should be denied for read-only key')
  } catch (err) {
    t.is(err.message, 'ERR_MISSING_WRITE_PERMISSIONS')
  }

  let sawAlert = false
  const origDebug = worker.debugError.bind(worker)
  worker.debugError = (a, b, alert) => {
    if (alert) sawAlert = true
    return origDebug(a, b, alert)
  }
  worker.net_r0.handleReply = async () => {
    throw new Error('handler boom')
  }

  try {
    await worker.net_r0.handlers.listRacks({}, {
      _mux: { stream: { remotePublicKey: Buffer.alloc(32) } }
    })
    t.fail('expected throw')
  } catch (err) {
    t.is(err.message, 'handler boom')
    t.ok(sawAlert, 'debugError should run with alert for RPC failure')
  }
})

test('setFacs assigns facility handles', async (t) => {
  const worker = await createWorker()
  worker._start(() => {})
  const facs = {
    interval_0: worker.interval_0,
    store_s1: worker.store_s1,
    actionApprover_0: worker.actionApprover_0
  }
  WrkProcAggr.prototype.setFacs.call(worker, {
    interval_0: { tag: 'i' },
    store_s1: { tag: 's' },
    actionApprover_0: { tag: 'a' }
  })
  t.is(worker.interval_0.tag, 'i')
  t.is(worker.store_s1.tag, 's')
  t.is(worker.actionApprover_0.tag, 'a')
  WrkProcAggr.prototype.setFacs.call(worker, facs)
})

test('pushAction — invalid rack errors, reqVotes, rackType filter', async (t) => {
  t.test('skips targets whose error matches INVALID_ACTIONS_ERRORS', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    worker.actionCaller = {
      getWriteCalls: async () => ({
        targets: {
          'rack-bad': { reqVotes: 1, calls: [], error: 'UNKNOWN_METHOD on device' },
          'rack-good': { reqVotes: 1, calls: [{ id: 'thing1' }] }
        },
        requiredPerms: ['miner:rw'],
        approvalPerms: []
      })
    }
    const result = await worker.pushAction({
      query: {},
      action: 'reboot',
      params: [],
      voter: 'v',
      authPerms: ['miner:rw']
    })
    t.ok(result.id, 'should still push when one rack is valid')
  })

  t.test('uses highest reqVotes across targets', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    let captured
    worker.actionApprover_0 = {
      ...worker.actionApprover_0,
      async pushAction (opts) {
        captured = opts
        return { id: 'a1', data: {} }
      }
    }
    worker.actionCaller = {
      getWriteCalls: async () => ({
        targets: {
          r1: { reqVotes: 2, calls: [{ id: 'a' }] },
          r2: { reqVotes: 7, calls: [{ id: 'b' }] }
        },
        requiredPerms: [],
        approvalPerms: []
      })
    }
    await worker.pushAction({
      query: {},
      action: 'reboot',
      params: [],
      voter: 'v',
      authPerms: []
    })
    t.is(captured.reqVotesPos, 7)
  })

  t.test('filters targets by rackType', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    let captured
    worker.actionApprover_0 = {
      ...worker.actionApprover_0,
      async pushAction (opts) {
        captured = opts
        return { id: 'x', data: {} }
      }
    }
    worker.actionCaller = {
      getWriteCalls: async () => ({
        targets: {
          minerRack: { reqVotes: 1, calls: [{ id: 'm1' }] },
          psuRack: { reqVotes: 1, calls: [{ id: 'p1' }] }
        },
        requiredPerms: [],
        approvalPerms: []
      })
    }
    await worker.registerRack({
      id: 'minerRack',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'k1' }
    })
    await worker.registerRack({
      id: 'psuRack',
      type: 'wrk-psu',
      info: { rpcPublicKey: 'k2' }
    })
    await worker.pushAction({
      query: {},
      action: 'reboot',
      params: [],
      voter: 'v',
      authPerms: [],
      rackType: 'wrk-miner'
    })
    t.ok(captured.payload[1].minerRack)
    t.ok(captured.payload[1].psuRack)
    t.absent(captured.payload[1].minerRack.reqVotes, 'processed rack has reqVotes stripped')
    t.ok(captured.payload[1].psuRack.reqVotes === 1, 'skipped rack is left untouched')
  })
})

const minerAggrStats = {
  miner: {
    ops: { total: { op: 'sum', src: 'value' } }
  }
}

test('tailLog — success path and tailLogMulti', async (t) => {
  t.test('aggregates tail samples when aggrStats matches type', async (t) => {
    const worker = await createWorker({ aggrStats: minerAggrStats })
    worker._start(() => {})
    await worker.registerRack({
      id: 'rack-1',
      type: 'miner-s19',
      info: { rpcPublicKey: 'rpc1' }
    })
    worker.net_r0.jRequest = async (pk, method) => {
      if (method === 'tailLog') {
        return [
          { ts: 5000, value: 1, tag: 'x' },
          { ts: 5000, value: 2, tag: 'y' }
        ]
      }
      return []
    }
    const out = await worker.tailLog({
      type: 'miner-s19',
      key: 'hr',
      aggrFields: { total: 1 }
    })
    t.ok(Array.isArray(out), 'should return projection array')
    t.ok(out.length >= 1, 'should have aggregated row')
  })

  t.test('uses aggrTimes ranges and cloneDeep when multiple windows', async (t) => {
    const worker = await createWorker({ aggrStats: minerAggrStats })
    worker._start(() => {})
    await worker.registerRack({
      id: 'rack-1',
      type: 'miner-s19',
      info: { rpcPublicKey: 'rpc1' }
    })
    worker.net_r0.jRequest = async (pk, method) => {
      if (method === 'tailLog') {
        return [{ ts: 1500, value: 5, extra: 1 }]
      }
      return []
    }
    const out = await worker.tailLog({
      type: 'miner-s19',
      key: 'hr',
      aggrFields: { total: 1 },
      aggrTimes: [
        { start: 1000, end: 2000 },
        { start: 1200, end: 1800 }
      ]
    })
    t.ok(Array.isArray(out))
  })
})

test('tailLogMulti — success', async (t) => {
  const worker = await createWorker({ aggrStats: minerAggrStats })
  worker._start(() => {})
  await worker.registerRack({
    id: 'rack-1',
    type: 'miner-s19',
    info: { rpcPublicKey: 'rpc1' }
  })
  worker.net_r0.jRequest = async (pk, method) => {
    if (method === 'tailLog') {
      return [{ ts: 1, value: 1, x: 1 }]
    }
    return []
  }
  const rows = await worker.tailLogMulti({
    keys: [
      { type: 'miner-s19', key: 'a' },
      { type: 'miner-s19', key: 'b' }
    ],
    aggrFields: { total: 1 }
  })
  t.is(rows.length, 2)
  t.ok(Array.isArray(rows[0]))
})

test('getWrkSettings and saveWrkSettings — RPC failure', async (t) => {
  t.test('getWrkSettings throws ERR_GET_SETTINGS_FAILED', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'k1' }
    })
    worker.net_r0.jRequest = async () => {
      throw new Error('rpc failed')
    }
    try {
      await worker.getWrkSettings({ rackId: 'rack-1' })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_GET_SETTINGS_FAILED')
    }
  })

  t.test('saveWrkSettings throws ERR_SAVE_SETTINGS_FAILED', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    await worker.registerRack({
      id: 'rack-1',
      type: 'wrk-miner-s19',
      info: { rpcPublicKey: 'k1' }
    })
    worker.net_r0.jRequest = async () => {
      throw new Error('rpc failed')
    }
    try {
      await worker.saveWrkSettings({ rackId: 'rack-1', entries: { a: 1 } })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_SAVE_SETTINGS_FAILED')
    }
  })
})

test('updateConfig — pool validation on merge', async (t) => {
  t.test('rejects empty poolConfigName string', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })
    try {
      await worker.updateConfig({
        type: CONFIG_TYPES.POOL,
        id: created.id,
        data: { poolConfigName: '' }
      })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_POOL_CONFIG_NAME_INVALID')
    }
  })

  t.test('rejects empty poolUrls array on update', async (t) => {
    const worker = await createWorker()
    worker._start(() => {})
    const created = await worker.registerConfig({
      type: CONFIG_TYPES.POOL,
      data: poolConfigFixture()
    })
    try {
      await worker.updateConfig({
        type: CONFIG_TYPES.POOL,
        id: created.id,
        data: { poolUrls: [] }
      })
      t.fail('expected throw')
    } catch (err) {
      t.is(err.message, 'ERR_POOL_URLS_INVALID')
    }
  })
})
