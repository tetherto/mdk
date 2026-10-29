'use strict'

const debug = require('debug')('mdk:kernel:dispatcher')
const { validate: validateEnvelope } = require('../../protocol/envelope')
const { COMMAND_SCOPES } = require('../../protocol/actions')
const { validateParams, normalizeParams } = require('../../protocol/params')

const DEFAULT_VERIFY_WITHIN_MS = 60000

/**
 * Command Dispatcher
 *
 * Validates incoming commands against the MDK schema, checks deviceId
 * exists in the Worker Registry, validates the command and its params against
 * the worker's declared capabilities (a command the target does not declare is
 * rejected), and hands off to the Command State Machine. Every attempt,
 * accepted or rejected, goes to the write-command log when one is set.
 *
 * State machine:
 *   Validating → RoutingAction → Enqueued | Rejected
 */
class CommandDispatcher {
  constructor (opts) {
    this.registry = opts.registry
    this.stateMachine = opts.stateMachine
    this.commandLog = opts.commandLog || null
  }

  /**
   * @param {object} envelope - command.request envelope
   * @param {object} [opts]
   * @param {string} [opts.requesterId] - authenticated caller identity (the
   *   transport public key); falls back to envelope.sender for in-process calls
   * @param {string[]} [opts.roles] - the roles spec.rbac binds to the caller, for the log
   * @param {{ requesterId: string, roles: string[] }} [opts.via] - the app that acted for
   *   the requester (an operator), when it did
   */
  async dispatch (envelope, opts) {
    const result = await this._admit(envelope, opts)
    await this.recordAttempt(envelope, opts, result)
    return result
  }

  // A failed log write never fails the command: it may already be on its way
  // to the device, and a caller that saw an error could send it again.
  async recordAttempt (envelope, opts, result) {
    if (!this.commandLog) return
    const payload = (envelope && envelope.payload) || {}
    try {
      await this.commandLog.append({
        event: 'attempt',
        commandId: result.commandId || null,
        caller: { key: (opts && opts.requesterId) || (envelope && envelope.sender) || null, roles: (opts && opts.roles) || null },
        ...(opts && opts.via ? { via: { key: opts.via.requesterId, roles: opts.via.roles || null } } : {}),
        command: payload.command || null,
        scope: payload.scope || COMMAND_SCOPES.DEVICE,
        deviceId: (envelope && envelope.deviceId) || null,
        workerId: payload.workerId || null,
        targets: Array.isArray(payload.targets) ? payload.targets : null,
        params: payload.params || {},
        outcome: result.status || 'REJECTED',
        error: result.error || null
      })
    } catch (err) {
      debug('command log append failed: %s', err.message)
    }
  }

  async getLog (query) {
    return { entries: this.commandLog ? await this.commandLog.query(query) : [] }
  }

  async _admit (envelope, opts) {
    const validation = validateEnvelope(envelope)
    if (!validation.valid) {
      return { error: validation.error, status: 'REJECTED' }
    }

    const payload = envelope.payload || {}
    const { command, params } = payload
    if (!command) return { error: 'ERR_COMMAND_REQUIRED', status: 'REJECTED' }

    const target = this._resolveTarget(envelope, payload)
    if (target.error) return { error: target.error, status: 'REJECTED' }

    if (!this.registry.isRoutable(target.resolution.workerId)) {
      return { error: 'ERR_WORKER_NOT_ROUTABLE', status: 'REJECTED' }
    }

    const check = this._validateCommand(command, params, target.capabilities)
    if (!check.valid) return { error: check.error, status: 'REJECTED' }

    const commandId = await this.stateMachine.enqueue({
      scope: target.scope,
      deviceId: target.deviceId,
      workerId: target.resolution.workerId,
      targets: target.targets,
      command,
      params: params || {},
      requesterId: (opts && opts.requesterId) || envelope.sender,
      ...(opts && opts.via ? { via: opts.via.requesterId } : {}),
      verify: target.deviceId ? _verifySpec(_commandDef(command, target.capabilities), params || {}) : null
    })

    debug('dispatched: %s (%s %s → %s)', commandId, command, target.scope, target.routeKey)
    return { commandId, status: 'QUEUED' }
  }

  _resolveTarget (envelope, payload) {
    const scope = payload.scope || COMMAND_SCOPES.DEVICE

    if (scope === COMMAND_SCOPES.WORKER || scope === COMMAND_SCOPES.RACK) {
      if (!payload.workerId) return { error: 'ERR_WORKER_ID_REQUIRED' }
      const resolution = this.registry.resolveWorker(payload.workerId)
      if (!resolution) return { error: 'ERR_WORKER_NOT_FOUND' }
      return {
        scope,
        resolution,
        capabilities: this.registry.getWorkerCapabilities(resolution.workerId),
        deviceId: null,
        targets: Array.isArray(payload.targets) ? payload.targets : null,
        routeKey: resolution.workerId
      }
    }

    if (!envelope.deviceId) return { error: 'ERR_DEVICE_ID_REQUIRED' }
    const resolution = this.registry.resolveWorkerForDevice(envelope.deviceId)
    if (!resolution) return { error: 'ERR_DEVICE_NOT_FOUND' }
    return {
      scope,
      resolution,
      capabilities: this.registry.getCapabilities(envelope.deviceId),
      deviceId: envelope.deviceId,
      targets: null,
      routeKey: envelope.deviceId
    }
  }

  async getStatus (commandId) {
    if (!commandId) return { error: 'ERR_COMMAND_ID_REQUIRED', status: 'REJECTED' }
    const entry = await this.stateMachine.getState(commandId)
    if (!entry) return { error: 'ERR_COMMAND_NOT_FOUND', status: 'REJECTED' }
    return {
      commandId,
      status: entry.state,
      command: entry.command,
      deviceId: entry.deviceId || null,
      workerId: entry.workerId || null,
      scope: entry.scope || COMMAND_SCOPES.DEVICE,
      result: entry.result || null,
      error: entry.error || null,
      verification: entry.verification || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }
  }

  async cancel (commandId) {
    if (!commandId) return { error: 'ERR_COMMAND_ID_REQUIRED', status: 'REJECTED' }
    const cancelled = await this.stateMachine.cancel(commandId)
    return { commandId, cancelled }
  }

  _validateCommand (command, params, capabilities) {
    const cmdDef = _commandDef(command, capabilities)
    if (!cmdDef) return { valid: false, error: `ERR_COMMAND_NOT_IN_CAPABILITIES: ${command}` }
    const invalid = validateParams(cmdDef.params, normalizeParams(cmdDef.params, params))
    return invalid ? { valid: false, error: invalid } : { valid: true }
  }
}

function _commandDef (command, capabilities) {
  const commands = capabilities && capabilities.commands
  if (!commands) return undefined
  return Array.isArray(commands)
    ? commands.find(c => c.name === command)
    : (Object.hasOwn(commands, command) ? commands[command] : undefined)
}

// The expected value is the request's own param, read the way the Worker
// names positional params ({ value } / { args }) from the approval path.
function _verifySpec (cmdDef, params) {
  const verify = cmdDef && cmdDef.verify
  if (!verify) return null
  const expected = normalizeParams(cmdDef.params, params)[verify.param]
  if (expected === undefined) return null
  return { telemetry: verify.telemetry, expected, withinMs: verify.withinMs || DEFAULT_VERIFY_WITHIN_MS }
}

module.exports = { CommandDispatcher }
