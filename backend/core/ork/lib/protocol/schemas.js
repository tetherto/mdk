'use strict'

/**
 * MDK Protocol — Per-Action Payload Validators
 *
 * Each function validates the payload of a specific action type.
 * Returns { valid: true } or { valid: false, error: 'ERR_...' }
 */

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
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.command || typeof payload.command !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_COMMAND_REQUIRED' }
  }
  return { valid: true }
}

function validateCommandResult (payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'ERR_PAYLOAD_NOT_OBJECT' }
  }
  if (!payload.commandId || typeof payload.commandId !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_COMMAND_ID_REQUIRED' }
  }
  if (!payload.status || typeof payload.status !== 'string') {
    return { valid: false, error: 'ERR_PAYLOAD_STATUS_REQUIRED' }
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
  'health.pong': validateHealthPong,
  'state.response': validateStateResponse
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
  validateHealthPong,
  validateStateResponse,
  PAYLOAD_VALIDATORS
}
