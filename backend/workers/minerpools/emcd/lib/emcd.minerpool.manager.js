'use strict'

const { PoolService } = require('@tetherto/mdk-core')
const EmcdMinerpoolApi = require('./emcd.minerpool.api')
const constants = require('./utils/constants')
const utils = require('./utils')

const { COIN, POOL_TYPE, DEFAULT_API_URL, MASTER_ACCOUNT, DAY_MS, HISTORY_TTL_MS, STATS_MAX_AGE_MS, REQUEST_INTERVAL_MS, TRANSACTION_TYPES } = constants
const { DataError, toNumber, toTimestamp, isIsoDate, dateString, monthKey, previousDay, getMonthlyDateRanges, getWorkersStats } = utils

// 403: the key lacks master:read:balance. 404: the endpoint is not deployed yet.
const BALANCE_UNAVAILABLE_STATUSES = new Set([403, 404])
const DAILY_JOB = '1D'
const MONTHS_OF_HISTORY = 12

const toSecondTs = time => Math.floor(time.getTime() / 1000) * 1000

/**
 * @typedef {Object} AccountStats
 * @property {string} username           subaccount ID, '' for the master account
 * @property {number} timestamp          ms when the snapshot was taken
 * @property {number|null} balance       BTC, null when /balance is unavailable
 * @property {null} unsettled            EMCD Pool API does not expose pending payouts
 * @property {number} revenue_24h        BTC earned on the previous UTC day
 * @property {number} estimated_today_income  same as revenue_24h
 * @property {number} hashrate           H/s, current
 * @property {number} hashrate_1h        H/s, 1h average
 * @property {number} hashrate_24h       H/s, 24h average
 * @property {number} hashrate_stale_1h  H/s, rejected 1h average
 * @property {number} hashrate_stale_24h H/s, rejected 24h average
 * @property {number} worker_count
 * @property {number} active_workers_count
 * @property {MonthlyBalance[]} yearlyBalances
 */

/**
 * @typedef {Object} MonthlyBalance
 * @property {string} month   "M-YYYY"
 * @property {number} balance BTC paid out in that month
 */

/**
 * @typedef {Object} PayoutTransaction
 * @property {string} username
 * @property {string|null} id        blockchain txId, null for internal payouts
 * @property {'payout'} type
 * @property {number} changed_balance BTC
 * @property {number} created_at     unix seconds
 */

/**
 * EMCD Bitcoin pool worker.
 *
 * Every signed request is rate-limited to about one per second, so a full
 * stats cycle for one account takes several seconds. Three mechanisms keep
 * that from piling up:
 *  - `EmcdMinerpoolApi` serializes all HTTP calls through one queue;
 *  - `_dedupe` makes overlapping scheduler ticks share one in-flight job;
 *  - `_yearlyBalances` caches the twelve-month payout history per account.
 */
class EmcdMinerpoolManager extends PoolService {
  constructor (conf, ctx) {
    super({ ...conf, wtype: conf?.wtype || POOL_TYPE }, ctx)
    this._inFlight = new Map()
    this._yearlyBalances = new Map()
    this._balanceWarningLogged = false
    this._statsError = null
  }

  async init () {
    if (this._initialized) {
      return
    }

    try {
      await super.init(POOL_TYPE)
      this._scheduleDailyJobInUtc()
    } catch (err) {
      await new Promise(resolve => this.stop(resolve))
      throw err
    }
  }

  /**
   * PoolService schedules the daily job in local time. EMCD ledgers are
   * keyed by UTC day, so the job must fire at UTC midnight.
   */
  _scheduleDailyJobInUtc () {
    this.scheduler_0.del(DAILY_JOB)
    this.scheduler_0.add(
      DAILY_JOB,
      time => this.fetchData(DAILY_JOB, time),
      { rule: '0 0 0 * * *', tz: 'Etc/UTC' }
    )
  }

  async _createFacilities (ctx) {
    const config = this.conf.emcd || {}

    this.accounts = parseAccounts(config.accounts)
    EmcdMinerpoolApi.validateConfig(config)

    await super._createFacilities(ctx)

    this.emcdApi = new EmcdMinerpoolApi(this.http_0, {
      ...config,
      signal: this.abortSignal,
      requestIntervalMs: process.env.NODE_ENV === 'test' ? 0 : REQUEST_INTERVAL_MS
    })
  }

  /**
   * PoolService registers signal handlers it never removes. Keep a reference
   * so stop() can detach them and a test process does not leak listeners.
   */
  _bindProcessExit () {
    this._onProcessExit = () => this.stop(() => {})
    process.once('SIGINT', this._onProcessExit)
    process.once('SIGTERM', this._onProcessExit)
  }

  stop (cb) {
    if (this._onProcessExit) {
      process.removeListener('SIGINT', this._onProcessExit)
      process.removeListener('SIGTERM', this._onProcessExit)
    }
    super.stop(cb)
  }

  getHttpUrl () {
    return this.conf.emcd?.apiUrl || DEFAULT_API_URL
  }

  fetchStats (time) {
    return this._dedupe('stats', async () => {
      try {
        const stats = []
        for (const username of this.accounts) {
          stats.push(await this._fetchAccountStats(username, time))
        }
        this.data.statsData = { ts: toSecondTs(time), stats }
        this._statsError = null
      } catch (err) {
        this._statsError = err
        throw err
      }
    })
  }

  fetchWorkers (time) {
    return this._dedupe('workers', async () => {
      const workers = []
      for (const username of this.accounts) {
        workers.push(...await this._fetchAccountWorkers(username))
      }

      const ts = toSecondTs(time)
      await this._saveToDb(this.workersCountDb, ts, { ts, count: workers.length })
      this.data.workersData = { ts, workers }
    })
  }

  /**
   * Fires at UTC midnight and stores the payouts of the day that just ended.
   * @param {Date} [time] scheduler fire time; the previous UTC day is collected
   */
  fetchTransactions (time = new Date()) {
    return this._dedupe('transactions', async () => {
      const day = previousDay(time)

      const transactions = []
      for (const username of this.accounts) {
        transactions.push(...await this._fetchAccountPayouts(username, day))
      }

      await this._saveToDb(this.transactionsDb, day.start, { ts: day.start, transactions })
    })
  }

  /**
   * Payout totals for the last twelve months, newest first. Cached per
   * account for HISTORY_TTL_MS and invalidated on month rollover.
   * @returns {Promise<MonthlyBalance[]>}
   */
  getYearlyBalances (username, time = new Date()) {
    return this._dedupe(`history:${username}`, async () => {
      const ranges = getMonthlyDateRanges(time)
      const cached = this._yearlyBalances.get(username)
      if (isFreshHistory(cached, ranges[0].month)) {
        return cached.balances
      }

      const balances = await this._fetchMonthlyPayoutTotals(username, ranges, time)
      this._yearlyBalances.set(username, { month: ranges[0].month, ts: Date.now(), balances })
      return balances
    })
  }

  /**
   * Sum of one stats field across all accounts. Throws E_POOL_API when the
   * last poll failed, is older than STATS_MAX_AGE_MS, or lacks the field.
   * @param {string} field key of an entry in `data.statsData.stats`
   * @returns {number}
   */
  getMetric (field) {
    const { ts, stats } = this.data.statsData

    const isStale = Date.now() - ts > STATS_MAX_AGE_MS
    if (this._statsError || !stats?.length || isStale) {
      throw new Error('E_POOL_API: EMCD statistics are unavailable or stale')
    }
    if (stats.some(account => !Number.isFinite(account[field]))) {
      throw new Error(`E_POOL_API: EMCD ${field} is unavailable`)
    }

    return stats.reduce((sum, account) => sum + account[field], 0)
  }

  /**
   * Hourly aggregation is built on `satoshis_net_earned`, which EMCD payouts
   * do not expose. Fail loudly instead of returning zeros.
   */
  _aggrTransactions () {
    throw new Error('ERR_EMCD_PAYOUT_AGGREGATION_UNSUPPORTED')
  }

  /** @returns {Promise<AccountStats>} */
  async _fetchAccountStats (username, time) {
    const hashrate = await this.emcdApi.getHashrate(username)
    const workers = await this._fetchAccountWorkers(username)
    const revenue = await this._fetchYesterdayRevenue(username, time)
    const balance = await this._fetchBalance(username)
    const yearlyBalances = await this.getYearlyBalances(username, time)

    return {
      username,
      timestamp: Date.now(),
      balance,
      unsettled: null,
      revenue_24h: revenue,
      estimated_today_income: revenue,
      hashrate: toNumber(hashrate?.currHr, 'hashrate.currHr'),
      hashrate_1h: toNumber(hashrate?.avg1Hr, 'hashrate.avg1Hr'),
      hashrate_24h: toNumber(hashrate?.avg24Hr, 'hashrate.avg24Hr'),
      hashrate_stale_1h: toNumber(hashrate?.rejects?.Avg1Hr, 'rejects.Avg1Hr'),
      hashrate_stale_24h: toNumber(hashrate?.rejects?.Avg24Hr, 'rejects.Avg24Hr'),
      worker_count: workers.length,
      active_workers_count: workers.filter(worker => worker.online).length,
      yearlyBalances
    }
  }

  async _fetchAccountWorkers (username) {
    return getWorkersStats(await this.emcdApi.getWorkers(username), username)
  }

  /**
   * EMCD publishes earnings once per completed day, so yesterday's total is
   * both `revenue_24h` and the best estimate for today.
   *
   * Queries [yesterday, today] and filters locally: the ledger's end-date
   * filter may be inclusive or exclusive, and this works either way.
   */
  async _fetchYesterdayRevenue (username, time) {
    const { date: yesterday } = previousDay(time)
    const earnings = await this.emcdApi.getEarnings(username, yesterday, dateString(time))

    let revenue = 0
    for (const earning of earnings) {
      if (!isIsoDate(earning?.date)) {
        throw new DataError('earning.date')
      }
      if (earning.date === yesterday) {
        revenue += toNumber(earning.totalAmount, 'earning.totalAmount')
      }
    }
    return revenue
  }

  /**
   * GET /balance answers `{ coin, balance, updatedAt }` (gw-pool MR !68).
   * `balance` is the credited mining balance as a decimal string; funds
   * blocked for an outgoing payout are excluded and not reported separately.
   * @returns {Promise<number|null>} null when the endpoint is unavailable
   */
  async _fetchBalance (username) {
    try {
      const result = await this.emcdApi.getBalance(username)
      if (result?.coin !== COIN) {
        throw new DataError('balance.coin')
      }
      return toNumber(result.balance, 'balance.balance')
    } catch (err) {
      if (!BALANCE_UNAVAILABLE_STATUSES.has(err.status)) {
        throw err
      }
      this._warnBalanceUnavailableOnce(err.status)
      return null
    }
  }

  _warnBalanceUnavailableOnce (status) {
    if (this._balanceWarningLogged) {
      return
    }
    this._balanceWarningLogged = true
    const reason = status === 403
      ? 'the API key lacks master:read:balance'
      : 'the API does not provide /balance'
    this._logErr('WARN_EMCD_BALANCE_UNAVAILABLE', `${reason}; balance telemetry is unavailable.`)
  }

  /** @returns {Promise<PayoutTransaction[]>} */
  async _fetchAccountPayouts (username, day) {
    const payouts = await this.emcdApi.getPayouts(username, day.date, dateString(day.end))

    const transactions = []
    for (const payout of payouts) {
      const createdAt = toTimestamp(payout.time, 'payout.time')
      const isWithinDay = createdAt >= day.start && createdAt < day.end
      if (!isWithinDay) {
        continue
      }

      transactions.push({
        username,
        id: payout.txId,
        type: TRANSACTION_TYPES.PAYOUT,
        changed_balance: toNumber(payout.amount, 'payout.amount'),
        created_at: Math.floor(createdAt / 1000)
      })
    }
    return transactions
  }

  async _fetchMonthlyPayoutTotals (username, ranges, time) {
    const oldest = ranges[MONTHS_OF_HISTORY - 1]
    const end = Date.parse(dateString(time)) + DAY_MS
    const payouts = await this.emcdApi.getPayouts(username, dateString(oldest.start), dateString(end))

    const totals = new Map(ranges.map(range => [range.month, 0]))
    for (const payout of payouts) {
      const paidAt = toTimestamp(payout.time, 'payout.time')
      if (paidAt >= end) {
        continue
      }

      const month = monthKey(paidAt)
      if (!totals.has(month)) {
        continue
      }
      totals.set(month, totals.get(month) + toNumber(payout.amount, 'payout.amount'))
    }

    return Array.from(totals, ([month, balance]) => ({ month, balance }))
  }

  /**
   * Scheduler ticks can overlap when an account has a long payout history.
   * Callers with the same key share the job that is already running.
   * @param {string} key job identity, e.g. 'stats' or 'history:<account>'
   * @param {() => Promise<T>} job
   * @returns {Promise<T>}
   * @template T
   */
  _dedupe (key, job) {
    if (this._inFlight.has(key)) {
      return this._inFlight.get(key)
    }

    const pending = Promise.resolve()
      .then(job)
      .finally(() => this._inFlight.delete(key))
    this._inFlight.set(key, pending)
    return pending
  }
}

/**
 * An explicit list selects only those subaccounts. An empty list selects the
 * master account, which the API addresses by an empty subaccount ID.
 * @param {string[]|undefined} accounts
 * @returns {string[]}
 */
function parseAccounts (accounts) {
  accounts = accounts ?? []
  const isList = Array.isArray(accounts)
  const allNonEmpty = isList && accounts.every(id => typeof id === 'string' && id.trim().length > 0)
  const allUnique = isList && new Set(accounts).size === accounts.length
  if (!allNonEmpty || !allUnique) {
    throw new Error('ERR_EMCD_ACCOUNTS_INVALID')
  }

  return accounts.length ? [...accounts] : [MASTER_ACCOUNT]
}

function isFreshHistory (cached, currentMonth) {
  return Boolean(cached) &&
    cached.month === currentMonth &&
    Date.now() - cached.ts < HISTORY_TTL_MS
}

module.exports = EmcdMinerpoolManager
