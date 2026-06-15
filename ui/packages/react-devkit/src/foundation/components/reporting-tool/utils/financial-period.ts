/**
 * Pure date / period helpers for the reporting-tool's financial pages.
 *
 * No fetch, no effects, no reducer state - just bucket-key formatting and
 * empty-data detection used by the financial composite hooks.
 */

import { format } from 'date-fns/format'
import _every from 'lodash/every'
import _isEmpty from 'lodash/isEmpty'

import { PERIOD, type PeriodValue } from '../../../constants/ranges'
import type { FinancePeriod } from '@/types/finance'

export const MS_PER_DAY = 86_400_000

const WEEK_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export type PeriodType = 'month' | 'week' | 'day'

export type FinancialDateRange = {
  start: number
  end: number
  period?: PeriodValue
}

/**
 * Map UI period constants (`PERIOD.*`) to finance API query `period` strings.
 */
export const toFinancePeriod = (period?: PeriodValue): FinancePeriod => {
  if (period === PERIOD.WEEKLY) return 'weekly'
  if (period === PERIOD.YEARLY) return 'yearly'
  if (period === PERIOD.DAILY) return 'daily'

  return 'monthly'
}

/**
 * Format a timestamp into the bucket label used by financial chart x-axes.
 *
 * - `month` -> `yyyy-MM`     (Jan-Dec across years)
 * - `week`  -> `MM-dd`       (one tick per day inside a week)
 * - `day`   -> `Sun..Sat`    (weekday short name)
 *
 * Defaults to `month` for unknown period types.
 */
export const getPeriodKey = (timestamp: number, periodType: PeriodType): string => {
  const date = new Date(timestamp)

  switch (periodType) {
    case 'month':
      return format(date, 'yyyy-MM')
    case 'week':
      return format(date, 'MM-dd')
    case 'day':
      return WEEK_DAY_LABELS[date.getDay()] ?? ''
    default:
      return format(date, 'yyyy-MM')
  }
}

/**
 * Pick the bucket type ('month' / 'week' / 'day') a financial chart should
 * render given the user's selected date range.
 *
 * - PERIOD.MONTHLY            -> 'month'
 * - PERIOD.DAILY, span <= 7d  -> 'day'
 * - PERIOD.DAILY, span >  7d  -> 'week'
 * - anything else / null      -> 'month'
 */
export const getPeriodType = (dateRange: FinancialDateRange | null): PeriodType => {
  if (!dateRange?.period) return 'month'
  if (dateRange.period === PERIOD.MONTHLY) return 'month'
  if (dateRange.period === PERIOD.DAILY) {
    const days = Math.ceil((dateRange.end - dateRange.start) / MS_PER_DAY)
    return days <= 7 ? 'day' : 'week'
  }
  return 'month'
}

/**
 * True when a chart dataset has no series, or every series has no values, or
 * every value across every series is exactly 0. Used by financial charts to
 * decide between "render bars" and "render the empty-state placeholder".
 */
export const checkIfAllValuesAreZero = (
  data: { series?: { values?: number[] }[] } | null | undefined,
): boolean => {
  if (!data?.series || _isEmpty(data.series)) return true
  return _every(data.series, ({ values }) => {
    if (!values || _isEmpty(values)) return true
    return _every(values, (value) => value === 0)
  })
}
