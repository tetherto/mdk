'use strict'

const async = require('async')
const TetherWrkBase = require('@tetherto/tether-wrk-base/workers/base.wrk.tether')
const debug = require('debug')('ork:aggr')
const gLibStats = require('../../lib-stats')
const mingo = require('mingo')
const ActionCaller = require('./lib/action.caller')
const { cloneDeep, isNil, isEmpty } = require('@bitfinex/lib-js-util-base')
const { differenceInDays, addDays } = require('date-fns')
const { daysTo24HrIntervals, isCurrentDay, sortThings } = require('./lib/util')
const {
  OPTIONAL_CONFIGS,
  RPC_METHODS,
  COMMENT_ACTION,
  INVALID_ACTIONS_ERRORS,
  DEFAULT_TIMEZONE,
  CONFIG_TYPES,
  DEFAULT_ACTION_CONFIG_RESOLVERS
} = require('./lib/constants')
const aggrCrossthg = require('./lib/aggr.crossthg')
const { setTimeout: sleep } = require('timers/promises')
const { createDataProxy } = require('./lib/data.proxy')

class WrkProcAggr extends TetherWrkBase {
  constructor (conf, ctx) {
    if (!ctx.cluster) {
      throw new Error('ERR_PROC_RACK_UNDEFINED')
    }
    ctx.rack = ctx.cluster // new base class uses rack arg
    super(conf, ctx)

    this.prefix = `${this.wtype}-${ctx.cluster}`

    this.loadConf('base.ork', 'ork')
    this._loadOptionalConfigs()

    this.crossActionsLRU = {}
    this.savedAggrKeys = {}
    this._racksCache = null

    ctx.isRpcMode = ctx.isRpcMode !== false
    ctx.libMap = new Map()
    const self = this
    this.dataProxy = createDataProxy({
      isRpcMode: ctx.isRpcMode,
      getRacksEntries () { return self._getRacksEntries() },
      get net_r0 () { return self.net_r0 },
      get libMap () { return ctx.libMap }
    })

    if (ctx.isRpcMode) {
      this.init()
      this.start()
    }
  }

  _loadOptionalConfigs () {
    OPTIONAL_CONFIGS.forEach(config => {
      try {
        this.loadConf(config.name, config.key)
      } catch (e) {
        this.debugError(`failed to load config ${config.name}`, e)
      }
    })
  }

  init () {
    super.init()

    this.setInitFacs([
      ['fac', '@bitfinex/bfx-facs-interval', '0', '0', {}, -10],
      ['fac', '@tetherto/hp-svc-facs-store', 's1', 's1', {
        storeDir: `store/${this.ctx.cluster}-db`
      }, -5],
      ['fac', '@tetherto/svc-facs-action-approver', '0', '0', {}, 20]
    ])
  }

  setFacs (facs) {
    this.interval_0 = facs.interval_0
    this.store_s1 = facs.store_s1
    this.actionApprover_0 = facs.actionApprover_0
  }

  debugGeneric (msg) {
    debug(`[STORE/${this.ctx.cluster}]`, ...arguments)
  }

  debugError (data, e, alert = false) {
    if (alert) {
      return console.error(`[STORE/${this.ctx.cluster}]`, data, e)
    }
    debug(`[STORE/${this.ctx.cluster}]`, data, e)
  }

  async _getRacksEntries () {
    if (this._racksCache) return this._racksCache
    const entries = []
    for await (const data of this.racks.createReadStream()) {
      entries.push(JSON.parse(data.value.toString()))
    }
    this._racksCache = entries
    return entries
  }

  async registerRack (req) {
    if (!req.id) {
      throw new Error('ERR_RACK_ID_INVALID')
    }

    if (!req.type) {
      throw new Error('ERR_RACK_TYPE_INVALID')
    }

    if (req.libInstance) {
      const { id, type, libInstance } = req
      this.ctx.libMap.set(id, { type, lib: libInstance })
      return 1
    }

    const info = req.info

    if (!info.rpcPublicKey) {
      throw new Error('ERR_RACK_INFO_RPC_PUBKEY_INVALID')
    }

    await this.racks.put(
      req.id,
      Buffer.from(JSON.stringify(req))
    )
    if (this._racksCache) {
      const idx = this._racksCache.findIndex(e => e.id === req.id)
      if (idx !== -1) {
        this._racksCache[idx] = req
      } else {
        this._racksCache.push(req)
      }
    }

    return 1
  }

  async forgetRacks (req) {
    const entries = await this._getRacksEntries()
    const toDelete = entries.filter(entry => {
      if (req.all) return true
      return Array.isArray(req.ids) && req.ids.includes(entry.id)
    })

    for (const entry of toDelete) {
      await this.racks.del(entry.id)
    }

    if (toDelete.length && this._racksCache) {
      const deletedIds = new Set(toDelete.map(e => e.id))
      this._racksCache = this._racksCache.filter(e => !deletedIds.has(e.id))
    }

    return toDelete.length
  }

  async listRacks (req) {
    if (req.type && typeof req.type !== 'string') {
      throw new Error('ERR_TYPE_INVALID')
    }

    const entries = await this._getRacksEntries()
    const res = entries.filter(entry => !req.type || entry.type.startsWith(req.type))

    if (!req.keys) {
      return res.map(entry => {
        // remove rpc key from info
        return { ...entry, info: {} }
      })
    }

    return res
  }

  async listThings (req) {
    const collection = await this.dataProxy.requestData('listThings', req, { timeout: 10000 })

    if (!req.sort) {
      return collection
    }
    if (!Array.isArray(collection)) {
      return []
    }
    return collection.sort((a, b) => sortThings(a, b, req.sort))
  }

  async getThingsCount (req) {
    const counts = await this.dataProxy.requestData('getThingsCount', req, { timeout: 10000 })
    return counts.reduce((acc, c) => acc + (c || 0), 0)
  }

  async getHistoricalLogs (req) {
    if (!req.logType) {
      throw new Error('ERR_LOG_TYPE_INVALID')
    }

    const collection = await this.dataProxy.requestData('getHistoricalLogs', req, { timeout: 10000 })

    if (!req.sort) {
      return collection
    }

    const query = new mingo.Query({})
    const cursor = query.find(collection).sort(req.sort)
    return cursor.all()
  }

  async forgetThings (req) {
    const collection = await this.dataProxy.requestData('forgetThings', req, { timeout: 10000 })

    return collection.reduce((acc, e) => {
      return acc + e
    }, 0)
  }

  async aggregateTailLogs () {
    if (this.aggregatingTailLogs) return
    this.aggregatingTailLogs = true

    try {
    // fetch and save aggr data for previous days
      let days = this.conf.aggrData.aggrTailLogStoreDays || 180
      const aggrTimezones = this.conf.globalConfig?.aggrTailLogTimezones || [{ code: DEFAULT_TIMEZONE, offset: 0 }]
      const timezoneIntervals = {}
      aggrTimezones.forEach(timezone => {
        // skip fetching data for previous days already fetched, unless next day begins
        if (this.lastFetchedAggrLogs && isCurrentDay(this.lastFetchedAggrLogs, timezone.offset)) {
          days = 1 // fetch only today's data
        }

        // break down days into 24 hour intervals
        timezoneIntervals[timezone.code] = daysTo24HrIntervals(days, timezone.offset)
      })

      // calculate tail-log aggregated data for each key/type
      const aggrTailLogKeys = this.conf.aggrData.aggrTailLogKeys || []
      for (const aggrTailLogKey of aggrTailLogKeys) {
        for (const [timezone, intervals] of Object.entries(timezoneIntervals)) {
          await this._saveAggrTaillogs(aggrTailLogKey, intervals, timezone)
        }
      }
      this.lastFetchedAggrLogs = Date.now()
    } catch (e) {
      this.debugError('aggregateTailLogs err', e)
    } finally {
      this.aggregatingTailLogs = false
    }
  }

  async _saveAggrTaillogs (aggrTailLogKey, intervals, timezone) {
    const { key, type, tag, fields, aggrFields, limit } = aggrTailLogKey
    for (const { startTs: start, endTs: end, index } of intervals) {
      // check if interval already fetched
      const aggrLogKey = `tail-log-${type}-${timezone}-day-${index}`
      const logIntervalKey = `${type}-${start}-${end}`
      let data = await this._getCachedAggrData(logIntervalKey)
      if (!data?.length) {
        // data is fetched in bg, add delay between calls
        await sleep(this.conf.aggrData.aggrTailLogApiDelay || 1000)
        data = await this.tailLog(this._getTailLogAggrParams({ key, type, tag, fields, aggrFields, start, end, limit }))
      }

      // save 24 hour aggregated tail-log data in db
      await this.tailLogAggrDb.put(aggrLogKey, Buffer.from(JSON.stringify(data)))
      if (index) this.savedAggrKeys[logIntervalKey] = aggrLogKey
    }
  }

  async _getCachedAggrData (logIntervalKey) {
    if (this.savedAggrKeys[logIntervalKey]) {
      const data = await this.tailLogAggrDb.get(this.savedAggrKeys[logIntervalKey])
      if (data) return JSON.parse(data.value.toString())
    }
    return null
  }

  _getTailLogAggrParams (opts) {
    const { key, type, tag, fields, aggrFields, start, end, limit } = opts
    return {
      key,
      type,
      tag,
      ...(fields ? { fields } : {}),
      ...(aggrFields ? { aggrFields } : {}),
      start,
      end,
      limit,
      aggrTimes: [{ start, end }]
    }
  }

  async tailLogCustomRangeAggr (req) {
    // check configs loaded
    if (!this.conf.aggrData || !this.conf.aggrStats) {
      throw new Error('ERR_NOT_CONFIGURED')
    }

    if (!Array.isArray(req.keys)) throw new Error('ERR_KEYS_INVALID')

    const aggrData = []
    for (const key of req.keys) {
      try {
        const data = await this._getTailLogRangeAggr(key)
        aggrData.push({ type: key.type, data, error: null })
      } catch (e) {
        this.debugError(`tailLogCustomRangeAggr ${key}`, e)
        aggrData.push({ type: key.type, data: null, error: e.message })
      }
    }

    return aggrData
  }

  _validateTaillogAggrReq (req) {
    const { type, startDate, endDate } = req

    if (!type) {
      throw new Error('ERR_TYPE_INVALID')
    }

    if (!startDate || isNaN(new Date(startDate).getTime())) {
      throw new Error('ERR_START_DATE_INVALID')
    }

    if (!endDate || isNaN(new Date(endDate).getTime())) {
      throw new Error('ERR_END_DATE_INVALID')
    }
  }

  _getTaillogAggrOps (logKey, type) {
    const state = { ops: {} }
    if (logKey.ops) {
      state.ops = logKey.ops
    } else {
      const ops = this.conf.aggrStats[type].ops
      for (const op in ops) {
        state.ops[op] = { src: op, op: ops[op].op }
      }
    }
    return state
  }

  async _getTailLogRangeAggr (req) {
    this._validateTaillogAggrReq(req)
    const { type, startDate, endDate, timezoneOffset = 0, fields = {} } = req

    // find timezone from offset
    const aggrTimezones = this.conf.globalConfig?.aggrTailLogTimezones || [{ code: DEFAULT_TIMEZONE, offset: 0 }]
    const timezone = aggrTimezones.find(t => t.offset === timezoneOffset)
    if (!timezone) throw new Error('ERR_TIMEZONE_OFFSET_INVALID')

    // fetch saved aggregated tail-logs within date range
    let aggrData = {}
    const aggrTailLogKeys = this.conf.aggrData.aggrTailLogKeys || []
    const logKey = aggrTailLogKeys.find(t => t.type === type)
    if (!logKey) return {}

    // zero index for most recent date, so start-date gives end-index
    const endIndex = differenceInDays(new Date(), new Date(startDate))
    const startIndex = differenceInDays(new Date(), new Date(endDate))

    // set aggregated keys for the ops
    const state = this._getTaillogAggrOps(logKey, type)

    // calculate aggrCount and aggrIntervals
    let aggrCount = 0
    let aggrIntervals = 0
    const dailyDataObjects = []
    const monthlyData = {}
    let currMonth
    let prevMonth

    // fetch daily aggr tail-log from db, aggr it further for the date range
    for (let i = startIndex; i <= endIndex; i++) {
      const ts = addDays(startDate, (i - startIndex)).getTime()
      let data = await this.tailLogAggrDb.get(`tail-log-${type}-${timezone.code}-day-${i}`)
      if (data) {
        data = JSON.parse(data.value.toString())

        // create arr of objects instead of aggregated data
        if (req.shouldReturnDailyData) {
          dailyDataObjects.push({ ts, val: this._projection(data, fields)[0] })
          continue
        }
        if (req.shouldReturnMonthlyData) {
          // group data by month
          prevMonth = currMonth
          currMonth = new Date(ts).getMonth() + 1
          if (!monthlyData[currMonth]) {
            if (prevMonth && !isEmpty(aggrData)) {
              gLibStats.tallyStats(state, aggrData)
              monthlyData[prevMonth] = cloneDeep(aggrData)
            }
            aggrData = {}
          }
        }

        for (const entry of data) {
          gLibStats.applyStats(state, aggrData, entry)

          aggrCount += entry.aggrCount || 0
          aggrIntervals += entry.aggrIntervals || 0
        }
        aggrData = this._projection([aggrData], logKey.aggrFields)[0]
      }
    }

    if (req.shouldReturnDailyData) {
      return dailyDataObjects
    }
    if (req.shouldReturnMonthlyData) {
      return Object.entries(monthlyData).map(e => ({ month: parseInt(e[0]), val: e[1] }))
    }

    gLibStats.tallyStats(state, aggrData)
    return { ...aggrData, aggrCount, aggrIntervals }
  }

  _projection (data, fields = {}) {
    const query = new mingo.Query({})
    const cursor = query.find(data, fields)
    return cursor.all()
  }

  _taillogProjections (req, specs) {
    const { aggrFields = {}, fields = {} } = req
    for (const field in aggrFields) {
      if (specs.ops[field]?.src) {
        fields[specs.ops[field].src] = aggrFields[field]
      }
    }
    // always read ts and aggrTsRange and aggrCount and aggrIntervals
    if (Object.keys(fields).length && !fields.ts) fields.ts = 1
    if (Object.keys(aggrFields).length && !aggrFields.ts) aggrFields.ts = 1
    if (Object.keys(aggrFields).length && !aggrFields.aggrTsRange) aggrFields.aggrTsRange = 1
    if (Object.keys(aggrFields).length && !aggrFields.aggrCount) aggrFields.aggrCount = 1
    if (Object.keys(aggrFields).length && !aggrFields.aggrIntervals) aggrFields.aggrIntervals = 1

    return { fields, aggrFields }
  }

  _getTaillogSpecs (type) {
    // check optional config loaded
    if (!this.conf.aggrStats) {
      throw new Error('ERR_NOT_CONFIGURED')
    }

    if (!type) {
      throw new Error('ERR_TYPE_INVALID')
    }

    const specs = this.conf.aggrStats
    const btype = type.split('-')[0]

    if (!specs[btype]) {
      throw new Error('ERR_TYPE_AGGR_INVALID')
    }

    return specs[btype]
  }

  async tailLog (req) {
    const specs = this._getTaillogSpecs(req.type)
    const { aggrFields, fields } = this._taillogProjections(req, specs)
    // set fields to fetch from racks
    req.fields = fields

    let res = await this.dataProxy.requestData('tailLog', req, { timeout: 10000, type: req.type })

    const aggrTimes = req.aggrTimes
    res = res.reduce((acc, item) => {
      let grps = [item.ts]
      if (aggrTimes?.length) {
        const ranges = aggrTimes.filter(val => item.ts >= val.start && item.ts <= val.end)
        grps = ranges.map(range => `${range.start}-${range.end}`)
      }

      grps.forEach(grp => {
        acc[grp] = acc[grp] ?? []

        // aggrTimes ranges can share object instances, make a copy to avoid calc overlap
        if (aggrTimes?.length > 1) {
          item = cloneDeep(item)
        }

        acc[grp].push(item)
      })

      return acc
    }, {})

    const state = {}
    const aggr = []

    state.ops = specs.ops

    try {
      for (const k in res) {
        const tf = res[k]
        if (!tf.length) {
          continue
        }

        const acc = {
          ts: aggrTimes?.length ? 0 : tf[0].ts,
          aggrTsRange: aggrTimes?.length ? k : '',
          aggrCount: tf.length
        }

        // find unique intervals count
        const uniqueIntervals = new Set()

        for (const entry of tf) {
          gLibStats.applyStats(state, acc, entry)

          // filter out objects with just ts property
          if (Object.keys(entry).length > 1) {
            uniqueIntervals.add(entry.ts)
          }
        }
        acc.aggrIntervals = uniqueIntervals.size

        gLibStats.tallyStats(state, acc)

        aggr.push(acc)
      }
    } catch (e) {
      this.debugGeneric(e)
    }

    aggr.sort((a, b) => {
      return a.ts - b.ts
    })

    // check if cross thing aggregation type
    if (req.applyAggrCrossthg && this.conf.aggrCrossthg?.[req.type]) {
      await aggrCrossthg.call(this, aggr, this.conf.aggrCrossthg[req.type])
    }

    return this._projection(aggr, aggrFields)
  }

  async tailLogMulti (req) {
    const { keys, ...reqParams } = req

    if (!Array.isArray(keys)) throw new Error('ERR_KEYS_INVALID')

    const missingType = keys.find(val => !val.type)
    if (missingType) throw new Error('ERR_TYPE_INVALID')

    return await async.mapLimit(
      keys,
      5,
      async key => await this.tailLog({ ...key, ...reqParams })
    )
  }

  async _thgCommentsAction (req, methodName) {
    if (!req.rackId) throw new Error('ERR_RACK_ID_INVALID')
    if (!req.thingId) throw new Error('ERR_THING_ID_INVALID')

    try {
      const res = await this.dataProxy.requestRackData(req.rackId, methodName, req, { timeout: 10000 })
      return res ?? 0
    } catch (e) {
      this.debugError(`${methodName} ${req.rackId}`, e, true)
      return 0
    }
  }

  async saveThingComment (req) {
    return this._thgCommentsAction(req, COMMENT_ACTION.ADD)
  }

  async editThingComment (req) {
    return this._thgCommentsAction(req, COMMENT_ACTION.EDIT)
  }

  async deleteThingComment (req) {
    return this._thgCommentsAction(req, COMMENT_ACTION.DELETE)
  }

  async pushActionsBatch (req) {
    const { batchActionsPayload, voter, authPerms } = req
    let { batchActionUID, suffix } = req
    const batchTs = Date.now()
    if (batchActionUID) batchActionUID = `${batchTs}-${batchActionUID}`
    if (suffix) batchActionUID = `${batchActionUID}-${suffix}`
    if (!Array.isArray(batchActionsPayload)) {
      throw new Error('ERR_PAYLOAD_INVALID')
    }

    return await async.mapLimit(
      batchActionsPayload,
      5,
      async ({ query, action, params, rackType = null }) => {
        return await this.pushAction({
          query,
          action,
          params,
          voter,
          authPerms,
          ...(batchActionUID ? { batchActionUID } : {}),
          rackType
        })
      }
    )
  }

  async _shouldSkipRackType (type, rack) {
    if (!type) return false
    const rackEntry = await this.racks.get(rack)
    if (!rackEntry) return false
    const raw = rackEntry.value != null ? rackEntry.value : rackEntry
    const rackData = JSON.parse(raw.toString())
    return rackData.type !== type && !rackData.type.startsWith(`${type}-`)
  }

  async pushAction (req) {
    const { query, action, params, voter, authPerms, batchActionUID, rackType = null } = req

    const { targets, requiredPerms, approvalPerms } = await this.actionCaller.getWriteCalls(query, action, params, authPerms)

    let reqVotes = 1
    let callCount = 0
    const errors = []
    for (const rack in targets) {
      if (await this._shouldSkipRackType(rackType, rack)) continue

      const entry = targets[rack]
      reqVotes = entry.reqVotes > reqVotes ? entry.reqVotes : reqVotes
      delete entry.reqVotes
      // Clean up approvalPerms from targets (stored at payload level)
      delete entry.approvalPerms
      callCount += entry.calls.length

      if (entry.error && INVALID_ACTIONS_ERRORS.some(err => entry.error.includes(err))) {
        continue
      }

      if (!entry.calls.length) {
        this.debugError({ rack, entry }, 'ERR_ORK_ACTION_CALLS_EMPTY')
        errors.push(`${rack}: ${entry.error || 'ERR_ORK_ACTION_CALLS_EMPTY'}`)
      }
    }
    if (callCount === 0) {
      errors.push('ERR_ORK_ACTION_CALLS_EMPTY')
      return { id: null, errors }
    }

    const data = await this.actionApprover_0.pushAction({
      action,
      payload: [params, targets, requiredPerms, approvalPerms],
      voter,
      reqVotesPos: reqVotes,
      // All the actions would denied by single negative vote.
      reqVotesNeg: 1,
      batchActionUID
    })
    return { id: data.id, data, errors }
  }

  async getGlobalConfig (req) {
    const fields = req.fields || {}
    if (!this.conf?.globalConfig) {
      throw new Error('ERR_GLOBAL_CONFIG_MISSING')
    }
    return this._projection([this.conf.globalConfig], fields)?.[0]
  }

  async getWrkConf (req) {
    if (!req.type) {
      throw new Error('ERR_TYPE_INVALID')
    }

    return await this.dataProxy.requestData('getWrkConf', req, { timeout: 10000, type: req.type })
  }

  async getThingConf (req) {
    if (!req.type) {
      throw new Error('ERR_TYPE_INVALID')
    }

    return await this.dataProxy.requestData('getThingConf', req, { timeout: 10000, type: req.type })
  }

  async getAction (req) {
    const { id, type } = req
    const { data } = await this.actionApprover_0.getAction(type, id)
    // split targets, call params, required perms and approval perms
    data.requiredPerms = data.payload[2]
    data.approvalPerms = data.payload[3] || data.payload[2]
    data.targets = data.payload[1]
    data.params = data.payload[0]
    delete data.payload

    return data
  }

  async getActionsBatch (req) {
    const { ids } = req

    const res = await Promise.all(ids.map(async (id) => {
      const types = ['voting', 'ready', 'executing', 'done']
      const queryRes = await Promise.allSettled(types.map(t => this.actionApprover_0.getAction(t, id)))

      for (let i = 0; i < types.length; i++) {
        const type = types[i]
        const entry = queryRes[i]
        if (entry.status === 'fulfilled') {
          const action = entry.value.data
          // split targets, call params, required perms and approval perms
          action.requiredPerms = action.payload[2]
          action.approvalPerms = action.payload[3] || action.payload[2]
          action.targets = action.payload[1]
          action.params = action.payload[0]
          delete action.payload
          return { type, action }
        }
      }

      return null
    }))

    return res.filter(Boolean)
  }

  async cancelActionsBatch (req) {
    const { ids, voter } = req
    return await this.actionApprover_0.cancelActionsBatch({ ids, voter })
  }

  async voteAction (req) {
    const { id, voter, approve, authPerms } = req
    const { data } = await this.actionApprover_0.getAction('voting', id)
    // Use approvalPerms (payload[3]) if present, fallback to requiredPerms (payload[2])
    // approvalPerms controls who can vote/approve, requiredPerms controls who can submit
    const approvalPerms = data.payload[3] || data.payload[2]
    if (!approvalPerms.every(p => authPerms.includes(p))) {
      throw new Error('ERR_ACTION_DENIED')
    }

    await this.actionApprover_0.voteAction({ id, voter, approve })
    return 1
  }

  /**
   * Retrieves all actions associated with a given batch UID by querying within a small time window around its timestamp.
   *
   * @private
   * @async
   * @param {string} batchUID - The batch UID string, where the timestamp is expected to be the first part before a dot (e.g., "1747137700278.something").
   * @param {"voting" | "done" | "ready" | "executing"} type - The type of actions to query for.
   * @returns {Promise<Array<Object>>} - A Promise that resolves to an array of action objects retrieved from the query.
   *
   * @example
   * const actions = await _getActionsByBatchUID("1747137700278.someId", "done");
   */
  async _getActionsByBatchUID (batchUID, type) {
    const timestamp = batchUID.split('-')[0]
    const range = {
      gte: Number(timestamp),
      lte: Number(timestamp) + 2 * 60 * 1000
    }
    const queryStream = this.actionApprover_0.query(type, range)
    return await this._getActionsFromQueryStream(queryStream)
  }

  async _getActionsFromQueryStream (queryStream) {
    const res = []
    for await (const entry of queryStream) {
      // split targets, call params, required perms and approval perms
      entry.requiredPerms = entry.payload[2]
      entry.approvalPerms = entry.payload[3] || entry.payload[2]
      entry.targets = entry.payload[1]
      entry.params = entry.payload[0]
      delete entry.payload
      for (const target of Object.values(entry.targets)) {
        target.calls?.forEach(call => {
          delete call.tags
        })
      }

      res.push(entry)
    }
    return res
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

  _filterInvalidActionsErrors (actions) {
    return actions.filter(a => {
      const targets = a.targets || {}
      for (const rack in targets) {
        const entry = targets[rack]
        if (!entry.error || !INVALID_ACTIONS_ERRORS.some(err => entry.error.includes(err))) {
          return true
        }
      }
      return false
    })
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

  /**
   * Queries actions from the action approver by a specified type and filter.
   * Optionally groups the results by `batchActionUID` if `groupBatch` is true.
   *
   * @private
   * @async
   * @param {"voting" | "done" | "ready" | "executing"} type - The type of actions to retrieve.
   * @param {{
   *   gt?: number,
   *   gte?: number,
   *   lt?: number,
   *   lte?: number
   * }} filter - A filter object defining the range criteria for the query.
   * @param {{
   *   limit?: number
   * }} opts - Additional options for the query, such as a result limit.
   * @param {boolean} [groupBatch=false] - Whether to group the results by batch.
   * @returns {Promise<Array<Object> | Array<{
   *   batchActionUID: string,
   *   id: string,
   *   actions: Array<Object>
   * }>>} - Returns a Promise that resolves to either a flat array of action objects or an array of grouped batch objects.
   *
   * @example
   * await _queryActionsByType('voting', { gt: 1747137700000 }, { limit: 100 }, true)
   */
  async _queryActionsByType (type, filter, opts, groupBatch = false) {
    const queryStream = this.actionApprover_0.query(type, filter, opts)
    const res = await this._getActionsFromQueryStream(queryStream)
    if (!groupBatch) return res
    let filteredActions = this._getOneActionPerBatch(res)
    if (type === 'done') {
      filteredActions = this._filterInvalidActionsErrors(filteredActions)
    }
    return await this._groupBatchActions(filteredActions, type)
  }

  _filterData (data, req = {}) {
    if (!isNil(req.query) || !isNil(req.fields)) {
      const query = new mingo.Query(req.query || {})
      data = query.find(data, req.fields || {}).all()
    }
    return data
  }

  async queryActions (req) {
    const { queries, suffix, groupBatch = false } = req

    if (!Array.isArray(queries)) {
      throw new Error('ERR_QUERIES_INVALID')
    }

    queries.forEach(query => {
      if (!query.type || typeof query.type !== 'string') {
        throw new Error('ERR_QUERIES_TYPE_INVALID')
      }
    })
    const res = {}
    await async.mapLimit(queries, 25, async ({ type, filter, opts, query, fields }) => {
      const actions = await this._queryActionsByType(type, filter, opts, groupBatch)

      let finalQuery = query || {}
      if (suffix) {
        const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        finalQuery = {
          ...finalQuery,
          batchActionUID: { $regex: new RegExp(`${escapedSuffix}$`) }
        }
      }

      res[type] = this._filterData(actions, { query: finalQuery, fields })
    })
    return res
  }

  async getWrkExtData (req) {
    if (!req.type) {
      throw new Error('ERR_TYPE_INVALID')
    }

    let res = await this.dataProxy.requestData('getWrkExtData', req, { timeout: 10000, type: req.type })

    let specs = this.conf.aggrStats
    const btype = req.type.split('-')[0]
    if (!specs[btype]) return res

    specs = specs[btype]
    res = res.reduce((acc, item) => {
      const grps = [item.ts]
      grps.forEach(grp => {
        acc[grp] = acc[grp] ?? []
        acc[grp].push(item)
      })
      return acc
    }, {})

    const state = { ops: specs.ops }
    const aggr = []
    for (const k in res) {
      const tf = res[k]
      if (!tf.length) continue
      const acc = { ts: k }
      for (const entry of tf) {
        gLibStats.applyStats(state, acc, entry)
      }
      gLibStats.tallyStats(state, acc)
      aggr.push(acc)
    }

    // check if cross thing aggregation type
    if (req.applyAggrCrossthg && this.conf.aggrCrossthg?.[req.type]) {
      await aggrCrossthg.call(this, aggr, this.conf.aggrCrossthg[req.type])
    }

    return aggr
  }

  async crossAggrActions () {
    if (!this.conf.globalConfig?.isAutoSleepAllowed) return
    const conf = this.conf.crossAggrAction
    if (!conf) return
    const {
      tagPrefix,
      crossThingType,
      action,
      voter,
      params,
      authPerms,
      listThingsReq,
      crossThingsActionReq
    } = conf

    if (
      !tagPrefix ||
      !crossThingType ||
      !action ||
      !params ||
      !Array.isArray(params) ||
      !authPerms ||
      !Array.isArray(authPerms) ||
      !crossThingsActionReq
    ) {
      this.debugError('ERR_CROSS_AGGR_ACTIONS_INVALID_CONFIG')
      return
    }
    const listThingsResponse = await this.listThings(listThingsReq)
    if (!Array.isArray(listThingsResponse)) {
      this.debugError('ERR_CROSS_AGGR_ACTIONS_INVALID_LIST_THINGS_RESPONSE')
      return
    }

    await async.eachLimit(listThingsResponse, 25, async (thing) => {
      if (!thing.tags || !Array.isArray(thing.tags)) {
        this.debugError('ERR_CROSS_AGGR_ACTIONS_THING_TAGS_INVALID')
        return
      }
      const tag = thing.tags.find((tag) => tag.includes(tagPrefix))
      if (!tag) return
      const crossThingDevices = [
        { tags: { $in: [`t-${crossThingType}`] } },
        { tags: { $in: [tag] } }
      ]
      const query = {
        $and: crossThingDevices
      }
      const now = Date.now()
      const lastActionAt = this.crossActionsLRU[`${crossThingType}_${tag}`]
      if ((now - lastActionAt) < (this.conf.crossAggrAction.minActionTsDiff || 60000)) {
        return
      }
      const thingsNeedAction = await this.listThings({
        query: {
          $and: [
            ...crossThingDevices,
            ...crossThingsActionReq.devicesCondition
          ]
        },
        fields: crossThingsActionReq.fields
      })
      if (!thingsNeedAction?.length) return
      try {
        await this.pushAction({
          query,
          action,
          params,
          voter: voter || 'MDK AUTOMATION',
          authPerms
        })
        this.crossActionsLRU[`${crossThingType}_${tag}`] = now
      } catch (e) {
        this.debugError('ERR_CROSS_AGGR_ACTIONS_PUSH_ACTION', e, true)
      }
    })
  }

  async getWrkSettings (req) {
    if (!req.rackId || (typeof req.rackId !== 'string')) throw new Error('ERR_RACK_ID_INVALID')

    try {
      const res = await this.dataProxy.requestRackData(req.rackId, 'getWrkSettings', req, { timeout: 10000 })
      return res ?? 0
    } catch (e) {
      this.debugError(`getWrkSettings ${req.rackId}`, e, true)
      throw new Error('ERR_GET_SETTINGS_FAILED')
    }
  }

  async saveWrkSettings (req) {
    if (!req.rackId || (typeof req.rackId !== 'string')) throw new Error('ERR_RACK_ID_INVALID')
    if (!req.entries || (typeof req.entries !== 'object')) throw new Error('ERR_ENTRIES_INVALID')

    try {
      const res = await this.dataProxy.requestRackData(req.rackId, 'saveWrkSettings', req, { timeout: 10000 })
      return res ?? 0
    } catch (e) {
      this.debugError(`saveWrkSettings ${req.rackId}`, e, true)
      throw new Error('ERR_SAVE_SETTINGS_FAILED')
    }
  }

  async setGlobalConfig (req) {
    if (isEmpty(req)) throw new Error('ERR_CONFIG_INVALID')
    if (!this.conf.globalConfig) throw new Error('ERR_GLOBAL_CONFIG_NOT_FOUND')
    if (!isNil(req.isAutoSleepAllowed) && typeof req.isAutoSleepAllowed === 'boolean') {
      this.conf.globalConfig.isAutoSleepAllowed = req.isAutoSleepAllowed
      return this.conf.globalConfig
    }
    return null
  }

  // ============ Generic Config CRUD Methods ============

  _generateConfigId () {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  _validateConfigType (type) {
    const validTypes = Object.values(CONFIG_TYPES)
    if (!type || !validTypes.includes(type)) {
      throw new Error('ERR_CONFIG_TYPE_INVALID')
    }
  }

  _getConfigDbKey (type, id) {
    return `${type}:${id}`
  }

  _validatePoolConfigData (data) {
    if (!data.poolConfigName || typeof data.poolConfigName !== 'string') {
      throw new Error('ERR_POOL_CONFIG_NAME_INVALID')
    }
    if (data.description !== undefined && typeof data.description !== 'string') {
      throw new Error('ERR_DESCRIPTION_INVALID')
    }
    if (!Array.isArray(data.poolUrls) || data.poolUrls.length === 0) {
      throw new Error('ERR_POOL_URLS_INVALID')
    }
    for (const poolUrl of data.poolUrls) {
      if (!poolUrl.url || typeof poolUrl.url !== 'string') {
        throw new Error('ERR_POOL_URL_INVALID')
      }
      if (!poolUrl.workerName || typeof poolUrl.workerName !== 'string') {
        throw new Error('ERR_WORKER_NAME_INVALID')
      }
      if (!poolUrl.workerPassword || typeof poolUrl.workerPassword !== 'string') {
        throw new Error('ERR_WORKER_PASSWORD_INVALID')
      }
      if (!poolUrl.pool || typeof poolUrl.pool !== 'string') {
        throw new Error('ERR_POOL_INVALID')
      }
    }
  }

  _validateConfigData (type, data) {
    switch (type) {
      case CONFIG_TYPES.POOL:
        this._validatePoolConfigData(data)
        break
      default:
        throw new Error('ERR_CONFIG_TYPE_INVALID')
    }
  }

  async registerConfig (req) {
    const { type, data } = req

    this._validateConfigType(type)

    if (!data) {
      throw new Error('ERR_CONFIG_DATA_MISSING')
    }

    this._validateConfigData(type, data)

    const now = Date.now()
    const id = this._generateConfigId()
    const config = {
      id,
      type,
      ...data,
      status: 'approved',
      createdAt: now,
      updatedAt: now
    }

    const dbKey = this._getConfigDbKey(type, id)
    await this.configsDb.put(dbKey, Buffer.from(JSON.stringify(config)))

    return config
  }

  async updateConfig (req) {
    const { type, id, data } = req

    this._validateConfigType(type)

    if (!id) {
      throw new Error('ERR_CONFIG_ID_MISSING')
    }

    const dbKey = this._getConfigDbKey(type, id)
    const existingData = await this.configsDb.get(dbKey)
    if (!existingData) {
      throw new Error('ERR_CONFIG_NOT_FOUND')
    }

    const existingConfig = JSON.parse(existingData.value.toString())

    // Merge new data into existing config
    const updatedConfig = { ...existingConfig }

    if (type === CONFIG_TYPES.POOL) {
      if (data.poolConfigName !== undefined) {
        if (typeof data.poolConfigName !== 'string' || !data.poolConfigName) {
          throw new Error('ERR_POOL_CONFIG_NAME_INVALID')
        }
        updatedConfig.poolConfigName = data.poolConfigName
      }
      if (data.description !== undefined) {
        if (typeof data.description !== 'string') {
          throw new Error('ERR_DESCRIPTION_INVALID')
        }
        updatedConfig.description = data.description
      }
      if (data.poolUrls !== undefined) {
        if (!Array.isArray(data.poolUrls) || data.poolUrls.length === 0) {
          throw new Error('ERR_POOL_URLS_INVALID')
        }
        for (const poolUrl of data.poolUrls) {
          if (!poolUrl.url || typeof poolUrl.url !== 'string') {
            throw new Error('ERR_POOL_URL_INVALID')
          }
          if (!poolUrl.workerName || typeof poolUrl.workerName !== 'string') {
            throw new Error('ERR_WORKER_NAME_INVALID')
          }
          if (!poolUrl.workerPassword || typeof poolUrl.workerPassword !== 'string') {
            throw new Error('ERR_WORKER_PASSWORD_INVALID')
          }
          if (!poolUrl.pool || typeof poolUrl.pool !== 'string') {
            throw new Error('ERR_POOL_INVALID')
          }
        }
        updatedConfig.poolUrls = data.poolUrls
      }
    }

    if (data.status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(data.status)) {
        throw new Error('ERR_STATUS_INVALID')
      }
      updatedConfig.status = data.status
    }

    updatedConfig.updatedAt = Date.now()

    await this.configsDb.put(dbKey, Buffer.from(JSON.stringify(updatedConfig)))

    return updatedConfig
  }

  async getConfigs (req) {
    const { type, query = {}, fields = {} } = req || {}

    this._validateConfigType(type)

    const prefix = `${type}:`
    const stream = this.configsDb.createReadStream({
      gte: prefix,
      lt: `${type};` // Character after ':'
    })

    const configs = []
    for await (const entry of stream) {
      const config = JSON.parse(entry.value.toString())
      configs.push(config)
    }

    return this._filterData(configs, { query, fields })
  }

  async deleteConfig (req) {
    const { type, id } = req

    this._validateConfigType(type)

    if (!id) {
      throw new Error('ERR_CONFIG_ID_MISSING')
    }

    const dbKey = this._getConfigDbKey(type, id)
    const existingData = await this.configsDb.get(dbKey)
    if (!existingData) {
      throw new Error('ERR_CONFIG_NOT_FOUND')
    }

    await this.configsDb.del(dbKey)

    return 1
  }

  _start (cb) {
    async.series([
      next => { super._start(next) },
      async () => {
        await this.net_r0.startRpcServer()
        const rpcServer = this.net_r0.rpcServer

        this.racks = await this.store_s1.getBee(
          { name: 'racks' },
          { keyEncoding: 'utf-8' }
        )

        await this.racks.ready()
        await this._getRacksEntries()

        this.actionDb = await this.store_s1.getBee(
          { name: 'action-approver' }
        )

        // store tail-log aggr data in db
        this.tailLogAggrDb = await this.store_s1.getBee(
          { name: 'tail-log-aggr' },
          { keyEncoding: 'utf-8' }
        )
        await this.tailLogAggrDb.ready()

        // store generic configs in db (pool configs, etc.)
        this.configsDb = await this.store_s1.getBee(
          { name: 'configs' },
          { keyEncoding: 'utf-8' }
        )
        await this.configsDb.ready()

        const orkActionsConfig = this.conf.ork.orkActions || {}
        // Merge default action config resolvers with any custom ones from config
        const actionConfigResolvers = {
          ...DEFAULT_ACTION_CONFIG_RESOLVERS,
          ...(this.conf.ork.actionConfigResolvers || {})
        }
        const actionCaller = new ActionCaller(this.net_r0, this.racks, this.conf.ork.callTargetsLimit, this, orkActionsConfig, this.configsDb, actionConfigResolvers)
        const actionCallerProxy = new Proxy(actionCaller, {
          get: (target, property, receiver) => {
            // proxy action calls as methods don't exist
            if (typeof target[property] === 'undefined') {
              return (...payload) => {
                const [params, racks] = payload // [params[], targets, requiredPerms]

                return target.callTargets(property, params, racks)
              }
            }
            return Reflect.get(target, property, receiver)
          }
        })
        this.actionCaller = actionCallerProxy
        await this.actionApprover_0.initDb(this.actionDb)
        this.actionApprover_0.initWrk(this.actionCaller)
        await this.actionApprover_0.startInterval(this.conf.ork.actionIntvlMs || 30000)

        // check optional configs loaded
        if (this.conf.aggrData && this.conf.aggrStats) {
        // set interval to store aggregated tailLog data
          this.interval_0.add(
            'aggregate-tail-log',
            this.aggregateTailLogs.bind(this),
            this.conf.aggrData.agrrTailLogIntvlMs || 3600000
          )
        }

        if (this.conf.crossAggrAction) {
          // set interval to add automated cross thing actions
          this.interval_0.add(
            'cross-actions-automation',
            this.crossAggrActions.bind(this),
            this.conf.crossAggrAction.agrrListThingsIntvlMs || 10000
          )
        }

        rpcServer.respond('echo', x => x)

        RPC_METHODS.forEach(method => {
          rpcServer.respond(method.name, async (req, ctx) => {
            try {
              // block write operations for read-only peers
              const remoteKey = ctx._mux.stream.remotePublicKey.toString('hex')
              if (method.op === 'w' && this.net_r0.conf.allowReadOnly?.includes(remoteKey)) {
                throw new Error('ERR_MISSING_WRITE_PERMISSIONS')
              }

              return await this.net_r0.handleReply(method.name, req)
            } catch (err) {
              this.debugError(`rpc ${method.name} failed`, err, true)
              throw err
            }
          })
        })

        this.status.rpcPublicKey = rpcServer.publicKey.toString('hex')

        // rpc client key to be allowed through destination server firewall
        this.status.rpcClientKey = this.net_r0.dht.defaultKeyPair.publicKey.toString('hex')
        this.saveStatus()
      }
    ], cb)
  }
}

module.exports = WrkProcAggr
