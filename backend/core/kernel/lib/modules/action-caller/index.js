'use strict'

const async = require('async')
const mingo = require('mingo')
const { ACTIONS, MESSAGE_TYPES, COMMAND_SCOPES } = require('../../protocol/actions')
const { build } = require('../../protocol/envelope')
const { validateWriteCallsResponse } = require('../../protocol/schemas')
const { WORKER_WRITE_ACTION_TYPES } = require('./constants')
const { hasWritePermission } = require('../../permissions')
const { isPlainObject } = require('@bitfinex/lib-js-util-base')
const debug = require('debug')('mdk:kernel:dispatcher')

class ActionCaller {
  /**
   * @param {object} opts
   * @param {import('../worker-registry')} opts.registry
   * @param {import('../../transport/worker-channel').WorkerChannel} opts.workerChannel
   * @param {import('../command-dispatcher')} opts.dispatcher
   * @param {string} [opts.kernelId]
   * @param {number} [opts.callTargetsLimit]
   * @param {number} [opts.getWriteCallsLimit]
   */
  constructor (opts) {
    this._registry = opts.registry
    this._workerChannel = opts.workerChannel
    this._dispatcher = opts.dispatcher
    this._kernelId = opts.kernelId || 'kernel:kernel:default'
    this._callTargetsLimit = opts.callTargetsLimit || 50
    this._getWriteCallsLimit = opts.getWriteCallsLimit || 5
    this.rackActions = new Set([
      WORKER_WRITE_ACTION_TYPES.REGISTER_THING,
      WORKER_WRITE_ACTION_TYPES.UPDATE_THING,
      WORKER_WRITE_ACTION_TYPES.FORGET_THINGS,
      WORKER_WRITE_ACTION_TYPES.RACK_REBOOT
    ])
  }

  /**
   * @param {object} query
   * @param {string} action
   * @param {any[]} params
   * @param {string[]|null} permissions - `<family>:w` strings naming the device
   *   families to ask; null asks every family (a caller checked by spec.rbac,
   *   whose device rule is applied to the calls that come back)
   */
  async getWriteCalls (query, action, params, permissions) {
    if (!isPlainObject(query)) {
      throw new Error('ERR_QUERY_INVALID')
    }

    try {
      const mingoQuery = new mingo.Query(query)
      if (!mingoQuery) throw new Error('ERR_QUERY_INVALID')
    } catch (e) {
      throw new Error('ERR_QUERY_INVALID')
    }

    if (!action || typeof action !== 'string') {
      throw new Error('ERR_ACTION_INVALID')
    }
    if (!Array.isArray(params)) {
      throw new Error('ERR_PARAMS_INVALID')
    }

    const targets = {}
    const requiredPerms = new Set()
    const workers = this._registry.getReadyWorkers()

    await async.eachLimit(workers, this._getWriteCallsLimit, async (worker) => {
      const baseType = worker.deviceFamily
      if (!baseType || (permissions !== null && !hasWritePermission(permissions, baseType))) {
        return
      }
      if (!worker.channel) {
        return
      }

      try {
        let rackActionId
        if (this.rackActions.has(action)) {
          this._validateRackAction(action, params)

          // params[0].workerId was params[0].rackId previously
          if (action !== WORKER_WRITE_ACTION_TYPES.RACK_REBOOT && params[0].workerId !== worker.workerId) {
            return
          }

          rackActionId = params[0]?.id || params[0]?.query?.id || worker.workerId
        }

        const envelope = build({
          action: ACTIONS.WRITE_CALLS_REQUEST,
          type: MESSAGE_TYPES.REQUEST,
          sender: this._kernelId,
          target: worker.workerId,
          payload: { query, action, params, rackActionId }
        })

        const response = await this._workerChannel.send(worker.channel, envelope)
        const res = this._unwrapPayload(response, ACTIONS.WRITE_CALLS_RESPONSE)
        const check = validateWriteCallsResponse(res)
        if (!check.valid) throw new Error(check.error)

        // A Worker answers for its own devices only: calls naming another
        // Worker's devices (or, for a rack action, any id but the one asked
        // about) are dropped, so an approved write cannot be redirected.
        const calls = this._ownedCalls(worker.workerId, action, res.calls, rackActionId)
        if (calls.length) {
          targets[worker.workerId] = { reqVotes: res.reqVotes, calls }
          requiredPerms.add(baseType)
        } else if (res.calls.length) {
          targets[worker.workerId] = { reqVotes: 1, calls: [], error: 'ERR_WRITE_CALLS_NOT_OWNED' }
        }
      } catch (err) {
        debug(`getWriteCalls failed for ${worker.workerId}: ${err.message}`)
        targets[worker.workerId] = { reqVotes: 1, calls: [], error: err.message }
      }
    })

    return { targets, requiredPerms: Array.from(requiredPerms) }
  }

  /**
   * Keep the calls `workerId` may answer for, copied to `{ id, tags }` so a
   * Worker cannot pre-set result fields. Duplicate ids are dropped.
   */
  _ownedCalls (workerId, action, calls, rackActionId) {
    const rackAction = this.rackActions.has(action)
    const seen = new Set()
    const owned = []
    for (const call of calls) {
      if (seen.has(call.id)) continue
      const ok = rackAction ? call.id === rackActionId : this._ownsDevice(workerId, call.id)
      if (!ok) {
        debug(`dropping write call ${call.id} from ${workerId}: not owned`)
        continue
      }
      seen.add(call.id)
      owned.push({ id: call.id, tags: Array.isArray(call.tags) ? call.tags.filter(t => typeof t === 'string') : [] })
    }
    return owned
  }

  _ownsDevice (workerId, deviceId) {
    const entry = this._registry.resolveWorkerForDevice(deviceId)
    return !!entry && entry.workerId === workerId
  }

  _validateRackAction (action, params) {
    if (action === WORKER_WRITE_ACTION_TYPES.RACK_REBOOT) {
      return
    }
    if (!params[0]?.workerId) {
      throw new Error('ERR_ACTION_INVALID_MISSING_WORKER_ID')
    }

    if (action === WORKER_WRITE_ACTION_TYPES.UPDATE_THING && !params[0]?.id) {
      throw new Error('ERR_ACTION_INVALID_MISSING_ID')
    }

    if (action === WORKER_WRITE_ACTION_TYPES.FORGET_THINGS && typeof params[0]?.query?.id !== 'string') {
      throw new Error('ERR_ACTION_INVALID_QUERY_ID')
    }
  }

  /**
   * @param {string} workerId
   * @param {string} deviceId
   * @param {string} action
   * @param {any[]} params
   */
  async _callTarget (workerId, deviceId, action, params) {
    const commandParams = this._formatCommandParams(action, params)
    const rackAction = this.rackActions.has(action)

    const payload = {
      command: action,
      params: commandParams,
      requesterId: this._kernelId
    }

    let envelopeDeviceId = deviceId
    if (rackAction) {
      envelopeDeviceId = null
      payload.scope = action === WORKER_WRITE_ACTION_TYPES.RACK_REBOOT
        ? COMMAND_SCOPES.RACK
        : COMMAND_SCOPES.WORKER
      payload.workerId = workerId
    }

    const envelope = build({
      action: ACTIONS.COMMAND_REQUEST,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._kernelId,
      deviceId: envelopeDeviceId,
      payload
    })

    const result = await this._dispatcher.dispatch(envelope)
    if (result.status === 'REJECTED') {
      throw new Error(result.error)
    }

    return result.commandId
  }

  /**
   * @param {string} action
   * @param {any[]} params
   * @param {Object<string, { calls: Array<{id: string, tags: string[]}>, error?: string }>} targets
   */
  async callTargets (action, params, targets) {
    if (!isPlainObject(targets)) throw new Error('ERR_TARGETS_INVALID')
    const rackAction = this.rackActions.has(action)
    const calls = Object.entries(targets).map(
      ([workerId, entry]) => (entry && Array.isArray(entry.calls) ? entry.calls : []).map(call => ({ workerId, call }))
    ).flat(1)

    await async.eachLimit(calls, this._callTargetsLimit, async ({ workerId, call }) => {
      try {
        // Re-checked at execution: the device may have moved to another
        // Worker since the action was staged.
        if (!rackAction && !this._ownsDevice(workerId, call.id)) throw new Error('ERR_DEVICE_NOT_OWNED')
        const commandId = await this._callTarget(workerId, call.id, action, params)
        call.commandId = commandId
      } catch (err) {
        call.error = err.message
      }
    })
  }

  _formatCommandParams (action, params) {
    const opts = params[params.length - 1]
    const hasOpts = opts && typeof opts === 'object' && !Array.isArray(opts) && ('actionId' in opts && 'user' in opts)
    const baseParams = hasOpts ? params.slice(0, -1) : params

    if (this.rackActions.has(action)) {
      switch (action) {
        case WORKER_WRITE_ACTION_TYPES.REGISTER_THING:
        case WORKER_WRITE_ACTION_TYPES.UPDATE_THING: {
          const formatted = { ...(baseParams[0] || {}) }
          formatted.actionId = opts.actionId
          formatted.user = opts.user
          return formatted
        }
        case WORKER_WRITE_ACTION_TYPES.FORGET_THINGS: {
          const formatted = { query: baseParams[0]?.query }
          formatted.actionId = opts.actionId
          return formatted
        }
        default:
          return {}
      }
    }

    if (baseParams.length === 1 && typeof baseParams[0] === 'object' && !Array.isArray(baseParams[0])) {
      return baseParams[0]
    }

    if (baseParams.length === 1) {
      return { value: baseParams[0] }
    }

    return { args: baseParams }
  }

  _unwrapPayload (response, expectedAction) {
    if (!response || typeof response !== 'object') {
      throw new Error('ERR_WORKER_RESPONSE_INVALID')
    }
    if (response.error) {
      throw new Error(response.error)
    }
    if (response.payload && typeof response.payload === 'object') {
      if (response.payload.error) {
        throw new Error(response.payload.error)
      }
      return response.payload
    }
    if (response.action === expectedAction) {
      return response.payload || response
    }
    return response
  }
}

module.exports = { ActionCaller }
