'use strict'

const async = require('async')
const NetFacility = require('@tetherto/hp-svc-facs-net')
const Hyperbee = require('hyperbee')
const mingo = require('mingo')
const { isPlainObject } = require('@bitfinex/lib-js-util-base')
const { ACTION_TYPES } = require('./constants')
const { hasWritePermission } = require('./permissions')

class ActionCaller {
  /**
   * @param {NetFacility} net
   * @param {Hyperbee} racks
   * @param {number} callTargetsLimit
   * @param {Object} orkInstance - Reference to the ORK worker instance for ORK-level actions
   * @param {Object} orkActionsConfig - Configuration for ORK-level actions (whitelist, reqVotes, etc.)
   * @param {Hyperbee} configsDb - Database for storing configs (pool configs, etc.)
   * @param {Object} actionConfigResolvers - Configuration for resolving action params from configs
   * @example actionConfigResolvers format:
   * {
   *   setupPools: {
   *     configIdParam: 'poolConfigId',  // Param field containing config ID
   *     configType: 'pool'              // Config type prefix in DB (e.g., 'pool:id')
   *   }
   * }
   * The full config object is passed to the action. The device worker handles the transformation.
   */
  constructor (net, racks, callTargetsLimit = 50, orkInstance = null, orkActionsConfig = {}, configsDb = null, actionConfigResolvers = {}) {
    if (!(net instanceof NetFacility)) {
      throw new Error('ERR_NET_INVALID_INSTANCE')
    }

    if (!(racks instanceof Hyperbee)) {
      throw new Error('ERR_RACKS_INSTANCE_INVALID')
    }

    this._net = net
    this._racks = racks
    this._orkInstance = orkInstance
    this._orkActionsConfig = orkActionsConfig
    this._configsDb = configsDb
    this._actionConfigResolvers = actionConfigResolvers
    this.rackActions = new Set([ACTION_TYPES.REGISTER_THING, ACTION_TYPES.UPDATE_THING, ACTION_TYPES.FORGET_THINGS, ACTION_TYPES.RACK_REBOOT])
    this.orkActions = new Set([ACTION_TYPES.REGISTER_CONFIG, ACTION_TYPES.UPDATE_CONFIG, ACTION_TYPES.DELETE_CONFIG])
    this._callTargetsLimit = callTargetsLimit
  }

  /**
   * Check if an ORK action is whitelisted and enabled
   * @param {string} action
   * @returns {boolean}
   */
  isOrkActionAllowed (action) {
    const config = this._orkActionsConfig[action]
    return config && config.enabled === true
  }

  /**
   * Get the required votes for an ORK action
   * @param {string} action
   * @returns {number}
   */
  getOrkActionReqVotes (action) {
    const config = this._orkActionsConfig[action]
    return config?.reqVotes || 1
  }

  /**
   * Get the required permissions for an ORK action (to submit)
   * @param {string} action
   * @returns {string[]}
   */
  getOrkActionRequiredPerms (action) {
    const config = this._orkActionsConfig[action]
    return config?.requiredPerms || []
  }

  /**
   * Get the required permissions to approve an ORK action
   * @param {string} action
   * @returns {string[]}
   */
  getOrkActionApprovalPerms (action) {
    const config = this._orkActionsConfig[action]
    // If no approvalPerms specified, use requiredPerms as fallback
    return config?.approvalPerms || config?.requiredPerms || []
  }

  /**
   * Resolves action params from a stored config based on actionConfigResolvers configuration
   * Fetches the full config and passes it to the action. The device worker handles transformation.
   * @param {string} action - The action name
   * @param {Object} params - The action params (first element of params array)
   * @returns {Promise<Array|null>} - Config data as params array or null if no resolution needed
   */
  async _resolveActionConfig (action, params) {
    const resolver = this._actionConfigResolvers[action]
    if (!resolver) {
      return null
    }

    const { configIdParam, configType } = resolver

    const configId = params?.[configIdParam]
    if (!configId) {
      return null
    }

    if (!this._configsDb) {
      throw new Error('ERR_CONFIGS_DB_NOT_AVAILABLE')
    }

    const dbKey = `${configType}:${configId}`
    const configData = await this._configsDb.get(dbKey)

    if (!configData) {
      throw new Error('ERR_CONFIG_NOT_FOUND')
    }

    const config = JSON.parse(configData.value.toString())
    if (config?.status !== 'approved') {
      throw new Error('ERR_CONFIG_NOT_APPROVED')
    }

    return [{ config }]
  }

  /**
   * @param {string} rack
   * @param {string} id
   * @param {string} method
   * @param {any[]} params
   */
  async _callThing (rack, id, method, params) {
    const raw = await this._racks.get(rack)
    const entry = JSON.parse(raw.value.toString())

    if (this.rackActions.has(method)) {
      let formattedParams = {}
      let query
      switch (method) {
        case ACTION_TYPES.REGISTER_THING:
        case ACTION_TYPES.UPDATE_THING: {
          formattedParams = params[0]
          const paramOpts = params[params.length - 1]
          formattedParams.actionId = paramOpts.actionId
          formattedParams.user = paramOpts.user
          break
        }

        case ACTION_TYPES.FORGET_THINGS: {
          query = params[0]?.query
          const paramOpts = params[params.length - 1]
          const actionId = paramOpts.actionId
          formattedParams = { query, actionId }
          break
        }
      }
      return this._net.jRequest(
        entry.info.rpcPublicKey,
        method,
        formattedParams
      )
    }

    let resolvedParams = params
    const resolved = await this._resolveActionConfig(method, params[0])
    if (resolved) {
      resolvedParams = resolved
    }

    return this._net.jRequest(
      entry.info.rpcPublicKey,
      'queryThing',
      { id, method, params: resolvedParams }
    )
  }

  /**
   * @param {object} query
   * @param {string} action
   * @param {any[]} params
   * @param {string[]} rackTypes
   * @returns {Promise<{
    *  requiredPerms: string[],
    *  targets: Object<
    *    string, {
    *      reqVotes: number,
    *      calls: Array<{id: string, tags: string[]}>,
    *      error?: string,
    *      isOrkAction?: boolean
    *    }>
   *  }>}
   */
  async getWriteCalls (query, action, params, permissions) {
    if (!isPlainObject(query)) {
      throw new Error('ERR_QUERY_INVALID')
    }

    try {
      // invalid mongo query throws error
      const mingoQuery = new mingo.Query(query)
      if (!mingoQuery) throw new Error('ERR_QUERY_INVALID')
    } catch (e) { throw new Error('ERR_QUERY_INVALID') }

    if (!action || typeof action !== 'string') {
      throw new Error('ERR_ACTION_INVALID')
    }
    if (!Array.isArray(params)) {
      throw new Error('ERR_PARAMS_INVALID')
    }

    if (this.orkActions.has(action)) {
      if (!this.isOrkActionAllowed(action)) {
        throw new Error('ERR_ORK_ACTION_NOT_ALLOWED')
      }

      const requiredPerms = this.getOrkActionRequiredPerms(action)
      for (const perm of requiredPerms) {
        if (!hasWritePermission(permissions, perm)) {
          throw new Error('ERR_PERMISSION_DENIED')
        }
      }

      const approvalPerms = this.getOrkActionApprovalPerms(action)

      return {
        targets: {
          ork: {
            reqVotes: this.getOrkActionReqVotes(action),
            calls: [{ id: 'ork', tags: [] }],
            isOrkAction: true,
            approvalPerms
          }
        },
        requiredPerms,
        approvalPerms
      }
    }

    const targets = {}
    const stream = this._racks.createReadStream()
    const limit = 5
    const requiredPerms = new Set()

    await async.eachLimit(stream, limit, async (raw) => {
      const entry = JSON.parse(raw.value.toString())
      const baseType = entry.type.split('-')[0]

      if (!hasWritePermission(permissions, baseType)) {
        return
      }

      try {
        let rackActionId
        if (this.rackActions.has(action)) {
          this._validateRackAction(action, params)

          // if not reboot action then only add actions for rackId in params
          if (action !== ACTION_TYPES.RACK_REBOOT && params[0].rackId !== entry.id) return

          rackActionId = params[0]?.id || params[0]?.query?.id || entry.id
        }

        const res = await this._net.jRequest(
          entry.info.rpcPublicKey,
          'getWriteCalls',
          { query, action, params, rackActionId },
          { timeout: 120000 }
        )

        if (res.calls.length) {
          targets[entry.id] = { reqVotes: res.reqVotes, calls: res.calls }
          requiredPerms.add(baseType)
        }
      } catch (err) {
        console.error(`getWriteCalls failed for ${entry.id}`, err)
        targets[entry.id] = { reqVotes: 1, calls: [], error: err.message }
      }
    })

    return { targets, requiredPerms: Array.from(requiredPerms) }
  }

  /**
   * @param {string} action
   * @param {any[]} params
   */
  _validateRackAction (action, params) {
    if (action === ACTION_TYPES.RACK_REBOOT) {
      return
    }
    if (!params[0]?.rackId) {
      throw new Error('ERR_ACTION_INVALID_MISSING_RACKID')
    }

    if (action === ACTION_TYPES.UPDATE_THING && !params[0]?.id) {
      throw new Error('ERR_ACTION_INVALID_MISSING_ID')
    }

    if (action === ACTION_TYPES.FORGET_THINGS && typeof params[0]?.query?.id !== 'string') {
      throw new Error('ERR_ACTION_INVALID_QUERY_ID')
    }
  }

  /**
   * @param {string} action
   * @param {any[]} params
   * @param {Object<string, { calls: Array<{id: string, tags: string[]}>, error?: string, isOrkAction?: boolean }>} targets
   */
  async callTargets (action, params, targets) {
    if (this.orkActions.has(action) && targets.ork?.isOrkAction) {
      if (!this._orkInstance) {
        throw new Error('ERR_ORK_INSTANCE_NOT_SET')
      }

      const orkMethod = this._orkInstance[action]
      if (typeof orkMethod !== 'function') {
        throw new Error('ERR_ORK_METHOD_NOT_FOUND')
      }

      try {
        const result = await orkMethod.call(this._orkInstance, params[0])
        targets.ork.calls[0].result = result
      } catch (err) {
        targets.ork.calls[0].error = err.message
      }
      return
    }

    const calls = Object.entries(targets).map(
      ([rack, entry]) => entry.calls.map(call => [rack, call])
    ).flat(1)

    await async.eachLimit(calls, this._callTargetsLimit, async ([rack, call]) => {
      try {
        const result = await this._callThing(rack, call.id, action, params)
        call.result = result
      } catch (err) {
        call.error = err.message
      }
    })
  }
}

module.exports = ActionCaller
