import { toZonedTime } from 'date-fns-tz'
import _filter from 'lodash/filter'
import _padStart from 'lodash/padStart'
import _reject from 'lodash/reject'

import { TIMEFRAME_TYPE, type TimeframeTypeValue } from '../../../constants/ranges'

const MS_PER_DAY = 24 * 60 * 60 * 1_000

type Month = {
  month: number
  label: string
}

type Week = {
  start: Date
  end: Date
  label: string
  bucketYear: number
  bucketMonth: number
  disabled?: boolean
}

export const YEARS: number[] = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)

const anchorYear = YEARS[0] ?? new Date().getFullYear()

export const MONTHS: Month[] = Array.from({ length: 12 }, (_, i) => ({
  month: i,
  label: new Date(anchorYear, i, 1).toLocaleString('en', { month: 'long' }),
}))

const endOfYesterday = (): Date => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  d.setTime(d.getTime() - MS_PER_DAY)
  return d
}

const capToYesterday = (d: Date): Date =>
  new Date(Math.min(d.getTime(), endOfYesterday().getTime()))

export const rangeOfYear = (year: number): [Date, Date] => {
  const start = new Date(year, 0, 1, 0, 0, 0, 0)
  const end = capToYesterday(new Date(year, 11, 31, 23, 59, 59, 999))
  return [start, end]
}

export const rangeOfMonth = (year: number, month: number): [Date, Date] => {
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = capToYesterday(new Date(year, month + 1, 0, 23, 59, 59, 999))
  return [start, end]
}

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const isSameZonedDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const weeksOfMonth = (year: number, month: number, timezone = 'UTC'): Week[] => {
  const firstDay = new Date(year, month, 1)
  firstDay.setHours(0, 0, 0, 0)
  const lastDay = new Date(year, month + 1, 0)
  lastDay.setHours(23, 59, 59, 999)

  const eoy = endOfYesterday()

  const firstDayInTz = toZonedTime(firstDay, timezone)
  const firstWeekStart = new Date(firstDayInTz)

  const dayOfWeek = firstWeekStart.getDay()
  const mondayBasedDay = (dayOfWeek + 6) % 7
  firstWeekStart.setDate(firstWeekStart.getDate() - mondayBasedDay)

  const result: Week[] = []
  let ws = firstWeekStart

  for (let i = 0; i < 6; i++) {
    if (ws.getTime() > eoy.getTime()) break

    const we = addDays(ws, 6)
    const overlaps = we >= firstDay && ws <= lastDay
    if (!overlaps) {
      ws = addDays(ws, 7)
      continue
    }

    const start = new Date(ws)
    start.setHours(0, 0, 0, 0)
    const end = capToYesterday(new Date(we.setHours(23, 59, 59, 999)))

    const rawStartInTz = toZonedTime(start, timezone)
    const endInTz = toZonedTime(end, timezone)
    const startInTz = isSameZonedDay(rawStartInTz, endInTz)
      ? addDays(rawStartInTz, -1)
      : rawStartInTz

    const weekStartMonth = startInTz.getMonth()
    const weekEndMonth = endInTz.getMonth()

    if (weekStartMonth === month || weekEndMonth === month) {
      const pad = (n: number) => _padStart(String(n), 2, '0')
      const d1 = startInTz.getDate()
      const m1 = startInTz.getMonth()
      const d2 = endInTz.getDate()
      const m2 = endInTz.getMonth()
      const bucketYear = endInTz.getFullYear()
      const bucketMonth = endInTz.getMonth()
      const label = `${pad(d1)}/${pad(m1 + 1)} - ${pad(d2)}/${pad(m2 + 1)}`

      result.push({
        start,
        end,
        label,
        bucketYear,
        bucketMonth,
        disabled: start > eoy,
      })
    }

    ws = addDays(ws, 7)
  }

  return result
}

export const monthsForYear = (y: number): Month[] => {
  const yesterday = endOfYesterday()
  if (y === yesterday.getFullYear()) {
    const lastVisibleMonth = yesterday.getMonth()
    return _filter(MONTHS, ({ month }) => month <= lastVisibleMonth)
  }
  return MONTHS
}

export type WeekRangeCacheEntry = {
  start: Date
  end: Date
  disabled?: boolean
}

export const buildWeeksCache = (timezone: string): Record<string, WeekRangeCacheEntry[]> => {
  const acc: Record<string, WeekRangeCacheEntry[]> = {}
  for (const year of YEARS) {
    for (let month = 0; month < 12; month++) {
      acc[`${year}-${month}`] = weeksOfMonth(year, month, timezone).map((w) => ({
        start: w.start,
        end: w.end,
        disabled: w.disabled,
      }))
    }
  }
  return acc
}

export const findWeekMatchInCalendar = (
  weeksCache: Record<string, WeekRangeCacheEntry[]>,
  startMs: number,
  endMs: number,
): { y: number; m: number; row: WeekRangeCacheEntry } | null => {
  for (const y of YEARS) {
    for (let m = 0; m < 12; m++) {
      const weeks = weeksCache[`${y}-${m}`] ?? []
      const match = weeks.find(
        (w) => !w.disabled && w.start.getTime() === startMs && w.end.getTime() === endMs,
      )
      if (match) return { y, m, row: match }
    }
  }
  return null
}

/** Default year picker: first year in `YEARS`, or calendar year of `now`. */
export const defaultSelectedYear = (now: Date): number => YEARS[0] ?? now.getFullYear()

export const defaultSelectedMonth = (now: Date): number => now.getMonth()

export const monthTreeToken = (year: number, month: number) => `${year}|${month}`

export const parseMonthTreeToken = (token: string): { year: number; month: number } | null => {
  const parts = token.split('|')
  if (parts.length !== 2) return null
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  return { year, month }
}

export const weekTreeToken = (year: number, month: number, start: Date) =>
  `${year}|${month}|${start.getTime()}`

export const parseWeekTreeToken = (
  token: string,
): { year: number; month: number; startTs: number } | null => {
  const parts = token.split('|')
  if (parts.length !== 3) return null
  const year = Number(parts[0])
  const month = Number(parts[1])
  const startTs = Number(parts[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(startTs)) return null
  return { year, month, startTs }
}

type WeekRowLite = { start: Date; disabled?: boolean }

/** Validates the controlled week select value against current option rows (flat or tree). */
export function resolveWeekSelectDisplayValue(params: {
  activeTimeframe: 'year' | 'month' | 'week'
  selectedWeekKey: string
  weekTree: boolean
  /** Flat mode: weeks for the visible month only. */
  visibleWeeks: WeekRowLite[]
  /** Tree mode: resolve item by calendar month. */
  getWeeksForMonth: (year: number, month: number) => WeekRowLite[]
}): string {
  const { activeTimeframe, selectedWeekKey, weekTree, visibleWeeks, getWeeksForMonth } = params
  if (activeTimeframe !== 'week' || !selectedWeekKey) return ''

  if (weekTree) {
    const parsed = parseWeekTreeToken(selectedWeekKey)
    if (!parsed) return ''
    const row = getWeeksForMonth(parsed.year, parsed.month).find(
      (w) => w.start.getTime() === parsed.startTs && !w.disabled,
    )
    return row ? selectedWeekKey : ''
  }

  const row = visibleWeeks.find((w) => String(w.start.getTime()) === selectedWeekKey && !w.disabled)
  return row ? selectedWeekKey : ''
}

const matchesBoundary = (a: number, b: number, toleranceMs = 2): boolean =>
  Math.abs(a - b) <= toleranceMs

export const inferTimeframeTypeFromRange = (
  start: Date,
  end: Date,
  weeksCache: Record<string, WeekRangeCacheEntry[]>,
): TimeframeTypeValue | null => {
  const startMs = start.getTime()
  const endMs = end.getTime()

  for (const year of YEARS) {
    const [ys, ye] = rangeOfYear(year)
    if (matchesBoundary(startMs, ys.getTime()) && matchesBoundary(endMs, ye.getTime()))
      return TIMEFRAME_TYPE.YEAR
  }

  for (const year of YEARS) {
    for (const { month } of monthsForYear(year)) {
      const [ms, me] = rangeOfMonth(year, month)
      if (matchesBoundary(startMs, ms.getTime()) && matchesBoundary(endMs, me.getTime()))
        return TIMEFRAME_TYPE.MONTH
    }
  }

  for (const year of YEARS) {
    for (const { month } of MONTHS) {
      const weeks = _reject(weeksCache[`${year}-${month}`] ?? [], 'disabled')
      for (const w of weeks) {
        if (
          matchesBoundary(w.start.getTime(), startMs) &&
          matchesBoundary(w.end.getTime(), endMs)
        ) {
          return TIMEFRAME_TYPE.WEEK
        }
      }
    }
  }

  return null
}
