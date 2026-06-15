'use strict'

const StoreFacility = require('@tetherto/hp-svc-facs-store')
const HttpFacility = require('@bitfinex/bfx-facs-http')
const SchedulerFacility = require('@bitfinex/bfx-facs-scheduler')
const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const mingo = require('mingo')
const { SCHEDULER_TIMES, BTC_SATS, MINUTE_MS, HOUR_MS, HOURS_24_MS } = require('./utils/constants')
const { getTimeRanges } = require('./utils/time')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')

class MinerpoolManager extends EventEmitter {
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
      statsData: {},
      workersData: { ts: 0, workers: [] },
      blocks: [],
      yearlyBalances: {}
    }
  }

  async init (pool) {
    if (this._initialized) return

    this.loadConf(pool, pool)
    const ctx = this.ctx
    await this._createFacilities(ctx)

    if (this._ownsFacilities) {
      this._bindProcessExit()
    }

    this._initialized = true

    const db = await this.store_s1.getBee(
      { name: 'main' },
      { keyEncoding: 'binary' }
    )
    await db.ready()
    this.transactionsDb = db.sub('transactions')
    this.workersCountDb = db.sub('workers-count')
    this.statsDb = db.sub('stats')
    this.workersDb = db.sub('workers')
    this.blocksDb = db.sub('blocks')

    for (const { time, key } of Object.values(SCHEDULER_TIMES)) {
      this.scheduler_0.add(key, (fireTime) => {
        this.fetchData(key, fireTime)
      }, time)
    }
  }

  async fetchData (key, time) {
    try {
      switch (key) {
        case SCHEDULER_TIMES._1M.key:
          await this.fetchStats(time)
          break
        case SCHEDULER_TIMES._5M.key:
          await this.fetchWorkers(time)
          await this.saveStats(time)
          break
        case SCHEDULER_TIMES._1D.key:
          await this.fetchTransactions()
          await this.fetchBlocks()
          await this.saveWorkers(time)
          break
      }
    } catch (e) {
      this._logErr('ERR_DATA_FETCH', e)
    }
  }

  async fetchStats (time) {
    // no-op
  }

  async fetchWorkers (time) {
    // no-op
  }

  async fetchTransactions () {
    // no-op
  }

  async fetchBlocks () {
    // no-op
  }

  async saveStats (time) {
    const ts = Math.floor(time.getTime() / 1000) * 1000
    await this._saveToDb(this.statsDb, ts, { ts, stats: this.data.statsData.stats })
  }

  async saveWorkers (time) {
    const ts = Math.floor(time.getTime() / 1000) * 1000
    await this._saveToDb(this.workersDb, ts, { ts, workers: this.data.workersData.workers })
  }

  async _saveToDb (db, ts, data) {
    await db.put(utilsStore.convIntToBin(ts), Buffer.from(JSON.stringify(data)))
  }

  _logErr (msg, err) {
    console.error(new Date().toISOString(), msg, err)
  }

  _aggrTransactions (data, { start, end }) {
    const totalRevenue = data.reduce((total, log) => {
      log.transactions?.forEach((transaction) => {
        total += transaction.satoshis_net_earned
      })
      return total
    }, 0)
    const tsRange = getTimeRanges(start, end)
    const hourlyRevenues = []
    if (!tsRange.length) return { ts: Date.now(), hourlyRevenues }
    const hourlyAvgRevenue = (totalRevenue / tsRange.length) / BTC_SATS
    tsRange.forEach(({ end: rangeEnd }) => {
      hourlyRevenues.push({ ts: rangeEnd, revenue: hourlyAvgRevenue })
    })

    return { ts: Date.now(), hourlyRevenues }
  }

  _getIntervalMs (interval) {
    switch (interval) {
      case '1D':
        return HOURS_24_MS
      case '3h':
        return 3 * HOUR_MS
      case '30m':
        return 30 * MINUTE_MS
      case '5m':
      default:
        return 5 * MINUTE_MS
    }
  }

  _avg (avg, value, count) {
    return (avg * (count - 1) + value) / count
  }

  _aggrByInterval (data, interval) {
    const intervalMs = this._getIntervalMs(interval)
    const aggrBuckets = {}

    data.forEach(d => {
      const aggrTimestamp = Math.ceil(d.ts / intervalMs) * intervalMs
      if (!aggrBuckets[aggrTimestamp]) {
        aggrBuckets[aggrTimestamp] = []
      }
      aggrBuckets[aggrTimestamp].push(d)
    })

    return Object.entries(aggrBuckets).map(([ts, items]) => {
      return items.reduce((acc, d, itemIndex) => {
        d.stats = d.stats.map((stat, statsIndex) => {
          const avgHashrate = acc?.stats?.[statsIndex]?.hashrate || 0
          const hashrate = this._avg(avgHashrate, stat.hashrate, itemIndex + 1)
          return { ...stat, hashrate }
        })
        return { ...acc, ...d, ts: Number(ts) }
      }, {})
    })
  }

  async getDbData (db, { start, end }) {
    if (!start) throw new Error('ERR_START_INVALID')
    if (!end) throw new Error('ERR_END_INVALID')

    const query = {
      gte: utilsStore.convIntToBin(start),
      lte: utilsStore.convIntToBin(end)
    }

    const stream = db.createReadStream(query)
    const res = []
    for await (const entry of stream) {
      res.push(JSON.parse(entry.value.toString()))
    }

    return res
  }

  _projection (data, fields = {}) {
    const query = new mingo.Query({})
    if (Array.isArray(data)) return query.find(data, fields).all()
    const cursor = query.find([data], fields)
    return cursor.all()[0]
  }

  filterWorkers (workers, offset, limit) {
    return workers.slice(offset, offset + (Math.min(limit, 100)))
  }

  async getWorkers (query) {
    const { offset = 0, limit = 100, name, start, end } = query
    if (!start || !end) {
      const workersObj = { ts: 0, workers: this.filterWorkers(this.data.workersData.workers, offset, limit) }
      workersObj.workers = this.appendPoolType(workersObj.workers)
      return workersObj
    }
    const data = await this.getDbData(this.workersDb, query)
    return data.reduce((aggr, obj) => {
      let workersObj
      if (name) workersObj = { ts: obj.ts, workers: obj.workers.filter(w => w.name === name) }
      else workersObj = { ts: obj.ts, workers: this.filterWorkers(obj.workers, offset, limit) }
      workersObj.workers = this.appendPoolType(workersObj.workers)
      aggr = aggr.concat(workersObj)
      return aggr
    }, [])
  }

  appendPoolType (data) {
    return data.map(d => ({ poolType: this.wtype, ...d }))
  }

  async _getWrkExtDataExtra (key, query) {
    return undefined
  }

  async getWrkExtData (req) {
    const { query } = req
    if (!query) throw new Error('ERR_QUERY_INVALID')

    const { key } = query
    if (!key) throw new Error('ERR_KEY_INVALID')

    const extra = await this._getWrkExtDataExtra(key, query)
    if (extra !== undefined) {
      const data = extra
      if (!gLibUtilBase.isEmpty(query.fields)) return this._projection(data, query.fields)
      return data
    }

    let data
    switch (key) {
      case 'transactions':
        data = await this.getDbData(this.transactionsDb, query)
        if (query.aggrHourly) data = this._aggrTransactions(data, query)
        break
      case 'workers-count':
        data = await this.getDbData(this.workersCountDb, query)
        break
      case 'workers':
        data = await this.getWorkers(query)
        break
      case 'stats':
        data = this.data.statsData
        if (data.stats) data.stats = this.appendPoolType(data.stats)
        break
      case 'stats-history':
        data = await this.getDbData(this.statsDb, query)
        if (query.interval) data = this._aggrByInterval(data, query.interval)
        data.forEach(d => { if (d.stats) d.stats = this.appendPoolType(d.stats) })
        break
      default:
        data = this.data[key]
        break
    }

    if (!gLibUtilBase.isEmpty(query.fields)) return this._projection(data, query.fields)
    return data
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

  async _createFacilities (ctx) {
    if (ctx.facs) {
      this.store_s1 = ctx.facs.store_s1
      this.http_0 = ctx.facs.http_0
      this.scheduler_0 = ctx.facs.scheduler_0
      return
    }

    this.store_s1 = new StoreFacility(this, { storeDir: ctx.storeDir }, ctx)
    await this._startFacility(this.store_s1)

    this.scheduler_0 = new SchedulerFacility(this, {}, ctx)
    await this._startFacility(this.scheduler_0)

    this.http_0 = new HttpFacility(this, {
      baseUrl: this.getHttpUrl(),
      timeout: 30 * 1000
    }, {})
    await this._startFacility(this.http_0)

    this._ownsFacilities = true
  }

  getHttpUrl () {
    return this.conf.baseUrl
  }

  stop (cb) {
    if (!this._ownsFacilities || !this._initialized) {
      return cb()
    }
    this._initialized = false
    const facilities = [
      this.scheduler_0,
      this.http_0,
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
}

module.exports = MinerpoolManager
