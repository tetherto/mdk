'use strict'

/**
 * MDK Operation Parity Tests
 *
 * Each test maps one old Kernel RPC_METHOD or ACTION_TYPE to its MDK equivalent.
 * Source constants: miningos-wrk-kernel/workers/lib/constants.js
 *
 * The worker side is a WorkerRuntime hosting the parity-plugin fixture;
 * worker-infra operations (logs, settings, provisioning, stats, comments,
 * ext_data) are served by the runtime's service built-ins from stub services.
 *
 * Skipped operations are documented inline with a reason.
 */

const test = require('brittle')
const WorkerRuntime = require('../../../mdk-worker/lib/worker-runtime')
const { mergeBuiltinCommands } = require('../../../mdk-worker/lib/service-builtins')
const parityPlugin = require('../fixtures/parity-plugin')
const { WorkerRegistry } = require('../../lib/modules/worker-registry')
const { CommandStateMachine } = require('../../lib/modules/command-state-machine')
const { CommandDispatcher } = require('../../lib/modules/command-dispatcher')
const { TelemetryCollector } = require('../../lib/modules/telemetry-collector')
const { HealthMonitor } = require('../../lib/modules/health-monitor')
const { WorkerChannel } = require('../../lib/transport/worker-channel')
const { routeEnvelope } = require('../../lib/transport/envelope-router')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build: buildEnvelope } = require('../../lib/protocol/envelope')

const noopActionManager = {
  pushAction: async () => ({ id: null, errors: [] }),
  pushActionsBatch: async () => [],
  getAction: async () => ({}),
  getActionsBatch: async () => [],
  queryActions: async () => ({}),
  voteAction: async () => 1,
  cancelActionsBatch: async () => []
}

// ─── Helpers ──────────────────────────────────────────────────────────

function createMockStore () {
  const data = new Map()
  return {
    async get (key) { const v = data.get(key); return v ? { value: v } : null },
    async put (key, value) { data.set(key, value) },
    async del (key) { data.delete(key) },
    createReadStream () {
      const entries = [...data.entries()].map(([key, value]) => ({ key, value }))
      return (async function * () { for (const e of entries) yield e })()
    }
  }
}

// Old mock ThingManager → runtime device specs. The snap fields are served
// per-channel by the parity-plugin telemetry handlers, so `metrics` returns
// the same 13 WM fields the old collectThingSnap produced.
const DEVICES = [
  {
    deviceId: 'wm001',
    config: {
      snap: {
        hashrate_rt: 92.5,
        hashrate_avg: 90,
        power: 3200,
        temperature: 65,
        fan_speed_in: 3200,
        fan_speed_out: 3100,
        status: 'online',
        uptime: 86400,
        accepted_shares: 12000,
        rejected_shares: 42,
        pool_url: 'stratum+tcp://pool.example.com:3333',
        efficiency: 34.5,
        power_mode: 'normal'
      }
    }
  },
  {
    deviceId: 'wm002',
    config: {
      snap: { hashrate_rt: 88.0, hashrate_avg: 85, power: 3100, temperature: 62, status: 'online' }
    }
  }
]

// Stub worker-infra services: the manager methods the adapter used to call,
// keyed by the service each runtime built-in is gated on.
function createStubServices () {
  return {
    logHistory: {
      tailLog: async (req) => [{ ts: Date.now(), deviceId: req.thingId || 'wm001', msg: 'log entry', level: 'info' }],
      getHistoricalLogs: async (req) => [{ ts: Date.now() - 3600000, deviceId: req.thingId || 'wm001', msg: 'historical', level: 'info' }]
    },
    settings: {
      getSettings: async () => ({ autoReconnect: true, pollingIntervalMs: 5000 }),
      saveSettingsEntries: async (entries) => ({ saved: true, entries })
    },
    provisioning: {
      registerThing: async (params) => ({ id: 'wm003', type: 'miner-wm-m56s', ...params }),
      updateThing: async (params) => ({ ...params, updatedAt: Date.now() }),
      forgetThings: async (params) => (params.ids || []).length || 1,
      getThingConf: async () => ({ pool: 'stratum+tcp://pool.example.com:3333', workerName: 'WM001' }),
      listDevices: () => [
        { id: 'wm001', type: 'miner-wm-m56s', tags: ['whatsminer'], info: { serialNum: 'WM001' }, opts: { address: '192.168.1.10', port: 4028 } },
        { id: 'wm002', type: 'miner-wm-m56s', tags: ['whatsminer'], info: { serialNum: 'WM002' }, opts: { address: '192.168.1.11', port: 4028 } }
      ],
      listDeviceIds: () => ['wm001', 'wm002']
    },
    stats: {
      aggrStats: async (deviceIds) => ({ totalHashrate: 180.5, avgHashrate: 90.25, count: 2, deviceIds: deviceIds || [] })
    },
    comments: {
      saveThingComment: async (req) => ({ id: 'cmt-001', thingId: req.thingId, text: req.text, createdAt: Date.now() }),
      editThingComment: async (req) => ({ id: req.commentId, text: req.text, updatedAt: Date.now() }),
      deleteThingComment: async (req) => ({ deleted: 1, commentId: req.commentId })
    },
    pool: {
      getWrkExtData: async () => ({ buildVersion: '1.2.3', rackModel: 'M56S-Rack-8' })
    }
  }
}

// What the worker publishes: the plugin contract plus the built-in command
// entries the stub services enable (thing management, settings, comments).
const WM_CONTRACT = mergeBuiltinCommands(parityPlugin.contract, createStubServices())

async function createRuntime () {
  const runtime = new WorkerRuntime(parityPlugin, {
    workerId: 'wm-rack-1',
    devices: DEVICES,
    services: createStubServices()
  })
  await runtime._openContexts()
  return runtime
}

function makeInProcessChannel (runtime) {
  return { async request (envelope) { return runtime.handleRequest(envelope) } }
}

async function registeredReadyRegistry (channel) {
  const registryStore = createMockStore()
  const capStore = createMockStore()
  const registry = new WorkerRegistry({ store: registryStore, capabilityStore: capStore })
  await registry.register({
    workerId: 'wm-rack-1',
    deviceIds: ['wm001', 'wm002'],
    rpcKey: 'mock',
    channel
  })
  await registry.setReady('wm-rack-1', WM_CONTRACT)
  return { registry, registryStore, capStore }
}

/**
 * Pull telemetry from a stub WM worker via TelemetryCollector.
 * Maps old Kernel dataProxy.requestData(method, params) calls.
 */
async function telemetryPull (deviceId, query) {
  const runtime = await createRuntime()
  const channel = makeInProcessChannel(runtime)
  const { registry } = await registeredReadyRegistry(channel)
  const tc = new TelemetryCollector({ registry, workerChannel: new WorkerChannel({ timeout: 5000 }) })
  // For queries that don't need a specific device (e.g. logs_multi all-devices),
  // route via wm001 since TelemetryCollector.pull needs a resolvable deviceId to find the worker.
  return tc.pull(deviceId || 'wm001', query)
}

/**
 * Dispatch a command through CommandDispatcher → CSM → worker runtime.
 * Maps old Kernel pushAction / applyThings calls.
 * Returns: done event on SUCCESS, raw result object on REJECTED.
 */
async function commandDispatch (command, params, deviceId) {
  deviceId = deviceId || 'wm001'
  const runtime = await createRuntime()
  const channel = makeInProcessChannel(runtime)
  const { registry } = await registeredReadyRegistry(channel)
  const csm = new CommandStateMachine({
    wal: createMockStore(),
    workerChannel: new WorkerChannel({ timeout: 10000 }),
    registry,
    maxRetries: 0,
    timeoutMs: 10000
  })
  const dispatcher = new CommandDispatcher({ registry, stateMachine: csm })
  const doneP = new Promise(resolve => csm.once('command:done', resolve))
  const dispatchResult = await dispatcher.dispatch(buildEnvelope({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:parity',
    deviceId,
    payload: { command, params: params || {} }
  }))
  if (dispatchResult.status === 'REJECTED') return dispatchResult
  return doneP
}

// ─── Section 1: Telemetry Query Types ─────────────────────────────────
//
// Old Kernel dataProxy.requestData(method, params) → MDK telemetry.pull with query.type
// Reference: miningos-wrk-kernel/workers/lib/constants.js RPC_METHODS (read ops)

test('parity[telemetry] list → old listThings: all registered devices returned', async (t) => {
  const data = await telemetryPull('wm001', { type: 'list' })
  t.ok(data, 'response received')
  t.ok(data.things, 'things array present')
  t.is(data.things.length, 2, '2 devices in list')
  t.ok(data.things.find(th => th.id === 'wm001'), 'wm001 in list')
  t.ok(data.things.find(th => th.id === 'wm002'), 'wm002 in list')
  // Live status is no longer inlined in list — it comes from state.pull;
  // the provisioning-backed list carries identity/config fields only.
  t.is(data.things[0].type, 'miner-wm-m56s', 'device type included')
  t.is(data.things[0].address, '192.168.1.10', 'device address included')
})

test('parity[telemetry] count → old getThingsCount: device count per worker', async (t) => {
  const data = await telemetryPull('wm001', { type: 'count' })
  t.ok(data, 'response received')
  t.is(data.count, 2, 'count = 2 devices in this worker')
})

test('parity[telemetry] logs → old tailLog: log entries for a specific device', async (t) => {
  const data = await telemetryPull('wm001', { type: 'logs' })
  t.ok(data, 'response received')
  t.ok(Array.isArray(data.logs), 'logs is an array')
  t.is(data.logs.length, 1, 'one log entry returned')
  t.ok(data.logs[0].ts, 'log has timestamp')
  t.ok(data.logs[0].msg, 'log has message')
})

test('parity[telemetry] historical_logs → old getHistoricalLogs: range-based log retrieval', async (t) => {
  const now = Date.now()
  const data = await telemetryPull('wm001', {
    type: 'historical_logs',
    start: now - 86400000,
    end: now
  })
  t.ok(data, 'response received')
  t.ok(Array.isArray(data.logs), 'logs is an array')
  t.ok(data.logs.length > 0, 'historical logs returned')
  t.ok(data.logs[0].ts < now, 'log ts is in the past')
})

test('parity[telemetry] config → old getWrkConf: worker configuration snapshot', async (t) => {
  const data = await telemetryPull('wm001', { type: 'config' })
  t.ok(data, 'response received')
  t.ok(data.config, 'config present')
  t.is(data.config.workerId, 'wm-rack-1', 'workerId in config')
  t.ok(data.config.contract, 'contract metadata in config')
})

test('parity[telemetry] thing_config → old getThingConf: per-device configuration', async (t) => {
  const data = await telemetryPull('wm001', { type: 'thing_config' })
  t.ok(data, 'response received')
  t.ok(data.config, 'config present')
  t.ok(data.config.pool, 'pool config present')
})

test('parity[telemetry] settings → old getWrkSettings: worker settings object', async (t) => {
  const data = await telemetryPull('wm001', { type: 'settings' })
  t.ok(data, 'response received')
  t.ok(data.settings, 'settings present')
  t.ok(data.settings.autoReconnect !== undefined, 'autoReconnect setting present')
})

test('parity[telemetry] stats → old aggrStats: aggregated per-worker statistics', async (t) => {
  const data = await telemetryPull('wm001', { type: 'stats' })
  t.ok(data, 'response received')
  t.ok(data.stats, 'stats present')
  t.is(data.stats.totalHashrate, 180.5, 'totalHashrate aggregated')
  t.is(data.stats.count, 2, 'device count in stats')
})

test('parity[telemetry] ext_data → old getWrkExtData: extended worker metadata', async (t) => {
  const data = await telemetryPull('wm001', { type: 'ext_data' })
  t.ok(data, 'response received')
  t.ok(data.extData !== undefined, 'extData present')
  t.ok(data.extData.buildVersion, 'buildVersion in extData')
})

test('parity[telemetry] metrics single device → old collectThingSnap: all 13 WM fields', async (t) => {
  const data = await telemetryPull('wm001', { type: 'metrics' })
  t.ok(data, 'response received')
  t.ok(data.metrics, 'metrics present')

  // All 13 fields declared in WM contract
  t.is(data.metrics.hashrate_rt, 92.5, 'hashrate_rt')
  t.is(data.metrics.hashrate_avg, 90, 'hashrate_avg')
  t.is(data.metrics.power, 3200, 'power')
  t.is(data.metrics.temperature, 65, 'temperature')
  t.is(data.metrics.fan_speed_in, 3200, 'fan_speed_in')
  t.is(data.metrics.fan_speed_out, 3100, 'fan_speed_out')
  t.is(data.metrics.status, 'online', 'status')
  t.is(data.metrics.uptime, 86400, 'uptime')
  t.is(data.metrics.accepted_shares, 12000, 'accepted_shares')
  t.is(data.metrics.rejected_shares, 42, 'rejected_shares')
  t.ok(data.metrics.pool_url, 'pool_url')
  t.is(data.metrics.efficiency, 34.5, 'efficiency')
  t.is(data.metrics.power_mode, 'normal', 'power_mode')
})

test('parity[telemetry] metrics all devices → old pullAll fan-out across entire worker fleet', async (t) => {
  const runtime = await createRuntime()
  const channel = makeInProcessChannel(runtime)
  const { registry } = await registeredReadyRegistry(channel)

  const received = []
  const tc = new TelemetryCollector({ registry, workerChannel: new WorkerChannel({ timeout: 5000 }) })
  tc.subscribe('wm001', d => received.push({ id: 'wm001', hashrate: d.metrics?.hashrate_rt }))
  tc.subscribe('wm002', d => received.push({ id: 'wm002', hashrate: d.metrics?.hashrate_rt }))

  await tc.pullAll()

  t.is(received.length, 2, 'both devices polled via pullAll')
  t.ok(received.find(r => r.id === 'wm001' && r.hashrate === 92.5), 'wm001 metrics correct')
  t.ok(received.find(r => r.id === 'wm002' && r.hashrate === 88.0), 'wm002 metrics correct')
})

test('parity[telemetry] logs_multi → old tailLogMulti: logs from multiple devices in one request', async (t) => {
  const data = await telemetryPull('wm001', { type: 'logs_multi', deviceIds: ['wm001', 'wm002'] })
  t.ok(data, 'response received')
  t.ok(Array.isArray(data.logs), 'logs is an array')
  t.is(data.logs.length, 2, 'logs from both devices combined')
  // single-device fallback: TelemetryCollector always provides a deviceId for routing,
  // so the runtime receives deviceId='wm001' and fans to ['wm001'] when no deviceIds in query
  const dataFallback = await telemetryPull('wm001', { type: 'logs_multi' })
  t.ok(Array.isArray(dataFallback.logs), 'single-device fallback when no deviceIds in query')
  t.is(dataFallback.logs.length, 1, 'falls back to routing deviceId only')
})

// SKIPPED: tailLogCustomRangeAggr
// Reason: Cross-worker aggregation with timezone support. Moved to Gateway by design.
// Gateway calls telemetry.pull { type: 'historical_logs' } per worker and aggregates.

// ─── Section 2: Hardware Commands ─────────────────────────────────────
//
// Old Kernel ACTION_TYPES (miner actions) → MDK command.request
// Reference: miningos-wrk-kernel/workers/lib/constants.js ACTION_TYPES

test('parity[command] reboot → ACTION_TYPES.REBOOT: restarts single miner device', async (t) => {
  const done = await commandDispatch('reboot', {})
  t.is(done.state, 'SUCCESS', 'reboot succeeded')
  t.is(done.result.method, 'reboot', 'reboot handler invoked')
  t.is(done.result.applied, 1, 'applied to 1 device')
})

test('parity[command] setPowerMode → ACTION_TYPES.SET_POWER_MODE: changes miner power mode', async (t) => {
  const done = await commandDispatch('setPowerMode', { mode: 'low' })
  t.is(done.state, 'SUCCESS', 'setPowerMode succeeded')
  t.is(done.result.method, 'setPowerMode', 'correct method dispatched')
  t.alike(done.result.params, ['low'], 'mode param forwarded')
})

test('parity[command] setLED → ACTION_TYPES.SET_LED: toggles physical LED indicator', async (t) => {
  const done = await commandDispatch('setLED', { enabled: true })
  t.is(done.state, 'SUCCESS', 'setLED succeeded')
  t.is(done.result.method, 'setLED', 'correct method dispatched')
})

test('parity[command] setupPools → ACTION_TYPES.SETUP_POOLS: configures mining pool', async (t) => {
  const pools = { pool1: { url: 'stratum+tcp://pool.example.com:3333', user: 'miner1', pass: 'x' } }
  const done = await commandDispatch('setupPools', { pools })
  t.is(done.state, 'SUCCESS', 'setupPools succeeded')
  t.is(done.result.method, 'setupPools', 'correct method dispatched')
})

test('parity[command] setPowerPct — whitelisted action: sets power percentage', async (t) => {
  const done = await commandDispatch('setPowerPct', { pct: 80 })
  t.is(done.state, 'SUCCESS', 'setPowerPct succeeded')
  t.is(done.result.method, 'setPowerPct', 'correct method dispatched')
  t.alike(done.result.params, [80], 'pct value forwarded')
})

test('parity[command] setPowerPct range guard: pct > 100 rejected before reaching worker', async (t) => {
  // Old Kernel: param validation was caller-side. MDK: Kernel validates against contract on dispatch.
  const result = await commandDispatch('setPowerPct', { pct: 150 })
  t.is(result.status, 'REJECTED', 'out-of-range param rejected at dispatcher')
  t.ok(result.error.includes('ERR_PARAM_RANGE'), 'ERR_PARAM_RANGE error code')
  t.ok(result.error.includes('pct'), 'error names the bad param')
})

test('parity[command] setPowerPct range guard: pct = 0 accepted (boundary min)', async (t) => {
  const done = await commandDispatch('setPowerPct', { pct: 0 })
  t.is(done.state, 'SUCCESS', 'pct=0 is valid (min boundary)')
})

test('parity[command] setPowerPct range guard: pct = 100 accepted (boundary max)', async (t) => {
  const done = await commandDispatch('setPowerPct', { pct: 100 })
  t.is(done.state, 'SUCCESS', 'pct=100 is valid (max boundary)')
})

test('parity[command] rackReboot → ACTION_TYPES.RACK_REBOOT: restarts the entire worker rack process', async (t) => {
  // Under the runtime a worker must declare rackReboot in its contract for
  // the Kernel to accept it — the parity-plugin does (old gap-2 fix).
  const done = await commandDispatch('rackReboot', {})
  t.is(done.state, 'SUCCESS', 'rackReboot succeeded')
  t.is(done.result, 1, 'rack reboot returns success')
})

test('parity[command] downloadLogs → whitelisted action: hardware log download now in contract', async (t) => {
  // Old gap-3 fix: downloadLogs declared in the contract so Kernel accepts it
  const done = await commandDispatch('downloadLogs', {})
  t.is(done.state, 'SUCCESS', 'downloadLogs accepted — no longer rejected as unknown command')
  t.is(done.result.method, 'downloadLogs', 'runtime routes to the plugin handler')
})

// SKIPPED: container commands (switchContainer, setCoolingFanThreshold, emergencyStop, etc.)
// Reason: Container worker device type. Not applicable to Whatsminer M56S rack.

// ─── Section 3: Device Management Commands ────────────────────────────
//
// Old Kernel ACTION_TYPES (thing management) + RPC_METHODS (write ops)

test('parity[command] registerThing → ACTION_TYPES.REGISTER_THING: adds new miner to worker', async (t) => {
  const done = await commandDispatch('registerThing', {
    info: { serialNum: 'WM003', model: 'M56S' },
    opts: { address: '192.168.1.12', port: 4028 }
  })
  t.is(done.state, 'SUCCESS', 'registerThing succeeded')
  t.ok(done.result.id, 'new device id returned')
  t.is(done.result.type, 'miner-wm-m56s', 'device type correct')
})

test('parity[command] updateThing → ACTION_TYPES.UPDATE_THING: updates device metadata', async (t) => {
  const done = await commandDispatch('updateThing', {
    info: { serialNum: 'WM001-UPDATED' }
  }, 'wm001')
  t.is(done.state, 'SUCCESS', 'updateThing succeeded')
  t.ok(done.result.updatedAt, 'updatedAt set')
})

test('parity[command] forgetThings → ACTION_TYPES.FORGET_THINGS: removes devices from worker', async (t) => {
  const done = await commandDispatch('forgetThings', { ids: ['wm001'] }, 'wm001')
  t.is(done.state, 'SUCCESS', 'forgetThings succeeded')
  t.ok(done.result.removed >= 1, 'removal count returned')
})

test('parity[command] saveSettings → old saveWrkSettings: persists worker configuration', async (t) => {
  const done = await commandDispatch('saveSettings', { pollingIntervalMs: 10000 }, 'wm001')
  t.is(done.state, 'SUCCESS', 'saveSettings succeeded')
  t.ok(done.result, 'result present')
})

// ─── Section 4: Comment Commands ──────────────────────────────────────
//
// Old Kernel: COMMENT_ACTION constants → saveThingComment / editThingComment / deleteThingComment

test('parity[command] saveComment → old saveThingComment: adds annotation to device', async (t) => {
  const done = await commandDispatch('saveComment', { text: 'Check fan speed after maintenance' }, 'wm001')
  t.is(done.state, 'SUCCESS', 'saveComment succeeded')
  t.ok(done.result.id, 'comment id returned')
  t.is(done.result.text, 'Check fan speed after maintenance', 'comment text preserved')
})

test('parity[command] editComment → old editThingComment: updates existing annotation', async (t) => {
  const done = await commandDispatch('editComment', { commentId: 'cmt-001', text: 'Updated note' }, 'wm001')
  t.is(done.state, 'SUCCESS', 'editComment succeeded')
  t.is(done.result.id, 'cmt-001', 'correct comment id')
  t.is(done.result.text, 'Updated note', 'text updated')
})

test('parity[command] deleteComment → old deleteThingComment: removes annotation', async (t) => {
  const done = await commandDispatch('deleteComment', { commentId: 'cmt-001' }, 'wm001')
  t.is(done.state, 'SUCCESS', 'deleteComment succeeded')
  t.is(done.result.deleted, 1, 'deletion count returned')
  t.is(done.result.commentId, 'cmt-001', 'correct comment deleted')
})

// ─── Section 5: Registry and Listener Operations ────────────────────────
//
// Old Kernel: listRacks via envelope router → MDK: worker.list action through the
// shared router (HRPC transport mechanics covered in transport.test.js)
// Old Kernel: no capabilities endpoint → MDK: device.capabilities action (new)

test('parity[registry] worker.list via envelope router → old listRacks', async (t) => {
  const workers = [
    { workerId: 'wm-rack-1', deviceIds: ['wm001', 'wm002'], state: 'READY', healthState: 'HEALTHY' }
  ]

  const response = await routeEnvelope(buildEnvelope({
    action: ACTIONS.WORKER_LIST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:gateway:1',
    payload: {}
  }), {
    dispatcher: { async dispatch () { return {} } },
    telemetryCollector: { async pull () { return null }, async pullState () { return null } },
    registry: {
      listWorkers () { return workers },
      getCapabilities () { return WM_CONTRACT.capabilities }
    },
    actionManager: noopActionManager
  })

  t.ok(response.workers, 'workers list returned')
  t.is(response.workers.length, 1, '1 worker in registry')
  t.is(response.workers[0].workerId, 'wm-rack-1', 'correct workerId')
  t.is(response.workers[0].state, 'READY', 'state is READY')
  t.alike(response.workers[0].deviceIds, ['wm001', 'wm002'], 'device ids included')
})

test('parity[registry] device.capabilities via envelope router (new in MDK: no old equivalent)', async (t) => {
  const response = await routeEnvelope(buildEnvelope({
    action: ACTIONS.DEVICE_CAPABILITIES,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:gateway:1',
    deviceId: 'wm001',
    payload: {}
  }), {
    dispatcher: { async dispatch () { return {} } },
    telemetryCollector: { async pull () { return null }, async pullState () { return null } },
    registry: {
      listWorkers () { return [] },
      getCapabilities (deviceId) {
        if (deviceId === 'wm001') return WM_CONTRACT.capabilities
        return null
      }
    },
    actionManager: noopActionManager
  })

  t.ok(response.capabilities, 'capabilities returned')
  t.ok(response.capabilities.commands.find(c => c.name === 'reboot'), 'reboot in capabilities')
  t.ok(response.capabilities.telemetry.find(f => f.name === 'hashrate_rt'), 'hashrate_rt in telemetry')
  t.is(response.capabilities.health.supportedStates.length, 3, '3 health states declared')
})

// ─── Section 6: Health Monitoring ─────────────────────────────────────
//
// Old Kernel: per-rack health hooks in data proxy; failures removed rack from routing.
// New MDK: HealthMonitor with UNKNOWN → HEALTHY → SICK → DEAD state machine.

test('parity[health] health.ping → HEALTHY on first success → old rack health monitoring', async (t) => {
  const runtime = await createRuntime()
  const channel = makeInProcessChannel(runtime)
  const { registry } = await registeredReadyRegistry(channel)

  const monitor = new HealthMonitor({
    registry,
    workerChannel: new WorkerChannel({ timeout: 3000 }),
    failureThreshold: 3
  })
  monitor.start()

  await monitor.pingAll()

  const health = monitor.getHealth('wm-rack-1')
  t.is(health.state, 'HEALTHY', 'worker is HEALTHY after successful ping')
  t.is(health.consecutiveFailures, 0, 'no failures recorded')
  t.ok(health.lastPing, 'lastPing timestamp set')
  t.ok(registry.isRoutable('wm-rack-1'), 'worker is routable when HEALTHY')
})

test('parity[health] consecutive ping failures → DEAD blocks dispatch → old rack eviction', async (t) => {
  // Worker with a failing channel — simulates unresponsive miner rack
  const failingChannel = { async request () { throw new Error('ERR_CHANNEL_TIMEOUT') } }
  const registryStore = createMockStore()
  const capStore = createMockStore()
  const registry = new WorkerRegistry({ store: registryStore, capabilityStore: capStore })
  await registry.register({
    workerId: 'wm-rack-1',
    deviceIds: ['wm001', 'wm002'],
    rpcKey: 'mock',
    channel: failingChannel
  })
  await registry.setReady('wm-rack-1', WM_CONTRACT)

  // failureThreshold: 2 — faster test
  const monitor = new HealthMonitor({
    registry,
    workerChannel: new WorkerChannel({ timeout: 1000 }),
    failureThreshold: 2
  })
  monitor.start()

  // First failure → SICK (MDK blocks routing at SICK; stricter than old Kernel which only blocked at DEAD)
  await monitor.pingAll()
  t.is(monitor.getHealth('wm-rack-1').state, 'SICK', 'SICK after 1st failure')
  t.absent(registry.isRoutable('wm-rack-1'), 'not routable when SICK (MDK is stricter: blocks at SICK, not just DEAD)')

  // Second failure → DEAD
  await monitor.pingAll()
  t.is(monitor.getHealth('wm-rack-1').state, 'DEAD', 'DEAD after threshold failures')
  t.absent(registry.isRoutable('wm-rack-1'), 'not routable when DEAD')

  // Dispatch to a DEAD worker is rejected (same as old rack eviction)
  const csm = new CommandStateMachine({
    wal: createMockStore(),
    workerChannel: new WorkerChannel({ timeout: 5000 }),
    registry,
    maxRetries: 0,
    timeoutMs: 5000
  })
  const dispatcher = new CommandDispatcher({ registry, stateMachine: csm })
  const result = await dispatcher.dispatch(buildEnvelope({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:gateway:1',
    deviceId: 'wm001',
    payload: { command: 'reboot', params: {} }
  }))
  t.is(result.status, 'REJECTED', 'dispatch rejected when worker is DEAD')
  t.ok(result.error.includes('ERR_WORKER_NOT_ROUTABLE'), 'ERR_WORKER_NOT_ROUTABLE error')
})

test('parity[registry] worker.terminate via envelope router → old forgetRacks: explicit worker removal', async (t) => {
  const registryStore = createMockStore()
  const capStore = createMockStore()
  const registry = new WorkerRegistry({ store: registryStore, capabilityStore: capStore })
  await registry.register({ workerId: 'wm-rack-1', deviceIds: ['wm001', 'wm002'], rpcKey: 'mock', channel: null })
  await registry.setReady('wm-rack-1', WM_CONTRACT)

  t.is(registry.listWorkers().length, 1, 'worker present before terminate')

  const response = await routeEnvelope(buildEnvelope({
    action: ACTIONS.WORKER_TERMINATE,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:gateway:1',
    payload: { workerId: 'wm-rack-1' }
  }), {
    dispatcher: { async dispatch () { return {} } },
    telemetryCollector: { async pull () { return null }, async pullState () { return null } },
    registry,
    actionManager: noopActionManager
  })

  t.is(response.status, 'TERMINATED', 'terminate response received')
  t.is(response.workerId, 'wm-rack-1', 'correct workerId confirmed')
  t.is(registry.listWorkers().length, 0, 'worker removed from registry')
  t.absent(registry.resolveWorkerForDevice('wm001'), 'wm001 no longer resolvable')
  t.absent(registry.resolveWorkerForDevice('wm002'), 'wm002 no longer resolvable')
})

// SKIPPED: registerRack (old worker self-registration)
// Reason: MDK replaces push-registration with passive DHT discovery.
// Worker joins a Hyperswarm topic; Kernel pull-discovers via identity.request.
// Tested in mdk-protocol-parity.test.js (full discovery flow).

// SKIPPED: global config (getGlobalConfig / setGlobalConfig)
// Reason: Moved to Gateway by design. Fleet-wide configuration is not Kernel's responsibility.

// SKIPPED: action approval (pushAction / voteAction / cancelActionsBatch)
// Reason: Quorum voting is business logic, moved to Gateway by design.

// SKIPPED: pool config CRUD (registerConfig / updateConfig / deleteConfig / getConfigs)
// Reason: Moved to Gateway by design. Gateway pre-resolves poolConfigId before sending setupPools.

// SKIPPED: aggregateTailLogs / tailLogCustomRangeAggr
// Reason: Cross-worker aggregation moved to Gateway by design.
// Gateway fans out telemetry.pull { type: 'historical_logs' } per worker and joins client-side.
