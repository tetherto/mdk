'use strict'

const { COMMAND_STATES } = require('../modules/command-state-machine/states')

/**
 * MDK Protocol action constants
 *
 * These define the canonical action names used in the MDK Protocol envelope.
 * All communication between Kernel and Workers uses these action identifiers.
 */

const ACTIONS = {
  // Worker discovery & registration (Kernel → Worker)
  IDENTITY_REQUEST: 'identity.request',
  IDENTITY_RESPONSE: 'identity.response',

  // Capability declaration (Kernel → Worker)
  CAPABILITY_REQUEST: 'capability.request',
  CAPABILITY_RESPONSE: 'capability.response',

  // Telemetry (Kernel → Worker, scheduled)
  TELEMETRY_PULL: 'telemetry.pull',
  TELEMETRY_RESPONSE: 'telemetry.response',

  // State snapshot (Kernel → Worker, scheduled)
  STATE_PULL: 'state.pull',
  STATE_RESPONSE: 'state.response',

  // Command dispatch (Client → Kernel → Worker)
  COMMAND_REQUEST: 'command.request',
  COMMAND_RESULT: 'command.result',
  COMMAND_STATUS: 'command.status',
  COMMAND_STATUS_RESPONSE: 'command.status.response',
  COMMAND_CANCEL: 'command.cancel',
  COMMAND_CANCEL_RESPONSE: 'command.cancel.response',

  // Health probing (Kernel → Worker, scheduled)
  HEALTH_PING: 'health.ping',
  HEALTH_PONG: 'health.pong',

  // Kernel query actions (Gateway → Kernel, not forwarded to workers)
  WORKER_LIST: 'worker.list',
  DEVICE_CAPABILITIES: 'device.capabilities',
  WORKER_TERMINATE: 'worker.terminate',

  // Action approval lifecycle (Gateway → Kernel)
  ACTION_PUSH: 'action.push',
  ACTION_PUSH_BATCH: 'action.push-batch',
  ACTION_GET: 'action.get',
  ACTION_GET_BATCH: 'action.get-batch',
  ACTION_QUERY: 'action.query',
  ACTION_VOTE: 'action.vote',
  ACTION_CANCEL_BATCH: 'action.cancel-batch',

  // Write-call resolution (Kernel → Worker)
  WRITE_CALLS_REQUEST: 'write.calls.request',
  WRITE_CALLS_RESPONSE: 'write.calls.response'
}

const COMMAND_SCOPES = {
  DEVICE: 'device',
  WORKER: 'worker',
  RACK: 'rack'
}

const VALID_COMMAND_SCOPES = new Set(Object.values(COMMAND_SCOPES))

const VALID_COMMAND_RESULT_STATUSES = new Set([
  ...Object.values(COMMAND_STATES),
  'REJECTED'
])

const MAX_TARGETS = 1024

/**
 * MDK Protocol message types
 */
const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  EVENT: 'event'
}

const PROTOCOL_VERSION = '0.2.0'

module.exports = {
  ACTIONS,
  COMMAND_SCOPES,
  VALID_COMMAND_SCOPES,
  VALID_COMMAND_RESULT_STATUSES,
  MAX_TARGETS,
  MESSAGE_TYPES,
  PROTOCOL_VERSION
}
