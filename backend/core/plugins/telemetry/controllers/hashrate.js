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

async function getHashrate (ctx, req) {
  const { start, end } = validateStartEnd(req)

  const startDate = new Date(start).toISOString()
  const endDate = new Date(end).toISOString()

  if (req.query.groupBy) return getGoupedHashrate(ctx, req)

  const results = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG_RANGE_AGGR, {
    keys: [{
      type: WORKER_TYPES.MINER,
      startDate,
      endDate,
      fields: { [AGGR_FIELDS.HASHRATE_SUM]: 1 },
      shouldReturnDailyData: 1
    }]
  })

  const daily = processHashrateData(results)
  const log = Object.keys(daily).sort().map(dayTs => ({
    ts: Number(dayTs),
    hashrateMhs: daily[dayTs]
  }))

  const summary = calculateHashrateSummary(log)

  return { log, summary }
}

async function getGoupedHashrate (ctx, req) {
  const { groupBy, start, end } = req.query

  const field = groupBy === WORKER_TYPES.MINER
    ? LOG_FIELDS.HASHRATE_SUM_TYPE_GROUP
    : LOG_FIELDS.HASHRATE_SUM_CONTAINER_GROUP

  const aggrField = groupBy === WORKER_TYPES.MINER
    ? AGGR_FIELDS.HASHRATE_SUM_TYPE_GROUP_AGGR
    : AGGR_FIELDS.HASHRATE_SUM_CONTAINER_GROUP_AGGR

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
    aggr.push({ ts: val.ts, hashrateMhs: val[aggrField] })
    return aggr
  }, [])

  const summary = calculateGroupedHashrateSummary(log, groupBy)

  return { log, summary }
}

function processHashrateData (results) {
  const daily = {}
  for (const entry of iterateRpcEntries(results)) {
    forEachRangeAggrItem(entry, (ts, val) => {
      const v = typeof val === 'object' ? (val[AGGR_FIELDS.HASHRATE_SUM] || 0) : (Number(val) || 0)
      daily[ts] = (daily[ts] || 0) + v
    })
  }
  return daily
}

function calculateHashrateSummary (log) {
  if (!log.length) {
    return {
      avgHashrateMhs: null,
      totalHashrateMhs: 0
    }
  }

  const total = log.reduce((sum, entry) => sum + (entry.hashrateMhs || 0), 0)

  return {
    avgHashrateMhs: safeDiv(total, log.length),
    totalHashrateMhs: total
  }
}

function calculateGroupedHashrateSummary (log, groupBy) {
  if (!log.length) {
    return {
      avgHashrateMhs: null,
      totalHashrateMhs: 0
    }
  }

  const groupTotals = {}
  const groupCounts = {}

  for (const entry of log) {
    const hashrate = entry.hashrateMhs
    if (typeof hashrate === 'object' && hashrate !== null) {
      for (const [name, val] of Object.entries(hashrate)) {
        const v = Number(val) || 0
        groupTotals[name] = (groupTotals[name] || 0) + v
        groupCounts[name] = (groupCounts[name] || 0) + 1
      }
    }
  }

  const byGroup = {}
  let siteTotal = 0
  for (const [name, total] of Object.entries(groupTotals)) {
    byGroup[name] = {
      avgHashrateMhs: safeDiv(total, groupCounts[name]),
      totalHashrateMhs: total
    }
    siteTotal += total
  }

  return {
    avgHashrateMhs: safeDiv(siteTotal, log.length),
    totalHashrateMhs: siteTotal,
    groupedBy: byGroup
  }
}

module.exports = async function (req, services) {
  return getHashrate(services, req)
}

module.exports.getHashrate = getHashrate
module.exports.processHashrateData = processHashrateData
module.exports.calculateHashrateSummary = calculateHashrateSummary
module.exports.calculateGroupedHashrateSummary = calculateGroupedHashrateSummary
