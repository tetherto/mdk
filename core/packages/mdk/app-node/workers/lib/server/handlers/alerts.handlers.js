'use strict'

const {
  RPC_METHODS,
  SEVERITY_LEVELS,
  ALERTS_DEFAULT_LIMIT,
  ALERTS_MAX_SITE_LIMIT,
  ALERTS_MAX_HISTORY_LIMIT,
  SITE_ALERTS_FILTER_FIELDS,
  SITE_ALERTS_SEARCH_FIELDS,
  HISTORY_FILTER_FIELDS,
  HISTORY_SEARCH_FIELDS
} = require('../../constants')
const { parseJsonQueryParam, matchesFilter, deduplicateAlerts } = require('../../utils')

function extractAlertsFromThings (things) {
  const alerts = []
  for (const thing of things) {
    if (Array.isArray(thing?.last?.alerts)) {
      for (const alert of thing.last.alerts) {
        if (alert && typeof alert === 'object' && !Array.isArray(alert)) {
          alerts.push({
            ...alert,
            id: thing.id,
            type: thing.type,
            code: thing.code,
            container: thing.info?.container
          })
        }
      }
    }
  }
  return alerts
}

function matchesSearch (item, search, fields) {
  if (!search) return true
  const lowerSearch = search.toLowerCase()
  for (const field of fields) {
    const val = item[field]
    if (val != null && String(val).toLowerCase().includes(lowerSearch)) {
      return true
    }
  }
  return false
}

function applySort (items, sort) {
  if (!sort) return items
  const entries = Object.entries(sort)
  if (!entries.length) return items

  return items.slice().sort((a, b) => {
    for (const [field, dir] of entries) {
      const aVal = a[field]
      const bVal = b[field]
      if (aVal < bVal) return dir === 1 ? -1 : 1
      if (aVal > bVal) return dir === 1 ? 1 : -1
    }
    return 0
  })
}

function buildSeveritySummary (alerts) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, total: alerts.length }
  for (const alert of alerts) {
    if (SEVERITY_LEVELS.has(alert.severity)) {
      summary[alert.severity]++
    }
  }
  return summary
}

function flattenHistoryAlert (entry) {
  const thing = entry.thing || {}
  return {
    name: entry.name,
    description: entry.description,
    severity: entry.severity,
    createdAt: entry.createdAt,
    uuid: entry.uuid,
    deviceId: thing.id,
    deviceType: thing.type,
    code: thing.code,
    container: thing.info?.container,
    position: thing.info?.pos,
    tags: thing.tags
  }
}

async function getSiteAlerts (ctx, req) {
  const filter = parseJsonQueryParam(req.query.filter, 'ERR_INVALID_FILTER')
  const sort = parseJsonQueryParam(req.query.sort, 'ERR_INVALID_SORT')
  const search = req.query.search || ''
  const offset = Number(req.query.offset) || 0
  const limit = Math.min(Number(req.query.limit) || ALERTS_DEFAULT_LIMIT, ALERTS_MAX_SITE_LIMIT)

  const results = await ctx.dataProxy.requestDataMap(RPC_METHODS.LIST_THINGS, {
    status: 1,
    query: { 'last.alerts': { $ne: null } },
    fields: {
      'last.alerts': 1,
      'info.container': 1,
      type: 1,
      id: 1,
      code: 1
    }
  })

  const things = results.flat()
  let alerts = extractAlertsFromThings(things)

  alerts = alerts.filter(a =>
    matchesFilter(a, filter, SITE_ALERTS_FILTER_FIELDS) &&
    matchesSearch(a, search, SITE_ALERTS_SEARCH_FIELDS)
  )

  const summary = buildSeveritySummary(alerts)
  alerts = applySort(alerts, sort)
  const total = alerts.length
  alerts = alerts.slice(offset, offset + limit)

  return { alerts, summary, total }
}

async function getAlertsHistory (ctx, req) {
  const start = Number(req.query.start)
  const end = Number(req.query.end)

  if (start >= end) {
    throw new Error('ERR_INVALID_DATE_RANGE')
  }

  const filter = parseJsonQueryParam(req.query.filter, 'ERR_INVALID_FILTER')
  const sort = parseJsonQueryParam(req.query.sort, 'ERR_INVALID_SORT') || { createdAt: -1 }
  const search = req.query.search || ''
  const offset = Number(req.query.offset) || 0
  const limit = Math.min(Number(req.query.limit) || ALERTS_DEFAULT_LIMIT, ALERTS_MAX_HISTORY_LIMIT)

  const results = await ctx.dataProxy.requestDataMap(RPC_METHODS.GET_HISTORICAL_LOGS, {
    start,
    end,
    logType: 'alerts'
  })

  let alerts = results.flat().map(flattenHistoryAlert)
  alerts = deduplicateAlerts(alerts)

  alerts = alerts.filter(a =>
    matchesFilter(a, filter, HISTORY_FILTER_FIELDS) &&
    matchesSearch(a, search, HISTORY_SEARCH_FIELDS)
  )

  alerts = applySort(alerts, sort)
  const total = alerts.length
  alerts = alerts.slice(offset, offset + limit)

  return { alerts, total }
}

module.exports = {
  getSiteAlerts,
  getAlertsHistory,
  extractAlertsFromThings,
  matchesSearch,
  applySort,
  buildSeveritySummary,
  flattenHistoryAlert
}
