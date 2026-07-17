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
      return opts.capabilities || null
    },
    getWorkerCapabilities (workerId) {
      return opts.workerCapabilities || null
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
  const dispatcher = new CommandDispatcher({ registry, stateMachine })
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

test('dispatcher - passes when no capabilities declared', async (t) => {
  const { dispatcher, enqueuedCommands } = createDispatcher({
    devices: { wm001: { workerId: 'w1', channel: {} } },
    capabilities: null
  })
  const result = await dispatcher.dispatch(makeEnvelope('wm001', 'anything'))
  t.is(result.status, 'QUEUED')
  t.is(enqueuedCommands.length, 1)
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
