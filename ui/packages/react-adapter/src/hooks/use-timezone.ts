import { format, toZonedTime } from 'date-fns-tz'
import { useCallback } from 'react'

import { useTimezone as useTimezoneStore } from './store-hooks'

const DATE_TIME_FORMAT_WITH_SECONDS = 'dd-MM-yyyy HH:mm:ss'

/**
 * Return type for `useTimezoneFormatter` hook.
 */
export type UseTimezoneFormatterReturn = {
  /** Format a date in the current or specified timezone */
  getFormattedDate: (date: Date | number, fixedTimezone?: string, formatString?: string) => string
  /** Current timezone string (e.g., 'America/New_York', 'UTC') */
  timezone: string
  /** Update the current timezone */
  changeTimezone: (tz: string) => void
}

/**
 * Timezone-aware date formatting hook.
 *
 * Composes the raw `useTimezone` store binding with `date-fns-tz` helpers so
 * components can render dates in the user's selected timezone without owning
 * the formatting logic themselves.
 *
 * @example
 * ```tsx
 * const { getFormattedDate, timezone, changeTimezone } = useTimezoneFormatter()
 * getFormattedDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd HH:mm')
 * ```
 *
 * @category utility
 */
export const useTimezoneFormatter = (): UseTimezoneFormatterReturn => {
  const { timezone, setTimezone } = useTimezoneStore()

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

  const changeTimezone = useCallback(
    (tz: string): void => {
      setTimezone(tz)
    },
    [setTimezone],
  )

  return {
    getFormattedDate,
    timezone,
    changeTimezone,
  }
}
