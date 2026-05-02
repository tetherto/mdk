'use strict'

const mingo = require('mingo')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const { TIME_PERIODS_MS } = require('./constants')

const isValidSnap = (snap) => {
  return snap.stats && snap.config
}

const isOffline = (snap) => {
  return !snap?.stats?.status || snap.stats.status === 'offline'
}

/**
 * Converts a cron expression to an interval in milliseconds.
 * @param {string} cron - The cron expression.
 * @returns {number} The interval in milliseconds.
 */
const getIntervalFromCron = (cron) => {
  const [, minute, hour] = cron.split(' ')

  if (minute.startsWith('*/')) {
    return parseInt(minute.slice(2), 10) * 60 * 1000
  }

  if (hour.startsWith('*/')) {
    return parseInt(hour.slice(2), 10) * 60 * 60 * 1000
  }

  if (hour === '0' && minute === '0') {
    return 24 * 60 * 60 * 1000
  }
  throw new Error('ERR_CRON_UNSUPPORTED')
}

const getLogsCountForTimeRange = (start, end, key, statTimeframes) => {
  end ||= Date.now()
  start ??= 0
  if (!statTimeframes) return 0
  const currentLogCron = statTimeframes.find(
    tf => tf[0] === key.replace('stat-', '')
  )?.[1]
  if (!currentLogCron) return 0
  try {
    const timeInterval = getIntervalFromCron(currentLogCron)
    return Math.ceil((end - start) / timeInterval) + 1
  } catch (error) {
    return 0
  }
}

const isObject = obj => {
  return obj && typeof obj === 'object' && !Array.isArray(obj)
}

const compareArrays = (prevArray, currArray) => {
  const additions = currArray.filter(item => !prevArray.includes(item))
  const deletions = prevArray.filter(item => !currArray.includes(item))
  return { additions, deletions }
}

const compareObjects = (prev, curr, changes, path = '') => {
  const allKeys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(curr || {})
  ])

  allKeys.forEach(key => {
    const currentPath = path ? `${path}.${key}` : key
    const prevValue = prev ? prev[key] : undefined
    const currValue = curr ? curr[key] : undefined

    if (isObject(prevValue) && isObject(currValue)) {
      compareObjects(prevValue, currValue, changes, currentPath)
    } else if (Array.isArray(prevValue) && Array.isArray(currValue)) {
      const arrayChanges = compareArrays(prevValue, currValue)
      if (
        arrayChanges.additions.length > 0 ||
        arrayChanges.deletions.length > 0
      ) {
        changes[currentPath] = arrayChanges
      }
    } else if (prevValue !== currValue) {
      changes[currentPath] = {
        oldValue: prevValue,
        newValue: currValue
      }
    }
  })
}

const getJsonChanges = (previousJson, currentJson) => {
  const changes = {}

  compareObjects(previousJson, currentJson, changes)
  return changes
}

const getLogMaxHeight = (logKeepCount = 3) => Math.ceil(logKeepCount * 1.5)

/**
 * Aggregates logs based on time range and operation
 * @param {Array} logs - Array of log objects with ts field
 * @param {String} groupRange - Time range like '1D', '1H', '1W', '1M'
 * @param {Boolean} shouldCalculateAvg -
 * @returns {Array} Aggregated logs
 */
const aggregateLogs = (logs, groupRange, shouldCalculateAvg = false) => {
  if (!logs || logs.length === 0) return []

  const rangeMs = parseGroupRange(groupRange)

  // Group logs by time buckets
  const buckets = groupByTimeBuckets(logs, rangeMs)

  // Aggregate each bucket
  return buckets.map(bucket => aggregateBucket(bucket, shouldCalculateAvg ? 'avg' : 'sum'))
}

/**
 * Parse time range string to milliseconds
 * @param {String} range - Time range like '1D', '1H'
 * @returns {Number} Milliseconds
 */
const parseGroupRange = (range) => {
  const match = /^(\d+)\s*([HDWM])s?$/i.exec(range.trim())
  if (!match) {
    throw new Error(
      'ERR_INVALID_GROUP_RANGE_FORMAT. Use formats like "1D", "1H", "1W", "1M"'
    )
  }

  const value = Number(match[1])
  const unit = match[2].toUpperCase()
  return value * TIME_PERIODS_MS[unit]
}

/**
 * Group logs into time buckets
 * @param {Array} logs - Array of log objects
 * @param {Number} rangeMs - Bucket size in milliseconds
 * @returns {Array} Array of buckets with start, end, and logs
 */
const groupByTimeBuckets = (logs, rangeMs) => {
  if (logs.length === 0) return []
  const sorted = [...logs].sort((a, b) => a.ts - b.ts)

  const minTs = sorted[0].ts
  const maxTs = sorted[sorted.length - 1].ts

  const buckets = []
  let bucketStart = Math.floor(minTs / rangeMs) * rangeMs

  while (bucketStart <= maxTs) {
    const bucketEnd = bucketStart + rangeMs
    const logsInBucket = sorted.filter(log => log.ts >= bucketStart && log.ts < bucketEnd)

    if (logsInBucket.length > 0) {
      buckets.push({
        start: bucketStart,
        end: bucketEnd - 1,
        logs: logsInBucket
      })
    }

    bucketStart = bucketEnd
  }

  return buckets
}

/**
 * Aggregate a bucket of logs
 * @param {Object} bucket - Bucket with start, end, and logs
 * @param {String} operation - 'avg' or 'sum'
 * @returns {Object} Aggregated log object
 */
const aggregateBucket = (bucket, operation) => {
  const { start, end, logs } = bucket

  if (logs.length === 0) return null

  // If only one log in bucket, return it with updated timestamp
  if (logs.length === 1) {
    return {
      ...logs[0],
      ts: `${start}-${end}`
    }
  }

  const result = {
    ts: `${start}-${end}`
  }

  const allKeys = new Set()
  logs.forEach(log => {
    Object.keys(log).forEach(key => {
      if (key !== 'ts') allKeys.add(key)
    })
  })

  for (const key of allKeys) {
    result[key] = aggregateField(logs, key, operation)
  }

  return result
}

/**
 * Aggregate a specific field across multiple logs
 * @param {Array} logs - Array of log objects
 * @param {String} fieldName - Field to aggregate
 * @param {String} operation - 'avg' or 'sum'
 * @returns {*} Aggregated value
 */
const aggregateField = (logs, fieldName, operation) => {
  const values = logs
    .map(log => log[fieldName])
    .filter(v => v !== undefined && v !== null)

  if (values.length === 0) return null

  const firstValue = values[0]

  if (typeof firstValue === 'object' && !Array.isArray(firstValue)) {
    return aggregateNestedObject(logs, fieldName, operation)
  }

  if (typeof firstValue === 'number') {
    return aggregateNumeric(values, operation)
  }

  return firstValue
}

/**
 * Aggregate nested object fields
 * @param {Array} logs - Array of log objects
 * @param {String} fieldName - Parent field name
 * @param {String} operation - 'avg' or 'sum'
 * @returns {Object} Aggregated nested object
 */
const aggregateNestedObject = (logs, fieldName, operation) => {
  const allKeys = new Set()
  logs.forEach(log => {
    if (log[fieldName] && typeof log[fieldName] === 'object') {
      Object.keys(log[fieldName]).forEach(k => allKeys.add(k))
    }
  })

  const result = {}

  for (const key of allKeys) {
    const values = logs
      .map(log => log[fieldName]?.[key])
      .filter(v => v !== undefined && v !== null && typeof v === 'number')

    if (values.length > 0) {
      result[key] = aggregateNumeric(values, operation)
    } else {
      const firstValue = logs.find(log => log[fieldName]?.[key] !== undefined && log[fieldName]?.[key] !== null)
      if (firstValue) {
        result[key] = firstValue[fieldName][key]
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

/**
 * Aggregate numeric values
 * @param {Array} values - Array of numeric values
 * @param {String} operation - 'avg' or 'sum'
 * @returns {Number} Aggregated value
 */
const aggregateNumeric = (values, operation) => {
  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v))

  if (numericValues.length === 0) return 0

  if (operation === 'sum') {
    return numericValues.reduce((sum, val) => sum + val, 0)
  } else if (operation === 'avg') {
    const sum = numericValues.reduce((sum, val) => sum + val, 0)
    return sum / numericValues.length
  }

  throw new Error(`ERR_UNKNOWN_OPERATION: ${operation}. Use 'avg' or 'sum'`)
}

/**
 * Retrieves the value at the specified path within an object.
 *
 * @param {Object} obj - The object to query.
 * @param {string} path - The path of the property to get, separated by dots (e.g., "info.container").
 * @returns {*} - Returns the value at the specified path or undefined if the path is invalid.
 */
function getValue (obj, path) {
  const keys = path.split('.')
  return keys.reduce((acc, key) => acc && acc[key], obj)
}

/**
 * Sorts two objects based on a specified key and order.
 * Handles alphanumeric sorting by splitting values into numeric and non-numeric parts.
 *
 * @param {Object} a - The first object to compare.
 * @param {Object} b - The second object to compare.
 * @param {Object} sortBy - An object specifying the key to sort by and the order (1 for ascending, -1 for descending).
 * @param {string} sortBy.key - The key path (e.g., "info.container") to access the value in each object.
 * @param {number} sortBy.order - The sort order (1 for ascending, -1 for descending).
 * @returns {number} - A negative, zero, or positive value based on the sort order.
 */
const getThingSorter = (a, b, sortBy) => {
  const regex = /\d+|\D+/g // Matches numbers or non-numbers

  if (!sortBy || Object.keys(sortBy).length === 0) {
    return 1
  }

  // Iterate through all sort keys in sortBy
  for (const [key, order] of Object.entries(sortBy)) {
    const valA = getValue(a, key)
    const valB = getValue(b, key)

    if (valA === undefined || valB === undefined) {
      return (valA === undefined) - (valB === undefined)
    }

    const parseValue = value => String(value).match(regex) || []
    const partsA = parseValue(valA)
    const partsB = parseValue(valB)

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      const [partA, partB] = [partsA[i], partsB[i]]

      const diff =
        !isNaN(partA) && !isNaN(partB)
          ? Number(partA) - Number(partB) // Numeric comparison
          : partA.localeCompare(partB) // Lexicographic comparison

      if (diff !== 0) {
        return diff * order // Apply order (1 or -1)
      }
    }

    const lengthDiff = partsA.length - partsB.length
    if (lengthDiff !== 0) {
      return lengthDiff * order // Handle prefix cases
    }
  }

  return 0 // If all sort keys are equal, maintain order
}

/**
 * Apply query filters (query, sort, offset, limit) to an array of objects.
 * Shared by listing and log-history.
 */
function applyFilters (things, req, returnObjects = false) {
  if (!gLibUtilBase.isNil(req.query) || !gLibUtilBase.isNil(req.fields)) {
    const query = new mingo.Query(req.query || {})
    things = query.find(things, req.fields || {}).all()
  }
  if (!gLibUtilBase.isNil(req.sort)) {
    things = things.sort((a, b) => getThingSorter(a, b, req.sort))
  }
  if (req.offset) {
    things = things.slice(req.offset)
  }
  if (!gLibUtilBase.isNil(req.limit)) {
    things = things.slice(0, req.limit)
  }

  if (returnObjects) return things

  return things.map(e => e.id)
}

/**
 * Project fields from data using mingo.
 * Shared by listing and log-history.
 */
function projection (data, fields = {}) {
  const query = new mingo.Query({})
  const cursor = query.find(data, fields)
  return cursor.all()
}

module.exports = {
  isValidSnap,
  isOffline,
  getLogsCountForTimeRange,
  getLogMaxHeight,
  getJsonChanges,
  aggregateLogs,
  getThingSorter,
  applyFilters,
  projection
}
