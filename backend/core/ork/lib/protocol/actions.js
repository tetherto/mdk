'use strict'

/**
 * MDK Protocol action constants
 *
 * These define the canonical action names used in the MDK Protocol envelope.
 * All communication between ORK and Workers uses these action identifiers.
 */

const ACTIONS = {
  // Worker discovery & registration (ORK → Worker)
  IDENTITY_REQUEST: 'identity.request',
  IDENTITY_RESPONSE: 'identity.response',

  // Capability declaration (ORK → Worker)
  CAPABILITY_REQUEST: 'capability.request',
  CAPABILITY_RESPONSE: 'capability.response',

  // Telemetry (ORK → Worker, scheduled)
  TELEMETRY_PULL: 'telemetry.pull',
  TELEMETRY_RESPONSE: 'telemetry.response',

  // State snapshot (ORK → Worker, scheduled)
  STATE_PULL: 'state.pull',
  STATE_RESPONSE: 'state.response',

  // Command dispatch (ORK → Worker)
  COMMAND_REQUEST: 'command.request',
  COMMAND_RESULT: 'command.result',

  // Health probing (ORK → Worker, scheduled)
  HEALTH_PING: 'health.ping',
  HEALTH_PONG: 'health.pong',

  // ORK query actions (App Node → ORK, not forwarded to workers)
  WORKER_LIST: 'worker.list',
  DEVICE_CAPABILITIES: 'device.capabilities',
  WORKER_TERMINATE: 'worker.terminate'
}

/**
 * MDK Protocol message types
 */
const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  EVENT: 'event'
}

/**
 * MDK Protocol version
 */
const PROTOCOL_VERSION = '0.1.0'

module.exports = {
  ACTIONS,
  MESSAGE_TYPES,
  PROTOCOL_VERSION
}
