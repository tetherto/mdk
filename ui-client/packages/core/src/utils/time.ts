/**
 * Time range and interval utilities
 *
 * Pure functions for working with time ranges, intervals, and periods.
 */

import { add } from 'date-fns/add'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { subDays } from 'date-fns/subDays'

import type { TimeInterval } from './types'

// ============================================================================
// Time Range Types
// ============================================================================

export const TimeRangeTypes = {
  DAY: 'day',
  MINUTE: 'minute',
} as const

export type TimeRangeType = (typeof TimeRangeTypes)[keyof typeof TimeRangeTypes]

// ============================================================================
// Time Range Helpers
// ============================================================================

/**
 * Determine whether a time span is best represented in day or minute resolution
 *
 * @returns `'minute'` if range is within 24 hours, otherwise `'day'`
 */
export const getTimeRange = (
  latestTimeStampMs: number | undefined,
  oldTimeStampMs: number | undefined,
): TimeRangeType => {
  if (!latestTimeStampMs || !oldTimeStampMs) {
    return TimeRangeTypes.DAY
  }

  const range = latestTimeStampMs - oldTimeStampMs

  // If range is 0 (single data point), default to DAY
  if (range === 0) {
    return TimeRangeTypes.DAY
  }

  return range <= 24 * 60 * 60 * 1000 ? TimeRangeTypes.MINUTE : TimeRangeTypes.DAY
}

/**
 * Break a time range into equal intervals
 *
 * @param start - Start timestamp in milliseconds
 * @param end - End timestamp in milliseconds
 * @param intervalMs - Interval size in milliseconds
 * @returns Array of intervals with start and end timestamps
 *
 * @example
 * ```ts
 * const oneHourMs = 3_600_000
 * breakTimeIntoIntervals(0, 7_200_000, oneHourMs)
 * // [{ start: 0, end: 3600000 }, { start: 3600000, end: 7200000 }]
 * ```
 */
export const breakTimeIntoIntervals = (
  start: number,
  end: number,
  intervalMs: number,
): TimeInterval[] => {
  const totalIntervals = Math.ceil((end - start) / intervalMs)

  return Array.from({ length: totalIntervals }, (_, i) => {
    const intervalStart = start + i * intervalMs
    const intervalEnd = Math.min(intervalStart + intervalMs, end)

    return { start: intervalStart, end: intervalEnd }
  })
}

/**
 * Find the smallest start and largest end from an array of time ranges
 *
 * @returns Object with `start` (smallest) and `end` (largest), or nulls if empty
 */
export const getSmallestAndLargestTs = (
  array: TimeInterval[],
): { start: number | null; end: number | null } => {
  if (array.length === 0) {
    return { start: null, end: null }
  }

  let minStart = array[0]!.start
  let maxEnd = array[0]!.end

  for (const item of array) {
    if (item.start < minStart) minStart = item.start
    if (item.end > maxEnd) maxEnd = item.end
  }

  return { start: minStart, end: maxEnd }
}

/**
 * Get a time range covering the last N days, ending at end of yesterday
 *
 * Useful for reports that exclude the current (incomplete) day.
 *
 * @param days - Number of days to include in the range (default: 7)
 * @param referenceDate - Reference date to calculate from (default: current date)
 *
 * @example
 * ```ts
 * getLastNDaysEndingYesterday(7)  // Last 7 days ending at 23:59:59.999 yesterday
 * ```
 */
export const getLastNDaysEndingYesterday = (days = 7, referenceDate = new Date()): TimeInterval => {
  const yesterday = subDays(referenceDate, 1)
  const start = startOfDay(subDays(yesterday, days - 1)).getTime()
  const end = endOfDay(yesterday).getTime()

  return { start, end }
}

/**
 * Generator that iterates over timestamps from startTs to endTs
 * separated by a given duration
 *
 * @param startTs - Start timestamp in milliseconds
 * @param endTs - End timestamp in milliseconds
 * @param duration - date-fns Duration object
 *
 * @example
 * ```ts
 * for (const ts of timeRangeWalker(start, end, { hours: 1 })) {
 *   console.log(new Date(ts))
 * }
 * ```
 */
export function* timeRangeWalker(
  startTs: number,
  endTs: number,
  duration: Parameters<typeof add>[1],
): Generator<number> {
  if (!startTs || !endTs) {
    throw new Error('startTs and endTs must be provided')
  }

  let currentTs = startTs
  yield currentTs

  while (currentTs <= endTs) {
    const currentDate = new Date(currentTs)
    currentTs = add(currentDate, duration).valueOf()
    yield currentTs
  }
}

/**
 * Convert seconds to milliseconds
 *
 * @param seconds - Number of seconds
 * @returns Equivalent number of milliseconds
 *
 * @example
 * ```ts
 * secondsToMs(60)  // 60000
 * ```
 */
export const secondsToMs = (seconds: number): number => seconds * 1000
