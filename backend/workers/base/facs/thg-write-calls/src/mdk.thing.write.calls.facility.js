'use strict'

const async = require('async')
const BaseFacility = require('@bitfinex/bfx-facs-base')

class MDKThingWriteCallsFacility extends BaseFacility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)

    this.name = 'mdk-thing-write-calls'
    this._hasConf = false

    this.init()
  }

  init () {
    super.init()

    /** @type {Map<string, number>} */
    this.allowedActions = new Map()
  }

  bindWriteCalls (netFac = 'net_r0') {
    this.caller[netFac].rpcServer.respond('getWriteCalls', async (data) => {
      const net = this.caller[netFac]

      try {
        data = net.parseInputJSON(data)
        const res = await this.getWriteCalls(data)
        return net.toOutJSON(res)
      } catch (e) {
        return net.toOutJSON(`[HRPC_ERR]=${e.message}`)
      }
    })
  }

  /**
   * @param {Object} data
   * @param {Object} data.query
   * @param {string} data.action
   * @param {any[]} data.params
   * @returns {Promise<{
   *    reqVotes: number,
   *    calls: Array<{id: string, tags: string[]}>,
   *    error?: string
   * }>}
   */
  async getWriteCalls (data) {
    const { query, action, params, rackActionId = null } = data

    const res = {
      calls: [],
      reqVotes: 1
    }

    if (!this.allowedActions.has(action)) {
      return res
    }
    res.reqVotes = this.allowedActions.get(action)

    if (rackActionId) {
      res.calls.push({
        id: rackActionId,
        tags: []
      })
      return res
    }

    const thgs = this.caller.listThings({
      query,
      limit: 100000
    })
    const limit = this.opts.maxParallelWriteValidations || 5
    await async.eachLimit(thgs, limit, async (thg) => {
      await this.caller.queryThing({ id: thg.id, method: 'validateWriteAction', params: [action, ...params] })
      res.calls.push({
        id: thg.id,
        tags: thg.tags
      })
    })

    return res
  }

  /**
   * @param  {Array<[string, number]>} actions
   */
  async whitelistActions (actions) {
    for (const [action, reqVotes] of actions) {
      this.allowedActions.set(action, reqVotes)
    }
  }

  /**
   * @param {string[]} actions
   */
  async delistActions (actions) {
    for (const action of actions) {
      this.allowedActions.delete(action)
    }
  }
}

module.exports = MDKThingWriteCallsFacility
