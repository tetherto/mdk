'use strict'

const test = require('brittle')
const { build, validate, validateFull, match, buildResponse, serialize, deserialize } = require('../../lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION } = require('../../lib/protocol/actions')
const { validatePayload } = require('../../lib/protocol/schemas')

test('envelope - build() produces valid envelope', (t) => {
  const env = build({
    action: ACTIONS.TELEMETRY_PULL,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork:kernel:shard-1',
    deviceId: 'wm001',
    payload: { query: { type: 'metrics' } }
  })

  t.ok(env.id, 'has id')
  t.is(env.version, PROTOCOL_VERSION, 'has correct version')
  t.is(env.type, 'request', 'has correct type')
  t.is(env.action, 'telemetry.pull', 'has correct action')
  t.is(env.sender, 'ork:kernel:shard-1', 'has correct sender')
  t.is(env.deviceId, 'wm001', 'has deviceId')
  t.is(env.target, null, 'target defaults to null')
  t.ok(env.timestamp > 0, 'has timestamp')
  t.alike(env.payload, { query: { type: 'metrics' } }, 'has payload')
})

test('envelope - build() allows id override', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork:kernel:shard-1',
    id: 'custom-id-123'
  })
  t.is(env.id, 'custom-id-123')
})

test('envelope - build() throws on missing action', (t) => {
  t.exception(() => {
    build({ type: MESSAGE_TYPES.REQUEST, sender: 'ork' })
  }, /ERR_ENVELOPE_ACTION_REQUIRED/)
})

test('envelope - build() throws on missing type', (t) => {
  t.exception(() => {
    build({ action: ACTIONS.HEALTH_PING, sender: 'ork' })
  }, /ERR_ENVELOPE_TYPE_REQUIRED/)
})

test('envelope - build() throws on missing sender', (t) => {
  t.exception(() => {
    build({ action: ACTIONS.HEALTH_PING, type: MESSAGE_TYPES.REQUEST })
  }, /ERR_ENVELOPE_SENDER_REQUIRED/)
})

test('envelope - build() defaults payload to empty object', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  t.alike(env.payload, {})
})

test('envelope - validate() accepts valid envelope', (t) => {
  const env = build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'app-node:client:1',
    deviceId: 'wm001',
    payload: { command: 'reboot', params: {} }
  })
  const result = validate(env)
  t.ok(result.valid)
})

test('envelope - validate() rejects non-object', (t) => {
  t.is(validate(null).valid, false)
  t.is(validate(null).error, 'ERR_ENVELOPE_NOT_OBJECT')
  t.is(validate('string').valid, false)
  t.is(validate(42).valid, false)
  t.is(validate([]).valid, false)
})

test('envelope - validate() rejects missing id', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  delete env.id
  const result = validate(env)
  t.is(result.valid, false)
  t.is(result.error, 'ERR_ENVELOPE_ID_MISSING')
})

test('envelope - validate() rejects missing version', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  delete env.version
  t.is(validate(env).error, 'ERR_ENVELOPE_VERSION_MISSING')
})

test('envelope - validate() rejects invalid type', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  env.type = 'invalid'
  t.is(validate(env).error, 'ERR_ENVELOPE_TYPE_INVALID')
})

test('envelope - validate() rejects unknown action', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  env.action = 'unknown.action'
  t.is(validate(env).error, 'ERR_ENVELOPE_ACTION_UNKNOWN')
})

test('envelope - validate() rejects missing sender', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  delete env.sender
  t.is(validate(env).error, 'ERR_ENVELOPE_SENDER_INVALID')
})

test('envelope - validate() rejects missing timestamp', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  delete env.timestamp
  t.is(validate(env).error, 'ERR_ENVELOPE_TIMESTAMP_INVALID')
})

test('envelope - validate() rejects array payload', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork'
  })
  env.payload = [1, 2, 3]
  t.is(validate(env).error, 'ERR_ENVELOPE_PAYLOAD_INVALID')
})

test('envelope - validateFull() checks envelope + payload', (t) => {
  const env = build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'app-node:client:1',
    payload: { command: 'reboot' }
  })
  t.ok(validateFull(env).valid, 'valid command request passes')

  const env2 = build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'app-node:client:1',
    payload: {} // missing command field
  })
  const result = validateFull(env2)
  t.is(result.valid, false)
  t.is(result.error, 'ERR_PAYLOAD_COMMAND_REQUIRED')
})

test('envelope - match() checks action', (t) => {
  const env = build({
    action: ACTIONS.HEALTH_PONG,
    type: MESSAGE_TYPES.RESPONSE,
    sender: 'worker-1'
  })
  t.ok(match(env, ACTIONS.HEALTH_PONG))
  t.absent(match(env, ACTIONS.HEALTH_PING))
  t.absent(match(null, ACTIONS.HEALTH_PING))
})

test('envelope - buildResponse() creates linked response', (t) => {
  const req = build({
    action: ACTIONS.TELEMETRY_PULL,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork:kernel:shard-1',
    deviceId: 'wm001'
  })

  const resp = buildResponse(req, ACTIONS.TELEMETRY_RESPONSE, { metrics: { hashrate: 90 } }, 'worker-1')
  t.is(resp.type, 'response')
  t.is(resp.action, 'telemetry.response')
  t.is(resp.sender, 'worker-1')
  t.is(resp.target, 'ork:kernel:shard-1')
  t.is(resp.deviceId, 'wm001')
  t.alike(resp.payload, { metrics: { hashrate: 90 } })
})

test('envelope - serialize/deserialize round-trip', (t) => {
  const env = build({
    action: ACTIONS.COMMAND_REQUEST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'app-node:client:1',
    deviceId: 'wm002',
    payload: { command: 'reboot', params: {} }
  })

  const buf = serialize(env)
  t.ok(Buffer.isBuffer(buf), 'serializes to Buffer')

  const restored = deserialize(buf)
  t.is(restored.id, env.id)
  t.is(restored.action, env.action)
  t.is(restored.sender, env.sender)
  t.is(restored.deviceId, env.deviceId)
  t.alike(restored.payload, env.payload)

  t.ok(validate(restored).valid, 'deserialized envelope is valid')
})

test('schemas - validatePayload identity.response', (t) => {
  t.ok(validatePayload('identity.response', {
    workerId: 'wrk-1',
    devices: [{ deviceId: 'wm001' }]
  }).valid)

  t.is(validatePayload('identity.response', {}).error, 'ERR_PAYLOAD_WORKER_ID_REQUIRED')
  t.is(validatePayload('identity.response', { workerId: 'wrk-1' }).error, 'ERR_PAYLOAD_DEVICES_REQUIRED')
  t.is(validatePayload('identity.response', { workerId: 'wrk-1', devices: [{}] }).error, 'ERR_PAYLOAD_DEVICE_INVALID at index 0')
})

test('schemas - validatePayload capability.response', (t) => {
  t.ok(validatePayload('capability.response', { contract: { capabilities: {} } }).valid)
  t.is(validatePayload('capability.response', {}).error, 'ERR_PAYLOAD_CONTRACT_REQUIRED')
})

test('schemas - validatePayload command.request', (t) => {
  t.ok(validatePayload('command.request', { command: 'reboot' }).valid)
  t.is(validatePayload('command.request', {}).error, 'ERR_PAYLOAD_COMMAND_REQUIRED')
})

test('schemas - validatePayload command.result', (t) => {
  t.ok(validatePayload('command.result', { commandId: 'abc', status: 'SUCCESS' }).valid)
  t.is(validatePayload('command.result', { status: 'SUCCESS' }).error, 'ERR_PAYLOAD_COMMAND_ID_REQUIRED')
  t.is(validatePayload('command.result', { commandId: 'abc' }).error, 'ERR_PAYLOAD_STATUS_REQUIRED')
})

test('schemas - validatePayload health.pong', (t) => {
  t.ok(validatePayload('health.pong', { status: 'OK' }).valid)
  t.is(validatePayload('health.pong', {}).error, 'ERR_PAYLOAD_STATUS_REQUIRED')
})

test('schemas - validatePayload state.response', (t) => {
  t.ok(validatePayload('state.response', { state: { wm001: {} } }).valid)
  t.is(validatePayload('state.response', {}).error, 'ERR_PAYLOAD_STATE_REQUIRED')
})

test('schemas - validatePayload unknown action accepts anything', (t) => {
  t.ok(validatePayload('identity.request', {}).valid) // no validator for requests
  t.ok(validatePayload('health.ping', {}).valid)
  t.ok(validatePayload('unknown.action', { anything: true }).valid)
})
