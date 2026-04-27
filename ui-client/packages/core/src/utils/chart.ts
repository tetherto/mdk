import { LABEL_TO_IGNORE } from '../constants/charts'
import type { ChartDataset } from '../types'
import { isNil, isPlainObject } from './validation'

/**
 * Convert a hex color string to an rgba string with the given opacity
 *
 * @param hex - Hex color string (e.g. '#FF0000' or '#F00')
 * @param opacity - Opacity value between 0 and 1 (default: 0.2)
 * @returns rgba color string
 *
 * @example
 * ```ts
 * hexToOpacity('#FF0000')       // 'rgba(255, 0, 0, 0.2)'
 * hexToOpacity('#FF0000', 0.5)  // 'rgba(255, 0, 0, 0.5)'
 * hexToOpacity('#F00')          // 'rgba(255, 0, 0, 0.2)'
 * ```
 */
export const hexToOpacity = (hex: string, opacity = 0.2): string => {
  if (typeof hex !== 'string') {
    throw new TypeError(
      `Expected a string for HEX color, but received ${typeof hex} ${JSON.stringify(hex)}`,
    )
  }

  let cleanedHex = hex.replace('#', '')

  if (cleanedHex.length === 3) {
    cleanedHex = cleanedHex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  const r = Number.parseInt(cleanedHex.slice(0, 2), 16)
  const g = Number.parseInt(cleanedHex.slice(2, 4), 16)
  const b = Number.parseInt(cleanedHex.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

type ProcessDataProcessor = ((data: unknown) => unknown) | null | undefined

/**
 * Merge new time-series data into existing dataset, deduplicating by `ts` key.
 *
 * @param newData - Object keyed by dataset name, each value is an array of data points with `ts`
 * @param existingData - Previously accumulated dataset in the same shape
 * @param processor - Optional transform applied to each newData array before merging
 * @returns Merged dataset
 *
 * @example
 * ```ts
 * const merged = processDataset(
 *   { default: [{ ts: 1, value: 10 }] },
 *   { default: [{ ts: 0, value: 5 }] },
 * )
 * // { default: [{ ts: 0, value: 5 }, { ts: 1, value: 10 }] }
 * ```
 */
export const processDataset = (
  newData: Record<string, unknown[]>,
  existingData: Record<string, unknown[]>,
  processor: ProcessDataProcessor = null,
): Record<string, unknown[]> => {
  const result: Record<string, unknown[]> = {}

  for (const key of Object.keys(newData)) {
    const processedData = processor ? processor(newData[key]) : newData[key]
    const existingByTs = new Map<number | string, unknown>()
    const existingArr = existingData[key] as Array<{ ts: number | string }> | undefined
    if (existingArr) {
      for (const item of existingArr) {
        existingByTs.set(item.ts, item)
      }
    }
    const newArr = processedData as Array<{ ts: number | string }> | undefined
    if (newArr) {
      for (const item of newArr) {
        existingByTs.set(item.ts, item)
      }
    }
    result[key] = Array.from(existingByTs.values())
  }

  return result
}

/**
 * Check if chart datasets have any data available
 *
 * @param datasets - Array of Chart.js datasets
 * @returns true if any dataset has data, false otherwise
 *
 * @example
 * ```tsx
 * const datasets = [
 *   { label: 'Series 1', data: [1, 2, 3] },
 *   { label: 'Series 2', data: [] }
 * ]
 *
 * const hasData = getChartDataAvailability(datasets) // true
 * ```
 */
export const getChartDataAvailability = (datasets: ChartDataset[]): boolean => {
  // Empty or null datasets array
  if (!datasets || datasets.length === 0) {
    return false
  }

  // Check if at least one dataset has non-empty data
  return datasets.some((dataset) => {
    // Ensure dataset is an object and has data property
    if (!dataset || typeof dataset !== 'object') {
      return false
    }

    const data = (dataset as { data?: unknown[] }).data

    // Check if data is a non-empty array
    return Array.isArray(data) && data.length > 0
  })
}

/**
 * Recursively checks if a dataset contains any non-null, non-undefined values
 *
 * Ignores common chart metadata and styling properties to focus on actual data.
 *
 * @param dataset - The dataset to check (can be array, object, or primitive)
 * @returns True if the dataset contains data values, false otherwise
 *
 * @example
 * ```tsx
 * // Primitive values
 * hasDataValues(5) // true
 * hasDataValues('text') // true
 * hasDataValues(null) // false
 * hasDataValues(undefined) // false
 *
 * // Arrays
 * hasDataValues([1, 2, 3]) // true
 * hasDataValues([null, null]) // false
 * hasDataValues([]) // false
 *
 * // Objects with data
 * hasDataValues({ data: [1, 2, 3], label: 'Chart' }) // true
 * hasDataValues({ value: 100 }) // true
 *
 * // Objects without data (only metadata)
 * hasDataValues({ label: 'Chart', backgroundColor: 'red' }) // false
 * hasDataValues({}) // false
 *
 * // Nested structures
 * hasDataValues({
 *   series: [{ value: 10 }, { value: 20 }]
 * }) // true
 *
 * hasDataValues({
 *   datasets: [{ data: [1, 2, 3] }]
 * }) // true
 * ```
 */
export const hasDataValues = (dataset: unknown): boolean => {
  // Null or undefined - no data
  if (isNil(dataset)) {
    return false
  }

  // Handle arrays
  if (Array.isArray(dataset)) {
    if (dataset.length === 0) {
      return false
    }
    // Recursively check if any element has data
    return dataset.some((item) => hasDataValues(item))
  }

  // Handle primitive values (numbers, strings, booleans)
  if (!isPlainObject(dataset)) {
    return true // Any non-nil primitive is valid data
  }

  // Handle objects
  const keys = Object.keys(dataset)

  // Empty object - no data
  if (keys.length === 0) {
    return false
  }

  // Check if any non-ignored property contains data values
  return keys.some((key) => {
    // Skip metadata/styling properties
    if (LABEL_TO_IGNORE.includes(key as (typeof LABEL_TO_IGNORE)[number])) {
      return false
    }

    const item = dataset[key]

    // Nil value - no data
    if (isNil(item)) {
      return false
    }

    // Primitive value - valid data
    if (!isPlainObject(item) && !Array.isArray(item)) {
      return true
    }

    // Object or array - check recursively
    if (isPlainObject(item)) {
      // Special case: check for 'value' property first
      if ('value' in item && !isNil(item.value)) {
        return true
      }
      // Otherwise check recursively
      return hasDataValues(item)
    }

    // Array - check recursively
    if (Array.isArray(item)) {
      return hasDataValues(item)
    }

    return false
  })
}
