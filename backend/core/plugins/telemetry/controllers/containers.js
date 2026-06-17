'use strict'

const {
  WORKER_TYPES,
  AGGR_FIELDS,
  RPC_METHODS,
  LOG_KEYS,
  WORKER_TAGS,
  DEVICE_LIST_FIELDS,
  METRICS_TIME,
  METRICS_DEFAULTS
} = require('../../lib/constants')
const {
  iterateRpcEntries,
  parseEntryTs
} = require('../../lib/metrics.utils')

async function getContainerTelemetry (ctx, req) {
  const containerId = req.params.id

  if (!containerId) {
    throw new Error('ERR_MISSING_CONTAINER_ID')
  }

  const containerTag = `container-${containerId}`

  const [minersResults, sensorResults] = await Promise.all([
    ctx.dataProxy.requestDataAllPages(RPC_METHODS.LIST_THINGS, {
      query: { tags: { $in: [containerTag] } },
      fields: DEVICE_LIST_FIELDS
    }),
    ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG, {
      key: LOG_KEYS.STAT_5M,
      type: WORKER_TYPES.CONTAINER,
      tag: WORKER_TAGS.CONTAINER,
      aggrFields: {
        [AGGR_FIELDS.CONTAINER_SPECIFIC_STATS]: 1
      },
      limit: 1
    })
  ])

  const miners = processContainerMiners(minersResults)
  const telemetry = processContainerSensorSnapshot(sensorResults, containerId)

  return {
    id: containerId,
    miners,
    telemetry
  }
}

function processContainerMiners (results) {
  const miners = []
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const thing of data) {
      if (!thing || thing.error) continue
      miners.push(thing)
    }
  }
  return miners
}

function processContainerSensorSnapshot (results, containerId) {
  for (const entry of iterateRpcEntries(results)) {
    const aggrData = entry[AGGR_FIELDS.CONTAINER_SPECIFIC_STATS] ||
      entry.aggrFields?.[AGGR_FIELDS.CONTAINER_SPECIFIC_STATS] || {}

    if (typeof aggrData !== 'object' || aggrData === null) continue

    if (aggrData[containerId]) {
      return aggrData[containerId]
    }

    for (const [key, val] of Object.entries(aggrData)) {
      if (key.startsWith(containerId)) {
        return val
      }
    }
  }
  return null
}

async function getContainerHistory (ctx, req) {
  const containerId = req.params.id

  if (!containerId) {
    throw new Error('ERR_MISSING_CONTAINER_ID')
  }

  const now = Date.now()
  const start = Number(req.query.start) || (now - METRICS_TIME.ONE_DAY_MS)
  const end = Number(req.query.end) || now
  const limit = Number(req.query.limit) || METRICS_DEFAULTS.CONTAINER_HISTORY_LIMIT

  if (start >= end) {
    throw new Error('ERR_INVALID_DATE_RANGE')
  }

  const results = await ctx.dataProxy.requestData(RPC_METHODS.TAIL_LOG, {
    key: LOG_KEYS.STAT_5M,
    type: WORKER_TYPES.CONTAINER,
    tag: WORKER_TAGS.CONTAINER,
    aggrFields: {
      [AGGR_FIELDS.CONTAINER_SPECIFIC_STATS]: 1
    },
    start,
    end,
    limit
  })

  const log = processContainerHistoryData(results, containerId)

  return { log }
}

function processContainerHistoryData (results, containerId) {
  const log = []

  for (const entry of iterateRpcEntries(results)) {
    const ts = parseEntryTs(entry.ts || entry.timestamp)
    if (!ts) continue

    const aggrData = entry[AGGR_FIELDS.CONTAINER_SPECIFIC_STATS] ||
      entry.aggrFields?.[AGGR_FIELDS.CONTAINER_SPECIFIC_STATS] || {}

    if (typeof aggrData !== 'object' || aggrData === null) continue

    let containerData = aggrData[containerId] || null

    if (!containerData) {
      for (const [key, val] of Object.entries(aggrData)) {
        if (key.startsWith(containerId)) {
          containerData = val
          break
        }
      }
    }

    if (containerData) {
      log.push({ ts, ...containerData })
    }
  }

  log.sort((a, b) => a.ts - b.ts)
  return log
}

module.exports = async function (req, services) {
  return getContainerTelemetry(services, req)
}

module.exports.history = async function (req, services) {
  return getContainerHistory(services, req)
}

module.exports.getContainerTelemetry = getContainerTelemetry
module.exports.getContainerHistory = getContainerHistory
module.exports.processContainerMiners = processContainerMiners
module.exports.processContainerSensorSnapshot = processContainerSensorSnapshot
module.exports.processContainerHistoryData = processContainerHistoryData
