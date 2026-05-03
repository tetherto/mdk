'use strict'

const debug = require('debug')('thing:proc')
const fs = require('fs')
const path = require('path')
const gLibStats = require('../../../mdk/lib-stats')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const IntervalsFacility = require('@bitfinex/bfx-facs-interval')
const SchedulerFacility = require('@bitfinex/bfx-facs-scheduler')
const MDKThgWriteCallsFacility = require('../../../facs/thg-write-calls')
const { MAIN_DB } = require('./utils/constants')
const EventEmitter = require('events')
const SettingsService = require('./services/settings.service')
const LogsService = require('./services/logs.service')
const ListingService = require('./services/listing.service')
const LogHistoryService = require('./services/log.history.service')
const CommentsService = require('./services/comments.service')
const AlertsService = require('./services/alerts.service')
const StatsService = require('./services/stats.service')
const ActionsService = require('./services/actions.service')
const SnapsService = require('./services/snaps.service')
const DataService = require('./services/data.service')
const ConnectionService = require('./services/connection.service')

class ThingManager extends EventEmitter {
  constructor (conf, ctx) {
    super()
    this.conf = conf
    this.ctx = ctx

    if (!ctx.rack) {
      throw new Error('ERR_PROC_RACK_UNDEFINED')
    }

    this.wtype = ctx.wtype ?? 'thing'
    this.loadConf = ctx.loadConf ?? this._defaultLoadConf.bind(this)
    this.loadLib = ctx.loadLib ?? (() => null)

    this.prefix = `${this.wtype}-${ctx.rack}`

    this._handler = this._createApplyThingsProxy()
  }

  _createApplyThingsProxy () {
    return new Proxy(this, {
      get: (target, property) => {
        return (...payload) => {
          const [req, thg] = payload
          if (req.method.endsWith('ThingLocApply') && target[req.method] && typeof target[req.method] === 'function') {
            return target[req.method](thg)
          }
          if (thg.ctrl?.[req.method] && typeof thg.ctrl[req.method] === 'function') {
            return thg.ctrl[req.method](...req.params)
          }
          throw new Error('ERR_METHOD_INVALID')
        }
      }
    })
  }

  getThingType () {
    return 'thing'
  }

  getThingTags () {
    return []
  }

  selectThingInfo () {
    return {}
  }

  getSpecTags () {
    return this.getThingTags()
  }

  _getThingBaseType () {
    return this.getThingType().split('-')[0] || 'thing'
  }

  tailLogHook0 () {
    // no-op, override in subclass
  }

  collectThingSnap (thg) {
    throw new Error('ERR_IMPL_UNKNOWN')
  }

  collectSnapsHook0 () {
    // no-op, override in subclass
  }

  _validateUpdateThing (req) {
    // no-op, override in subclass
  }

  connectThing (thg) {
    // no-op, override in subclass
  }

  disconnectThing (thg) {
    if (typeof thg.ctrl?.close === 'function') {
      thg.ctrl.close()
    }
  }

  releaseIpThing (thg) {
    // no-op, override in subclass
  }

  registerThingHook0 (thg) {
    // no-op, override in subclass
  }

  forgetThingHook0 (thg) {
    // no-op, override in subclass
  }

  setupThingHook0 (thg) {
    // no-op, override in subclass
  }

  setupThingHook1 (thg) {
    // no-op, override in subclass
  }

  _getWrkExtData (args) {
    return {}
  }

  validateRegisterThing (data) {
    this.dataService?.validateRegisterThing(data)
  }

  _defaultLoadConf (c, group = null) {
    const root = this.ctx.root || ''
    const configPath = path.join(root, 'config', `${c}.json`)
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      const merged = group ? { [group]: data } : data
      Object.assign(this.conf, merged)
    }
  }

  _startFacility (facility) {
    return new Promise((resolve, reject) => {
      facility.start((err) => (err ? reject(err) : resolve()))
    })
  }

  async _createFacilities (ctx) {
    if (ctx.facs) {
      this.store_s1 = ctx.facs.store_s1
      this.interval_0 = ctx.facs.interval_0
      this.scheduler_0 = ctx.facs.scheduler_0
      this.mdkThgWriteCalls_0 = ctx.facs.mdkThgWriteCalls_0
      return
    }

    this.store_s1 = new StoreFacility(this, { storeDir: ctx.storeDir }, ctx)
    await this._startFacility(this.store_s1)

    this.interval_0 = new IntervalsFacility(this, {}, ctx)
    await this._startFacility(this.interval_0)

    this.scheduler_0 = new SchedulerFacility(this, {}, ctx)
    await this._startFacility(this.scheduler_0)

    this.mdkThgWriteCalls_0 = new MDKThgWriteCallsFacility(this, {}, ctx)
    await this._startFacility(this.mdkThgWriteCalls_0)

    this._ownsFacilities = true
  }

  async init () {
    if (this._initialized) return
    this.loadConf('base.thing', 'thing')

    const ctx = this.ctx

    await this._createFacilities(ctx)

    this.rackId = `${this.getThingType()}-${ctx.rack}`

    this.loadConf('common')

    this.mem = {
      things: {},
      log: {},
      log_cache: {},
      log_map: {},
      collectingThingSnap: {}
    }

    const thingConf = this.conf.thing
    this.scheduleAddlStatConfigTfs = this.conf.thing.scheduleAddlStatConfigTfs || []
    this.statTimeframes = gLibStats.defaults.timeframes

    this.db = await this.store_s1.getBee(
      { name: MAIN_DB },
      { keyEncoding: 'utf-8' }
    )

    await this.db.ready()

    this.things = this.db.sub('things')
    this.meta_logs = this.db.sub('meta_logs_00')
    this.settings = this.db.sub('settings')

    thingConf.thingQueryConcurrency = thingConf.thingQueryConcurrency || 25
    thingConf.storeSnapItvMs = thingConf.storeSnapItvMs || 300000
    thingConf.collectSnapTimeoutMs = thingConf.collectSnapTimeoutMs || 120000

    debug(`RACK-ID=${this.rackId}`)

    this.settingsService = new SettingsService({ settingsDb: this.settings })

    this.logs = new LogsService({
      store: this.store_s1,
      metaLogs: this.meta_logs,
      thingConf,
      logCache: this.mem.log_cache,
      debug: this.debug.bind(this),
      debugError: this.debugError.bind(this)
    })

    this.listing = new ListingService({
      getThings: () => this.mem.things,
      rackId: this.rackId,
      selectThingInfo: this.selectThingInfo.bind(this)
    })

    this.connection = new ConnectionService({
      thingsDb: this.things,
      getThings: () => this.mem.things,
      getBeeTimeLog: (key, offset, init) =>
        this.logs.getBeeTimeLog(key, offset, init),
      releaseBeeTimeLog: (log) => this.logs.releaseBeeTimeLog(log),
      filterThings: (req, returnObjects = false) =>
        this.listing.filterThings(req, returnObjects),
      assignCodesToThings: () => this._assignCodesToThings(),
      connectThing: (thg) => this.connectThing(thg),
      disconnectThing: (thg) => this.disconnectThing(thg),
      releaseIpThing: (thg) => this.releaseIpThing(thg),
      registerThingHook0: (thg) => this.registerThingHook0(thg),
      forgetThingHook0: (thg) => this.forgetThingHook0(thg),
      setupThingHook0: (thg) => this.setupThingHook0(thg),
      setupThingHook1: (thg) => this.setupThingHook1(thg),
      getThingType: () => this.getThingType(),
      debug: this.debug.bind(this),
      debugError: this.debugError.bind(this)
    })

    this.dataService = new DataService({
      thingsDb: this.things,
      getThings: () => this.mem.things,
      getMem: () => this.mem,
      getThingType: () => this.getThingType(),
      getThingTags: () => this.getThingTags(),
      setupThing: (base) => this.connection.setupThing(base),
      registerThingHook0: (thg) => this.connection.registerThingHook0(thg),
      updateThingHook0: (thg, thgPrev) =>
        this.connection.updateThingHook0(thg, thgPrev),
      reconnectThing: (thg) => this.connection.reconnectThing(thg),
      validateUpdateThing: (req) => this._validateUpdateThing(req)
    })

    this.logHistory = new LogHistoryService({
      logs: this.logs,
      getThings: () => this.mem.things,
      statTimeframes: this.statTimeframes,
      thingConf: this.conf.thing,
      tailLogHook0: this.tailLogHook0.bind(this)
    })

    this.comments = new CommentsService({
      loadThing: (req) => this.dataService.loadThing(req),
      saveThing: (thg) => this.dataService.saveThing(thg),
      checkThingExists: (req) => this.dataService.checkThingExists(req),
      generateId: () => this.dataService.generateId()
    })

    this.alerts = new AlertsService({
      logs: this.logs,
      getThings: () => this.mem.things,
      loadLib: this.loadLib,
      conf: this.conf,
      getSpecTags: () => this.getSpecTags(),
      debugError: this.debugError.bind(this)
    })

    this.stats = new StatsService({
      getThings: () => this.mem.things,
      loadLib: this.loadLib,
      getSpecTags: () => this.getSpecTags(),
      getBeeTimeLog: (key, offset, init) =>
        this.logs.getBeeTimeLog(key, offset, init),
      releaseBeeTimeLog: (log) => this.logs.releaseBeeTimeLog(log),
      processThingAlerts: (thg) => this.alerts.processThingAlerts(thg),
      getThingBaseType: () => this._getThingBaseType(),
      conf: this.conf,
      debugError: this.debugError.bind(this),
      debugThingError: this.debugThingError.bind(this)
    })

    this.actions = new ActionsService({
      getThings: () => this.mem.things,
      filterThings: (req, returnObjects = false) =>
        this.listing.filterThings(req, returnObjects),
      invokeHandler: (req, thg) => this._handler.call(req, thg),
      thingConf: this.conf.thing,
      debugThingError: this.debugThingError.bind(this)
    })

    this.snaps = new SnapsService({
      getThings: () => this.mem.things,
      getCollectingThingSnap: () => this.mem.collectingThingSnap,
      getBeeTimeLog: (key, offset, init) =>
        this.logs.getBeeTimeLog(key, offset, init),
      releaseBeeTimeLog: (log) => this.logs.releaseBeeTimeLog(log),
      collectThingSnap: (thg) => this.collectThingSnap(thg),
      processThingAlerts: (thg) => this.alerts.processThingAlerts(thg),
      connectThing: (thg) => this.connection.connectThing(thg),
      saveAlerts: () => this._saveAlerts(),
      collectSnapsHook0: () => this.collectSnapsHook0(),
      thingConf: this.conf.thing,
      debugError: this.debugError.bind(this),
      debugThingError: this.debugThingError.bind(this)
    })

    await this.connection.setupThings()

    this.interval_0.add(
      'collectSnaps',
      this.snaps.collectSnaps.bind(this.snaps),
      thingConf.collectSnapsItvMs || 60000
    )

    this.interval_0.add(
      'rotateLogs',
      this.logs.rotateLogs.bind(this.logs),
      thingConf.rotateLogsItvMs || 120000
    )

    this.interval_0.add(
      'refreshLogsCache',
      this.logs.refreshLogsCache.bind(this.logs),
      thingConf.refreshLogsCacheItvMs || 60000
    )

    for (const tfs of this.statTimeframes) {
      const sk = `stat-${tfs[0]}`
      this.scheduler_0.add(sk, (fireTime) => {
        this.stats.buildStats(sk, fireTime)
      }, tfs[1])
    }

    if (this._ownsFacilities) {
      this._bindProcessExit()
    }

    this._initialized = true
  }

  _bindProcessExit () {
    const stop = () => {
      this.stop(() => {})
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  }

  stop (cb) {
    if (!this._ownsFacilities || !this._initialized) {
      return cb()
    }
    this._initialized = false
    const facilities = [
      this.interval_0,
      this.scheduler_0,
      this.mdkThgWriteCalls_0,
      this.store_s1
    ]
    let i = 0
    const next = (err) => {
      if (err) this.debugError('ERR_FAC_STOP', err)
      if (i >= facilities.length) return cb()
      const facility = facilities[i++]
      if (typeof facility.stop !== 'function') return next()
      facility.stop(next)
    }
    next()
  }

  debugThingError (thg, e) {
    debug(`[THING/${this.rackId}/${thg.id}]`, e)
  }

  debugError (data, e) {
    debug(`[THING/${this.rackId}]`, data, e)
  }

  debug (data) {
    debug(`[THING/${this.rackId}]`, data)
  }

  _addWhitelistedActions (actions) {
    return this.mdkThgWriteCalls_0.whitelistActions(actions)
  }

  getSettings () {
    return this.settingsService.getSettings()
  }

  saveSettingsEntries (entries) {
    return this.settingsService.saveSettingsEntries(entries)
  }

  getBeeTimeLog (logKey, offset = 0, init = false) {
    return this.logs.getBeeTimeLog(logKey, offset, init)
  }

  releaseBeeTimeLog (log) {
    return this.logs.releaseBeeTimeLog(log)
  }

  rotateLogs () {
    return this.logs.rotateLogs()
  }

  refreshLogsCache () {
    return this.logs.refreshLogsCache()
  }

  saveLogData (key, ts, data, offset = 0, init = false) {
    return this.logs.saveLogData(key, ts, data, offset, init)
  }

  _filterThings (req, returnObjects = false) {
    return this.listing.filterThings(req, returnObjects)
  }

  _prepThingInfo (thg, opts = {}) {
    return this.listing.prepThingInfo(thg, opts)
  }

  listThings (req) {
    return this.listing.listThings(req)
  }

  tailLog (req) {
    return this.logHistory.tailLog(req)
  }

  getHistoricalLogs (req) {
    return this.logHistory.getHistoricalLogs(req)
  }

  saveThingComment (req) {
    return this.comments.saveThingComment(req)
  }

  editThingComment (req) {
    return this.comments.editThingComment(req)
  }

  deleteThingComment (req) {
    return this.comments.deleteThingComment(req)
  }

  processThingAlerts (thg) {
    return this.alerts.processThingAlerts(thg)
  }

  _saveAlerts () {
    return this.alerts.saveAlerts()
  }

  buildStats (sk, fireTime) {
    return this.stats.buildStats(sk, fireTime)
  }

  saveRealTimeData () {
    return this.stats.saveRealTimeData()
  }

  aggrStats (thgIds, opts = {}, thgs = null) {
    return this.stats.aggrStats(thgIds, opts, thgs)
  }

  applyThings (req) {
    return this.actions.applyThings(req)
  }

  queryThing (req) {
    return this.actions.queryThing(req)
  }

  rackReboot (req) {
    const { exit } = require('node:process')
    this.stop(() => exit(-1))
    return 1
  }

  collectSnaps () {
    return this.snaps.collectSnaps()
  }

  registerThing (req) {
    return this.dataService.registerThing(req)
  }

  updateThing (req) {
    return this.dataService.updateThing(req)
  }

  saveThingData (thg) {
    return this.dataService.saveThingData(thg)
  }

  _assignCodesToThings () {
    return this.dataService.assignCodesToThings()
  }

  setupThing (base) {
    return this.connection.setupThing(base)
  }

  forgetThings (req) {
    return this.connection.forgetThings(req)
  }
}

module.exports = ThingManager
