'use strict'

const { id, opts, env, config, logger } = require('@tetherto/mdk-worker/device')
const F2MinerpoolApi = require('../lib/f2.minerpool.api')
const { getWorkersStats } = require('../lib/utils')
const createHttp = require('./http')

// WorkerRuntimeV2 loads this module once per device into a private registry:
// the pool is one logical device, so this is one F2Pool account set. opts is
// the device's own config (accounts, apiUrl); config is the worker-level
// block; the API secret comes from env ahead of either.
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const accounts = opts.accounts || config.accounts
// A mock started by `mdk run` (`mock: true`) listens on the device's host/port,
// so a port without an apiUrl means "this local simulator".
const apiUrl = opts.apiUrl || config.apiUrl ||
  (opts.port ? `http://${opts.host || opts.address || '127.0.0.1'}:${opts.port}` : 'https://api.f2pool.com')
const apiSecret = env.F2POOL_API_SECRET || opts.apiSecret || config.apiSecret
if (!Array.isArray(accounts) || !accounts.length) throw new Error('ERR_ACCOUNTS_REQUIRED')
if (!apiSecret) throw new Error('ERR_API_SECRET_REQUIRED')

const api = new F2MinerpoolApi(createHttp(apiUrl), apiSecret)

logger('pool %s: %d account(s) at %s', id, accounts.length, apiUrl)

async function call (fn) {
  try {
    return await fn()
  } catch (err) {
    const detail = String((err && err.message) || err)
    if (/^ERR_/.test(detail)) throw err
    throw new Error(`ERR_POOL_API: ${detail}`)
  }
}

// F2Pool rate-limits its API (the client sleeps between calls), so each data
// set is read once per poll sweep and shared by every channel of it; a pool
// that has gone away fails instead of answering from a cache.
const sweep = require('@tetherto/mdk-worker/sweep-memo')()

// Only the fields a channel reads: balance, estimated_earnings and hashrate
// sum them across accounts, so an account the pool reports nothing for adds 0.
async function loadStats () {
  const end = Date.now()
  const stats = []
  for (const username of accounts) {
    const { balance_info: bal = {} } = await api.getBalance(username) || {}
    const { hash_rate_list: hashRate24h = [] } = await api.getHashRateHistory(username, end - DAY_MS, end) || {}
    stats.push({
      username,
      timestamp: end,
      balance: bal.total_income || 0,
      estimated_today_income: bal.estimated_today_income || 0,
      hashrate: hashRate24h.length ? hashRate24h[hashRate24h.length - 1].hash_rate || 0 : 0
    })
  }
  return { ts: end, stats }
}

async function loadWorkers () {
  let workers = []
  for (const username of accounts) {
    workers = workers.concat(getWorkersStats(await api.getWorkers(username), username))
  }
  return { ts: Date.now(), workers }
}

module.exports = {
  accounts,
  api,
  call,
  stats: (params) => sweep(params, 'stats', () => call(loadStats)),
  workers: (params) => sweep(params, 'workers', () => call(loadWorkers))
}
