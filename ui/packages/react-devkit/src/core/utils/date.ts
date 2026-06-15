/**
 * Date utilities
 *
 * Pure functions for date validation, parsing, and manipulation.
 */

import { isValid } from 'date-fns/isValid'

/**
 * Check if a timestamp is valid
 */
export const isValidTimestamp = (timestamp: number | string | Date): boolean => {
  const date = new Date(timestamp)

  return isValid(date)
}

/**
 * Parse month labels commonly used in UI sorting
 *
 * Supported formats:
 * - `"MM-YY"` (e.g. "01-26") - assumes 2000-2099
 * - `"MM-YYYY"` (e.g. "01-2025")
 *
 * @returns The first day of the parsed month, or null if the label is invalid
 *
 * @example
 * ```ts
 * parseMonthLabelToDate('01-26')    // Date(2026, 0, 1)
 * parseMonthLabelToDate('03-2025')  // Date(2025, 2, 1)
 * parseMonthLabelToDate('invalid')  // null
 * ```
 */
export const parseMonthLabelToDate = (label: unknown): Date | null => {
  if (typeof label !== 'string') return null

  const mmYy = /^(\d{2})-(\d{2})$/
  const mmYyyy = /^(\d{2})-(\d{4})$/

  const matchMmYyyy = label.match(mmYyyy)
  const matchMmYy = label.match(mmYy)

  if (matchMmYyyy) {
    const mm = matchMmYyyy[1]!
    const yyyy = matchMmYyyy[2]!
    const month = Number.parseInt(mm, 10)
    const year = Number.parseInt(yyyy, 10)
    return new Date(year, month - 1)
  }

  if (matchMmYy) {
    const mm = matchMmYy[1]!
    const yy = matchMmYy[2]!
    const month = Number.parseInt(mm, 10)
    const year = 2000 + Number.parseInt(yy, 10)
    return new Date(year, month - 1)
  }

  return null
}

/**
 * Get a Date object representing a point in the past relative to a reference date
 *
 * @example
 * ```ts
 * getPastDateFromDate({ days: 7 })  // 7 days ago from now
 * getPastDateFromDate({ dateTs: someTimestamp, days: 30 })
 * ```
 */
export const getPastDateFromDate = ({
  dateTs = Date.now(),
  days,
}: {
  dateTs?: number
  days: number
}): Date => new Date(dateTs - days * 24 * 60 * 60 * 1000)

/**
 * Get the end of yesterday (23:59:59.999)
 */
export const getEndOfYesterday = (): Date => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * Get the beginning of a month (00:00:00.000 on the 1st)
 *
 * @param date - Reference date (defaults to current date)
 */
export const getBeginningOfMonth = (date: Date = new Date()): Date => {
  const beginningOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  beginningOfMonth.setHours(0, 0, 0, 0)

  return beginningOfMonth
}

/**
 * Round a date/timestamp down to the nearest minute (sets seconds and ms to 0)
 *
 * @param date - Date object or timestamp in ms (defaults to current time)
 * @returns Timestamp in milliseconds, rounded to the nearest minute
 */
export const getTimeRoundedToMinute = (date: Date | number = new Date()): number => {
  const d = typeof date === 'number' ? new Date(date) : new Date(date.getTime())
  d.setSeconds(0)
  d.setMilliseconds(0)

  return d.getTime()
}
