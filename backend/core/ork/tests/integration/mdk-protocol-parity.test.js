'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hyperswarm = require('hyperswarm')
const { MDKWorkerAdapter } = require('../../../../workers/base/lib/mdk-worker-adapter')
const { WorkerRegistry } = require('../../lib/modules/worker-registry')
const { CommandStateMachine } = require('../../lib/modules/command-state-machine')
const { CommandDispatcher } = require('../../lib/modules/command-dispatcher')
const { TelemetryCollector } = require('../../lib/modules/telemetry-collector')
const { WorkerChannel } = require('../../lib/transport/worker-channel')
const { DHTListener } = require('../../lib/discovery/dht-listener')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build: buildEnvelope, serialize, deserialize } = require('../../lib/protocol/envelope')

// ─── Helpers ──────────────────────────────────────────────────────────

async function createTestBee (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-parity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const store = new Corestore(tmpDir)
  const core = store.get({ name: 'ork-parity' })
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8' })
  await bee.ready()
  t.teardown(async () => {
    await bee.close()
    await store.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  return bee
}

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

function createMockManager () {
  const things = {
    wm001: {
      id: 'wm001',
      type: 'miner-wm-m56s',
      tags: ['whatsminer'],
      info: { serialNum: 'WM001' },
      opts: { address: '192.168.1.10', port: 4028 },
      ctrl: {
        isThingOnline () { return true },
        getSnap () { return { hashrate_rt: 92.5, hashrate_avg: 90, power: 3200, temperature: 65, status: 'online' } }
      }
    },
    wm002: {
      id: 'wm002',
      type: 'miner-wm-m56s',
      tags: ['whatsminer'],
      info: { serialNum: 'WM002' },
      opts: { address: '192.168.1.11', port: 4028 },
      ctrl: {
        isThingOnline () { return true },
        getSnap () { return { hashrate_rt: 88.0, hashrate_avg: 85, power: 3100, temperature: 62, status: 'online' } }
      }
    },
    wm003: {
      id: 'wm003',
      type: 'miner-wm-m56s',
      tags: ['whatsminer'],
      info: { serialNum: 'WM003' },
      opts: { address: '192.168.1.12', port: 4028 },
      ctrl: {
        isThingOnline () { return false },
        getSnap () { throw new Error('device offline') }
      }
    }
  }

  return {
    rackId: 'wm-rack-1',
    mem: { things },
    listThings () {
      return Object.values(things).map(t => ({
        id: t.id,
        type: t.type,
        tags: t.tags,
        info: t.info,
        status: t.ctrl.isThingOnline() ? 'online' : 'offline'
      }))
    },
    async collectThingSnap (thg) { return thg.ctrl.getSnap() },
    async tailLog () { return [] },
    async getHistoricalLogs () { return [] },
    async getSettings () { return { autoReconnect: true } },
    async aggrStats () { return { totalHashrate: 180.5, count: 3 } },
    async registerThing (params) { return { id: 'wm004', ...params } },
    async updateThing (params) { return params },
    async forgetThings () { return 1 },
    async saveSettingsEntries (entries) { return entries },
    async saveThingComment (req) { return { id: 'cmt-1', ...req } },
    async editThingComment (req) { return req },
    async deleteThingComment () { return 1 },
    async applyThings (req) { return { applied: 1, method: req.method } },
    _getWrkExtData () { return {} },
    getThingConf () { return { pool: 'stratum://pool.example.com:3333' } }
  }
}

const WM_CONTRACT = {
  metadata: {
    provider: 'microbt',
    deviceFamily: 'miner',
    brand: 'Whatsminer',
    modelsSupported: ['M56S'],
    overview: 'Whatsminer stub for parity testing'
  },
  capabilities: {
    telemetry: [
      { name: 'hashrate_rt', type: 'number', unit: 'TH/s', description: 'Real-time hashrate' },
      { name: 'hashrate_avg', type: 'number', unit: 'TH/s', description: 'Average hashrate' },
      { name: 'power', type: 'number', unit: 'W', description: 'Power draw' },
      { name: 'temperature', type: 'number', unit: 'C', description: 'Chip temperature' },
      { name: 'status', type: 'string', unit: '', description: 'Device status' }
    ],
    commands: [
      { name: 'reboot', params: [] },
      { name: 'setPowerMode', params: [{ name: 'mode', type: 'string' }] },
      { name: 'setPowerPct', params: [{ name: 'pct', type: 'number', min: 0, max: 100 }] },
      { name: 'registerThing', params: [{ name: 'info', type: 'object' }, { name: 'opts', type: 'object' }] }
    ],
    health: { supportedStates: ['OK', 'DEGRADED', 'OFFLINE'] },
    errors: {}
  }
}

/**
 * In-process channel: routes MDK envelopes directly to adapter.handleRequest.
 * Bypasses HRPC/DHT for tests focused on protocol correctness rather than transport.
 */
function makeInProcessChannel (adapter) {
  return {
    async request (envelope) {
      return adapter.handleRequest(envelope)
    }
  }
}

async function registeredReadyRegistry (channel) {
  const registryStore = createMockStore()
  const capStore = createMockStore()
  const registry = new WorkerRegistry({ store: registryStore, capabilityStore: capStore })
  await registry.register({
    workerId: 'wm-rack-1',
    deviceIds: ['wm001', 'wm002', 'wm003'],
    rpcKey: 'mock',
    channel
  })
  await registry.setReady('wm-rack-1', WM_CONTRACT)
  return { registry, registryStore, capStore }
}

// ─── Test 1: Full discovery flow via DHT testnet ───────────────────────

test('parity - discover → identity → capability → READY via testnet DHT', async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = testnet.bootstrap
  const topic = crypto.randomBytes(32)

  // ─── Stub worker (manual setup to use testnet bootstrap) ────────────
  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })

  const workerDht = new DHT({ bootstrap })
  const workerRpc = new HyperswarmRPC({ dht: workerDht })
  const workerServer = workerRpc.createServer()

  workerServer.respond('mdk', async (reqBuf) => {
    const envelope = deserialize(reqBuf)
    const result = await adapter.handleRequest(envelope)
    return serialize(result)
  })

  await workerServer.listen()

  const workerSwarm = new Hyperswarm({ bootstrap })
  workerSwarm.join(topic, { server: true, client: false })
  await workerSwarm.flush()
  workerSwarm.on('connection', (stream) => {
    stream.write(workerServer.publicKey)
    stream.on('error', () => {})
  })

  t.teardown(async () => {
    await workerSwarm.destroy()
    await workerServer.close()
    await workerRpc.destroy()
    await workerDht.destroy()
  })

  // ─── ORK side ───────────────────────────────────────────────────────
  const orkRpc = new HyperswarmRPC({ bootstrap })
  const workerChannel = new WorkerChannel({ timeout: 15000, rpc: orkRpc })
  const registry = new WorkerRegistry({
    store: createMockStore(),
    capabilityStore: createMockStore()
  })

  const listener = new DHTListener({
    topic: topic.toString('hex'),
    registry,
    workerChannel,
    swarmOpts: { bootstrap }
  })

  t.teardown(async () => {
    await listener.stop()
    await orkRpc.destroy()
  })

  await listener.start()

  // Wait for discovery + registration (up to 15s)
  let attempts = 0
  while (registry.listWorkers().length === 0 && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 500))
    attempts++
  }

  const workers = registry.listWorkers()
  t.is(workers.length, 1, 'one worker discovered')
  t.is(workers[0].workerId, 'wm-rack-1', 'correct workerId')
  t.is(workers[0].state, 'READY', 'worker state is READY')
  t.is(workers[0].deviceIds.length, 3, 'all 3 devices registered')

  // All 3 devices resolvable
  t.ok(registry.resolveWorkerForDevice('wm001'), 'wm001 resolvable')
  t.ok(registry.resolveWorkerForDevice('wm002'), 'wm002 resolvable')
  t.ok(registry.resolveWorkerForDevice('wm003'), 'wm003 resolvable')

  // Capabilities stored
  const caps = registry.getCapabilities('wm001')
  t.ok(caps, 'capabilities stored for wm001')
  t.ok(caps.commands.find(c => c.name === 'reboot'), 'reboot command in capabilities')
  t.ok(caps.telemetry.find(tf => tf.name === 'hashrate_rt'), 'hashrate_rt telemetry field')

  // Worker is routable
  t.ok(registry.isRoutable('wm-rack-1'), 'worker is routable')
})

// ─── Test 2: Telemetry pull from READY worker ─────────────────────────

test('parity - telemetry pull returns WM metrics (in-process)', async (t) => {
  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const tc = new TelemetryCollector({ registry, workerChannel: new WorkerChannel({ timeout: 5000 }) })

  // Pull metrics for a specific online device
  const data = await tc.pull('wm001', { type: 'metrics' })
  t.ok(data, 'telemetry data returned')
  t.is(data.metrics.hashrate_rt, 92.5, 'hashrate_rt correct')
  t.is(data.metrics.power, 3200, 'power correct')
  t.is(data.metrics.status, 'online', 'status correct')

  // Pull metrics for second device
  const data2 = await tc.pull('wm002')
  t.ok(data2, 'wm002 telemetry returned')
  t.is(data2.metrics.hashrate_rt, 88.0, 'wm002 hashrate_rt correct')

  // Pull for offline device — adapter wraps error in payload
  const data3 = await tc.pull('wm003')
  t.ok(data3, 'wm003 response received')
  t.ok(data3.error, 'offline device returns error field')

  // Unknown device returns null
  const missing = await tc.pull('nonexistent')
  t.absent(missing, 'unknown device returns null')
})

test('parity - telemetry pullAll fans out to all registered devices', async (t) => {
  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const pulled = []
  const tc = new TelemetryCollector({
    registry,
    workerChannel: new WorkerChannel({ timeout: 5000 })
  })
  tc.subscribe('wm001', (data) => pulled.push({ id: 'wm001', data }))
  tc.subscribe('wm002', (data) => pulled.push({ id: 'wm002', data }))

  await tc.pullAll()

  t.ok(pulled.some(p => p.id === 'wm001'), 'wm001 subscriber notified')
  t.ok(pulled.some(p => p.id === 'wm002'), 'wm002 subscriber notified')
})

test('parity - state pull returns per-device state map', async (t) => {
  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const tc = new TelemetryCollector({ registry, workerChannel: new WorkerChannel({ timeout: 5000 }) })

  const snap = await tc.pullState('wm001')
  t.ok(snap, 'state snap returned')
  t.ok(snap.state, 'state map present')
  t.is(snap.state.wm001.status, 'online', 'wm001 is online')
  t.is(snap.state.wm002.status, 'online', 'wm002 is online')
  t.is(snap.state.wm003.status, 'offline', 'wm003 is offline')
  t.is(snap.thingCount, 3, '3 things in state snap')
})

// ─── Test 3: Command dispatch → SUCCESS ───────────────────────────────

test('parity - command dispatch: reboot → QUEUED → SUCCESS', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('ork-wal')

  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const csm = new CommandStateMachine({
    wal: walStore,
    workerChannel: new WorkerChannel({ timeout: 10000 }),
    registry,
    maxRetries: 2,
    timeoutMs: 10000
  })

  const dispatcher = new CommandDispatcher({ registry, stateMachine: csm })

  const envelope = buildEnvelope({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:parity',
    deviceId: 'wm001',
    payload: { command: 'reboot', params: {} }
  })

  const doneP = new Promise(resolve => csm.once('command:done', resolve))

  const result = await dispatcher.dispatch(envelope)
  t.is(result.status, 'QUEUED', 'dispatcher returns QUEUED immediately')
  t.ok(result.commandId, 'commandId assigned')

  const done = await doneP
  t.is(done.commandId, result.commandId, 'done event for same commandId')
  t.is(done.state, 'SUCCESS', 'command reached SUCCESS')
  t.absent(done.error, 'no error on success')
})

test('parity - command dispatch: registerThing creates new device', async (t) => {
  const bee = await createTestBee(t)

  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const csm = new CommandStateMachine({
    wal: bee.sub('ork-wal-register'),
    workerChannel: new WorkerChannel({ timeout: 10000 }),
    registry,
    maxRetries: 0,
    timeoutMs: 10000
  })

  const dispatcher = new CommandDispatcher({ registry, stateMachine: csm })

  const doneP = new Promise(resolve => csm.once('command:done', resolve))

  await dispatcher.dispatch(buildEnvelope({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:parity',
    deviceId: 'wm001',
    payload: {
      command: 'registerThing',
      params: {
        info: { serialNum: 'WM004', model: 'M56S' },
        opts: { address: '192.168.1.13', port: 4028 }
      }
    }
  }))

  const done = await doneP
  t.is(done.state, 'SUCCESS', 'registerThing succeeded')
  t.ok(done.result, 'result present')
  t.is(done.result.id, 'wm004', 'new device id returned')
})

test('parity - command rejected for device not in capabilities', async (t) => {
  const bee = await createTestBee(t)

  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const csm = new CommandStateMachine({
    wal: bee.sub('ork-wal-reject'),
    workerChannel: new WorkerChannel({ timeout: 10000 }),
    registry,
    maxRetries: 0,
    timeoutMs: 10000
  })

  const dispatcher = new CommandDispatcher({ registry, stateMachine: csm })

  const result = await dispatcher.dispatch(buildEnvelope({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:parity',
    deviceId: 'wm001',
    payload: { command: 'setPoolStratum', params: {} }
  }))

  t.is(result.status, 'REJECTED', 'unknown command rejected at dispatcher')
  t.ok(result.error.startsWith('ERR_COMMAND_NOT_IN_CAPABILITIES'), 'correct error code')
})

// ─── Test 4: State transitions visible ────────────────────────────────

test('parity - state transitions: QUEUED confirmed, SUCCESS compacted from WAL', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('ork-wal-states')

  const adapter = new MDKWorkerAdapter(createMockManager(), WM_CONTRACT, { workerId: 'wm-rack-1' })
  const channel = makeInProcessChannel(adapter)
  const { registry } = await registeredReadyRegistry(channel)

  const csm = new CommandStateMachine({
    wal: walStore,
    workerChannel: new WorkerChannel({ timeout: 10000 }),
    registry,
    maxRetries: 0,
    timeoutMs: 10000
  })
  const dispatcher = new CommandDispatcher({ registry, stateMachine: csm })

  const doneP = new Promise(resolve => csm.once('command:done', resolve))

  const result = await dispatcher.dispatch(buildEnvelope({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:parity',
    deviceId: 'wm001',
    payload: { command: 'reboot', params: {} }
  }))

  // Dispatcher returns QUEUED — this is the declared state at handoff
  t.is(result.status, 'QUEUED', 'dispatcher returns QUEUED status')

  const done = await doneP
  t.is(done.state, 'SUCCESS', 'command:done emitted with SUCCESS')

  // Terminal states are compacted from WAL immediately after emission
  const walEntry = await walStore.get(result.commandId)
  t.absent(walEntry, 'command removed from WAL after SUCCESS (compacted)')

  // Command also removed from in-memory map
  t.absent(csm._commands.has(result.commandId), 'command removed from _commands map')
})

// ─── Test 5: Restart recovery ─────────────────────────────────────────

test('parity - restart recovery: QUEUED commands survive drain, re-queued on recover', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('ork-wal-recovery')
  const registryStore = createMockStore()
  const capStore = createMockStore()

  // ─── Phase 1: register worker, enqueue command (channel null → stays QUEUED) ──
  const registry1 = new WorkerRegistry({ store: registryStore, capabilityStore: capStore })
  // Register with null channel so _dispatch returns early without sending
  await registry1.register({
    workerId: 'wm-rack-1',
    deviceIds: ['wm001', 'wm002'],
    rpcKey: 'mock-key',
    channel: null
  })
  await registry1.setReady('wm-rack-1', WM_CONTRACT)

  const csm1 = new CommandStateMachine({
    wal: walStore,
    workerChannel: { async send () {} },
    registry: registry1,
    maxRetries: 2,
    timeoutMs: 5000
  })

  // Enqueue — _dispatch sees no channel, returns immediately; command stays QUEUED in WAL
  const cmdId = await csm1.enqueue({
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    requesterId: 'test:parity'
  })

  // Allow microtasks to settle
  await new Promise(resolve => setImmediate(resolve))

  // Command is QUEUED in WAL
  const walBefore = await walStore.get(cmdId)
  t.ok(walBefore, 'command in WAL before drain')
  t.is(JSON.parse(walBefore.value.toString()).state, 'QUEUED', 'QUEUED in WAL')

  // Simulate ORK shutdown: drain → QUEUED commands untouched
  await csm1.drain()
  t.ok(csm1._draining, '_draining set after drain()')

  const walAfterDrain = await walStore.get(cmdId)
  t.ok(walAfterDrain, 'command survives drain in WAL')
  t.is(JSON.parse(walAfterDrain.value.toString()).state, 'QUEUED', 'QUEUED unchanged by drain')

  // ─── Phase 2: restart — recover registry and CSM ──────────────────
  const registry2 = new WorkerRegistry({ store: registryStore, capabilityStore: capStore })
  await registry2.recover()

  const workers = registry2.listWorkers()
  t.is(workers.length, 1, 'one worker recovered')
  t.is(workers[0].workerId, 'wm-rack-1', 'correct workerId')
  t.is(workers[0].state, 'DISCOVERED', 'worker restored to DISCOVERED (awaiting DHT reconnect)')

  const res = registry2.resolveWorkerForDevice('wm001')
  t.ok(res, 'wm001 still resolvable after recovery')
  t.absent(res.channel, 'no channel — requires DHT reconnect to become READY again')

  const csm2 = new CommandStateMachine({
    wal: walStore,
    workerChannel: { async send () {} },
    registry: registry2,
    maxRetries: 2,
    timeoutMs: 5000
  })
  await csm2.recover()

  t.ok(csm2._commands.has(cmdId), 'QUEUED command re-queued in memory after recover()')
  const recoveredEntry = csm2._commands.get(cmdId)
  t.is(recoveredEntry.state, 'QUEUED', 'recovered entry is QUEUED')
  t.is(recoveredEntry.command, 'reboot', 'command name preserved')
  t.is(recoveredEntry.retries, 2, 'retry budget preserved')
})

test('parity - restart recovery: EXECUTING marked TIMEOUT on drain, re-queued on recover', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('ork-wal-exec-recovery')

  const csm1 = new CommandStateMachine({
    wal: walStore,
    workerChannel: { async send () {} },
    registry: { resolveWorkerForDevice: () => null, isRoutable: () => false },
    maxRetries: 1,
    timeoutMs: 5000
  })

  // Inject an EXECUTING entry directly (simulates crash mid-execution)
  const cmdId = crypto.randomUUID()
  const execEntry = {
    state: 'EXECUTING',
    deviceId: 'wm001',
    command: 'setPowerMode',
    params: { mode: 'normal' },
    requesterId: 'test:parity',
    retries: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  csm1._commands.set(cmdId, execEntry)
  await csm1.wal.append(cmdId, execEntry)

  // Drain: EXECUTING → TIMEOUT in WAL
  await csm1.drain()

  const walAfterDrain = await walStore.get(cmdId)
  t.ok(walAfterDrain, 'TIMEOUT entry in WAL after drain')
  t.is(JSON.parse(walAfterDrain.value.toString()).state, 'TIMEOUT', 'EXECUTING → TIMEOUT on drain')

  // Restart: recover() sweeps WAL, TIMEOUT with retries > 0 → QUEUED
  const csm2 = new CommandStateMachine({
    wal: walStore,
    workerChannel: { async send () {} },
    registry: { resolveWorkerForDevice: () => null, isRoutable: () => false },
    maxRetries: 1,
    timeoutMs: 5000
  })
  await csm2.recover()

  t.ok(csm2._commands.has(cmdId), 'previously EXECUTING command re-queued after recover()')
  const recovered = csm2._commands.get(cmdId)
  t.is(recovered.state, 'QUEUED', 'TIMEOUT → QUEUED after recover()')
  t.is(recovered.retries, 0, 'retry budget decremented')
})
