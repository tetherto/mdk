'use strict'

const {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
} = require('../../../../tpls/tpl-lib-minerpool/lib/utils/time')

/**
 * @typedef {Object} Worker
 * @property {string} host
 * @property {number} status
 * @property {string} last_share_at
 * @property {Object} hash_rate_info
 * @property {string} hash_rate_info.name
 * @property {number} hash_rate_info.hash_rate
 * @property {number} hash_rate_info.h1_hash_rate
 * @property {number} hash_rate_info.h24_hash_rate
 * @property {number} hash_rate_info.h1_stale_hash_rate
 * @property {number} hash_rate_info.h24_stale_hash_rate
 */

/**
 * @typedef {Object} WorkerStats
 * @property {string} id
 * @property {string} name
 * @property {boolean} online
 * @property {string} last_updated
 * @property {number} hashrate
 * @property {number} hashrate_1h
 * @property {number} hashrate_24h
 * @property {number} hashrate_stale_1h
 * @property {number} hashrate_stale_24h
 */

/**
 * @param {Worker[]} workers
 * @returns {WorkerStats[]}
 */
function getWorkersStats (workers, username) {
  return workers.map(w => {
    return {
      username,
      id: w.host,
      name: w.hash_rate_info.name,
      online: +w.status === 0 ? 1 : 0,
      last_updated: w.last_share_at,
      hashrate: w.hash_rate_info.hash_rate,
      hashrate_1h: w.hash_rate_info.h1_hash_rate,
      hashrate_24h: w.hash_rate_info.h24_hash_rate,
      hashrate_stale_1h: w.hash_rate_info.h1_stale_hash_rate,
      hashrate_stale_24h: w.hash_rate_info.h24_stale_hash_rate
    }
  })
}

const getMonthlyDateRanges = (months) => {
  const dateRange = {}
  const today = new Date()
  for (let i = 0; i < months; i++) {
    const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1, 0, 0, 0)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1, 0, 0, 0)
    dateRange[`${startDate.getMonth() + 1}-${startDate.getFullYear()}`] = {
      startDate: startDate.getTime(),
      endDate: endDate.getTime()
    }
  }

  return dateRange
}

module.exports = {
  getWorkersStats,
  getMonthlyDateRanges,
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
}
