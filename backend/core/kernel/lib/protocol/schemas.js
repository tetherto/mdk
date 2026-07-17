'use strict'

const {
  VALID_COMMAND_SCOPES,
  COMMAND_SCOPES,
  VALID_COMMAND_RESULT_STATUSES,
  MAX_TARGETS
} = require('./actions')

/**
 * MDK Protocol — Per-Action Payload Validators
 *
 * Each function validates the payload of a specific action type.
 * Returns { valid: true } or { valid: false, error: 'ERR_...' }
 */

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
  if (!payload.contract || typeof payload.contract !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_CONTRACT_REQUIRED' }
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
    if (payload.targets.length > MAX_TARGETS) {
      return { valid: false, error: 'ERR_PAYLOAD_TARGETS_TOO_MANY' }
    }
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
  return { valid: true }
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
  return { valid: true }
}

function validateActionQuery (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!Array.isArray(payload.queries)) {
    return { valid: false, error: 'ERR_PAYLOAD_QUERIES_REQUIRED' }
  }
  return { valid: true }
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
  return { valid: true }
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
  if (typeof payload.reqVotes !== 'number') {
    return { valid: false, error: 'ERR_PAYLOAD_REQ_VOTES_REQUIRED' }
  }
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
  'health.pong': validateHealthPong,
  'state.response': validateStateResponse,
  'action.push': validateActionPush,
  'action.push-batch': validateActionPushBatch,
  'action.get': validateActionGet,
  'action.get-batch': validateActionGetBatch,
  'action.query': validateActionQuery,
  'action.vote': validateActionVote,
  'action.cancel-batch': validateActionCancelBatch,
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
