/**
 * Formatting utilities
 *
 * Pure functions for formatting numbers, currencies, dates, hashrates,
 * and other display values. All functions return a fallback string
 * when the input is invalid.
 */

import { format as dateFnsFormat } from 'date-fns/format'

import type { ErrorWithTimestamp, ValueUnit } from './types'

const LOCALE = 'en-US'

/**
 * Default fallback string for invalid/missing values
 */
export const FALLBACK = '-'

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format number with locale formatting and configurable options
 *
 * Handles string-encoded numbers, null, and undefined gracefully.
 *
 * @example
 * ```ts
 * formatNumber(1234.567)                        // "1,234.57"
 * formatNumber(null)                             // "-"
 * formatNumber(1234, { minimumFractionDigits: 2 }) // "1,234.00"
 * ```
 */
export const formatNumber = (
  number: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {},
  fallback = FALLBACK,
): string => {
  // Default options
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    maximumSignificantDigits: undefined,
    ...options,
  }

  // If significant digits are set, don't override fraction digits
  if (options?.maximumSignificantDigits !== undefined) {
    delete opts.minimumFractionDigits
    delete opts.maximumFractionDigits
  }

  const parsed = Number.parseFloat(number as string)
  const result = Number.isFinite(parsed)
    ? new Intl.NumberFormat(LOCALE, opts).format(number as number)
    : fallback

  return result === '-0' ? '0' : result
}

/**
 * Format hashrate with rounding to 2 decimal places
 */
export const formatHashrate = (
  number: number | string,
  options?: Intl.NumberFormatOptions,
  fallback = FALLBACK,
): string => {
  const parsed = Number.parseFloat(number as string)
  return Number.isFinite(parsed)
    ? formatNumber(Math.round(parsed * 100) / 100, options, fallback)
    : fallback
}

/**
 * Format number as a percentage string
 *
 * @example
 * ```ts
 * getPercentFormattedNumber(0.75)  // "75%"
 * ```
 */
export const getPercentFormattedNumber = (
  number: number | string,
  decimals = 2,
  fallback = FALLBACK,
): string =>
  formatNumber(
    number,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
      maximumSignificantDigits: undefined,
      style: 'percent',
    },
    fallback,
  )

// ============================================================================
// Value + Unit Formatting
// ============================================================================

/**
 * Format a value and unit into a display string
 *
 * Fiat currency symbols ($, €, £, ¥) are placed before the number.
 * Other units are placed after with a space.
 *
 * @example
 * ```ts
 * formatValueUnit(1234, '$')    // "$1,234"
 * formatValueUnit(1234, 'BTC')  // "1,234 BTC"
 * ```
 */
export const formatValueUnit = (
  value: number | string,
  unit?: string,
  options?: Intl.NumberFormatOptions,
  fallback = FALLBACK,
  formatter: (
    value: number | string,
    options?: Intl.NumberFormatOptions,
    fallback?: string,
  ) => string = formatNumber,
): string => {
  const formattedValue = formatter(value, options, fallback)
  if (formattedValue === fallback) return fallback
  if (!unit) return formattedValue

  // Fiat currency symbols go before the number with no space
  const fiatSymbols = ['$', '€', '£', '¥']
  if (fiatSymbols.includes(unit)) {
    return `${unit}${formattedValue}`
  }

  // Crypto and other units go after with a space
  return `${formattedValue} ${unit}`
}

/**
 * Format a ValueUnit object into a display string
 */
export const formatUnit = (
  object: Partial<ValueUnit> = {},
  options?: Intl.NumberFormatOptions,
  fallback = FALLBACK,
  formatter: (
    value: number | string,
    options?: Intl.NumberFormatOptions,
    fallback?: string,
  ) => string = formatNumber,
): string => {
  const { value, unit } = object
  return formatValueUnit(value as number | string, unit, options, fallback, formatter)
}

/**
 * Format a hashrate ValueUnit object into a display string
 */
export const formatHashrateUnit = (
  object: Partial<ValueUnit> = {},
  options?: Intl.NumberFormatOptions,
  fallback = FALLBACK,
): string => {
  const { value, unit } = object
  return formatValueUnit(value as number | string, unit, options, fallback, formatHashrate)
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format errors with timestamps into a human-readable string
 *
 * @param errors - Array of error objects, a plain string, or null
 * @param getFormattedDate - Optional custom date formatter
 */
export const formatErrors = (
  errors: ErrorWithTimestamp[] | string | null | undefined,
  getFormattedDate?: (date: Date) => string,
): string => {
  if (!errors) return ''
  if (typeof errors === 'string') return errors

  return errors
    .map((error) => {
      const { msg, message, timestamp } = error
      const text = msg || message

      if (!timestamp) return `${text}. \n`

      const ts = typeof timestamp === 'string' ? Number.parseInt(timestamp, 10) : timestamp
      const dateString =
        getFormattedDate && ts ? getFormattedDate(new Date(ts)) : new Date(ts).toLocaleString()

      return `${text}\n${dateString}`
    })
    .join('\n\n')
}

// ============================================================================
// Misc Formatting
// ============================================================================

/**
 * Format MAC address to uppercase
 */
export const formatMacAddress = (macAddress?: string): string =>
  macAddress ? macAddress.toUpperCase() : ''

/**
 * Convert a string to Title Case
 *
 * Handles camelCase, snake_case, kebab-case, and space-separated words.
 *
 * @example
 * ```ts
 * toTitleCase('hello_world')   // "Hello World"
 * toTitleCase('helloWorld')    // "Hello World"
 * ```
 */
export const toTitleCase = (name: string): string =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

/**
 * Format a chart date from a timestamp
 *
 * @param tsRaw - Timestamp (number or string)
 * @param withYear - Whether to include the year (default: true)
 * @param customFormatTemplate - Custom date-fns format template
 * @param fallback - Fallback string for invalid values
 *
 * @example
 * ```ts
 * formatChartDate(1700000000000)                // "2023-11-14"
 * formatChartDate(1700000000000, false)          // "11-14"
 * formatChartDate(1700000000000, true, 'dd MMM') // "14 Nov"
 * ```
 */
export const formatChartDate = (
  tsRaw: number | string | null | undefined,
  withYear = true,
  customFormatTemplate?: string,
  fallback = FALLBACK,
): string => {
  if (tsRaw == null) return fallback

  const ts = Number(tsRaw)
  if (!Number.isFinite(ts)) return fallback

  let formatTemplate: string

  if (customFormatTemplate && customFormatTemplate.length > 0) {
    formatTemplate = customFormatTemplate
  } else if (withYear) {
    formatTemplate = 'yyyy-MM-dd'
  } else {
    formatTemplate = 'MM-dd'
  }

  return dateFnsFormat(new Date(ts), formatTemplate)
}

/**
 * Format a count, capping display at 99+
 *
 * @example
 * ```ts
 * formatCountTo99Plus(5)    // "5"
 * formatCountTo99Plus(150)  // "99+"
 * formatCountTo99Plus(null) // "N/A"
 * ```
 */
export const formatCountTo99Plus = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'

  return value > 99 ? '99+' : String(value)
}

/**
 * Format table pagination count string
 *
 * @example
 * ```ts
 * showTotalTableCount(100, [1, 10])  // "1-10 of 100"
 * ```
 */
export const showTotalTableCount = (total: number, range: [number, number]): string =>
  `${range[0]}-${range[1]} of ${total}`

/**
 * Format currency with Intl.NumberFormat
 *
 * @example
 * ```ts
 * formatCurrency(1234.56)        // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 * ```
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat(LOCALE, {
    currency,
    style: 'currency',
  }).format(amount)
}

/**
 * Format date with Intl.DateTimeFormat
 *
 * @example
 * ```ts
 * formatDate(new Date())
 * formatDate('2024-01-15', { month: 'long', year: 'numeric' })
 * ```
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(LOCALE, options).format(dateObj)
}

/**
 * Format relative time (e.g., "2h ago", "just now")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`

  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

/**
 * Convert number or string to CSS size
 */
export const toCssSize = (value?: number | string): string | undefined =>
  typeof value === 'number' ? `${value}px` : value

export const convertKwToW = (valueInKw: number | string): number =>
  valueInKw && !Number.isNaN(Number(valueInKw)) ? Number(valueInKw) * 1000 : Number.NaN
