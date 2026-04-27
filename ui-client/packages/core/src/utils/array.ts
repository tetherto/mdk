/**
 * Array and collection utilities
 *
 * Pure functions for working with arrays: weighted averages,
 * circular access, attribute parsing, and data extraction.
 */

import type { WeightedAverageResult } from './types'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get a nested value from an object by dot-separated path
 *
 * @example
 * ```ts
 * getNestedValue({ a: { b: 42 } }, 'a.b')  // 42
 * ```
 */
export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }

    return undefined
  }, obj)
}

// ============================================================================
// Weighted Average
// ============================================================================

/**
 * Calculate weighted average from an array of objects
 *
 * @param arr - Array of objects containing value and weight data
 * @param valueAttribute - Dot-path to the value property
 * @param weightAttribute - Dot-path to the weight property
 *
 * @example
 * ```ts
 * const data = [
 *   { hashrate: 100, weight: 10 },
 *   { hashrate: 200, weight: 20 },
 * ]
 * getWeightedAverage(data, 'hashrate', 'weight')
 * // { avg: 166.67, totalWeight: 30, weightedValue: 5000 }
 * ```
 */
export const getWeightedAverage = (
  arr: Record<string, unknown>[],
  valueAttribute: string,
  weightAttribute: string,
): WeightedAverageResult => {
  const { weightedValue, totalWeight } = arr.reduce<{ weightedValue: number; totalWeight: number }>(
    (acc, curr) => {
      const value = Number(getNestedValue(curr, valueAttribute) ?? 0)
      const weight = Number(getNestedValue(curr, weightAttribute) ?? 0)
      if (!Number.isNaN(value) && !Number.isNaN(weight)) {
        acc.totalWeight += weight
        acc.weightedValue += value * weight
      }

      return acc
    },
    { weightedValue: 0, totalWeight: 0 },
  )

  return {
    avg: totalWeight === 0 ? 0 : weightedValue / totalWeight,
    totalWeight,
    weightedValue,
  }
}

/**
 * Calculate average from pre-weighted data (avg / totalWeight)
 *
 * @returns The computed average, or null if inputs are invalid
 */
export const getAvgFromWeighted = (
  avgData: { avg?: number; totalWeight?: number } | undefined,
): number | null =>
  Number.isFinite(avgData?.avg) &&
  Number.isFinite(avgData?.totalWeight) &&
  avgData!.totalWeight! > 0
    ? avgData!.avg! / avgData!.totalWeight!
    : null

// ============================================================================
// Circular Array Access
// ============================================================================

/**
 * Generator that infinitely cycles through array elements
 *
 * @example
 * ```ts
 * const colors = circularArrayAccess(['red', 'blue', 'green'])
 * colors.next().value  // 'red'
 * colors.next().value  // 'blue'
 * colors.next().value  // 'green'
 * colors.next().value  // 'red' (wraps around)
 * ```
 */
export function* circularArrayAccess<T>(array: T[]): Generator<T, void, unknown> {
  if (array.length === 0) return

  let currentIndex = -1

  while (true) {
    currentIndex = (currentIndex + 1) % array.length
    yield array[currentIndex] as T
  }
}
