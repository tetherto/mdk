'use strict'

const async = require('async')
const { applyFilters } = require('../utils')

/**
 * Write-call approval surface for the Kernel action-approver flow
 * (`write.calls.request`). Actions must be whitelisted with their required
 * vote count; per-device validation is the injected
 * validateWriteAction(device, action, params) — wire it to the vendor
 * client's validateWriteAction. Non-whitelisted actions answer zero calls.
 */
class ActionsService {
  constructor ({ listDevices, validateWriteAction, maxParallelWriteValidations }) {
    this.listDevices = listDevices || (() => [])
    this.validateWriteAction = validateWriteAction || (async () => 1)
    this.maxParallelWriteValidations = maxParallelWriteValidations || 5
    this.allowedActions = new Map()
  }

  whitelistActions (actions) {
    for (const [action, reqVotes] of actions) {
      this.allowedActions.set(action, reqVotes)
    }
  }

  delistActions (actions) {
    for (const action of actions) {
      this.allowedActions.delete(action)
    }
  }

  async getWriteCalls (data) {
    const { query, action, params = [], rackActionId = null } = data

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

    const devices = applyFilters(this.listDevices(), { query, limit: 100000 }, true)

    await async.eachLimit(devices, this.maxParallelWriteValidations, async (dev) => {
      await this.validateWriteAction(dev, action, params)
      res.calls.push({
        id: dev.id,
        tags: dev.tags || []
      })
    })

    return res
  }
}

module.exports = ActionsService
