'use strict'

const {
  WORKER_TYPES,
  AGGR_FIELDS,
  RPC_METHODS,
  LOG_KEYS,
  WORKER_TAGS
} = require('../../lib/constants')
const {
  validateStartEnd,
  iterateRpcEntries,
  parseEntryTs,
  sumObjectValues
} = require('../../lib/metrics.utils')
const { getStartOfDay, safeDiv } = require('../../lib/utils')

async function getMinerStatus (ctx, req) {
  const { start, end } = validateStartEnd(req)

  const results = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG, {
    key: LOG_KEYS.STAT_3H,
    type: WORKER_TYPES.MINER,
    tag: WORKER_TAGS.MINER,
    aggrFields: {
      [AGGR_FIELDS.TYPE_CNT]: 1,
      [AGGR_FIELDS.OFFLINE_CNT]: 1,
      [AGGR_FIELDS.SLEEP_CNT]: 1,
      [AGGR_FIELDS.MAINTENANCE_CNT]: 1
    },
    groupRange: '1D',
    shouldCalculateAvg: true,
    start,
    end
  })

  const daily = processMinerStatusData(results)
  const log = Object.keys(daily).sort().map(dayTs => ({
    ts: Number(dayTs),
    ...daily[dayTs]
  }))

  const summary = calculateMinerStatusSummary(log)

  return { log, summary }
}

function processMinerStatusData (results) {
  const daily = {}
  for (const entry of iterateRpcEntries(results)) {
    const rawTs = parseEntryTs(entry.ts || entry.timestamp)
    const ts = rawTs ? getStartOfDay(rawTs) : null
    if (!ts) continue
    if (!daily[ts]) {
      daily[ts] = { online: 0, offline: 0, sleep: 0, maintenance: 0 }
    }

    const offlineCnt = sumObjectValues(entry[AGGR_FIELDS.OFFLINE_CNT] || entry.aggrFields?.[AGGR_FIELDS.OFFLINE_CNT])
    const sleepCnt = sumObjectValues(entry[AGGR_FIELDS.SLEEP_CNT] || entry.aggrFields?.[AGGR_FIELDS.SLEEP_CNT])
    const maintenanceCnt = sumObjectValues(entry[AGGR_FIELDS.MAINTENANCE_CNT] || entry.aggrFields?.[AGGR_FIELDS.MAINTENANCE_CNT])

    daily[ts].offline += offlineCnt
    daily[ts].sleep += sleepCnt
    daily[ts].maintenance += maintenanceCnt

    const totalCount = sumObjectValues(entry[AGGR_FIELDS.TYPE_CNT]) || entry.total_cnt || entry.count || 0
    if (totalCount > 0) {
      daily[ts].online += Math.max(0, totalCount - offlineCnt - sleepCnt - maintenanceCnt)
    }
  }
  return daily
}

function calculateMinerStatusSummary (log) {
  if (!log.length) {
    return {
      avgOnline: null,
      avgOffline: null,
      avgSleep: null,
      avgMaintenance: null
    }
  }

  const totals = log.reduce((acc, entry) => {
    acc.online += entry.online || 0
    acc.offline += entry.offline || 0
    acc.sleep += entry.sleep || 0
    acc.maintenance += entry.maintenance || 0
    return acc
  }, { online: 0, offline: 0, sleep: 0, maintenance: 0 })

  return {
    avgOnline: safeDiv(totals.online, log.length),
    avgOffline: safeDiv(totals.offline, log.length),
    avgSleep: safeDiv(totals.sleep, log.length),
    avgMaintenance: safeDiv(totals.maintenance, log.length)
  }
}

module.exports = async function (req, services) {
  return getMinerStatus(services, req)
}

module.exports.getMinerStatus = getMinerStatus
module.exports.processMinerStatusData = processMinerStatusData
module.exports.calculateMinerStatusSummary = calculateMinerStatusSummary
