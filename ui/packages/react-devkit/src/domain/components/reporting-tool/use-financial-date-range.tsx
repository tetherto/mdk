import type { DateRange } from '@primitives'
import { DateRangePicker } from '@primitives'
import { endOfDay } from 'date-fns/endOfDay'
import { endOfMonth } from 'date-fns/endOfMonth'
import { getDate } from 'date-fns/getDate'
import { getDaysInMonth } from 'date-fns/getDaysInMonth'
import { getMonth } from 'date-fns/getMonth'
import { getYear } from 'date-fns/getYear'
import { isAfter } from 'date-fns/isAfter'
import { startOfDay } from 'date-fns/startOfDay'
import { startOfMonth } from 'date-fns/startOfMonth'
import { subDays } from 'date-fns/subDays'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PERIOD, type PeriodValue } from '../../constants/ranges'
import type { FinancialDateRange } from './utils/financial-period'

export type { FinancialDateRange } from './utils/financial-period'

export type UseFinancialDateRangeOptions = {
  defaultPeriod?: PeriodValue
  timezone?: string
}

export type FinancialRangeChangeOptions = {
  year?: number
  month?: number
  period?: PeriodValue
}

export type UseFinancialDateRangeResult = {
  dateRange: FinancialDateRange | null
  handleRangeChange: (
    dates: [Date, Date] | null,
    rangeOptions?: FinancialRangeChangeOptions,
  ) => void
  onDateRangeReset: () => void
  datePicker: ReactElement
}

/**
 * Converts a calendar range (wall date fields from the two Date instances) into
 * UTC epoch ms boundaries in `timezone`, mirroring Mining OS `getRangeTimestamps`
 * (full month vs day span, end clamped to "yesterday" when still in the future).
 */
export const rangeDatesToFinancialMs = (
  range: [Date, Date],
  timezone: string,
): { start: number; end: number } | null => {
  const [startDate, endDate] = range

  const startYear = getYear(startDate)
  const startMonth = getMonth(startDate)
  const startDay = getDate(startDate)

  const endYear = getYear(endDate)
  const endMonth = getMonth(endDate)
  const endDay = getDate(endDate)

  const startMonthDate = new Date(startYear, startMonth, 1)
  const isFullMonth =
    startYear === endYear &&
    startMonth === endMonth &&
    startDay === 1 &&
    endDay === getDaysInMonth(startMonthDate)

  let startUtc: Date
  let endUtc: Date

  if (isFullMonth) {
    const startInZone = startOfMonth(startMonthDate)
    const endInZone = endOfMonth(startMonthDate)
    startUtc = fromZonedTime(startInZone, timezone)
    endUtc = fromZonedTime(endInZone, timezone)
  } else {
    const startInZone = startOfDay(new Date(startYear, startMonth, startDay))
    const endInZone = endOfDay(new Date(endYear, endMonth, endDay))
    startUtc = fromZonedTime(startInZone, timezone)
    endUtc = fromZonedTime(endInZone, timezone)
  }

  const now = new Date()
  const nowInTargetZone = toZonedTime(now, timezone)
  const nowInZone = startOfDay(nowInTargetZone)
  const nowUtc = fromZonedTime(nowInZone, timezone)

  const endDateUtc = fromZonedTime(startOfDay(new Date(endYear, endMonth, endDay)), timezone)

  let finalEndUtc: Date
  if (isAfter(endDateUtc, nowUtc)) {
    const yesterdayInZone = endOfDay(subDays(nowInTargetZone, 1))
    finalEndUtc = fromZonedTime(yesterdayInZone, timezone)
  } else {
    finalEndUtc = endUtc
  }

  return { start: startUtc.getTime(), end: finalEndUtc.getTime() }
}

/**
 * Resolves the active financial date range (start/end) used by every reporting-section query.
 *
 * @category widgets
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const useFinancialDateRange = (
  options?: UseFinancialDateRangeOptions,
): UseFinancialDateRangeResult => {
  const defaultPeriod = options?.defaultPeriod ?? PERIOD.DAILY
  const timezone = options?.timezone ?? 'UTC'

  const [dateRange, setDateRange] = useState<FinancialDateRange | null>(null)

  const applyWallRange = useCallback(
    (dates: [Date, Date], period: PeriodValue) => {
      const ms = rangeDatesToFinancialMs(dates, timezone)
      if (!ms) return
      setDateRange({
        start: ms.start,
        end: ms.end,
        period,
      })
    },
    [timezone],
  )

  const handleRangeChange = useCallback(
    (dates: [Date, Date] | null, rangeOptions?: FinancialRangeChangeOptions) => {
      if (!dates) return
      const raw = rangeOptions?.period
      const period: PeriodValue =
        raw === PERIOD.DAILY ||
        raw === PERIOD.MONTHLY ||
        raw === PERIOD.WEEKLY ||
        raw === PERIOD.YEARLY
          ? raw
          : defaultPeriod
      applyWallRange(dates, period)
    },
    [applyWallRange, defaultPeriod],
  )

  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const now = new Date()
    applyWallRange([startOfMonth(now), endOfMonth(now)], defaultPeriod)
  }, [applyWallRange, defaultPeriod])

  const onDateRangeReset = useCallback(() => {
    const now = new Date()
    applyWallRange([startOfMonth(now), endOfMonth(now)], defaultPeriod)
  }, [applyWallRange, defaultPeriod])

  const datePicker = useMemo(() => {
    const selected: DateRange | undefined = dateRange
      ? {
          from: toZonedTime(new Date(dateRange.start), timezone),
          to: toZonedTime(new Date(dateRange.end), timezone),
        }
      : undefined

    const periodForPicker = dateRange?.period ?? defaultPeriod

    const onSelect = (next: DateRange | undefined): void => {
      if (!next?.from) return
      const from = startOfDay(next.from)
      const to = endOfDay(next.to ?? next.from)
      applyWallRange([from, to], periodForPicker)
    }

    return <DateRangePicker selected={selected} onSelect={onSelect} />
  }, [applyWallRange, dateRange, defaultPeriod, timezone])

  return {
    dateRange,
    handleRangeChange,
    onDateRangeReset,
    datePicker,
  }
}
