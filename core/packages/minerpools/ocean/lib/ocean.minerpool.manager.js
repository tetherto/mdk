'use strict'

const OceanMinerpoolApi = require('./ocean.minerpool.api')
const { getWorkersStats, convertMsToSeconds, isCurrentMonth, getMonthlyDateRanges } = require('./utils')
const { POOL_TYPE, BTC_SATS } = require('./utils/constants')
const MinerpoolManager = require('../../../tpls/tpl-lib-minerpool/lib/minerpool.manager')

class OceanMinerpoolManager extends MinerpoolManager {
  constructor (conf, ctx) {
    super(conf, ctx)
    this.wtype = this.conf.wtype || POOL_TYPE
  }

  async init () {
    await super.init(POOL_TYPE)

    this.accounts = this.conf.ocean.accounts
    this.oceanApi = new OceanMinerpoolApi(this.http_0)
  }

  getHttpUrl () {
    return this.conf.ocean.apiUrl
  }

  async fetchStats (time) {
    const stats = []
    for (const username of this.accounts) {
      const earnings = await this.getEarnings(username)
      const hashRate = await this.oceanApi.getHashRateInfo(username)
      const yearlyBalances = await this.getYearlyBalances(username)

      stats.push({
        username,
        timestamp: Date.now(),
        balance: earnings.revenue,
        unsettled: earnings.unsettled,
        revenue_24h: earnings.revenue,
        estimated_today_income: earnings.income,
        hashrate: +hashRate.hashrate_60s,
        hashrate_1h: +hashRate.hashrate_3600s,
        hashrate_24h: +hashRate.hashrate_86400s,
        hashrate_stale_1h: 0,
        hashrate_stale_24h: 0,
        worker_count: this.data.workersData.workers.length,
        active_workers_count: hashRate.active_worker_count,
        yearlyBalances
      })
    }

    this.data.statsData = { ts: Math.floor(time.getTime() / 1000) * 1000, stats }
  }

  async fetchWorkers (time) {
    let workers = []
    for (const username of this.accounts) {
      try {
        const accountWorkers = getWorkersStats(await this.oceanApi.getWorkers(username), username)
        workers = workers.concat(accountWorkers)
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
    const ts = new Date().setHours(0, 0, 0, 0)
    const start = convertMsToSeconds(ts)
    const end = convertMsToSeconds(Date.now())
    for (const username of this.accounts) {
      let dailyTransactions = await this.oceanApi.getTransactions(username, start, end)
      dailyTransactions = dailyTransactions.earnings?.map(t => ({ username, ...t }))
      transactions = transactions.concat(dailyTransactions)
    }

    await this._saveToDb(this.transactionsDb, ts, { ts, transactions })
  }

  async fetchBlocks () {
    const resp = await this.oceanApi.getBlocks()
    if (!resp?.blocks) return

    for (const block of resp.blocks) {
      const ts = new Date(block.ts).getTime()
      await this._saveToDb(this.blocksDb, ts, {
        ts,
        blockId: block.block_hash,
        networkDifficulty: block.network_difficulty,
        poolShares: block.accepted_shares,
        earnings: block.total_reward_sats / BTC_SATS,
        luck: block.network_difficulty / block.accepted_shares,
        luckEarnings100Percent: (block.total_reward_sats / BTC_SATS) / (block.network_difficulty / block.accepted_shares),
        username: block.username
      })
    }
  }

  _getBlocksMonthlyAggr (blocks) {
    const monthlyDateRanges = getMonthlyDateRanges(12)
    const aggrData = blocks.reduce((aggr, block) => {
      const ts = new Date(block.ts)
      for (const { key } of Object.values(monthlyDateRanges)) {
        if (!aggr[key]) aggr[key] = { size: 0, totalDifficulty: 0, totalShares: 0, totalBlocksLuck: 0 }
        if (key === `${ts.getFullYear()}-${ts.getMonth() + 1}`) {
          aggr[key].totalDifficulty += block.networkDifficulty
          aggr[key].totalShares += block.poolShares
          aggr[key].totalBlocksLuck += block.luck
          aggr[key].size++
        }
      }
      return aggr
    }, {})

    const blocksData = {}
    for (const [key, block] of Object.entries(aggrData)) {
      blocksData[key] = {
        poolLuck: block.totalShares > 0 ? (block.totalDifficulty / block.totalShares) * 100 : 0,
        siteLuck: block.size > 0 ? (block.totalBlocksLuck / block.size) * 100 : 0
      }
    }

    return { ts: Date.now(), blocksData }
  }

  _getPoolBlocks (blocks) {
    const blocksData = { blocks, allBlocksLuck: 0, adjustedLuck: 0 }

    const { totalDifficulty, totalShares, totalBlocksLuck } = blocks.reduce((aggr, block) => {
      aggr.totalDifficulty += block.networkDifficulty
      aggr.totalShares += block.poolShares
      aggr.totalBlocksLuck += block.luck
      return aggr
    }, { totalDifficulty: 0, totalShares: 0, totalBlocksLuck: 0 })

    blocksData.allBlocksLuck = totalShares > 0 ? (totalDifficulty / totalShares) * 100 : 0
    blocksData.adjustedLuck = (totalBlocksLuck / blocks.length) * 100

    return { ts: Date.now(), blocksData }
  }

  async getYearlyBalances (username) {
    const yearlyDateRanges = getMonthlyDateRanges(12)
    const balances = this.data.yearlyBalances
    for (const [month, { key }] of Object.entries(yearlyDateRanges)) {
      if (!balances[month] || isCurrentMonth(month)) {
        try {
          const earnings = await this.oceanApi.getMonthlyEarnings(username, key)
          balances[month] = earnings.report.reduce((bal, t) => bal + +t.NetUserRwd, 0) / BTC_SATS
        } catch (e) {
          this._logErr('ERR_BALANCES_FETCH', e)
          balances[month] = 0
        }
      }
    }
    this.data.yearlyBalances = balances
    return Object.entries(balances).map(([month, balance]) => ({ month, balance }))
  }

  async getEarnings (username) {
    let revenue = 0; let income = 0
    const time24HoursAgo = convertMsToSeconds(Date.now() - 24 * 60 * 60 * 1000)
    const data = await this.oceanApi.getEarnings(username, time24HoursAgo)

    data.earnings?.forEach(earning => {
      revenue += earning.satoshis_net_earned
    })

    data.payouts?.forEach(pay => {
      income += pay.total_satoshis_net_paid
    })

    return {
      revenue: revenue / BTC_SATS,
      income,
      unsettled: (revenue - income) / BTC_SATS
    }
  }

  async _getWrkExtDataExtra (key, query) {
    if (key === 'blocks') {
      let data = await this.getDbData(this.blocksDb, query)
      if (query.aggrMonthly) data = this._getBlocksMonthlyAggr(data)
      else data = this._getPoolBlocks(data)
      return data
    }
    return undefined
  }
}

module.exports = OceanMinerpoolManager
