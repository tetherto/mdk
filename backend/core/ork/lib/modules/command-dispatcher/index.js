'use strict'

const debug = require('debug')('mdk:ork:dispatcher')
const { validate: validateEnvelope } = require('../../protocol/envelope')

/**
 * Command Dispatcher
 *
 * Validates incoming commands against the MDK schema, checks deviceId
 * exists in the Worker Registry, validates the command against the worker's
 * declared capabilities, and hands off to the Command State Machine.
 *
 * State machine:
 *   Validating → RoutingAction → Enqueued | Rejected
 */
class CommandDispatcher {
  constructor (opts) {
    this.registry = opts.registry
    this.stateMachine = opts.stateMachine
  }

  async dispatch (envelope) {
    const validation = validateEnvelope(envelope)
    if (!validation.valid) {
      return { error: validation.error, status: 'REJECTED' }
    }

    const { deviceId } = envelope
    const { command, params } = envelope.payload || {}

    if (!deviceId) return { error: 'ERR_DEVICE_ID_REQUIRED', status: 'REJECTED' }
    if (!command) return { error: 'ERR_COMMAND_REQUIRED', status: 'REJECTED' }

    const resolution = this.registry.resolveWorkerForDevice(deviceId)
    if (!resolution) return { error: 'ERR_DEVICE_NOT_FOUND', status: 'REJECTED' }
    if (!this.registry.isRoutable(resolution.workerId)) {
      return { error: 'ERR_WORKER_NOT_ROUTABLE', status: 'REJECTED' }
    }

    const capabilities = this.registry.getCapabilities(deviceId)
    if (capabilities) {
      const check = this._validateCommand(command, params, capabilities)
      if (!check.valid) return { error: check.error, status: 'REJECTED' }
    }

    const commandId = await this.stateMachine.enqueue({
      deviceId,
      command,
      params: params || {},
      requesterId: envelope.sender
    })

    debug(`dispatched: ${commandId} (${command} → ${deviceId})`)
    return { commandId, status: 'QUEUED' }
  }

  _validateCommand (command, params, capabilities) {
    if (!capabilities.commands) return { valid: true }

    const commands = capabilities.commands
    const cmdDef = Array.isArray(commands)
      ? commands.find(c => c.name === command)
      : commands[command]

    if (!cmdDef) {
      return { valid: false, error: `ERR_COMMAND_NOT_IN_CAPABILITIES: ${command}` }
    }

    if (cmdDef.params && Array.isArray(cmdDef.params) && params) {
      for (const paramDef of cmdDef.params) {
        const value = params[paramDef.name]
        if (value === undefined) continue

        if (paramDef.type === 'number' && typeof value !== 'number') {
          return { valid: false, error: `ERR_PARAM_TYPE: ${paramDef.name} must be number` }
        }
        if (paramDef.type === 'string' && typeof value !== 'string') {
          return { valid: false, error: `ERR_PARAM_TYPE: ${paramDef.name} must be string` }
        }
        if (paramDef.type === 'number') {
          if (paramDef.min !== undefined && value < paramDef.min) {
            return { valid: false, error: `ERR_PARAM_RANGE: ${paramDef.name} below min ${paramDef.min}` }
          }
          if (paramDef.max !== undefined && value > paramDef.max) {
            return { valid: false, error: `ERR_PARAM_RANGE: ${paramDef.name} above max ${paramDef.max}` }
          }
        }
      }
    }

    return { valid: true }
  }
}

module.exports = { CommandDispatcher }
