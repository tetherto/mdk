'use strict'

const { PERIOD_TYPES, NON_METRIC_KEYS } = require('./constants')

const getStartOfDay = (ts) => Math.floor(ts / 86400000) * 86400000

const convertMsToSeconds = (timestampMs) => {
  return Math.floor(timestampMs / 1000)
}

const PERIOD_CALCULATORS = {
  daily: (timestamp) => getStartOfDay(timestamp),
  weekly: (timestamp) => {
    const date = new Date(timestamp)
    const day = date.getUTCDay()
    const diff = date.getUTCDate() - day
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff)).getTime()
  },
  monthly: (timestamp) => {
    const date = new Date(timestamp)
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
  },
  yearly: (timestamp) => {
    const date = new Date(timestamp)
    return new Date(date.getFullYear(), 0, 1).getTime()
  }
}

const aggregateByPeriod = (log, period, nonMetricKeys = [], options = {}) => {
  if (period === PERIOD_TYPES.DAILY) {
    return log
  }

  const allNonMetricKeys = new Set([...NON_METRIC_KEYS, ...nonMetricKeys])
  const meanKeys = new Set(options.meanKeys || [])

  const grouped = log.reduce((acc, entry) => {
    let date
    try {
      date = new Date(Number(entry.ts))

      if (isNaN(date.getTime())) {
        return acc
      }
    } catch (error) {
      return acc
    }

    let groupKey

    if (period === PERIOD_TYPES.MONTHLY) {
      groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else if (period === PERIOD_TYPES.YEARLY) {
      groupKey = `${date.getFullYear()}`
    } else if (period === PERIOD_TYPES.WEEKLY) {
      const day = date.getUTCDay()
      const diff = date.getUTCDate() - day
      const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff))
      groupKey = `${weekStart.getTime()}`
    } else {
      groupKey = `${entry.ts}`
    }

    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(entry)
    return acc
  }, {})

  const aggregatedResults = Object.entries(grouped).map(([groupKey, entries]) => {
    const meanCounts = {}
    const aggregated = entries.reduce((acc, entry) => {
      Object.entries(entry).forEach(([key, val]) => {
        if (allNonMetricKeys.has(key)) {
          if (!acc[key] || acc[key] === null || acc[key] === undefined) {
            acc[key] = val
          }
        } else if (meanKeys.has(key)) {
          if (val !== null && val !== undefined && !isNaN(Number(val))) {
            acc[key] = (acc[key] || 0) + Number(val)
            meanCounts[key] = (meanCounts[key] || 0) + 1
          }
        } else {
          const numVal = Number(val) || 0
          acc[key] = (acc[key] || 0) + numVal
        }
      })
      return acc
    }, {})

    for (const key of meanKeys) {
      aggregated[key] = meanCounts[key] ? aggregated[key] / meanCounts[key] : null
    }

    try {
      if (period === PERIOD_TYPES.MONTHLY) {
        const [year, month] = groupKey.split('-').map(Number)

        const newDate = new Date(year, month - 1, 1)
        if (isNaN(newDate.getTime())) {
          throw new Error(`Invalid date for monthly grouping: ${groupKey}`)
        }

        aggregated.ts = newDate.getTime()
        aggregated.month = month
        aggregated.year = year
        aggregated.monthName = newDate.toLocaleString('en-US', { month: 'long' })
      } else if (period === PERIOD_TYPES.YEARLY) {
        const year = parseInt(groupKey)

        const newDate = new Date(year, 0, 1)
        if (isNaN(newDate.getTime())) {
          throw new Error(`Invalid date for yearly grouping: ${groupKey}`)
        }

        aggregated.ts = newDate.getTime()
        aggregated.year = year
      } else if (period === PERIOD_TYPES.WEEKLY) {
        aggregated.ts = Number(groupKey)
      }
    } catch (error) {
      aggregated.ts = entries[0].ts

      try {
        const fallbackDate = new Date(Number(entries[0].ts))
        if (!isNaN(fallbackDate.getTime())) {
          if (period === PERIOD_TYPES.MONTHLY) {
            aggregated.month = fallbackDate.getMonth() + 1
            aggregated.year = fallbackDate.getFullYear()
            aggregated.monthName = fallbackDate.toLocaleString('en-US', { month: 'long' })
          } else if (period === PERIOD_TYPES.YEARLY) {
            aggregated.year = fallbackDate.getFullYear()
          }
        }
      } catch (fallbackError) {
        console.warn('Could not extract date info from fallback timestamp', fallbackError)
      }
    }

    return aggregated
  })

  return aggregatedResults.sort((a, b) => Number(b.ts) - Number(a.ts))
}

const getPeriodKey = (timestamp, period) => {
  const calculator = PERIOD_CALCULATORS[period] || PERIOD_CALCULATORS.daily
  return calculator(timestamp)
}

const getPeriodEndDate = (periodTs, period) => {
  const periodEnd = new Date(periodTs)

  switch (period) {
    case PERIOD_TYPES.WEEKLY:
      periodEnd.setDate(periodEnd.getDate() + 7)
      break
    case PERIOD_TYPES.MONTHLY:
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      break
    case PERIOD_TYPES.YEARLY:
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      break
  }

  return periodEnd
}

const isTimestampInPeriod = (timestamp, periodTs, period) => {
  if (period === PERIOD_TYPES.DAILY) return timestamp === periodTs

  const periodEnd = getPeriodEndDate(periodTs, period)
  return timestamp >= periodTs && timestamp < periodEnd.getTime()
}

const getFilteredPeriodData = (
  sourceData,
  periodTs,
  period,
  filterFn = (entries) => entries
) => {
  if (period === PERIOD_TYPES.DAILY) {
    return sourceData[periodTs] || (typeof filterFn === 'function' ? {} : 0)
  }

  const entriesInPeriod = Object.entries(sourceData).filter(([tsStr]) => {
    const timestamp = Number(tsStr)
    return isTimestampInPeriod(timestamp, periodTs, period)
  })

  return filterFn(entriesInPeriod, sourceData)
}

module.exports = {
  getStartOfDay,
  convertMsToSeconds,
  getPeriodEndDate,
  aggregateByPeriod,
  getPeriodKey,
  isTimestampInPeriod,
  getFilteredPeriodData
}
