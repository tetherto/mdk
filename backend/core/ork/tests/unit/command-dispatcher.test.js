'use strict'

const test = require('brittle')
const { CommandDispatcher } = require('../../lib/modules/command-dispatcher')
const { build } = require('../../lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')

function makeEnvelope (deviceId, command, params) {
  return build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:1',
    deviceId,
    payload: { command, params: params || {} }
  })
}

function createDispatcher (opts = {}) {
  const enqueuedCommands = []
  const registry = {
    resolveWorkerForDevice (deviceId) {
      if (opts.devices && opts.devices[deviceId]) return opts.devices[deviceId]
      return null
    },
    isRoutable (workerId) {
      if (opts.routable === false) return false
      return true
    },
    getCapabilities (deviceId) {
      return opts.capabilities || null
    }
  }
  const stateMachine = {
    async enqueue (cmd) {
      enqueuedCommands.push(cmd)
      return 'cmd-' + Date.now()
    }
  }
  const dispatcher = new CommandDispatcher({ registry, stateMachine })
  return { dispatcher, enqueuedCommands }
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
