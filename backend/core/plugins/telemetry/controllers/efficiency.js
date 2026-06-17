'use strict'

const {
  WORKER_TYPES,
  AGGR_FIELDS,
  RPC_METHODS
} = require('../../lib/constants')
const {
  validateStartEnd,
  iterateRpcEntries,
  forEachRangeAggrItem
} = require('../../lib/metrics.utils')
const { safeDiv } = require('../../lib/utils')

async function getEfficiency (ctx, req) {
  const { start, end } = validateStartEnd(req)

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const results = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
    keys: [{
      type: WORKER_TYPES.MINER,
      startDate,
      endDate,
      fields: { [AGGR_FIELDS.EFFICIENCY]: 1 },
      shouldReturnDailyData: 1
    }]
  })

  const daily = processEfficiencyData(results)
  const log = Object.keys(daily).sort().map(dayTs => ({
    ts: Number(dayTs),
    efficiencyWThs: daily[dayTs].total / daily[dayTs].count
  }))

  const summary = calculateEfficiencySummary(log)

  return { log, summary }
}

function processEfficiencyData (results) {
  const daily = {}
  for (const entry of iterateRpcEntries(results)) {
    forEachRangeAggrItem(entry, (ts, val) => {
      const eff = typeof val === 'object' ? (val[AGGR_FIELDS.EFFICIENCY] || 0) : (Number(val) || 0)
      if (!eff) return
      if (!daily[ts]) daily[ts] = { total: 0, count: 0 }
      daily[ts].total += eff
      daily[ts].count += 1
    })
  }
  return daily
}

function calculateEfficiencySummary (log) {
  if (!log.length) {
    return {
      avgEfficiencyWThs: null
    }
  }

  const total = log.reduce((sum, entry) => sum + (entry.efficiencyWThs || 0), 0)

  return {
    avgEfficiencyWThs: safeDiv(total, log.length)
  }
}

module.exports = async function (req, services) {
  return getEfficiency(services, req)
}

module.exports.getEfficiency = getEfficiency
module.exports.processEfficiencyData = processEfficiencyData
module.exports.calculateEfficiencySummary = calculateEfficiencySummary
