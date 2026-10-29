'use strict'

const async = require('async')
const mingo = require('mingo')
const {
  ACTION_NEG_VOTES_THRESHOLD,
  PUSH_ACTIONS_BATCH_LIMIT,
  BATCH_ACTION_QUERY_WINDOW_MS
} = require('./constants')
const { hasWritePermission } = require('../../permissions')
const { createActionCallerProxy } = require('./caller-proxy')
const { assertSafeQuery, assertSafeProjection } = require('./query-guard')
const { redactSecrets } = require('./redact')

const isNil = (value) => value === null || value === undefined

// The device ids in an action's targets (`{ workerId: { calls: [{ id }] } }`)
// that `canWrite` refuses.
function _deniedCalls (targets, canWrite) {
  const denied = []
  for (const workerId in targets || {}) {
    for (const call of targets[workerId].calls || []) if (!canWrite(call.id)) denied.push(call.id)
  }
  return denied
}

/**
 * Action Manager
 *
 * Handles the action approval lifecycle at the Kernel layer.
 * Methods mirror legacy Worker kernel RPC handlers but are invoked
 * via MDK protocol envelopes (action.push, action.vote, etc.).
 */
class ActionManager {
  /**
   * @param {object} opts
   * @param {import('@tetherto/svc-facs-action-approver')} opts.actionApprover
   * @param {import('./action-caller')} opts.actionCaller
   */
  constructor (opts) {
    this._actionApprover = opts.actionApprover
    this._actionCaller = opts.actionCaller
    this._store = opts.store
    this._actionIntvlMs = opts.actionIntvlMs
  }

  async start () {
    await this._actionApprover.initDb(this._store)
    this._actionApprover.initWrk(createActionCallerProxy(this._actionCaller))
    this._actionApprover.startInterval(this._actionIntvlMs)
  }

  /**
   * @param {object} req
   * @param {{ canWrite?: (deviceId: string) => boolean }} [opts] - the caller's
   *   device rule from spec.rbac: a push reaching any device it may not write is
   *   refused whole. With it, the payload's self-asserted `authPerms` are ignored.
   */
  async pushAction (req, opts = {}) {
    const { query, action, params, voter, authPerms, batchActionUID } = req

    const { targets, requiredPerms } = await this._actionCaller.getWriteCalls(
      query,
      action,
      params,
      opts.canWrite ? null : authPerms
    )

    if (opts.canWrite) {
      const denied = _deniedCalls(targets, opts.canWrite)
      if (denied.length) return { id: null, errors: [`ERR_KERNEL_ACTION_FORBIDDEN: may not write ${denied.join(', ')}`] }
    }

    let reqVotes = 1
    let callCount = 0
    const errors = []
    for (const workerId in targets) {
      const entry = targets[workerId]
      reqVotes = entry.reqVotes > reqVotes ? entry.reqVotes : reqVotes
      delete entry.reqVotes
      callCount += entry.calls.length

      if (!entry.calls.length) {
        errors.push(`${workerId}: ${entry.error || 'ERR_KERNEL_ACTION_CALLS_EMPTY'}`)
      }
    }
    if (callCount === 0) {
      errors.push('ERR_KERNEL_ACTION_CALLS_EMPTY')
      return { id: null, errors }
    }

    const data = await this._actionApprover.pushAction({
      action,
      payload: [params, targets, requiredPerms],
      voter,
      reqVotesPos: reqVotes,
      reqVotesNeg: ACTION_NEG_VOTES_THRESHOLD,
      batchActionUID
    })
    return { id: data.id, data, errors }
  }

  async pushActionsBatch (req, opts) {
    const { batchActionsPayload, voter, authPerms, batchActionUID, suffix } = req
    const batchTs = Date.now()
    if (!Array.isArray(batchActionsPayload)) {
      throw new Error('ERR_PAYLOAD_INVALID')
    }

    return await async.mapLimit(
      batchActionsPayload,
      PUSH_ACTIONS_BATCH_LIMIT,
      async ({ query, action, params }) => {
        return await this.pushAction({
          query,
          action,
          params,
          voter,
          authPerms,
          ...(batchActionUID
            ? { batchActionUID: `${batchTs}-${batchActionUID}${suffix ? `-${suffix}` : ''}` }
            : {})
        }, opts)
      }
    )
  }

  async getAction (req) {
    const { id, type } = req
    const { data } = await this._actionApprover.getAction(type, id)
    return this._unpackActionData(data)
  }

  async getActionsBatch (req) {
    const { ids } = req

    const res = await Promise.all(ids.map(async (id) => {
      const types = ['voting', 'ready', 'executing', 'done']
      const queryRes = await Promise.allSettled(
        types.map(t => this._actionApprover.getAction(t, id))
      )

      for (let i = 0; i < types.length; i++) {
        const type = types[i]
        const entry = queryRes[i]
        if (entry.status === 'fulfilled') {
          return { type, action: this._unpackActionData(entry.value.data) }
        }
      }

      return null
    }))

    return res.filter(Boolean)
  }

  async cancelActionsBatch (req) {
    const { ids, voter } = req
    return await this._actionApprover.cancelActionsBatch({ ids, voter })
  }

  /**
   * @param {object} req
   * @param {{ canWrite?: (deviceId: string) => boolean }} [opts] - the voter's
   *   device rule from spec.rbac: a vote on an action that writes any device the
   *   voter may not write is refused. With it, the payload's `authPerms` are
   *   ignored; without it (in-process calls) they decide, as before.
   */
  async voteAction (req, opts = {}) {
    const { id, voter, approve, authPerms } = req
    const { data } = await this._actionApprover.getAction('voting', id)
    if (opts.canWrite) {
      const denied = _deniedCalls(data.payload[1], opts.canWrite)
      if (denied.length) throw new Error(`ERR_KERNEL_ACTION_FORBIDDEN: may not write ${denied.join(', ')}`)
    } else {
      const requiredBaseTypePerms = data.payload[2]
      if (!requiredBaseTypePerms.every(baseType => hasWritePermission(authPerms, baseType))) {
        throw new Error('ERR_ACTION_DENIED')
      }
    }

    await this._actionApprover.voteAction({ id, voter, approve })
    return 1
  }

  async queryActions (req) {
    const { queries, suffix, groupBatch = false } = req

    if (!Array.isArray(queries)) {
      throw new Error('ERR_QUERIES_INVALID')
    }

    queries.forEach(query => {
      if (!query || !query.type || typeof query.type !== 'string') {
        throw new Error('ERR_QUERIES_TYPE_INVALID')
      }
      assertSafeQuery(query.query)
      assertSafeProjection(query.fields)
    })

    const res = {}
    await async.mapLimit(queries, 25, async ({ type, filter, opts, query, fields }) => {
      const actions = await this._queryActionsByType(type, filter, opts, groupBatch)
      res[type] = this._filterData(actions, { query, fields, suffix })
    })
    return res
  }

  // Shapes a stored record for a caller. Params are redacted here, before any
  // caller query filter runs, so secrets can neither be read nor probed.
  _unpackActionData (data) {
    data.requiredPerms = data.payload[2]
    data.targets = data.payload[1]
    data.params = redactSecrets(data.payload[0])
    delete data.payload
    return data
  }

  async _getActionsFromQueryStream (queryStream) {
    const res = []
    for await (const entry of queryStream) {
      this._unpackActionData(entry)
      for (const target of Object.values(entry.targets)) {
        target.calls?.forEach(call => {
          delete call.tags
        })
      }
      res.push(entry)
    }
    return res
  }

  async _getActionsByBatchUID (batchUID, type) {
    const timestamp = batchUID.split('-')[0]
    const range = {
      gte: Number(timestamp),
      lte: Number(timestamp) + BATCH_ACTION_QUERY_WINDOW_MS
    }
    const queryStream = this._actionApprover.query(type, range)
    const actions = await this._getActionsFromQueryStream(queryStream)
    return actions.filter(action => action.batchActionUID === batchUID)
  }

  _getOneActionPerBatch (actions) {
    const existingBatch = new Set()
    const result = []
    for (const action of actions) {
      if (!action.batchActionUID) {
        result.push(action)
      } else if (!existingBatch.has(action.batchActionUID)) {
        existingBatch.add(action.batchActionUID)
        result.push(action)
      }
    }
    return result
  }

  async _groupBatchActions (filteredActions, type) {
    const groupedActions = []
    await async.mapLimit(
      filteredActions,
      10,
      async (action) => {
        const batchActionUID = action.batchActionUID
        if (batchActionUID) {
          const actions = await this._getActionsByBatchUID(batchActionUID, type)
          groupedActions.push({
            batchActionUID,
            id: batchActionUID.split('-')[0],
            actions
          })
        } else {
          groupedActions.push(action)
        }
      }
    )
    return groupedActions
  }

  async _queryActionsByType (type, filter, opts, groupBatch = false) {
    const queryStream = this._actionApprover.query(type, filter, opts)
    const res = await this._getActionsFromQueryStream(queryStream)
    if (!groupBatch) return res
    const filteredActions = this._getOneActionPerBatch(res)
    return await this._groupBatchActions(filteredActions, type)
  }

  _filterData (data, req = {}) {
    if (!isNil(req.query) || !isNil(req.fields)) {
      const query = new mingo.Query(req.query || {})
      data = query.find(data, req.fields || {}).all()
    }
    if (req.suffix) {
      data = data.filter(item => item.batchActionUID?.endsWith(req.suffix))
    }
    return data
  }
}

module.exports = { ActionManager }
