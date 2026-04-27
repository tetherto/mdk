'use strict'

const F2MinerpoolApi = require('./f2.minerpool.api')
const { TRANSACTION_TYPES, POOL_TYPE } = require('./utils/constants')
const { getWorkersStats, isCurrentMonth, getMonthlyDateRanges } = require('./utils')
const MinerpoolManager = require('../../../tpls/tpl-lib-minerpool/lib/minerpool.manager')

class F2MinerpoolManager extends MinerpoolManager {
  constructor (conf, ctx) {
    super(conf, ctx)
    this.wtype = this.conf.wtype || POOL_TYPE
  }

  async init () {
    await super.init(POOL_TYPE)

    this.accounts = this.conf.f2pool.accounts
    this.apiSecret = this.conf.f2pool.apiSecret
    this.f2poolApi = new F2MinerpoolApi(this.http_0, this.apiSecret)
  }

  getHttpUrl () {
    return this.conf.f2pool.apiUrl
  }

  async fetchStats (time) {
    const stats = []

    const end = Date.now()
    const start24h = end - (24 * 60 * 60 * 1000) // 24 hours ago

    for (const username of this.accounts) {
      const { balance_info: bal = {} } = await this.f2poolApi.getBalance(username) || {}

      const { hash_rate_list: hashRate24h = [] } = await this.f2poolApi.getHashRateHistory(username, start24h, end) || {}

      const oneHourAgo = end - (60 * 60 * 1000)
      const hashRate1h = hashRate24h.filter(item => item.timestamp * 1000 >= oneHourAgo)

      const avgHashRate1h = hashRate1h.length > 0
        ? hashRate1h.reduce((sum, item) => sum + (item.hash_rate || 0), 0) / hashRate1h.length
        : 0

      const avgHashRate24h = hashRate24h.length > 0
        ? hashRate24h.reduce((sum, item) => sum + (item.hash_rate || 0), 0) / hashRate24h.length
        : 0

      const avgStaleHashRate1h = hashRate1h.length > 0
        ? hashRate1h.reduce((sum, item) => sum + (item.stale_hash_rate || 0), 0) / hashRate1h.length
        : 0

      const avgStaleHashRate24h = hashRate24h.length > 0
        ? hashRate24h.reduce((sum, item) => sum + (item.stale_hash_rate || 0), 0) / hashRate24h.length
        : 0

      const latestHashRate = hashRate24h.length > 0
        ? hashRate24h[hashRate24h.length - 1].hash_rate || 0
        : 0

      const yearlyBalances = await this.getYearlyBalances(username)
      const activeWorkers = this.data.workersData.workers.filter(worker => worker.online)

      stats.push({
        username,
        timestamp: Date.now(),
        balance: bal.total_income,
        unsettled: bal.total_income - bal.paid,
        revenue_24h: bal.yesterday_income,
        estimated_today_income: bal.estimated_today_income,
        hashrate: latestHashRate,
        hashrate_1h: avgHashRate1h,
        hashrate_24h: avgHashRate24h,
        hashrate_stale_1h: avgStaleHashRate1h,
        hashrate_stale_24h: avgStaleHashRate24h,
        worker_count: this.data.workersData.workers.length,
        active_workers_count: activeWorkers.length,
        yearlyBalances
      })
    }
    this.data.statsData = { ts: Math.floor(time.getTime() / 1000) * 1000, stats }
  }

  async fetchWorkers (time) {
    let workers = []
    for (const username of this.accounts) {
      try {
        const userWorkers = getWorkersStats(await this.f2poolApi.getWorkers(username), username)
        workers = workers.concat(userWorkers)
      } catch (e) {
        this._logErr(`ERR_WORKERS_FETCH ${username}`, e)
      }
    }
    const ts = Math.floor(time.getTime() / 1000) * 1000
    this.data.workersData = { ts, workers }
    await this._saveToDb(this.workersCountDb, ts, { ts, count: workers.length })
  }

  async fetchTransactions () {
    let transactions = []
    const startTime = new Date().setHours(0, 0, 0, 0)
    const endTime = Date.now()
    for (const username of this.accounts) {
      try {
        let dailyTransactions = await this.f2poolApi.getTransactions(startTime, endTime, TRANSACTION_TYPES.REVENUE, username)
        dailyTransactions = dailyTransactions.map(t => ({ username, ...t }))
        transactions = transactions.concat(dailyTransactions)
      } catch (e) {
        this._logErr(`ERR_TRANSACTIONS_FETCH ${username}`, e)
      }
    }

    await this._saveToDb(this.transactionsDb, startTime, { ts: startTime, transactions })
  }

  async getYearlyBalances (username) {
    const yearlyDateRanges = getMonthlyDateRanges(12)
    const balances = this.data.yearlyBalances
    for (const [month, { startDate, endDate }] of Object.entries(yearlyDateRanges)) {
      if (!balances[month] || isCurrentMonth(month)) {
        try {
          const transactions = await this.f2poolApi.getTransactions(startDate, endDate, TRANSACTION_TYPES.REVENUE, username)
          balances[month] = transactions.reduce((bal, t) => bal + t.changed_balance, 0)
        } catch (e) {
          this._logErr('ERR_BALANCES_FETCH', e)
          balances[month] = 0
        }
      }
    }
    this.data.yearlyBalances = balances
    return Object.entries(balances).map(([month, balance]) => ({ month, balance }))
  }
}

module.exports = F2MinerpoolManager
