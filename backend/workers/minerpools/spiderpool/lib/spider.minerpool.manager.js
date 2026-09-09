'use strict'

const SpiderMinerpoolApi = require('./spider.minerpool.api')
const { TRANSACTION_TYPES, POOL_TYPE } = require('./utils/constants')
const { getWorkersStats, isCurrentMonth, getMonthlyDateRanges, convertMsToSeconds, toNumber } = require('./utils')
const MinerpoolManager = require('../../../../core/mdk').PoolService

class SpiderMinerpoolManager extends MinerpoolManager {
  constructor (conf, ctx) {
    super(conf, ctx)
    this.wtype = this.conf.wtype || POOL_TYPE
  }

  async init () {
    await super.init(POOL_TYPE)

    this.accounts = this.conf.spiderpool.accounts
    this.spiderApi = new SpiderMinerpoolApi(this.http_0, {
      accessKey: this.conf.spiderpool.accessKey,
      privateKey: this.conf.spiderpool.privateKey,
      coin: this.conf.spiderpool.coin,
      signal: this.abortSignal
    })
  }

  getHttpUrl () {
    return this.conf.spiderpool.apiUrl
  }

  async fetchStats (time) {
    const stats = []

    for (const subaccount of this.accounts) {
      const profit = await this.spiderApi.getProfitInfo(subaccount) || {}
      const hashRateInfo = await this.spiderApi.getFullHashRate(subaccount) || {}

      const hashRate1h = toNumber(hashRateInfo.hashRateHour)
      const hashRate24h = toNumber(hashRateInfo.hashRateDay)

      const yearlyBalances = await this.getYearlyBalances(subaccount)
      const activeWorkers = this.data.workersData.workers.filter(worker => worker.online)

      stats.push({
        username: subaccount,
        timestamp: Date.now(),
        balance: toNumber(profit.totalProfit),
        unsettled: toNumber(profit.unpaidProfit),
        revenue_24h: toNumber(profit.yesterdayProfit),
        estimated_today_income: toNumber(profit.dayEstimateProfit),
        hashrate: toNumber(hashRateInfo.hashRate10),
        hashrate_1h: hashRate1h,
        hashrate_24h: hashRate24h,
        // stale rates come back as share ratios; report them as hashrates
        hashrate_stale_1h: hashRate1h * toNumber(hashRateInfo.staleRateHour),
        hashrate_stale_24h: hashRate24h * toNumber(hashRateInfo.staleRateDay),
        worker_count: this.data.workersData.workers.length,
        active_workers_count: activeWorkers.length,
        yearlyBalances
      })
    }
    this.data.statsData = { ts: Math.floor(time.getTime() / 1000) * 1000, stats }
  }

  async fetchWorkers (time) {
    let workers = []
    for (const subaccount of this.accounts) {
      try {
        const userWorkers = getWorkersStats(await this.spiderApi.getWorkers(subaccount), subaccount)
        workers = workers.concat(userWorkers)
      } catch (e) {
        this._logErr(`ERR_WORKERS_FETCH ${subaccount}`, e)
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
    for (const subaccount of this.accounts) {
      try {
        const payments = await this.spiderApi.getPaymentRecords(subaccount, startTime, endTime)
        const dailyTransactions = payments.map(p => ({
          username: subaccount,
          id: p.txId,
          type: TRANSACTION_TYPES.PAYOUT,
          changed_balance: toNumber(p.paymentMoney),
          created_at: convertMsToSeconds(p.paymentDate),
          address: p.paymentAddress
        }))
        transactions = transactions.concat(dailyTransactions)
      } catch (e) {
        this._logErr(`ERR_TRANSACTIONS_FETCH ${subaccount}`, e)
      }
    }

    await this._saveToDb(this.transactionsDb, startTime, { ts: startTime, transactions })
  }

  async getYearlyBalances (subaccount) {
    const yearlyDateRanges = getMonthlyDateRanges(12)
    const balances = this.data.yearlyBalances
    for (const [month, { startDate, endDate }] of Object.entries(yearlyDateRanges)) {
      if (!balances[month] || isCurrentMonth(month)) {
        try {
          const payments = await this.spiderApi.getPaymentRecords(subaccount, startDate, endDate)
          balances[month] = payments.reduce((bal, p) => bal + toNumber(p.paymentMoney), 0)
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

module.exports = SpiderMinerpoolManager
