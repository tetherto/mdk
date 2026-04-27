'use strict'

const mingo = require('mingo')
const StoreFacility = require('hp-svc-facs-store')
const SchedulerFacility = require('bfx-facs-scheduler')
const HttpFacility = require('bfx-facs-http')
const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')

class ElectricityManager extends EventEmitter {
  constructor (conf, ctx) {
    super()
    this.conf = conf || {}
    this.ctx = ctx || {}
    this.wtype = this.conf.wtype
    this.debugError = (ctx && ctx.debugError) || ((...args) => console.error(...args))

    if (!ctx || !ctx.rack) {
      throw new Error('ERR_PROC_RACK_UNDEFINED')
    }

    this.prefix = `${this.wtype}-${ctx.rack}`
    this.loadConf = ctx.loadConf ?? this._defaultLoadConf.bind(this)

    this.data = {
      futureLogs: {},
      spotPriceForecast: [],
      nextHourEnergyCost: 0,
      hashpricePerHour: 0,
      nextHourRevenue: 0,
      nextHourShouldMine: false,
      hashrate: 0,
      consumption: 0,
      btcFees: 0,
      btcFeesChange: 0
    }
  }

  async init (provider) {
    if (this._initialized) return

    this.loadConf(provider, provider)
    const ctx = this.ctx
    await this._createFacilities(ctx)

    if (this._ownsFacilities) {
      this._bindProcessExit()
    }

    this._initialized = true

    const db = await this.store_s1.getBee(
      { name: 'electricity' },
      { keyEncoding: 'binary' }
    )
    await db.ready()
    this.settings = db.sub('settings')
  }

  _projection (data, fields = {}) {
    const query = new mingo.Query({})
    const cursor = query.find(data, fields)
    return cursor.all()
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

  getHttpUrl () {
    return this.conf.baseUrl
  }

  async _createFacilities (ctx) {
    if (ctx.facs) {
      this.store_s1 = ctx.facs.store_s1
      this.scheduler_0 = ctx.facs.scheduler_0
      this.http_0 = ctx.facs.http_0
      return
    }

    this.store_s1 = new StoreFacility(this, { storeDir: ctx.storeDir }, ctx)
    await this._startFacility(this.store_s1)

    this.scheduler_0 = new SchedulerFacility(this, {}, ctx)
    await this._startFacility(this.scheduler_0)

    console.log('got http', this.getHttpUrl())

    this.http_0 = new HttpFacility(this, {
      baseUrl: this.getHttpUrl(),
      timeout: 30 * 1000
    }, {})
    await this._startFacility(this.http_0)

    this._ownsFacilities = true
  }

  stop (cb) {
    if (!this._ownsFacilities || !this._initialized) {
      return cb()
    }
    this._initialized = false
    const facilities = [
      this.scheduler_0,
      this.store_s1,
      this.http_0
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

  _bindProcessExit () {
    const stop = () => {
      this.stop(() => {})
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  }

  _startFacility (facility) {
    return new Promise((resolve, reject) => {
      facility.start((err) => (err ? reject(err) : resolve()))
    })
  }

  async getMargin (req) {
    const wrkSettings = await this.getWrkSettings()
    return wrkSettings.margin || 0
  }

  async getRevenueEstimates (req) {
    // no-op
  }

  async getSpotPrice (req) {
    // no-op
  }

  async getStats (req) {
    // no-op
  }

  async getCostRevenue (req) {
    // no-op
  }

  async getStatsHistory (req) {
    // no-op
  }

  async getWrkExtData (req) {
    const { query } = req
    if (!query) throw new Error('ERR_QUERY_INVALID')
    const { key } = query
    if (!key) throw new Error('ERR_KEY_INVALID')

    let data
    switch (key) {
      case 'margin':
        data = await this.getMargin(query)
        break
      case 'revenue-estimates':
        data = await this.getRevenueEstimates(query)
        break
      case 'spot-price':
        data = await this.getSpotPrice(query)
        break
      case 'stats':
        data = await this.getStats(query)
        break
      case 'cost-revenue':
        data = await this.getCostRevenue(query)
        break
      case 'stats-history':
        data = await this.getStatsHistory(query)
        break
      default:
        data = this.data[key]
        break
    }
    return data
  }
}

module.exports = ElectricityManager
