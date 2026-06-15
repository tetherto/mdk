'use strict'

const MAINTENANCE = 'maintenance'

const STATUS = {
  OFFLINE: 'offline',
  SLEEPING: 'sleeping',
  MINING: 'mining',
  ERROR: 'error',
  NOT_MINING: 'not_mining'
}

const POWER_MODE = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  SLEEP: 'sleep'
}

const DEFAULT_THRESHOLD_HASHRATE = 50000000

const STAT_SHARES_1M = 'stat-shares-1m'
const STAT_SHARES_30M = 'stat-shares-30m'
const STAT_30M = 'stat-30m'
const MINER_TAG = 't-miner'
const STAT_STARTUP_STATUS = 'stat-startup'
const STAT_5M = 'stat-5m'

module.exports = {
  MAINTENANCE,
  POWER_MODE,
  STATUS,
  DEFAULT_THRESHOLD_HASHRATE,
  STAT_SHARES_1M,
  STAT_SHARES_30M,
  STAT_30M,
  MINER_TAG,
  STAT_STARTUP_STATUS,
  STAT_5M
}
