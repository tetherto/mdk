import { useTimezone } from '@tetherto/mdk-react-adapter'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  PERIOD,
  type PeriodValue,
  TIMEFRAME_TYPE,
  type TimeframeTypeValue,
} from '@/constants/ranges'
import {
  buildWeeksCache,
  defaultSelectedMonth,
  defaultSelectedYear,
  findWeekMatchInCalendar,
  inferTimeframeTypeFromRange,
  monthsForYear,
  monthTreeToken,
  parseMonthTreeToken,
  parseWeekTreeToken,
  rangeOfMonth,
  rangeOfYear,
  resolveWeekSelectDisplayValue,
  weeksOfMonth,
  weekTreeToken,
} from './timeframe-controls.helper'
import type { TimeframeControlsProps } from './timeframe-controls.types'

const PERIOD_BY_TIMEFRAME: Record<TimeframeTypeValue, PeriodValue> = {
  [TIMEFRAME_TYPE.YEAR]: PERIOD.MONTHLY,
  [TIMEFRAME_TYPE.MONTH]: PERIOD.DAILY,
  [TIMEFRAME_TYPE.WEEK]: PERIOD.DAILY,
}

/** Which single control “owns” the range: others show placeholders (mutually exclusive UI). */
export type ActiveTimeframe = 'year' | 'month' | 'week'

export type UseTimeframeControlsParams = Pick<
  TimeframeControlsProps,
  'dateRange' | 'timeframeType' | 'onRangeChange' | 'onTimeframeTypeChange'
> & {
  isWeekSelectVisible: boolean
  /** Both month + week selects visible → week nested tree. */
  weekTree: boolean
}

/**
 * Core state machine for TimeframeControls — owns year / month / week
 * selection and resolves the date-range output.
 *
 * @category filters
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const useTimeframeControls = ({
  dateRange,
  timeframeType: timeframeTypeProp,
  onRangeChange,
  onTimeframeTypeChange,
  isWeekSelectVisible,
  weekTree,
}: UseTimeframeControlsParams) => {
  const { timezone } = useTimezone()
  const weeksCache = useMemo(() => buildWeeksCache(timezone), [timezone])

  const [selectedYear, setSelectedYear] = useState(() => defaultSelectedYear(new Date()))
  const [selectedMonth, setSelectedMonth] = useState(() => defaultSelectedMonth(new Date()))
  /** Flat mode: week start timestamp. Tree mode: `year|month|startTs`. */
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('')
  const [activeTimeframe, setActiveTimeframe] = useState<ActiveTimeframe>('month')

  const applyRange = useCallback(
    (
      range: [Date, Date],
      options: Partial<{ year: number; month: number; period: string }>,
      nextType: TimeframeTypeValue,
    ) => {
      onRangeChange?.(range, { ...options, period: PERIOD_BY_TIMEFRAME[nextType] })
      onTimeframeTypeChange?.(nextType)
    },
    [onRangeChange, onTimeframeTypeChange],
  )

  const pushSelection = useCallback(
    (args: {
      nextActive: ActiveTimeframe
      range: [Date, Date]
      meta: Partial<{ year: number; month: number }>
      tf: TimeframeTypeValue
      picker: Partial<{ setYear: number; setMonth: number; weekKey: string }>
    }) => {
      const { nextActive, range, meta, tf, picker } = args
      setActiveTimeframe(nextActive)
      if (picker.setYear !== undefined) setSelectedYear(picker.setYear)
      if (picker.setMonth !== undefined) setSelectedMonth(picker.setMonth)
      if (picker.weekKey !== undefined) setSelectedWeekKey(picker.weekKey)
      applyRange(range, meta, tf)
    },
    [applyRange],
  )

  const syncFromExternalRange = useCallback(() => {
    if (!dateRange?.start || !dateRange?.end) return

    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    const inferred = inferTimeframeTypeFromRange(start, end, weeksCache)
    const effectiveType = timeframeTypeProp ?? inferred

    const syncPickerToStartMonth = (nextActive: ActiveTimeframe) => {
      setActiveTimeframe(nextActive)
      setSelectedYear(start.getFullYear())
      setSelectedMonth(start.getMonth())
      setSelectedWeekKey('')
    }

    if (!effectiveType) {
      setSelectedYear(defaultSelectedYear(new Date()))
      setSelectedMonth(defaultSelectedMonth(new Date()))
      setSelectedWeekKey('')
      setActiveTimeframe('month')
      return
    }

    if (effectiveType === TIMEFRAME_TYPE.YEAR) {
      syncPickerToStartMonth('year')
      return
    }

    if (effectiveType === TIMEFRAME_TYPE.MONTH) {
      syncPickerToStartMonth('month')
      return
    }

    if (effectiveType === TIMEFRAME_TYPE.WEEK) {
      const startMs = start.getTime()
      const endMs = end.getTime()
      const picked = findWeekMatchInCalendar(weeksCache, startMs, endMs)
      if (picked) {
        setActiveTimeframe('week')
        setSelectedYear(picked.y)
        setSelectedMonth(picked.m)
        setSelectedWeekKey(weekTreeToken(picked.y, picked.m, picked.row.start))
      } else {
        syncPickerToStartMonth('month')
      }
    }
  }, [dateRange, timeframeTypeProp, weeksCache])

  useEffect(() => {
    syncFromExternalRange()
  }, [syncFromExternalRange])

  const visibleMonths = useMemo(() => monthsForYear(selectedYear), [selectedYear])

  useEffect(() => {
    const allowed = new Set(visibleMonths.map((m) => m.month))
    if (!allowed.has(selectedMonth)) {
      const fallback = visibleMonths.at(-1)?.month ?? 0
      setSelectedMonth(fallback)
    }
  }, [selectedMonth, visibleMonths])

  const visibleWeeks = useMemo(() => {
    if (!isWeekSelectVisible) return []
    return weeksOfMonth(selectedYear, selectedMonth, timezone)
  }, [isWeekSelectVisible, selectedMonth, selectedYear, timezone])

  useEffect(() => {
    if (!isWeekSelectVisible || visibleWeeks.length === 0) return
    if (!weekTree) {
      const keys = new Set(visibleWeeks.map((w) => String(w.start.getTime())))
      if (selectedWeekKey && !keys.has(selectedWeekKey)) {
        setSelectedWeekKey('')
      }
    }
  }, [isWeekSelectVisible, selectedWeekKey, visibleWeeks, weekTree])

  const handleYearChange = useCallback(
    (value: string) => {
      const year = Number(value)
      pushSelection({
        nextActive: 'year',
        range: rangeOfYear(year),
        meta: { year },
        tf: TIMEFRAME_TYPE.YEAR,
        picker: { setYear: year, weekKey: '' },
      })
    },
    [pushSelection],
  )

  const handleMonthTreeChange = useCallback(
    (value: string) => {
      const parsed = parseMonthTreeToken(value)
      if (!parsed) return
      const { year, month } = parsed
      pushSelection({
        nextActive: 'month',
        range: rangeOfMonth(year, month),
        meta: { year, month },
        tf: TIMEFRAME_TYPE.MONTH,
        picker: { setYear: year, setMonth: month, weekKey: '' },
      })
    },
    [pushSelection],
  )

  const handleWeekChangeFlat = useCallback(
    (value: string) => {
      const week = visibleWeeks.find((w) => String(w.start.getTime()) === value)
      if (!week || week.disabled) return
      pushSelection({
        nextActive: 'week',
        range: [week.start, week.end],
        meta: { year: week.bucketYear, month: week.bucketMonth },
        tf: TIMEFRAME_TYPE.WEEK,
        picker: { weekKey: value },
      })
    },
    [pushSelection, visibleWeeks],
  )

  const handleWeekChangeFromTree = useCallback(
    (value: string) => {
      const parsed = parseWeekTreeToken(value)
      if (!parsed) return
      const { year, month, startTs } = parsed
      const row = weeksOfMonth(year, month, timezone).find(
        (w) => w.start.getTime() === startTs && !w.disabled,
      )
      if (!row) return
      pushSelection({
        nextActive: 'week',
        range: [row.start, row.end],
        meta: { year: row.bucketYear, month: row.bucketMonth },
        tf: TIMEFRAME_TYPE.WEEK,
        picker: { setYear: year, setMonth: month, weekKey: value },
      })
    },
    [pushSelection, timezone],
  )

  const yearSelectValue = activeTimeframe === 'year' ? String(selectedYear) : ''
  const monthSelectValue =
    activeTimeframe === 'month' ? monthTreeToken(selectedYear, selectedMonth) : ''

  const resolvedWeekValue = useMemo(
    () =>
      resolveWeekSelectDisplayValue({
        activeTimeframe,
        selectedWeekKey,
        weekTree,
        visibleWeeks,
        getWeeksForMonth: (y, m) => weeksOfMonth(y, m, timezone),
      }),
    [activeTimeframe, selectedWeekKey, timezone, weekTree, visibleWeeks],
  )

  return {
    timezone,
    selectedYear,
    selectedMonth,
    visibleWeeks,
    handleYearChange,
    handleMonthTreeChange,
    handleWeekChangeFlat,
    handleWeekChangeFromTree,
    yearSelectValue,
    monthSelectValue,
    resolvedWeekValue,
  }
}
