/**
 * Number and math utilities
 *
 * Pure functions for numeric operations: percentage calculations,
 * unit conversions, and value validation.
 */

import type { UnitLabel } from './types'

/**
 * Calculate percentage of a value relative to total
 *
 * @param partialValue - The part value
 * @param totalValue - The total value
 * @param keepOriginalRelation - If true, returns decimal (0-1) instead of percentage (0-100)
 * @returns The percentage value
 *
 * @example
 * ```ts
 * percentage(25, 100)        // 25
 * percentage(25, 100, true)  // 0.25
 * ```
 */
export const percentage = (
  partialValue: number,
  totalValue: number,
  keepOriginalRelation = false,
): number => {
  if (!partialValue || !totalValue) {
    return 0
  }

  const multiplier = keepOriginalRelation ? 1 : 100

  return (multiplier * partialValue) / totalValue
}

/**
 * Unit label constants for SI-prefix conversions
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const UNIT_LABELS = {
  DECIMAL: 'decimal' as const,
  KILO: 'k' as const,
  MEGA: 'M' as const,
  GIGA: 'G' as const,
  TERA: 'T' as const,
  PETA: 'P' as const,
}

/**
 * Multiplier map from unit name to the factor used by `convertValue` for unit-of-measure conversions.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const UNIT: Record<UnitLabel, number> = {
  [UNIT_LABELS.DECIMAL]: 1,
  [UNIT_LABELS.KILO]: 1_000,
  [UNIT_LABELS.MEGA]: 1_000_000,
  [UNIT_LABELS.GIGA]: 1_000_000_000,
  [UNIT_LABELS.TERA]: 1_000_000_000_000,
  [UNIT_LABELS.PETA]: 1_000_000_000_000_000,
}

/**
 * Convert a value between SI-prefix units
 *
 * @example
 * ```ts
 * convertUnits(1000, 'decimal', 'k')  // 1
 * convertUnits(1, 'M', 'k')           // 1000
 * ```
 */
export const convertUnits = (
  value: number,
  fromUnit: UnitLabel = UNIT_LABELS.DECIMAL,
  toUnit: UnitLabel = UNIT_LABELS.KILO,
): number => (value * UNIT[fromUnit]) / UNIT[toUnit]

/**
 * Convert decimal number to mega units
 */
export const decimalToMegaNumber = (value: number): number =>
  convertUnits(value, UNIT_LABELS.DECIMAL, UNIT_LABELS.MEGA)

/**
 * Check if a value should be displayed (is finite, non-null, non-zero)
 */
export const shouldDisplayValue = (value: number | null | undefined): boolean =>
  value !== null && value !== undefined && !Number.isNaN(value) && value !== 0

/**
 * Calculate percent change between two values
 *
 * @returns The rounded percent change, or null if inputs are invalid
 *
 * @example
 * ```ts
 * getPercentChange(110, 100)  // 10
 * getPercentChange(90, 100)   // -10
 * getPercentChange(100, 0)    // null
 * ```
 */
export const getPercentChange = (currentValue: number, historicalValue: number): number | null => {
  if (
    !Number.isFinite(currentValue) ||
    !Number.isFinite(historicalValue) ||
    historicalValue === 0
  ) {
    return null
  }

  const percentChange = Math.round(((currentValue - historicalValue) / historicalValue) * 100)

  return percentChange || null
}

/**
 * Safely converts unknown value to number
 * Returns 0 if value is not a number
 */
export const safeNumber = (value: unknown): number => {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

// ============================================================================
// Energy / Power / Mining Constants
// ============================================================================

/**
 * Watts per megawatt (1e6). Used by power conversion helpers.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const W_TO_MW = 1e6

/**
 * Number of satoshis in one bitcoin (1e8). Used by unit conversion helpers.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const BTC_SATS = 1e8

/**
 * Number of hours in a calendar day (24). Used by duration helpers.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const HOURS_IN_DAY = 24

/**
 * Hashrate units per petahash/second (1e15). Used by hashrate conversion helpers.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const HASHRATE_PER_PHS = 1e9

/**
 * Number of milliseconds in one hour (3.6e6). Used by duration conversion helpers.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const MS_PER_HOUR = 1_000 * 60 * 60

/**
 * Number of seconds in a calendar day (86400). Used by duration conversion helpers.
 * @category utilities
 * @domain generic
 * @tier internal
 */
export const SECONDS_PER_DAY = HOURS_IN_DAY * 60 * 60
