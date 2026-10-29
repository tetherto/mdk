'use strict'

const crypto = require('crypto')
const { PROTOCOL_VERSION, MESSAGE_TYPES, ACTIONS } = require('./actions')
const { validatePayload } = require('./schemas')

const VALID_ACTIONS = new Set(Object.values(ACTIONS))
const VALID_TYPES = new Set(Object.values(MESSAGE_TYPES))

/**
 * Build a new MDK Protocol envelope
 * @param {object} opts
 * @param {string} opts.action - Protocol action (e.g., 'telemetry.pull')
 * @param {string} opts.type - Message type: request | response | event
 * @param {string} opts.sender - Sender identity (e.g., 'kernel:kernel:shard-1')
 * @param {string|null} [opts.target] - Target identity
 * @param {string|null} [opts.deviceId] - Target device ID
 * @param {object} [opts.payload] - Message payload
 * @param {string} [opts.id] - Optional override for message ID
 * @param {string} [opts.auth] - The caller's access token
 * @param {string} [opts.actor] - The operator's access token, for a caller acting on their behalf
 * @returns {object} MDK Protocol envelope
 */
function build (opts) {
  if (!opts.action) throw new Error('ERR_ENVELOPE_ACTION_REQUIRED')
  if (!opts.type) throw new Error('ERR_ENVELOPE_TYPE_REQUIRED')
  if (!opts.sender) throw new Error('ERR_ENVELOPE_SENDER_REQUIRED')

  return {
    id: opts.id || crypto.randomUUID(),
    version: PROTOCOL_VERSION,
    type: opts.type,
    action: opts.action,
    sender: opts.sender,
    target: opts.target || null,
    deviceId: opts.deviceId || null,
    timestamp: Date.now(),
    payload: opts.payload || {},
    // The caller's access token (see @tetherto/mdk-identity). Top level, so no
    // action's payload ever carries or forwards it.
    ...(opts.auth ? { auth: opts.auth } : {}),
    // The operator's access token, when the caller (an app) acts for the user
    // its Gateway route authenticated. Authorized beside `auth`, never instead.
    ...(opts.actor ? { actor: opts.actor } : {})
  }
}

/**
 * Validate an incoming envelope has the required structure
 * @param {object} envelope - Raw envelope to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validate (envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, error: 'ERR_ENVELOPE_NOT_OBJECT' }
  }

  if (!envelope.id || typeof envelope.id !== 'string') {
    return { valid: false, error: 'ERR_ENVELOPE_ID_MISSING' }
  }

  if (!envelope.version || typeof envelope.version !== 'string') {
    return { valid: false, error: 'ERR_ENVELOPE_VERSION_MISSING' }
  }

  if (!envelope.type || !VALID_TYPES.has(envelope.type)) {
    return { valid: false, error: 'ERR_ENVELOPE_TYPE_INVALID' }
  }

  if (!envelope.action || typeof envelope.action !== 'string') {
    return { valid: false, error: 'ERR_ENVELOPE_ACTION_INVALID' }
  }

  if (!VALID_ACTIONS.has(envelope.action)) {
    return { valid: false, error: 'ERR_ENVELOPE_ACTION_UNKNOWN' }
  }

  if (!envelope.sender || typeof envelope.sender !== 'string') {
    return { valid: false, error: 'ERR_ENVELOPE_SENDER_INVALID' }
  }

  if (!envelope.timestamp || typeof envelope.timestamp !== 'number') {
    return { valid: false, error: 'ERR_ENVELOPE_TIMESTAMP_INVALID' }
  }

  if (envelope.payload !== undefined && envelope.payload !== null) {
    if (typeof envelope.payload !== 'object' || Array.isArray(envelope.payload)) {
      return { valid: false, error: 'ERR_ENVELOPE_PAYLOAD_INVALID' }
    }
  }

  if (envelope.auth !== undefined && (typeof envelope.auth !== 'string' || envelope.auth.length > 8192)) {
    return { valid: false, error: 'ERR_ENVELOPE_AUTH_INVALID' }
  }

  if (envelope.actor !== undefined && (typeof envelope.actor !== 'string' || !envelope.actor || envelope.actor.length > 8192)) {
    return { valid: false, error: 'ERR_ENVELOPE_ACTOR_INVALID' }
  }

  return { valid: true }
}

/**
 * Validate envelope structure AND payload for the given action
 * @param {object} envelope
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFull (envelope) {
  const envResult = validate(envelope)
  if (!envResult.valid) return envResult

  const payloadResult = validatePayload(envelope.action, envelope.payload)
  if (!payloadResult.valid) return payloadResult

  return { valid: true }
}

/**
 * Check if an envelope matches an expected action
 * @param {object} envelope
 * @param {string} expectedAction - e.g. ACTIONS.IDENTITY_RESPONSE
 * @returns {boolean}
 */
function match (envelope, expectedAction) {
  return envelope && envelope.action === expectedAction
}

/**
 * Build a response envelope from a request envelope
 * @param {object} requestEnvelope - Original request
 * @param {string} action - Response action
 * @param {object} payload - Response payload
 * @param {string} sender - Response sender identity
 * @returns {object} Response envelope
 */
function buildResponse (requestEnvelope, action, payload, sender) {
  return build({
    action,
    type: MESSAGE_TYPES.RESPONSE,
    sender,
    target: requestEnvelope.sender,
    deviceId: requestEnvelope.deviceId,
    payload
  })
}

/**
 * Serialize an envelope to a Buffer for transport
 * @param {object} envelope
 * @returns {Buffer}
 */
function serialize (envelope) {
  return Buffer.from(JSON.stringify(envelope))
}

/**
 * Deserialize a Buffer back to an envelope
 * @param {Buffer} buf
 * @returns {object}
 */
function deserialize (buf) {
  return JSON.parse(buf.toString())
}

module.exports = {
  build,
  validate,
  validateFull,
  match,
  buildResponse,
  serialize,
  deserialize
}
