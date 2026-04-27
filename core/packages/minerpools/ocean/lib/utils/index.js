'use strict'

const {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
} = require('../../../../tpls/tpl-lib-minerpool/lib/utils/time')

const getWorkersStats = (data, username) => {
  return Object.entries(data.workers).map(([name, [worker]]) => {
    return {
      username,
      id: name,
      name,
      online: +worker.hashrate_60s === 0 ? 0 : 1,
      last_updated: +data.snap_ts,
      hashrate: +worker.hashrate_60s,
      hashrate_1h: +worker.hashrate_3600s,
      hashrate_24h: +worker.hashrate_86400s,
      hashrate_stale_1h: 0,
      hashrate_stale_24h: 0
    }
  })
}

const getMonthlyDateRanges = (months) => {
  const dateRange = {}
  const today = new Date()
  for (let i = 0; i < months; i++) {
    const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1, 0, 0, 0)
    dateRange[`${startDate.getMonth() + 1}-${startDate.getFullYear()}`] = {
      key: `${startDate.getFullYear()}-${startDate.getMonth() + 1}`
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
