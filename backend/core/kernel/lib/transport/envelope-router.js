'use strict'

const { validate: validateEnvelope } = require('../protocol/envelope')
const { ACTIONS } = require('../protocol/actions')

/**
 * Shared envelope routing for Kernel listeners (HRPC).
 *
 * @param {object} envelope
 * @param {object} deps
 * @param {import('../modules/command-dispatcher')} deps.dispatcher
 * @param {import('../modules/telemetry-collector')} deps.telemetryCollector
 * @param {import('../modules/worker-registry')} deps.registry
 * @param {import('../modules/action-manager')} deps.actionManager
 */
async function routeEnvelope (envelope, deps) {
  const validation = validateEnvelope(envelope)
  if (!validation.valid) return { error: validation.error }

  const { dispatcher, telemetryCollector, registry, actionManager } = deps

  switch (envelope.action) {
    case ACTIONS.COMMAND_REQUEST:
      return dispatcher.dispatch(envelope)
    case ACTIONS.COMMAND_STATUS:
      return dispatcher.getStatus(envelope.payload && envelope.payload.commandId)
    case ACTIONS.COMMAND_CANCEL:
      return dispatcher.cancel(envelope.payload && envelope.payload.commandId)
    case ACTIONS.TELEMETRY_PULL:
      return telemetryCollector.pull(
        envelope.deviceId,
        envelope.payload && envelope.payload.query
      )
    case ACTIONS.STATE_PULL:
      return telemetryCollector.pullState(envelope.deviceId)
    case ACTIONS.WORKER_LIST:
      return { workers: registry.listWorkers() }
    case ACTIONS.DEVICE_CAPABILITIES:
      return { capabilities: registry.getCapabilities(envelope.deviceId) }
    case ACTIONS.WORKER_TERMINATE: {
      const { workerId } = envelope.payload || {}
      if (!workerId) return { error: 'ERR_WORKER_ID_REQUIRED' }
      await registry.terminate(workerId)
      return { status: 'TERMINATED', workerId }
    }
    case ACTIONS.ACTION_PUSH:
      return actionManager.pushAction(envelope.payload)
    case ACTIONS.ACTION_PUSH_BATCH:
      return actionManager.pushActionsBatch(envelope.payload)
    case ACTIONS.ACTION_GET:
      return actionManager.getAction(envelope.payload)
    case ACTIONS.ACTION_GET_BATCH:
      return actionManager.getActionsBatch(envelope.payload)
    case ACTIONS.ACTION_QUERY:
      return actionManager.queryActions(envelope.payload)
    case ACTIONS.ACTION_VOTE:
      return actionManager.voteAction(envelope.payload)
    case ACTIONS.ACTION_CANCEL_BATCH:
      return actionManager.cancelActionsBatch(envelope.payload)
    default:
      return { error: `ERR_UNKNOWN_ACTION: ${envelope.action}` }
  }
}

module.exports = { routeEnvelope }
