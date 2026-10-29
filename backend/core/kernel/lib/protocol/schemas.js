'use strict'

const {
  VALID_COMMAND_SCOPES,
  COMMAND_SCOPES,
  VALID_COMMAND_RESULT_STATUSES
} = require('./actions')

/**
 * MDK Protocol — Per-Action Payload Validators
 *
 * Each function validates the payload of a specific action type.
 * Returns { valid: true } or { valid: false, error: 'ERR_...' }
 */

// Upper bounds on caller-supplied arrays, so one request cannot fan out into
// unbounded worker calls, store reads or approver writes.
const LIMITS = Object.freeze({
  targets: 1000,
  devices: 10000,
  batchActions: 100,
  ids: 1000,
  queries: 50,
  authPerms: 256,
  params: 256,
  logEntries: 1000,
  // Worker write.calls.response: calls per Worker, and the most approvals a
  // Worker may demand (a huge reqVotes would block an action forever).
  writeCalls: 10000,
  reqVotes: 10
})

function tooLong (arr, max, name) {
  if (arr.length > max) return { valid: false, error: `ERR_PAYLOAD_${name}_TOO_MANY: max ${max}` }
  return null
}

function requirePayloadObject (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  return null
}

function requireCommandId (payload) {
  const obj = requirePayloadObject(payload)
  if (obj) return obj
  if (!payload.commandId || typeof payload.commandId !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_COMMAND_ID_REQUIRED' }
  }
  return null
}

function requireStatus (payload) {
  if (!payload.status || typeof payload.status !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_STATUS_REQUIRED' }
  }
  if (!VALID_COMMAND_RESULT_STATUSES.has(payload.status)) {
    return { valid: false, error: 'ERR_PAYLOAD_STATUS_INVALID' }
  }
  return null
}

function validateIdentityResponse (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.workerId || typeof payload.workerId !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_WORKER_ID_REQUIRED' }
  }
  if (!Array.isArray(payload.devices)) {
    return { valid: false, error: 'ERR_PAYLOAD_DEVICES_REQUIRED' }
  }
  const devicesLen = tooLong(payload.devices, LIMITS.devices, 'DEVICES')
  if (devicesLen) return devicesLen
  for (let i = 0; i < payload.devices.length; i++) {
    const d = payload.devices[i]
    if (!d || typeof d !== 'object' || !d.deviceId || typeof d.deviceId !== 'string') {
      return { valid: false, error: `ERR_PAYLOAD_DEVICE_INVALID at index ${i}` }
    }
  }
  return { valid: true }
}

function validateCapabilityResponse (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.contract || typeof payload.contract !== 'object' || Array.isArray(payload.contract)) {
    return { valid: false, error: 'ERR_PAYLOAD_CONTRACT_REQUIRED' }
  }
  const { capabilities, metadata } = payload.contract
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    return { valid: false, error: 'ERR_PAYLOAD_CONTRACT_CAPABILITIES_REQUIRED' }
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { valid: false, error: 'ERR_PAYLOAD_CONTRACT_METADATA_REQUIRED' }
  }
  return { valid: true }
}

function validateTelemetryPull (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  // deviceId can come from envelope or payload — at least one must be set
  // query is optional
  return { valid: true }
}

function validateTelemetryResponse (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  return { valid: true }
}

function validateCommandRequest (payload) {
  const obj = requirePayloadObject(payload)
  if (obj) return obj
  if (!payload.command || typeof payload.command !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_COMMAND_REQUIRED' }
  }
  if (payload.scope !== undefined) {
    if (typeof payload.scope !== 'string' || !VALID_COMMAND_SCOPES.has(payload.scope)) {
      return { valid: false, error: 'ERR_PAYLOAD_SCOPE_INVALID' }
    }
    if (
      (payload.scope === COMMAND_SCOPES.WORKER || payload.scope === COMMAND_SCOPES.RACK) &&
      (typeof payload.workerId !== 'string' || !payload.workerId)
    ) {
      return { valid: false, error: 'ERR_PAYLOAD_WORKER_ID_REQUIRED' }
    }
  }
  if (payload.workerId !== undefined && typeof payload.workerId !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_WORKER_ID_INVALID' }
  }
  if (payload.targets !== undefined) {
    if (!Array.isArray(payload.targets)) {
      return { valid: false, error: 'ERR_PAYLOAD_TARGETS_INVALID' }
    }
    const targetsLen = tooLong(payload.targets, LIMITS.targets, 'TARGETS')
    if (targetsLen) return targetsLen
    for (let i = 0; i < payload.targets.length; i++) {
      if (typeof payload.targets[i] !== 'string' || !payload.targets[i]) {
        return { valid: false, error: `ERR_PAYLOAD_TARGET_INVALID at index ${i}` }
      }
    }
  }
  return { valid: true }
}

function validateCommandResult (payload) {
  return requireCommandId(payload) || requireStatus(payload) || { valid: true }
}

function validateCommandStatus (payload) {
  return requireCommandId(payload) || { valid: true }
}

function validateCommandStatusResponse (payload) {
  return requireCommandId(payload) || requireStatus(payload) || { valid: true }
}

function validateCommandCancel (payload) {
  return requireCommandId(payload) || { valid: true }
}

function validateCommandCancelResponse (payload) {
  const err = requireCommandId(payload)
  if (err) return err
  if (typeof payload.cancelled !== 'boolean') {
    return { valid: false, error: 'ERR_PAYLOAD_CANCELLED_REQUIRED' }
  }
  return { valid: true }
}

function validateHealthPong (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.status || typeof payload.status !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_STATUS_REQUIRED' }
  }
  return { valid: true }
}

function validateStateResponse (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.state || typeof payload.state !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_STATE_REQUIRED' }
  }
  return { valid: true }
}

function validateActionPush (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.action || typeof payload.action !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_ACTION_REQUIRED' }
  }
  if (!payload.voter) {
    return { valid: false, error: 'ERR_PAYLOAD_VOTER_REQUIRED' }
  }
  if (!Array.isArray(payload.authPerms)) {
    return { valid: false, error: 'ERR_PAYLOAD_AUTH_PERMS_REQUIRED' }
  }
  if (!payload.query || typeof payload.query !== 'object' || Array.isArray(payload.query)) {
    return { valid: false, error: 'ERR_PAYLOAD_QUERY_REQUIRED' }
  }
  if (!Array.isArray(payload.params)) {
    return { valid: false, error: 'ERR_PAYLOAD_PARAMS_REQUIRED' }
  }
  return tooLong(payload.authPerms, LIMITS.authPerms, 'AUTH_PERMS') ||
    tooLong(payload.params, LIMITS.params, 'PARAMS') ||
    { valid: true }
}

function validateActionPushBatch (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!Array.isArray(payload.batchActionsPayload)) {
    return { valid: false, error: 'ERR_PAYLOAD_BATCH_ACTIONS_REQUIRED' }
  }
  if (!payload.voter) {
    return { valid: false, error: 'ERR_PAYLOAD_VOTER_REQUIRED' }
  }
  if (!Array.isArray(payload.authPerms)) {
    return { valid: false, error: 'ERR_PAYLOAD_AUTH_PERMS_REQUIRED' }
  }
  const len = tooLong(payload.batchActionsPayload, LIMITS.batchActions, 'BATCH_ACTIONS') ||
    tooLong(payload.authPerms, LIMITS.authPerms, 'AUTH_PERMS')
  if (len) return len
  for (let i = 0; i < payload.batchActionsPayload.length; i++) {
    const entry = payload.batchActionsPayload[i]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { valid: false, error: `ERR_PAYLOAD_BATCH_ACTION_INVALID at index ${i}` }
    }
    if (entry.params !== undefined && Array.isArray(entry.params) && entry.params.length > LIMITS.params) {
      return { valid: false, error: `ERR_PAYLOAD_PARAMS_TOO_MANY at index ${i}: max ${LIMITS.params}` }
    }
  }
  return { valid: true }
}

function validateActionGet (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.id) {
    return { valid: false, error: 'ERR_PAYLOAD_ID_REQUIRED' }
  }
  if (!payload.type || typeof payload.type !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_TYPE_REQUIRED' }
  }
  return { valid: true }
}

function validateActionGetBatch (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!Array.isArray(payload.ids)) {
    return { valid: false, error: 'ERR_PAYLOAD_IDS_REQUIRED' }
  }
  return tooLong(payload.ids, LIMITS.ids, 'IDS') || { valid: true }
}

function validateActionQuery (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!Array.isArray(payload.queries)) {
    return { valid: false, error: 'ERR_PAYLOAD_QUERIES_REQUIRED' }
  }
  return tooLong(payload.queries, LIMITS.queries, 'QUERIES') || { valid: true }
}

function validateActionVote (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.id) {
    return { valid: false, error: 'ERR_PAYLOAD_ID_REQUIRED' }
  }
  if (!payload.voter) {
    return { valid: false, error: 'ERR_PAYLOAD_VOTER_REQUIRED' }
  }
  if (typeof payload.approve !== 'boolean') {
    return { valid: false, error: 'ERR_PAYLOAD_APPROVE_REQUIRED' }
  }
  if (!Array.isArray(payload.authPerms)) {
    return { valid: false, error: 'ERR_PAYLOAD_AUTH_PERMS_REQUIRED' }
  }
  return tooLong(payload.authPerms, LIMITS.authPerms, 'AUTH_PERMS') || { valid: true }
}

function validateCommandLog (payload) {
  if (payload === undefined || payload === null) return { valid: true }
  if (typeof payload !== 'object') return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  for (const name of ['start', 'end']) {
    const value = payload[name]
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      return { valid: false, error: `ERR_PAYLOAD_${name.toUpperCase()}_INVALID` }
    }
  }
  if (payload.limit !== undefined && (!Number.isInteger(payload.limit) || payload.limit < 1 || payload.limit > LIMITS.logEntries)) {
    return { valid: false, error: `ERR_PAYLOAD_LIMIT_INVALID: integer 1-${LIMITS.logEntries}` }
  }
  return { valid: true }
}

function validateActionCancelBatch (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!Array.isArray(payload.ids)) {
    return { valid: false, error: 'ERR_PAYLOAD_IDS_REQUIRED' }
  }
  if (!payload.voter) {
    return { valid: false, error: 'ERR_PAYLOAD_VOTER_REQUIRED' }
  }
  return tooLong(payload.ids, LIMITS.ids, 'IDS') || { valid: true }
}

function validateWriteCallsRequest (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.action || typeof payload.action !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_ACTION_REQUIRED' }
  }
  if (!payload.query || typeof payload.query !== 'object' || Array.isArray(payload.query)) {
    return { valid: false, error: 'ERR_PAYLOAD_QUERY_REQUIRED' }
  }
  if (!Array.isArray(payload.params)) {
    return { valid: false, error: 'ERR_PAYLOAD_PARAMS_REQUIRED' }
  }
  return { valid: true }
}

function validateWriteCallsResponse (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!Array.isArray(payload.calls)) {
    return { valid: false, error: 'ERR_PAYLOAD_CALLS_REQUIRED' }
  }
  if (!Number.isInteger(payload.reqVotes) || payload.reqVotes < 1 || payload.reqVotes > LIMITS.reqVotes) {
    return { valid: false, error: `ERR_PAYLOAD_REQ_VOTES_INVALID: integer 1-${LIMITS.reqVotes}` }
  }
  const len = tooLong(payload.calls, LIMITS.writeCalls, 'CALLS')
  if (len) return len
  for (let i = 0; i < payload.calls.length; i++) {
    const call = payload.calls[i]
    if (!call || typeof call !== 'object' || Array.isArray(call) || !call.id || typeof call.id !== 'string') {
      return { valid: false, error: `ERR_PAYLOAD_CALL_INVALID at index ${i}` }
    }
    if (call.tags !== undefined && !Array.isArray(call.tags)) {
      return { valid: false, error: `ERR_PAYLOAD_CALL_TAGS_INVALID at index ${i}` }
    }
  }
  return { valid: true }
}

// spec.rbac itself is validated by @tetherto/mdk-rbac when it is applied; this
// only checks the envelope carries one (null applies the empty, deny-all policy).
function validateRbacApply (payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Object.hasOwn(payload, 'rbac')) {
    return { valid: false, error: 'ERR_PAYLOAD_RBAC_REQUIRED' }
  }
  const { rbac } = payload
  if (rbac !== null && (typeof rbac !== 'object' || Array.isArray(rbac))) {
    return { valid: false, error: 'ERR_PAYLOAD_RBAC_INVALID: rbac must be a mapping or null' }
  }
  return { valid: true }
}

// Sign-in and identity payloads: shape only, the issuer checks the rest. A
// missing string field is reported by name; values are never echoed back.
function _strings (...fields) {
  return (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { valid: false, error: 'ERR_PAYLOAD_INVALID: expected an object' }
    for (const f of fields) {
      if (typeof payload[f] !== 'string' || payload[f].length === 0 || payload[f].length > 8192) {
        return { valid: false, error: `ERR_PAYLOAD_FIELD_REQUIRED: ${f}` }
      }
    }
    return { valid: true }
  }
}

function validateAuthToken (payload) {
  const base = _strings('assertion')(payload)
  if (!base.valid) return base
  if (payload.bind !== undefined && typeof payload.bind !== 'boolean') return { valid: false, error: 'ERR_PAYLOAD_INVALID: bind must be a boolean' }
  return { valid: true }
}

/**
 * Map of action → payload validator
 * Actions not listed here have no payload constraints (empty payload OK)
 */
const PAYLOAD_VALIDATORS = {
  'identity.response': validateIdentityResponse,
  'capability.response': validateCapabilityResponse,
  'telemetry.pull': validateTelemetryPull,
  'telemetry.response': validateTelemetryResponse,
  'command.request': validateCommandRequest,
  'command.result': validateCommandResult,
  'command.status': validateCommandStatus,
  'command.status.response': validateCommandStatusResponse,
  'command.cancel': validateCommandCancel,
  'command.cancel.response': validateCommandCancelResponse,
  'command.log': validateCommandLog,
  'health.pong': validateHealthPong,
  'state.response': validateStateResponse,
  'action.push': validateActionPush,
  'action.push-batch': validateActionPushBatch,
  'action.get': validateActionGet,
  'action.get-batch': validateActionGetBatch,
  'action.query': validateActionQuery,
  'action.vote': validateActionVote,
  'action.cancel-batch': validateActionCancelBatch,
  'rbac.apply': validateRbacApply,
  'auth.login': _strings('username', 'password'),
  'auth.refresh': _strings('refreshToken'),
  'auth.token': validateAuthToken,
  'auth.logout': _strings('refreshToken'),
  'identity.user.upsert': _strings('name'),
  'identity.user.delete': _strings('name'),
  'identity.sa.upsert': _strings('name', 'publicKey'),
  'identity.sa.delete': _strings('name'),
  'write.calls.request': validateWriteCallsRequest,
  'write.calls.response': validateWriteCallsResponse
}

/**
 * Validate a payload for a given action
 * @param {string} action - The protocol action
 * @param {object} payload - The payload to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePayload (action, payload) {
  const validator = PAYLOAD_VALIDATORS[action]
  if (!validator) return { valid: true } // no validator = accept any payload
  return validator(payload)
}

module.exports = {
  LIMITS,
  validatePayload,
  validateIdentityResponse,
  validateCapabilityResponse,
  validateTelemetryPull,
  validateTelemetryResponse,
  validateCommandRequest,
  validateCommandResult,
  validateCommandStatus,
  validateCommandStatusResponse,
  validateCommandCancel,
  validateCommandCancelResponse,
  validateCommandLog,
  validateHealthPong,
  validateStateResponse,
  validateActionPush,
  validateActionPushBatch,
  validateActionGet,
  validateActionGetBatch,
  validateActionQuery,
  validateActionVote,
  validateActionCancelBatch,
  validateWriteCallsRequest,
  validateWriteCallsResponse,
  PAYLOAD_VALIDATORS
}
