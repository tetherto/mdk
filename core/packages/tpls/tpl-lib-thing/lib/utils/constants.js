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

module.exports = {
  STAT_RTD,
  OPTIONAL_CONFIGS,
  RPC_METHODS,
  MAIN_DB,
  TIME_PERIODS_MS
}
