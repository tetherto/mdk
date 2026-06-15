import { eachDayOfInterval } from 'date-fns/eachDayOfInterval'
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { eachWeekOfInterval } from 'date-fns/eachWeekOfInterval'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import _isArray from 'lodash/isArray'
import _isNumber from 'lodash/isNumber'
import _isObject from 'lodash/isObject'
import _isString from 'lodash/isString'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'

import type { AggregatedDataItem } from '../mining-report.types'

import { PERIOD } from '@/constants/ranges'

/**
 * Period item structure returned by time range generators
 */
export type PeriodItem = {
  label: string
  ts: number
  date: Date
}

/**
 * Get the appropriate label format based on the period
 */
export const getLabelFormat = (period: string): string =>
  period === PERIOD.MONTHLY ? 'MM-yy' : 'dd-MM'

/**
 * Generate a complete range of time periods between start and end dates
 */
const toDate = (date: string | Date | number): Date => {
  if (_isString(date)) return parseISO(date)
  if (_isNumber(date)) return new Date(date)

  return date
}

export const generateTimeRange = (
  startDate: string | Date | number,
  endDate: string | Date | number,
  period: string = 'daily',
  labelFormat: string = 'dd-MM',
): PeriodItem[] => {
  const start = toDate(startDate)
  const end = toDate(endDate)

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return []
  }

  let periods: Date[] = []

  switch (period) {
    case PERIOD.MONTHLY:
      periods = eachMonthOfInterval({ start, end })
      break
    case PERIOD.WEEKLY:
      periods = eachWeekOfInterval({ start, end })
      break
    case PERIOD.DAILY:
    default:
      periods = eachDayOfInterval({ start, end })
      break
  }

  return _map(periods, (periodDate) => ({
    label: format(periodDate, labelFormat),
    ts: periodDate.getTime(),
    date: periodDate,
  }))
}

/**
 * Generate a complete range of months between start and end dates (legacy function)
 */
export const generateMonthRange = (
  startDate: string | Date,
  endDate: string | Date,
  labelFormat: string = 'MM-dd',
): PeriodItem[] => generateTimeRange(startDate, endDate, 'monthly', labelFormat)

/**
 * Fill missing months in chart data with zero values
 */
export const fillMissingMonths = <T extends Record<string, unknown>>(
  existingData: T[],
  startDate: string | Date,
  endDate: string | Date,
  labelFormat: string = 'MM-dd',
  labelExtractor: (item: T) => string = (item) => (item.label as string) || '',
): Array<T & { label: string; ts: number; value: number }> => {
  const monthRange = generateMonthRange(startDate, endDate, labelFormat)

  // Create a map of existing data by label for quick lookup
  const existingDataMap = _reduce(
    existingData,
    (acc: Record<string, T>, item) => {
      const label = labelExtractor(item)
      acc[label] = item
      return acc
    },
    {} as Record<string, T>,
  )

  // Fill in missing months with zero values
  return _map(monthRange, (month) => {
    const existingItem = existingDataMap[month.label]

    if (existingItem) {
      return existingItem as T & { label: string; ts: number; value: number }
    }

    // Create zero-value item for missing month
    return {
      label: month.label,
      ts: month.ts,
      value: 0,
      // Preserve other properties that might be expected
      ...(_isObject(existingData[0])
        ? _reduce(
            existingData[0],
            (acc: Record<string, unknown>, _val, key) => {
              if (key !== 'label' && key !== 'ts' && key !== 'value') {
                acc[key] = 0
              }
              return acc
            },
            {} as Record<string, unknown>,
          )
        : {}),
    } as T & { label: string; ts: number; value: number }
  })
}

/**
 * Fill missing months in aggregated data structure
 */
export const fillMissingMonthsInAggregated = (
  aggregatedData: AggregatedDataItem[],
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  labelFormat: string = 'MM-dd',
): AggregatedDataItem[] => {
  // If no date range provided, return original data
  if (!startDate || !endDate) {
    return aggregatedData || []
  }

  const monthRange = generateMonthRange(startDate, endDate, labelFormat)

  // If no month range generated, return original data
  if (monthRange.length === 0) {
    return aggregatedData || []
  }

  // If no existing data, create zero-filled items for all months
  if (!aggregatedData || !Array.isArray(aggregatedData) || aggregatedData.length === 0) {
    return _map(monthRange, (month) => ({
      label: month.label,
      ts: month.ts,
      producedBTC: 0,
      ebitdaSell: 0,
      ebitdaHodl: 0,
      energyUSD: 0,
      opsUSD: 0,
      priceSamples: [],
    }))
  }

  // Create a map of existing data by label
  const existingDataMap: Record<string, AggregatedDataItem> = _reduce(
    aggregatedData,
    (acc: Record<string, AggregatedDataItem>, item) => {
      acc[item.label] = item
      return acc
    },
    {},
  )

  // Get the structure of the first item to create zero-filled items
  const sampleItem = aggregatedData[0]
  const zeroItemTemplate: Record<string, unknown> = _reduce(
    sampleItem,
    (acc: Record<string, unknown>, val, key) => {
      if (key === 'label' || key === 'ts') {
        return acc
      }
      // For numeric values, use 0; for arrays, use empty array; for objects, use empty object
      if (_isNumber(val)) {
        acc[key] = 0
      } else if (Array.isArray(val)) {
        acc[key] = []
      } else if (_isObject(val) && val !== null) {
        acc[key] = {}
      } else {
        acc[key] = val
      }
      return acc
    },
    {},
  )

  // Fill in missing months
  return _map(monthRange, (month) => {
    const existingItem = existingDataMap[month.label]

    if (existingItem) {
      return existingItem
    }

    return {
      ...zeroItemTemplate,
      label: month.label,
      ts: month.ts,
    }
  })
}

/**
 * Fill missing time periods in aggregated data structure
 */
export const fillMissingPeriodsInAggregated = (
  aggregatedData: AggregatedDataItem[],
  startDate: string | Date | number | null | undefined,
  endDate: string | Date | number | null | undefined,
  period: string = 'daily',
  labelFormat: string = 'dd-MM',
): AggregatedDataItem[] => {
  // If no date range provided, return original data
  if (!startDate || !endDate) {
    return aggregatedData || []
  }

  const timeRange = generateTimeRange(startDate, endDate, period, labelFormat)

  // If no time range generated, return original data
  if (timeRange.length === 0) {
    return aggregatedData || []
  }

  // If no existing data, create zero-filled items for all periods
  if (!aggregatedData || !Array.isArray(aggregatedData) || aggregatedData.length === 0) {
    return _map(timeRange, (periodItem) => ({
      label: periodItem.label,
      ts: periodItem.ts,
      producedBTC: 0,
      ebitdaSell: 0,
      ebitdaHodl: 0,
      energyUSD: 0,
      opsUSD: 0,
      priceSamples: [],
    }))
  }

  // Create a map of existing data by label
  const existingDataMap: Record<string, AggregatedDataItem> = _reduce(
    aggregatedData,
    (acc: Record<string, AggregatedDataItem>, item) => {
      acc[item.label] = item
      return acc
    },
    {},
  )

  // Get the structure of the first item to create zero-filled items
  const sampleItem = aggregatedData[0]
  const zeroItemTemplate: Record<string, unknown> = _reduce(
    sampleItem,
    (acc: Record<string, unknown>, val, key) => {
      if (key === 'label' || key === 'ts') {
        return acc
      }
      // For numeric values, use 0; for arrays, use empty array; for objects, use empty object
      if (_isNumber(val)) {
        acc[key] = 0
      } else if (_isArray(val)) {
        acc[key] = []
      } else if (_isObject(val) && val !== null) {
        acc[key] = {}
      } else {
        acc[key] = val
      }
      return acc
    },
    {},
  )

  // Fill in missing periods
  return _map(timeRange, (periodItem) => {
    const existingItem = existingDataMap[periodItem.label]

    if (existingItem) {
      return existingItem
    }

    return {
      ...zeroItemTemplate,
      label: periodItem.label,
      ts: periodItem.ts,
    }
  })
}

/**
 * Series data interface for fillMissingMonthsInSeries
 */
type SeriesData = {
  labels?: string[]
  values?: number[]
  [key: string]: unknown
}

/**
 * Fill missing months in chart series data
 */
export const fillMissingMonthsInSeries = <T extends SeriesData>(
  seriesData: T[],
  startDate: string | Date,
  endDate: string | Date,
  labelFormat: string = 'MM-dd',
): Array<T & { labels: string[]; values: number[] }> => {
  if (!seriesData || !Array.isArray(seriesData) || seriesData.length === 0) {
    return []
  }

  const monthRange = generateMonthRange(startDate, endDate, labelFormat)

  return _map(seriesData, (series) => {
    const existingValuesMap: Record<string, number> = _reduce(
      series.values || [],
      (acc: Record<string, number>, val, index) => {
        const label = series.labels?.[index] || `month-${index}`
        acc[label] = val
        return acc
      },
      {},
    )

    const filledValues = _map(monthRange, (month) => existingValuesMap[month.label] || 0)

    const filledLabels = _map(monthRange, ({ label }) => label)

    return {
      ...series,
      labels: filledLabels,
      values: filledValues,
    }
  })
}
