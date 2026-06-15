import _filter from 'lodash/filter'
import _isFinite from 'lodash/isFinite'
import _map from 'lodash/map'
import _mean from 'lodash/mean'

/**
 * Validation result interface
 */
export type ValidationResult = {
  isValid: boolean
  error?: string
}

/**
 * Convert megahashes per second to petahashes per second
 */
export const mhsToPhs = (mhs: number | string): number => (Number(mhs) || 0) / 1e9

/**
 * Convert watts to megawatts
 */
export const wToMw = (w: number | string): number => (Number(w) || 0) / 1e6

/**
 * Convert hash rate from H/s to PH/s (divide by 1e15)
 */
export const hsToPhs = (hashrate: number | string): number => (Number(hashrate) || 0) / 1e15

/**
 * Safely convert value to number with optional default
 */
export const safeNum = (v: unknown, defaultValue: number = 0): number => {
  const n = Number(v)
  return _isFinite(n) ? n : defaultValue
}

/**
 * Calculate average of array values, filtering out invalid numbers
 */
export const avg = (arr: unknown[]): number => {
  const xs = _map(
    _filter(arr, (v) => v !== null && v !== undefined && _isFinite(Number(v))),
    Number,
  )
  return xs.length ? _mean(xs) : 0
}

/**
 * Convert timestamp to ISO string
 */
export const tsToISO = (ts: number | string): string => new Date(Number(ts) || 0).toISOString()

/**
 * Calculate per-petahash value (e.g., cost per PH/s, revenue per PH/s)
 */
export const toPerPh = (numerator: number, denominator: number): number =>
  denominator > 0 ? numerator / denominator : 0

/**
 * Calculate hash revenue in USD from BTC and price
 */
export const calculateHashRevenueUSD = (
  revenueBTC: number | string,
  btcPrice: number | string,
  fallback: number | string = 0,
): number => {
  const btc = safeNum(revenueBTC)
  const price = safeNum(btcPrice)
  const usdFallback = safeNum(fallback)

  return btc * price || usdFallback
}

/**
 * Validate API data structure
 */
export const validateApiData = (api: unknown): ValidationResult => {
  if (!api) return { isValid: false, error: 'API data is null or undefined' }
  if (
    typeof api !== 'object' ||
    !('regions' in api) ||
    !Array.isArray((api as { regions?: unknown }).regions)
  ) {
    return { isValid: false, error: 'No valid regions data' }
  }
  return { isValid: true }
}

/**
 * Validate logs data
 */
export const validateLogs = (logsPerSource: unknown): ValidationResult => {
  if (!Array.isArray(logsPerSource) || !logsPerSource.length) {
    return { isValid: false, error: 'No valid logs data' }
  }
  return { isValid: true }
}
