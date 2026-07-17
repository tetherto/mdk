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
})

test('stop() disconnects every online device via the plugin', async (t) => {
  simPlugin._disconnected.length = 0
  const runtime = await createRuntime()
  await runtime.stop()

  t.alike(simPlugin._disconnected, ['SIM-001', 'SIM-002'])
})
