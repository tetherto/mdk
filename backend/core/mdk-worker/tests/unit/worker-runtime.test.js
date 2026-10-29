'use strict'

const test = require('brittle')
const { WorkerRuntime } = require('../..')
const simPlugin = require('../fixtures/sim-plugin')
const { ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION } = require('../../../kernel/lib/protocol/actions')

const DEVICES = [
  { deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } },
  { deviceId: 'SIM-002', config: { hashrate: 140, power: 3200 } }
]

async function createRuntime (plugin = simPlugin, opts = {}) {
  const runtime = new WorkerRuntime(plugin, { workerId: 'sim-rack-1', devices: DEVICES, ...opts })
  await runtime._openContexts()
  return runtime
}

function req (action, payload = {}, deviceId = null) {
  return {
    id: 'req-1',
    version: PROTOCOL_VERSION,
    type: MESSAGE_TYPES.REQUEST,
    action,
    sender: 'kernel:kernel:test',
    target: null,
    deviceId,
    timestamp: Date.now(),
    payload
  }
}

test('constructor validates workerId and device specs', (t) => {
  t.exception(() => new WorkerRuntime(simPlugin, { devices: DEVICES }), /ERR_WORKER_ID_REQUIRED/)
  t.exception(() => new WorkerRuntime(simPlugin, { workerId: 'w', devices: [] }), /ERR_DEVICES_REQUIRED/)
  t.exception(() => new WorkerRuntime(simPlugin, { workerId: 'w' }), /ERR_DEVICES_REQUIRED/)
  t.exception(
    () => new WorkerRuntime(simPlugin, { workerId: 'w', devices: [{ config: {} }] }),
    /ERR_DEVICE_ID_MISSING/
  )
  t.exception(
    () => new WorkerRuntime(simPlugin, { workerId: 'w', devices: [{ deviceId: 'a' }, { deviceId: 'a' }] }),
    /ERR_DEVICE_ID_DUPLICATE: a/
  )
  t.exception(
    () => new WorkerRuntime(simPlugin, { workerId: 'w', devices: [{ deviceId: 'a', config: 'nope' }] }),
    /ERR_DEVICE_CONFIG_INVALID: a/
  )
})

test('identity pull lists every hosted device', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.IDENTITY_REQUEST))

  t.is(res.action, ACTIONS.IDENTITY_RESPONSE)
  t.is(res.payload.workerId, 'sim-rack-1')
  t.alike(res.payload.devices, [{ deviceId: 'SIM-001' }, { deviceId: 'SIM-002' }])
})

test('capability pull returns the handler-stripped contract', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.CAPABILITY_REQUEST))

  t.is(res.action, ACTIONS.CAPABILITY_RESPONSE)
  const contract = res.payload.contract
  t.alike(contract.metadata, simPlugin.contract.metadata)
  t.alike(contract.capabilities.commands.map(c => c.name), ['setPowerLimit', 'reboot', 'explode'])
  for (const entry of [...contract.capabilities.telemetry, ...contract.capabilities.commands]) {
    t.is(entry.handler, undefined, `${entry.name} has no handler field`)
  }
})

test('responses are proper envelopes addressed back to the requester', async (t) => {
  const runtime = await createRuntime()
  const request = req(ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, 'SIM-001')
  const res = await runtime.handleRequest(request)

  t.is(res.type, MESSAGE_TYPES.RESPONSE)
  t.is(res.version, PROTOCOL_VERSION)
  t.is(res.sender, 'sim-rack-1')
  t.is(res.target, request.sender)
  t.is(res.deviceId, 'SIM-001')
  t.ok(res.id)
  t.ok(res.timestamp)
})

test('telemetry metrics routes to the addressed device context', async (t) => {
  const runtime = await createRuntime()

  const res1 = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: {} }, 'SIM-001'))
  t.is(res1.action, ACTIONS.TELEMETRY_RESPONSE)
  t.alike(res1.payload.metrics, { hashrate_rt: 100, power: 3000, power_limit: 3500 })

  const res2 = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, 'SIM-002'))
  t.alike(res2.payload.metrics, { hashrate_rt: 140, power: 3200, power_limit: 3500 })
})

test('telemetry named channel pulls a single handler', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'hashrate_rt' } }, 'SIM-002'))

  t.is(res.payload.name, 'hashrate_rt')
  t.is(res.payload.value, 140)
  t.is(res.payload.deviceId, 'SIM-002')
})

test('telemetry metrics without deviceId iterates every device', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }))

  t.is(res.payload.devices.length, 2)
  t.alike(res.payload.devices[0], { deviceId: 'SIM-001', metrics: { hashrate_rt: 100, power: 3000, power_limit: 3500 } })
  t.alike(res.payload.devices[1], { deviceId: 'SIM-002', metrics: { hashrate_rt: 140, power: 3200, power_limit: 3500 } })
})

test('telemetry list reports deviceIds and status without device I/O', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'list' } }))

  t.alike(res.payload.devices, [
    { deviceId: 'SIM-001', status: 'online' },
    { deviceId: 'SIM-002', status: 'online' }
  ])
})

test('telemetry errors: unknown device, unknown type, missing deviceId for channel', async (t) => {
  const runtime = await createRuntime()

  const unknownDevice = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: {} }, 'SIM-999'))
  t.is(unknownDevice.payload.error, 'ERR_DEVICE_NOT_FOUND: SIM-999')

  const unknownType = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'nope' } }, 'SIM-001'))
  t.is(unknownType.payload.error, 'ERR_UNKNOWN_QUERY_TYPE: nope')

  const noDevice = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'hashrate_rt' } }))
  t.is(noDevice.payload.error, 'ERR_DEVICE_ID_REQUIRED: hashrate_rt')
})

test('command routes to the addressed device and wraps the handler return', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.COMMAND_REQUEST, {
    commandId: 'cmd-1',
    command: 'setPowerLimit',
    params: { limit_watts: 2800 }
  }, 'SIM-002'))

  t.is(res.action, ACTIONS.COMMAND_RESULT)
  t.is(res.payload.commandId, 'cmd-1')
  t.is(res.payload.status, 'SUCCESS')
  t.alike(res.payload.result, { deviceId: 'SIM-002', watts: 2800, ok: true })

  // Mutation landed on SIM-002's context only.
  const tel2 = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'power_limit' } }, 'SIM-002'))
  t.is(tel2.payload.value, 2800)
  const tel1 = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'power_limit' } }, 'SIM-001'))
  t.is(tel1.payload.value, 3500)
})

test('command failures produce FAILED results', async (t) => {
  const runtime = await createRuntime()
  const cmd = (payload, deviceId) => runtime.handleRequest(req(ACTIONS.COMMAND_REQUEST, { commandId: 'c', ...payload }, deviceId))

  const thrown = await cmd({ command: 'explode', params: {} }, 'SIM-001')
  t.is(thrown.payload.status, 'FAILED')
  t.is(thrown.payload.error, 'ERR_SIM_EXPLODE')

  const unknown = await cmd({ command: 'selfDestruct', params: {} }, 'SIM-001')
  t.is(unknown.payload.error, 'ERR_UNKNOWN_COMMAND: selfDestruct')

  const noDevice = await cmd({ command: 'reboot', params: {} })
  t.is(noDevice.payload.error, 'ERR_DEVICE_ID_REQUIRED')

  const badDevice = await cmd({ command: 'reboot', params: {} }, 'SIM-999')
  t.is(badDevice.payload.error, 'ERR_DEVICE_NOT_FOUND: SIM-999')
})

test('health ping pongs', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.HEALTH_PING))

  t.is(res.action, ACTIONS.HEALTH_PONG)
  t.is(res.payload.status, 'OK')
})

test('state pull reports per-device status', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req(ACTIONS.STATE_PULL))

  t.is(res.action, ACTIONS.STATE_RESPONSE)
  t.alike(res.payload.state, { 'SIM-001': { status: 'online' }, 'SIM-002': { status: 'online' } })
  t.is(res.payload.deviceCount, 2)
  t.is(res.payload.workerId, 'sim-rack-1')
})

test('unknown action returns an error payload', async (t) => {
  const runtime = await createRuntime()
  const res = await runtime.handleRequest(req('bogus.action'))

  t.is(res.payload.error, 'ERR_UNKNOWN_ACTION: bogus.action')
})

test('a device whose connect() fails stays offline without harming siblings', async (t) => {
  const flaky = {
    ...simPlugin,
    connect: async (config, info) => {
      if (info.deviceId === 'SIM-002') throw new Error('ERR_SIM_UNREACHABLE')
      return simPlugin.connect(config, info)
    }
  }
  const runtime = await createRuntime(flaky)

  const identity = await runtime.handleRequest(req(ACTIONS.IDENTITY_REQUEST))
  t.is(identity.payload.devices.length, 2, 'offline device still reported to the kernel')

  const state = await runtime.handleRequest(req(ACTIONS.STATE_PULL))
  t.alike(state.payload.state, { 'SIM-001': { status: 'online' }, 'SIM-002': { status: 'offline' } })

  const tel = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: {} }, 'SIM-002'))
  t.is(tel.payload.error, 'ERR_DEVICE_UNAVAILABLE: SIM-002')

  const cmd = await runtime.handleRequest(req(ACTIONS.COMMAND_REQUEST, { commandId: 'c', command: 'reboot', params: {} }, 'SIM-002'))
  t.is(cmd.payload.status, 'FAILED')
  t.is(cmd.payload.error, 'ERR_DEVICE_UNAVAILABLE: SIM-002')

  const sibling = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: {} }, 'SIM-001'))
  t.alike(sibling.payload.metrics, { hashrate_rt: 100, power: 3000, power_limit: 3500 })

  const health = async (deviceId) => (await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'health' } }, deviceId))).payload.value
  const offline = await health('SIM-002')
  t.is(offline.reachable, false)
  t.is(offline.lastSuccessAt, null)
  t.is(offline.lastError, 'ERR_DEVICE_UNAVAILABLE: SIM-002', 'not the raw connect() message')
  t.is((await health('SIM-001')).reachable, true)
})

test('a throwing telemetry handler reports per-channel error, others still collected', async (t) => {
  const runtime = await createRuntime()
  // Force the hashrate handler to throw for SIM-001 by breaking its device.
  const entry = runtime._devices.get('SIM-001')
  Object.defineProperty(entry.device, 'hashrate', { get () { throw new Error('ERR_READ_FAILED') } })

  const res = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: {} }, 'SIM-001'))
  t.alike(res.payload.metrics.hashrate_rt, { error: 'ERR_READ_FAILED' })
  t.is(res.payload.metrics.power, 3000)

  const channel = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'hashrate_rt' } }, 'SIM-001'))
  t.is(channel.payload.error, 'ERR_READ_FAILED')

  const health = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'health' } }, 'SIM-001'))
  t.is(health.payload.value.reachable, true, 'the device answered the other channels')
  t.is(health.payload.value.lastError, 'ERR_READ_FAILED')
  t.is(health.payload.value.lastErrorAt, health.payload.value.lastSuccessAt, 'both from the metrics poll; a channel pull is not a poll')
})

test('stop() disconnects every online device via the plugin', async (t) => {
  simPlugin._disconnected.length = 0
  const runtime = await createRuntime()
  await runtime.stop()

  t.alike(simPlugin._disconnected, ['SIM-001', 'SIM-002'])
})

test('storeDir persists DHT/RPC seeds across runtime instances', async (t) => {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-seed-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })

  const first = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, storeDir: dir })
  const seedDht = await first._getOrCreateSeed('seedDht')
  const seedRpc = await first._getOrCreateSeed('seedRpc')
  t.is(seedDht.length, 32)
  t.is(seedRpc.length, 32)
  t.ok(fs.existsSync(path.join(dir, 'seedDht')))
  t.ok(fs.existsSync(path.join(dir, 'seedRpc')))

  const second = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, storeDir: dir })
  t.alike(await second._getOrCreateSeed('seedDht'), seedDht)
  t.alike(await second._getOrCreateSeed('seedRpc'), seedRpc)
})

test('without store or storeDir, seeds are random per call', async (t) => {
  const runtime = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES })
  const a = await runtime._getOrCreateSeed('seedRpc')
  const b = await runtime._getOrCreateSeed('seedRpc')
  t.is(a.equals(b), false)
})

// A sim-plugin copy whose setPowerLimit declares the full param vocabulary
// (required, enum, min/max) so the runtime-side validation can be exercised.
function strictPlugin () {
  const contract = JSON.parse(JSON.stringify(simPlugin.contract))
  const entry = contract.capabilities.commands.find((c) => c.name === 'setPowerLimit')
  entry.params = [
    { name: 'limit_watts', type: 'number', min: 100, max: 5000, required: true },
    { name: 'mode', type: 'string', enum: ['eco', 'normal'] },
    { name: 'force', type: 'boolean' },
    { name: 'extra', type: 'object' }
  ]
  return { ...simPlugin, contract }
}

test('command params are validated against the contract before dispatch', async (t) => {
  const runtime = await createRuntime(strictPlugin())
  const run = (params) => runtime.handleRequest(req(ACTIONS.COMMAND_REQUEST, { commandId: 'c', command: 'setPowerLimit', params }, 'SIM-001'))
  const powerLimit = () => runtime._devices.get('SIM-001').device.powerLimit

  const cases = [
    [{}, 'ERR_PARAM_REQUIRED: limit_watts'],
    [{ limit_watts: null }, 'ERR_PARAM_REQUIRED: limit_watts'],
    [{ limit_watts: '2800' }, 'ERR_PARAM_TYPE: limit_watts must be number'],
    [{ limit_watts: Infinity }, 'ERR_PARAM_TYPE: limit_watts must be number'],
    [{ limit_watts: 50 }, 'ERR_PARAM_RANGE: limit_watts below min 100'],
    [{ limit_watts: 9000 }, 'ERR_PARAM_RANGE: limit_watts above max 5000'],
    [{ limit_watts: 2800, mode: 'turbo' }, 'ERR_PARAM_ENUM: mode'],
    [{ limit_watts: 2800, force: 'yes' }, 'ERR_PARAM_TYPE: force must be boolean'],
    [{ limit_watts: 2800, extra: 'x' }, 'ERR_PARAM_TYPE: extra must be object'],
    ['2800', 'ERR_PARAMS_INVALID']
  ]
  for (const [params, error] of cases) {
    const res = await run(params)
    t.is(res.payload.status, 'FAILED', `rejected: ${JSON.stringify(params)}`)
    t.is(res.payload.error, error)
  }
  t.is(powerLimit(), 3500, 'no rejected call reached the handler')

  const ok = await run({ limit_watts: 2800, mode: 'eco', force: true, extra: [1], undeclared: 1 })
  t.is(ok.payload.status, 'SUCCESS', 'valid params (plus undeclared keys, and an array for an object param) pass')
  t.is(powerLimit(), 2800)

  // Positional dispatch is normalized first, then validated.
  const positional = await run({ value: 99999 })
  t.is(positional.payload.error, 'ERR_PARAM_RANGE: limit_watts above max 5000')
})

test('non-ERR_ handler errors are mapped to a code and not sent over RPC', async (t) => {
  const leaky = {
    ...simPlugin,
    connect: async (config, info) => {
      const device = await simPlugin.connect(config, info)
      Object.defineProperty(device, 'hashrate', { get () { throw new Error('connect ECONNREFUSED 10.0.0.7:4028 user=root pass=hunter2') } })
      return device
    }
  }
  const runtime = await createRuntime(leaky)

  const metrics = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: {} }, 'SIM-001'))
  t.alike(metrics.payload.metrics.hashrate_rt, { error: 'ERR_TELEMETRY_FAILED' })

  const channel = await runtime.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'hashrate_rt' } }, 'SIM-001'))
  t.is(channel.payload.error, 'ERR_TELEMETRY_FAILED')

  runtime._plugin.handlers.commands.set('reboot', async () => { throw new TypeError('Cannot read properties of undefined (reading \'secret\')') })
  const cmd = await runtime.handleRequest(req(ACTIONS.COMMAND_REQUEST, { commandId: 'c', command: 'reboot', params: {} }, 'SIM-001'))
  t.is(cmd.payload.error, 'ERR_COMMAND_FAILED')

  t.absent(JSON.stringify([metrics, channel, cmd]).includes('hunter2'), 'raw message never leaves the process')
})

test('seed files: malformed seeds fail instead of rotating the identity', async (t) => {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-seed-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })

  fs.writeFileSync(path.join(dir, 'seedRpc'), Buffer.alloc(16), { mode: 0o600 })
  const runtime = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, storeDir: dir })
  await t.exception(() => runtime._getOrCreateSeed('seedRpc'), /ERR_SEED_FILE_MALFORMED/)
  t.is(fs.readFileSync(path.join(dir, 'seedRpc')).length, 16, 'the malformed seed was left untouched')
})

test('seed files: symlinks are refused and new seeds are created 0600', { skip: process.platform === 'win32' }, async (t) => {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-seed-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })

  const target = path.join(dir, 'elsewhere')
  fs.writeFileSync(target, Buffer.alloc(32, 1))
  fs.symlinkSync(target, path.join(dir, 'seedDht'))
  fs.symlinkSync(path.join(dir, 'missing'), path.join(dir, 'seedRpc'))

  const runtime = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, storeDir: dir })
  await t.exception(() => runtime._getOrCreateSeed('seedDht'), /ERR_SEED_FILE_SYMLINK/)
  await t.exception(() => runtime._getOrCreateSeed('seedRpc'), /ERR_SEED_FILE_SYMLINK/, 'a dangling link is not written through')
  t.absent(fs.existsSync(path.join(dir, 'missing')), 'nothing created at the link target')

  const fresh = await runtime._getOrCreateSeed('seedNew')
  t.is(fresh.length, 32)
  t.is(fs.statSync(path.join(dir, 'seedNew')).mode & 0o777, 0o600)
})

test('seed files: group/world-readable seeds are tightened to 0600', { skip: process.platform === 'win32' }, async (t) => {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-seed-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })

  const seedPath = path.join(dir, 'seedDht')
  const seed = Buffer.alloc(32, 7)
  fs.writeFileSync(seedPath, seed)
  fs.chmodSync(seedPath, 0o644)

  const runtime = new WorkerRuntime(simPlugin, { workerId: 'w', devices: DEVICES, storeDir: dir })
  t.alike(await runtime._getOrCreateSeed('seedDht'), seed, 'the existing seed is kept')
  t.is(fs.statSync(seedPath).mode & 0o777, 0o600, 'and its mode tightened')
})
