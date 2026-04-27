import { format, toZonedTime } from 'date-fns-tz'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { DATE_TIME_FORMAT_WITH_SECONDS } from '../constants/dates'
import { timezoneSlice } from '../state/slices/timezone-slice'
import type { RootState } from '../types/redux'

/**
 * Return type for useTimezone hook
 */
export type UseTimezoneReturn = {
  /** Format a date in the current or specified timezone */
  getFormattedDate: (date: Date | number, fixedTimezone?: string, formatString?: string) => string
  /** Current timezone string (e.g., 'America/New_York', 'UTC') */
  timezone: string
  /** Update the current timezone */
  changeTimezone: (tz: string) => void
}

/**
 * Hook for timezone management and date formatting
 *
 * Provides access to the current timezone and utilities for formatting dates
 * with timezone awareness.
 *
 * @returns Object with timezone state and formatting utilities
 *
 * @example
 * ```tsx
 * function DateDisplay() {
 *   const { getFormattedDate, timezone, changeTimezone } = useTimezone()
 *
 *   const now = new Date()
 *
 *   return (
 *     <div>
 *       <p>Current timezone: {timezone}</p>
 *       <p>Formatted: {getFormattedDate(now)}</p>
 *       <button onClick={() => changeTimezone('America/New_York')}>
 *         Switch to NY Time
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Format with custom timezone and format
 * const { getFormattedDate } = useTimezone()
 *
 * getFormattedDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd HH:mm')
 * // "2024-01-15 14:30"
 * ```
 *
 * @example
 * ```tsx
 * // Use current timezone
 * const { getFormattedDate, timezone } = useTimezone()
 *
 * console.log(timezone) // "UTC"
 * getFormattedDate(new Date()) // Uses UTC timezone
 * ```
 */
export const useTimezone = (): UseTimezoneReturn => {
  const timezone = useSelector((state: RootState) => state.timezone.timezone)
  const dispatch = useDispatch()

  /**
   * Format a date with timezone awareness
   *
   * @param date - Date to format (Date object or timestamp)
   * @param fixedTimezone - Optional override timezone (defaults to current timezone)
   * @param formatString - Optional date format string (defaults to DATE_TIME_FORMAT_WITH_SECONDS)
   * @returns Formatted date string
   */
  const getFormattedDate = useCallback(
    (date: Date | number, fixedTimezone?: string, formatString?: string): string => {
      const targetTimezone = fixedTimezone || timezone
      const dateFormat = formatString || DATE_TIME_FORMAT_WITH_SECONDS

      const zonedDate = toZonedTime(date, targetTimezone)

      return format(zonedDate, dateFormat, {
        timeZone: targetTimezone,
      })
    },
    [timezone],
  )

  /**
   * Update the current timezone
   *
   * @param tz - Timezone string (IANA timezone identifier, e.g., 'America/New_York')
   */
  const changeTimezone = useCallback(
    (tz: string): void => {
      dispatch(timezoneSlice.actions.setTimezone(tz))
    },
    [dispatch],
  )

  return {
    getFormattedDate,
    timezone,
    changeTimezone,
  }
}
