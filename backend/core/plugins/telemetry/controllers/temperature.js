'use strict'

const {
  WORKER_TYPES,
  AGGR_FIELDS,
  RPC_METHODS,
  WORKER_TAGS
} = require('../../lib/constants')
const {
  validateStartEnd,
  iterateRpcEntries,
  parseEntryTs,
  resolveInterval,
  getIntervalConfig
} = require('../../lib/metrics.utils')
const { getStartOfDay, safeDiv } = require('../../lib/utils')

async function getTemperature (ctx, req) {
  const { start, end } = validateStartEnd(req)

  const interval = resolveInterval(start, end, req.query.interval)
  const config = getIntervalConfig(interval)
  const container = req.query.container || null

  const rpcPayload = {
    key: config.key,
    type: WORKER_TYPES.MINER,
    tag: WORKER_TAGS.MINER,
    aggrFields: {
      [AGGR_FIELDS.TEMP_MAX]: 1,
      [AGGR_FIELDS.TEMP_AVG]: 1
    },
    shouldCalculateAvg: true,
    start,
    end
  }

  if (config.groupRange) {
    rpcPayload.groupRange = config.groupRange
  }

  const results = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG, rpcPayload)

  const timePoints = processTemperatureData(results, config.groupRange, container)
  const log = Object.keys(timePoints).sort().map(ts => ({
    ts: Number(ts),
    ...timePoints[ts]
  }))

  const summary = calculateTemperatureSummary(log)

  return { log, summary }
}

function processTemperatureData (results, groupRange, containerFilter) {
  const timePoints = {}
  const avgCounts = {}

  for (const entry of iterateRpcEntries(results)) {
    const rawTs = parseEntryTs(entry.ts || entry.timestamp)
    const ts = groupRange && rawTs ? getStartOfDay(rawTs) : rawTs
    if (!ts) continue

    const maxObj = entry[AGGR_FIELDS.TEMP_MAX] || entry.aggrFields?.[AGGR_FIELDS.TEMP_MAX] || {}
    const avgObj = entry[AGGR_FIELDS.TEMP_AVG] || entry.aggrFields?.[AGGR_FIELDS.TEMP_AVG] || {}

    if (!timePoints[ts]) {
      timePoints[ts] = { containers: {}, siteMaxC: null, siteAvgC: null }
      avgCounts[ts] = {}
    }

    const point = timePoints[ts]

    if (typeof maxObj === 'object' && maxObj !== null) {
      for (const [name, maxVal] of Object.entries(maxObj)) {
        if (containerFilter && name !== containerFilter) continue
        const numMax = Number(maxVal) || 0
        const numAvg = Number(avgObj[name]) || 0

        if (!point.containers[name]) {
          point.containers[name] = { maxC: numMax, avgC: numAvg }
          avgCounts[ts][name] = 1
        } else {
          point.containers[name].maxC = Math.max(point.containers[name].maxC, numMax)
          const count = avgCounts[ts][name]
          point.containers[name].avgC = (point.containers[name].avgC * count + numAvg) / (count + 1)
          avgCounts[ts][name] = count + 1
        }
      }
    }

    const containerVals = Object.values(point.containers)
    if (containerVals.length) {
      point.siteMaxC = Math.max(...containerVals.map(c => c.maxC))
      const avgSum = containerVals.reduce((sum, c) => sum + c.avgC, 0)
      point.siteAvgC = safeDiv(avgSum, containerVals.length)
    }
  }
  return timePoints
}

function calculateTemperatureSummary (log) {
  if (!log.length) {
    return {
      avgMaxTemp: null,
      avgAvgTemp: null,
      peakTemp: null
    }
  }

  const maxTemps = log.filter(e => e.siteMaxC !== null).map(e => e.siteMaxC)
  const avgTemps = log.filter(e => e.siteAvgC !== null).map(e => e.siteAvgC)

  return {
    avgMaxTemp: maxTemps.length ? safeDiv(maxTemps.reduce((a, b) => a + b, 0), maxTemps.length) : null,
    avgAvgTemp: avgTemps.length ? safeDiv(avgTemps.reduce((a, b) => a + b, 0), avgTemps.length) : null,
    peakTemp: maxTemps.length ? Math.max(...maxTemps) : null
  }
}

module.exports = async function (req, services) {
  return getTemperature(services, req)
}

module.exports.getTemperature = getTemperature
module.exports.processTemperatureData = processTemperatureData
module.exports.calculateTemperatureSummary = calculateTemperatureSummary
