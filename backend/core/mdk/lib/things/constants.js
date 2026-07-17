'use strict'

const STAT_RTD = 'stat-rtd'
const MAIN_DB = 'main'

const TIME_PERIODS_MS = {
  H: 60 * 60 * 1000,
  D: 24 * 60 * 60 * 1000,
  W: 7 * 24 * 60 * 60 * 1000,
  M: 30 * 24 * 60 * 60 * 1000
}

const OPTIONAL_CONFIGS = []
const RPC_METHODS = {}

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

const RUNNING_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error'
}

module.exports = {
  STAT_RTD,
  OPTIONAL_CONFIGS,
  RPC_METHODS,
  MAIN_DB,
  TIME_PERIODS_MS,
  MAINTENANCE,
  POWER_MODE,
  STATUS,
  DEFAULT_THRESHOLD_HASHRATE,
  STAT_SHARES_1M,
  STAT_SHARES_30M,
  STAT_30M,
  MINER_TAG,
  STAT_STARTUP_STATUS,
  STAT_5M,
  RUNNING_STATUS
}
