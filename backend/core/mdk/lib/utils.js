'use strict'

const crypto = require('crypto')
const mingo = require('mingo')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')

const isValidSnap = (snap) => {
  return snap.stats && snap.config
}

const isOffline = (snap) => {
  return !snap?.stats?.status || snap.stats.status === 'offline'
}

function getRandomString (length) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, length)
}

function hasErrorAndPositiveHashrate (entry) {
  const { errors, hashrate_mhs: hashrateMHS } = entry?.last?.snap?.stats || {}
  const hashrate = hashrateMHS?.t_5m

  return errors?.length && hashrate > 0
}

function sumPoolsShares (pools, key) {
  if (!Array.isArray(pools)) return 0

  return pools?.reduce((acc, pool) => {
    const value = parseInt(pool[key])
    return acc + (isNaN(value) ? 0 : value)
  }, 0)
}

const TIME_PERIODS_MS = {
  H: 60 * 60 * 1000,
  D: 24 * 60 * 60 * 1000,
  W: 7 * 24 * 60 * 60 * 1000,
  M: 30 * 24 * 60 * 60 * 1000
}

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

const aggregateLogs = (logs, groupRange, shouldCalculateAvg = false) => {
  if (!logs || logs.length === 0) return []

  const rangeMs = parseGroupRange(groupRange)
  const buckets = groupByTimeBuckets(logs, rangeMs)

  return buckets.map(bucket => aggregateBucket(bucket, shouldCalculateAvg ? 'avg' : 'sum'))
}

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

const aggregateBucket = (bucket, operation) => {
  const { start, end, logs } = bucket

  if (logs.length === 0) return null

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

function getValue (obj, path) {
  const keys = path.split('.')
  return keys.reduce((acc, key) => acc && acc[key], obj)
}

const getThingSorter = (a, b, sortBy) => {
  const regex = /\d+|\D+/g

  if (!sortBy || Object.keys(sortBy).length === 0) {
    return 1
  }

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
          ? Number(partA) - Number(partB)
          : partA.localeCompare(partB)

      if (diff !== 0) {
        return diff * order
      }
    }

    const lengthDiff = partsA.length - partsB.length
    if (lengthDiff !== 0) {
      return lengthDiff * order
    }
  }

  return 0
}

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

function projection (data, fields = {}) {
  const query = new mingo.Query({})
  const cursor = query.find(data, fields)
  return cursor.all()
}

module.exports = {
  isValidSnap,
  isOffline,
  getRandomString,
  hasErrorAndPositiveHashrate,
  sumPoolsShares,
  getLogsCountForTimeRange,
  getLogMaxHeight,
  getJsonChanges,
  aggregateLogs,
  getThingSorter,
  applyFilters,
  projection
}
