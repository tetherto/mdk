'use strict'

const {
  WORKER_TYPES,
  AGGR_FIELDS,
  RPC_METHODS,
  LOG_FIELDS,
  LOG_KEYS,
  WORKER_TAGS
} = require('../../lib/constants')
const {
  validateStartEnd,
  iterateRpcEntries,
  forEachRangeAggrItem
} = require('../../lib/metrics.utils')
const { safeDiv } = require('../../lib/utils')

async function getConsumption (ctx, req) {
  const { start, end } = validateStartEnd(req)

  if (req.query.groupBy) return getGroupedConsumption(ctx, req)

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  const results = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
    keys: [{
      type: WORKER_TYPES.POWERMETER,
      startDate,
      endDate,
      fields: { [AGGR_FIELDS.SITE_POWER]: 1 },
      shouldReturnDailyData: 1
    }]
  })

  const daily = processConsumptionData(results)
  const log = Object.keys(daily).sort().map(dayTs => {
    const powerW = daily[dayTs]
    return {
      ts: Number(dayTs),
      powerW,
      consumptionMWh: (powerW * 24) / 1000000
    }
  })

  const summary = calculateConsumptionSummary(log)

  return { log, summary }
}

function processConsumptionData (results) {
  const daily = {}
  for (const entry of iterateRpcEntries(results)) {
    forEachRangeAggrItem(entry, (ts, val) => {
      const v = typeof val === 'object' ? (val[AGGR_FIELDS.SITE_POWER] || 0) : (Number(val) || 0)
      daily[ts] = (daily[ts] || 0) + v
    })
  }
  return daily
}

function calculateConsumptionSummary (log) {
  if (!log.length) {
    return {
      avgPowerW: null,
      totalConsumptionMWh: 0
    }
  }

  const totalPower = log.reduce((sum, entry) => sum + (entry.powerW || 0), 0)
  const totalConsumption = log.reduce((sum, entry) => sum + (entry.consumptionMWh || 0), 0)

  return {
    avgPowerW: safeDiv(totalPower, log.length),
    totalConsumptionMWh: totalConsumption
  }
}

async function getGroupedConsumption (ctx, req) {
  const { groupBy, start, end } = req.query

  const isMinerGroup = groupBy === WORKER_TYPES.MINER

  const field = isMinerGroup
    ? LOG_FIELDS.POWER_W_TYPE_GROUP_SUM
    : LOG_FIELDS.POWER_W_CONTAINER_GROUP_SUM

  const aggrField = isMinerGroup
    ? AGGR_FIELDS.POWER_W_TYPE_GROUP_SUM
    : AGGR_FIELDS.POWER_W_CONTAINER_GROUP_SUM

  const res = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG, {
    type: WORKER_TYPES.MINER,
    tag: WORKER_TAGS.MINER,
    key: LOG_KEYS.STAT_1D,
    start,
    end,
    fields: { [field]: 1 },
    aggrFields: { [aggrField]: 1 }
  })

  const log = res[0].reduce((aggr, val) => {
    const powerW = val[aggrField]
    aggr.push({
      ts: val.ts,
      powerW,
      consumptionMWh: typeof powerW === 'object' && powerW !== null
        ? Object.fromEntries(
          Object.entries(powerW).map(([k, v]) => [k, (Number(v) || 0) * 24 / 1000000])
        )
        : null
    })
    return aggr
  }, [])

  const summary = calculateGroupedConsumptionSummary(log, groupBy)

  return { log, summary }
}

function calculateGroupedConsumptionSummary (log, groupBy) {
  if (!log.length) {
    return {
      avgPowerW: null,
      totalConsumptionMWh: 0
    }
  }

  const groupTotals = {}
  const groupCounts = {}

  for (const entry of log) {
    const powerW = entry.powerW
    if (typeof powerW === 'object' && powerW !== null) {
      for (const [name, val] of Object.entries(powerW)) {
        const v = Number(val) || 0
        groupTotals[name] = (groupTotals[name] || 0) + v
        groupCounts[name] = (groupCounts[name] || 0) + 1
      }
    }
  }

  const byGroup = {}
  let siteTotal = 0
  for (const [name, total] of Object.entries(groupTotals)) {
    const avgPowerW = safeDiv(total, groupCounts[name])
    byGroup[name] = {
      avgPowerW,
      totalConsumptionMWh: (total * 24) / 1000000
    }
    siteTotal += total
  }

  return {
    avgPowerW: safeDiv(siteTotal, log.length),
    totalConsumptionMWh: (siteTotal * 24) / 1000000,
    groupedBy: byGroup
  }
}

module.exports = async function (req, services) {
  return getConsumption(services, req)
}

module.exports.getConsumption = getConsumption
module.exports.processConsumptionData = processConsumptionData
module.exports.calculateConsumptionSummary = calculateConsumptionSummary
module.exports.calculateGroupedConsumptionSummary = calculateGroupedConsumptionSummary
