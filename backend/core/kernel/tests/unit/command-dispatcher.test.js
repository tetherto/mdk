'use strict'

const test = require('brittle')
const { CommandDispatcher } = require('../../lib/modules/command-dispatcher')
const { build } = require('../../lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')

function makeEnvelope (deviceId, command, params, opts = {}) {
  const payload = { command, params: params || {} }
  if (opts.scope) payload.scope = opts.scope
  if (opts.workerId) payload.workerId = opts.workerId
  if (opts.targets) payload.targets = opts.targets
  return build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:1',
    deviceId,
    payload
  })
}

const DEVICE_CAPABILITIES = { commands: [{ name: 'reboot', params: [] }] }
const WORKER_CAPABILITIES = { commands: ['registerThing', 'forgetThings', 'rackReboot'].map((name) => ({ name, params: [] })) }

function createDispatcher (opts = {}) {
  const enqueuedCommands = []
  const stateEntries = opts.stateEntries || {}
  const cancelled = []
  const registry = {
    resolveWorkerForDevice (deviceId) {
      if (opts.devices && opts.devices[deviceId]) return opts.devices[deviceId]
      return null
    },
    resolveWorker (workerId) {
      if (opts.workers && opts.workers[workerId]) return opts.workers[workerId]
      return null
    },
    isRoutable (workerId) {
      if (opts.routable === false) return false
      return true
    },
    getCapabilities (deviceId) {
      return 'capabilities' in opts ? opts.capabilities : DEVICE_CAPABILITIES
    },
    getWorkerCapabilities (workerId) {
      return 'workerCapabilities' in opts ? opts.workerCapabilities : WORKER_CAPABILITIES
    }
  }
  const stateMachine = {
    async enqueue (cmd) {
      enqueuedCommands.push(cmd)
      return 'cmd-' + (enqueuedCommands.length)
    },
    async getState (commandId) {
      return stateEntries[commandId] || null
    },
    async cancel (commandId) {
      const entry = stateEntries[commandId]
      if (!entry || entry.state !== 'QUEUED') return false
      cancelled.push(commandId)
      return true
    }
  }
  const dispatcher = new CommandDispatcher({ registry, stateMachine, commandLog: opts.commandLog })
  return { dispatcher, enqueuedCommands, cancelled }
}

test('dispatcher - valid command dispatches successfully', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } }
  })

  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'))
  t.is(result.status, 'QUEUED')
  t.ok(result.commandId)
  t.is(enqueuedCommands.length, 1)
  t.is(enqueuedCommands[0].deviceId, 'wm001')
  t.is(enqueuedCommands[0].command, 'reboot')
})

test('dispatcher - rejects missing deviceId', async (t) => {
  const { dispatcher } = createDispatcher()
  const env = build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test',
    payload: { command: 'reboot' }
  })
  const result = await dispatcher.dispatch(env)
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_DEVICE_ID_REQUIRED')
})

test('dispatcher - rejects missing command', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } }
  })
  const env = build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test',
    deviceId: 'wm001',
    payload: {}
  })
  const result = await dispatcher.dispatch(env)
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_COMMAND_REQUIRED')
})

test('dispatcher - rejects unknown device', async (t) => {
  const { dispatcher } = createDispatcher({ devices: {} })
  const result = await dispatcher.dispatch(makeEnvelope('unknown', 'reboot'))
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_DEVICE_NOT_FOUND')
})

test('dispatcher - rejects non-routable worker', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    routable: false
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'))
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_WORKER_NOT_ROUTABLE')
})

test('dispatcher - rejects command not in capabilities', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [{ name: 'reboot', params: [] }] }
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'destroyAll'))
  t.is(result.status, 'REJECTED')
  t.ok(result.error.includes('ERR_COMMAND_NOT_IN_CAPABILITIES'))
})

test('dispatcher - rejects wrong param type', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [{ name: 'setPower', params: [{ name: 'watts', type: 'number' }] }] }
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'setPower', { watts: 'notanumber' }))
  t.is(result.status, 'REJECTED')
  t.ok(result.error.includes('ERR_PARAM_TYPE'))
})

test('dispatcher - rejects param below min', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [{ name: 'setPower', params: [{ name: 'watts', type: 'number', min: 2000, max: 4000 }] }] }
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'setPower', { watts: 500 }))
  t.is(result.status, 'REJECTED')
  t.ok(result.error.includes('ERR_PARAM_RANGE'))
  t.ok(result.error.includes('below min'))
})

test('dispatcher - rejects param above max', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [{ name: 'setPower', params: [{ name: 'watts', type: 'number', min: 2000, max: 4000 }] }] }
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'setPower', { watts: 9999 }))
  t.is(result.status, 'REJECTED')
  t.ok(result.error.includes('above max'))
})

test('dispatcher - rejects every command when the target declares none', async (t) => {
  for (const capabilities of [null, {}]) {
    const { dispatcher, enqueuedCommands } = createDispatcher({
      devices: { wm001: { workerId: 'w1', channel: {} } },
      capabilities
    })
    const result = await dispatcher.dispatch(makeEnvelope('wm001', 'anything'))
    t.is(result.error, 'ERR_COMMAND_NOT_IN_CAPABILITIES: anything')
    t.is(enqueuedCommands.length, 0)
  }
})

test('dispatcher - applies the Worker param rules before queueing', async (t) => {
  const capabilities = { commands: [{ name: 'setPowerMode', params: [{ name: 'mode', type: 'string', required: true, enum: ['low', 'high'] }] }] }
  const cases = [
    [{ mode: 'turbo' }, 'ERR_PARAM_ENUM: mode'],
    [{}, 'ERR_PARAM_REQUIRED: mode'],
    [{ value: 'turbo' }, 'ERR_PARAM_ENUM: mode']
  ]
  for (const [params, error] of cases) {
    const { dispatcher, enqueuedCommands } = createDispatcher({ devices: { wm001: { workerId: 'w1', channel: {} } }, capabilities })
    const result = await dispatcher.dispatch(makeEnvelope('wm001', 'setPowerMode', params))
    t.alike(result, { error, status: 'REJECTED' }, JSON.stringify(params))
    t.is(enqueuedCommands.length, 0)
  }
  const { dispatcher } = createDispatcher({ devices: { wm001: { workerId: 'w1', channel: {} } }, capabilities })
  t.is((await dispatcher.dispatch(makeEnvelope('wm001', 'setPowerMode', { value: 'low' }))).status, 'QUEUED', 'positional approval-path params pass')
})

test('dispatcher - passes valid params within range', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [{ name: 'setPower', params: [{ name: 'watts', type: 'number', min: 2000, max: 4000 }] }] }
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'setPower', { watts: 3000 }))
  t.is(result.status, 'QUEUED')
  t.is(enqueuedCommands[0].params.watts, 3000)
})

test('dispatcher - worker-scope command routes by workerId without deviceId', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    workers: { 'wrk-1': { workerId: 'wrk-1', channel: {} } },
    workerCapabilities: { commands: [{ name: 'registerThing', params: [{ name: 'info', type: 'object' }] }] }
  })

  const env = makeEnvelope(null, 'registerThing', { info: { serial: 'A1' } }, { scope: 'worker', workerId: 'wrk-1' })
  const result = await dispatcher.dispatch(env)

  t.is(result.status, 'QUEUED')
  t.ok(result.commandId)
  t.is(enqueuedCommands.length, 1)
  t.is(enqueuedCommands[0].scope, 'worker')
  t.is(enqueuedCommands[0].workerId, 'wrk-1')
  t.is(enqueuedCommands[0].deviceId, null)
  t.is(enqueuedCommands[0].command, 'registerThing')
})

test('dispatcher - rack-scope command routes by workerId', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    workers: { 'wrk-1': { workerId: 'wrk-1', channel: {} } }
  })

  const env = makeEnvelope(null, 'rackReboot', null, { scope: 'rack', workerId: 'wrk-1' })
  const result = await dispatcher.dispatch(env)

  t.is(result.status, 'QUEUED')
  t.is(enqueuedCommands[0].scope, 'rack')
  t.is(enqueuedCommands[0].workerId, 'wrk-1')
})

test('dispatcher - worker-scope without workerId is rejected', async (t) => {
  const { dispatcher } = createDispatcher({
    workers: { 'wrk-1': { workerId: 'wrk-1', channel: {} } }
  })

  const env = makeEnvelope(null, 'registerThing', null, { scope: 'worker' })
  const result = await dispatcher.dispatch(env)
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_WORKER_ID_REQUIRED')
})

test('dispatcher - worker-scope rejects unknown worker', async (t) => {
  const { dispatcher } = createDispatcher({ workers: {} })
  const env = makeEnvelope(null, 'registerThing', null, { scope: 'worker', workerId: 'wrk-missing' })
  const result = await dispatcher.dispatch(env)
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_WORKER_NOT_FOUND')
})

test('dispatcher - worker-scope validates against worker capabilities', async (t) => {
  const { dispatcher } = createDispatcher({
    workers: { 'wrk-1': { workerId: 'wrk-1', channel: {} } },
    workerCapabilities: { commands: [{ name: 'registerThing', params: [] }] }
  })
  const env = makeEnvelope(null, 'nukeWorker', null, { scope: 'worker', workerId: 'wrk-1' })
  const result = await dispatcher.dispatch(env)
  t.is(result.status, 'REJECTED')
  t.ok(result.error.includes('ERR_COMMAND_NOT_IN_CAPABILITIES'))
})

test('dispatcher - targets[] is propagated to the state machine', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    workers: { 'wrk-1': { workerId: 'wrk-1', channel: {} } }
  })
  const env = makeEnvelope(null, 'forgetThings', null, {
    scope: 'worker',
    workerId: 'wrk-1',
    targets: ['wm001', 'wm002']
  })
  const result = await dispatcher.dispatch(env)
  t.is(result.status, 'QUEUED')
  t.alike(enqueuedCommands[0].targets, ['wm001', 'wm002'])
})

test('dispatcher - getStatus returns the state machine entry shape', async (t) => {
  const { dispatcher } = createDispatcher({
    stateEntries: {
      'cmd-1': {
        state: 'EXECUTING',
        command: 'reboot',
        deviceId: 'wm001',
        scope: 'device',
        retries: 3,
        createdAt: 100,
        updatedAt: 200
      }
    }
  })
  const status = await dispatcher.getStatus('cmd-1')
  t.is(status.commandId, 'cmd-1')
  t.is(status.status, 'EXECUTING')
  t.is(status.command, 'reboot')
  t.is(status.deviceId, 'wm001')
  t.is(status.scope, 'device')
  t.is(status.verification, null, 'no verification while in flight')
})

test('dispatcher - getStatus reports the verification of a settled command', async (t) => {
  const verification = { state: 'VERIFIED', telemetry: 'power_mode', expected: 'low', observed: 'low', at: 300 }
  const { dispatcher } = createDispatcher({
    stateEntries: { 'cmd-1': { state: 'SUCCESS', command: 'setPowerMode', deviceId: 'wm001', result: {}, verification, createdAt: 100, updatedAt: 300 } }
  })
  const status = await dispatcher.getStatus('cmd-1')
  t.is(status.status, 'SUCCESS')
  t.alike(status.verification, verification)
})

const VERIFIED_SET_POWER = {
  commands: [{
    name: 'setPowerMode',
    params: [{ name: 'mode', type: 'string' }],
    verify: { telemetry: 'power_mode', param: 'mode', withinMs: 90000 }
  }]
}

test('dispatcher - a declared verify becomes the expected device state', async (t) => {
  const cases = [
    [{ mode: 'low' }, 'named param'],
    [{ value: 'low' }, 'positional { value } from the approval path'],
    [{ args: ['low'] }, 'positional { args } from the approval path']
  ]
  for (const [params, label] of cases) {
    const { dispatcher, enqueuedCommands } = createDispatcher({
      devices: { wm001: { workerId: 'w1', channel: {} } },
      capabilities: VERIFIED_SET_POWER
    })
    await dispatcher.dispatch(makeEnvelope('wm001', 'setPowerMode', params))
    t.alike(enqueuedCommands[0].verify, { telemetry: 'power_mode', expected: 'low', withinMs: 90000 }, label)
  }
})

test('dispatcher - verify withinMs defaults to 60s', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [{ name: 'setPowerMode', params: [{ name: 'mode', type: 'string' }], verify: { telemetry: 'power_mode', param: 'mode' } }] }
  })
  await dispatcher.dispatch(makeEnvelope('wm001', 'setPowerMode', { mode: 'low' }))
  t.is(enqueuedCommands[0].verify.withinMs, 60000)
})

test('dispatcher - no verify without a declaration or a requested value', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: [...VERIFIED_SET_POWER.commands, { name: 'reboot', params: [] }] }
  })
  await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'))
  await dispatcher.dispatch(makeEnvelope('wm001', 'setPowerMode', {}))
  t.is(enqueuedCommands[0].verify, null, 'command without verify')
  t.is(enqueuedCommands[1].verify, null, 'verify param not sent')
})

test('dispatcher - worker-scope commands are not verified', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    workers: { 'wrk-1': { workerId: 'wrk-1', channel: {} } },
    workerCapabilities: VERIFIED_SET_POWER
  })
  await dispatcher.dispatch(makeEnvelope(null, 'setPowerMode', { mode: 'low' }, { scope: 'worker', workerId: 'wrk-1' }))
  t.is(enqueuedCommands[0].verify, null)
})

test('dispatcher - getStatus rejects missing commandId', async (t) => {
  const { dispatcher } = createDispatcher()
  const status = await dispatcher.getStatus()
  t.is(status.status, 'REJECTED')
  t.is(status.error, 'ERR_COMMAND_ID_REQUIRED')
})

test('dispatcher - getStatus reports not found', async (t) => {
  const { dispatcher } = createDispatcher({ stateEntries: {} })
  const status = await dispatcher.getStatus('cmd-missing')
  t.is(status.status, 'REJECTED')
  t.is(status.error, 'ERR_COMMAND_NOT_FOUND')
})

test('dispatcher - cancel delegates to state machine', async (t) => {
  const { dispatcher, cancelled } = createDispatcher({
    stateEntries: { 'cmd-1': { state: 'QUEUED' } }
  })
  const result = await dispatcher.cancel('cmd-1')
  t.is(result.commandId, 'cmd-1')
  t.is(result.cancelled, true)
  t.alike(cancelled, ['cmd-1'])
})

test('dispatcher - cancel reports non-cancellable commands', async (t) => {
  const { dispatcher } = createDispatcher({
    stateEntries: { 'cmd-1': { state: 'EXECUTING' } }
  })
  const result = await dispatcher.cancel('cmd-1')
  t.is(result.cancelled, false)
})

test('dispatcher - cancel rejects missing commandId', async (t) => {
  const { dispatcher } = createDispatcher()
  const result = await dispatcher.cancel()
  t.is(result.status, 'REJECTED')
  t.is(result.error, 'ERR_COMMAND_ID_REQUIRED')
})

test('dispatcher - inherited property names are not capabilities', async (t) => {
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: { commands: { reboot: {} } }
  })
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    const result = await dispatcher.dispatch(makeEnvelope('wm001', name))
    t.is(result.status, 'REJECTED', `${name} rejected`)
  }
  const ok = await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'))
  t.is(ok.status, 'QUEUED')
})

test('dispatcher - requesterId comes from the authenticated caller when given', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } }
  })
  await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'), { requesterId: 'cafe' })
  await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'))
  t.is(enqueuedCommands[0].requesterId, 'cafe')
  t.is(enqueuedCommands[1].requesterId, 'test:client:1', 'in-process falls back to sender')
})

test('dispatcher - logs every attempt with caller, target, params and outcome', async (t) => {
  const entries = []
  const { dispatcher } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    commandLog: { append: async (entry) => { entries.push(entry) } }
  })
  const accepted = await dispatcher.dispatch(makeEnvelope('wm001', 'reboot', { delay: 1 }), { requesterId: 'cafe', roles: ['write'] })
  await dispatcher.dispatch(makeEnvelope('wm001', 'destroyAll'))
  t.alike(entries[0], {
    event: 'attempt',
    commandId: accepted.commandId,
    caller: { key: 'cafe', roles: ['write'] },
    command: 'reboot',
    scope: 'device',
    deviceId: 'wm001',
    workerId: null,
    targets: null,
    params: { delay: 1 },
    outcome: 'QUEUED',
    error: null
  })
  t.is(entries[1].outcome, 'REJECTED')
  t.is(entries[1].error, 'ERR_COMMAND_NOT_IN_CAPABILITIES: destroyAll')
  t.alike(entries[1].caller, { key: 'test:client:1', roles: null }, 'in-process callers are logged by sender')
})

test('dispatcher - an operator acting through an app is logged and queued via the app', async (t) => {
  const entries = []
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    commandLog: { append: async (entry) => { entries.push(entry) } }
  })
  await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'), { requesterId: 'alice', roles: ['tuner'], via: { requesterId: 'app:ops', roles: ['app-ops'] } })
  t.alike(entries[0].caller, { key: 'alice', roles: ['tuner'] })
  t.alike(entries[0].via, { key: 'app:ops', roles: ['app-ops'] })
  t.is(enqueuedCommands[0].requesterId, 'alice')
  t.is(enqueuedCommands[0].via, 'app:ops')
})

test('dispatcher - a failed log write does not fail the command', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    commandLog: { append: async () => { throw new Error('disk full') } }
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'reboot'))
  t.is(result.status, 'QUEUED')
  t.is(enqueuedCommands.length, 1)
})
