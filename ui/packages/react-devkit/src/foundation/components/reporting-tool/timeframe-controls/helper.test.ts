import { describe, expect, it } from 'vitest'

import { TIMEFRAME_TYPE } from '@/constants/ranges'
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
  YEARS,
} from './timeframe-controls.helper'

describe('timeframe-controls.helper', () => {
  describe('YEARS', () => {
    it('lists three most recent calendar years descending', () => {
      const current = new Date().getFullYear()
      expect(YEARS).toEqual([current, current - 1, current - 2])
    })
  })

  describe('rangeOfYear', () => {
    it('starts Jan 1 at midnight and ends on or before end of yesterday', () => {
      const [start, end] = rangeOfYear(2020)
      expect(start.getTime()).toBe(new Date(2020, 0, 1, 0, 0, 0, 0).getTime())
      expect(end.getTime()).toBeLessThanOrEqual(Date.now())
      expect(end.getHours()).toBe(23)
    })
  })

  describe('rangeOfMonth', () => {
    it('covers the full month window', () => {
      const [start, end] = rangeOfMonth(2024, 5)
      expect(start.getTime()).toBe(new Date(2024, 5, 1, 0, 0, 0, 0).getTime())
      expect(start.getMonth()).toBe(5)
      expect(end.getMonth()).toBe(5)
      expect(end.getDate()).toBeGreaterThanOrEqual(28)
    })
  })

  describe('monthsForYear', () => {
    it('returns every month for non-current years', () => {
      const minYear = Math.min(...YEARS)
      const list = monthsForYear(minYear)
      expect(list).toHaveLength(12)
      expect(list[0]?.month).toBe(0)
      expect(list[11]?.month).toBe(11)
    })

    it('caps months through yesterday for the current year', () => {
      const cur = new Date().getFullYear()
      const list = monthsForYear(cur)
      const expectedMax = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      )
      expectedMax.setDate(expectedMax.getDate() - 1)
      const maxMonth = expectedMax.getMonth()
      expect(list.every(({ month }) => month <= maxMonth)).toBe(true)
    })
  })

  describe('weeksOfMonth', () => {
    it('returns only enabled-ish week rows for UTC and attaches bucket metadata', () => {
      const rows = weeksOfMonth(2020, 5, 'UTC')
      expect(rows.length).toBeGreaterThan(0)
      for (const w of rows) {
        expect(w.label).toMatch(/\d{2}\/\d{2}\s-\s\d{2}\/\d{2}/)
        expect(w.bucketYear).toBeTypeOf('number')
        expect(w.bucketMonth).toBeGreaterThanOrEqual(0)
        expect(w.bucketMonth).toBeLessThanOrEqual(11)
      }
    })

    it('accepts non-UTC timezone without throwing', () => {
      expect(() => weeksOfMonth(2023, 0, 'America/New_York')).not.toThrow()
    })
  })

  describe('inferTimeframeTypeFromRange', () => {
    it('detects a full year range', () => {
      const year = YEARS[0]!
      const [ys, ye] = rangeOfYear(year)
      expect(inferTimeframeTypeFromRange(ys, ye, {})).toBe(TIMEFRAME_TYPE.YEAR)
    })

    it('detects a full month range', () => {
      const y = Math.min(...YEARS)
      const m = 3
      const [ms, me] = rangeOfMonth(y, m)
      expect(inferTimeframeTypeFromRange(ms, me, {})).toBe(TIMEFRAME_TYPE.MONTH)
    })

    it('detects a week span present in the cache', () => {
      const y = YEARS[0]!
      const m = 2
      const weeks = weeksOfMonth(y, m, 'UTC')
      const active = weeks.find((w) => !w.disabled)
      if (!active) return

      const cache: Record<string, typeof weeks> = {
        [`${y}-${m}`]: weeks,
      }
      expect(inferTimeframeTypeFromRange(active.start, active.end, cache)).toBe(TIMEFRAME_TYPE.WEEK)
    })

    it('returns null when no preset matches', () => {
      expect(inferTimeframeTypeFromRange(new Date(1999, 0, 1), new Date(1999, 0, 2), {})).toBeNull()
    })

    it('ignores disabled entries in the week cache', () => {
      const y = YEARS[0]!
      const m = 0
      const weeks = weeksOfMonth(y, m, 'UTC')
      const w = weeks[0]
      if (!w) return

      const cache: Record<string, ((typeof weeks)[0] & { disabled?: boolean })[]> = {
        [`${y}-${m}`]: [{ ...w, disabled: true }],
      }
      expect(inferTimeframeTypeFromRange(w.start, w.end, cache)).toBeNull()
    })
  })

  describe('buildWeeksCache', () => {
    it('indexes every year/month pair with start/end snapshots', () => {
      const cache = buildWeeksCache('UTC')
      for (const y of YEARS) {
        for (let m = 0; m < 12; m++) {
          const rows = cache[`${y}-${m}`]
          expect(rows).toBeDefined()
          expect(Array.isArray(rows)).toBe(true)
          for (const row of rows ?? []) {
            expect(row.start).toBeInstanceOf(Date)
            expect(row.end).toBeInstanceOf(Date)
          }
        }
      }
    })
  })

  describe('findWeekMatchInCalendar', () => {
    it('returns coordinates when a non-disabled week matches start/end ms', () => {
      const y = YEARS[1]!
      const m = 4
      const sourceWeeks = weeksOfMonth(y, m, 'UTC')
      const row = sourceWeeks.find((w) => !w.disabled)
      if (!row) return

      const cache: Record<string, { start: Date; end: Date; disabled?: boolean }[]> = {
        [`${y}-${m}`]: sourceWeeks.map((w) => ({
          start: w.start,
          end: w.end,
          disabled: w.disabled,
        })),
      }
      const got = findWeekMatchInCalendar(cache, row.start.getTime(), row.end.getTime())
      expect(got).toEqual({
        y,
        m,
        row: expect.objectContaining({
          start: row.start,
          end: row.end,
        }),
      })
    })

    it('returns null when boundaries differ', () => {
      expect(findWeekMatchInCalendar({}, 0, 1)).toBeNull()
    })

    it('skips disabled rows', () => {
      const y = YEARS[0]!
      const m = 0
      const start = new Date(y, 0, 6)
      const end = new Date(y, 0, 12)
      const cache: Record<string, { start: Date; end: Date; disabled?: boolean }[]> = {
        [`${y}-${m}`]: [{ start, end, disabled: true }],
      }
      expect(findWeekMatchInCalendar(cache, start.getTime(), end.getTime())).toBeNull()
    })
  })

  describe('defaultSelectedYear / defaultSelectedMonth', () => {
    it('uses first YEARS entry when present', () => {
      const fixed = new Date(1999, 6, 15)
      expect(defaultSelectedYear(fixed)).toBe(YEARS[0])
      expect(defaultSelectedMonth(fixed)).toBe(6)
    })
  })

  describe('monthTreeToken / parseMonthTreeToken', () => {
    it('round-trips', () => {
      const t = monthTreeToken(2024, 11)
      expect(parseMonthTreeToken(t)).toEqual({ year: 2024, month: 11 })
    })

    it('returns null for invalid tokens', () => {
      expect(parseMonthTreeToken('')).toBeNull()
      expect(parseMonthTreeToken('2024')).toBeNull()
      expect(parseMonthTreeToken('x|0')).toBeNull()
    })
  })

  describe('weekTreeToken / parseWeekTreeToken', () => {
    it('round-trips', () => {
      const start = new Date(2025, 3, 7)
      const raw = weekTreeToken(2025, 3, start)
      expect(parseWeekTreeToken(raw)).toEqual({ year: 2025, month: 3, startTs: start.getTime() })
    })

    it('returns null when malformed', () => {
      expect(parseWeekTreeToken('1|2')).toBeNull()
      expect(parseWeekTreeToken('a|b|c')).toBeNull()
    })
  })

  describe('resolveWeekSelectDisplayValue', () => {
    const start = new Date(2024, 1, 5)

    it('returns empty when not week timeframe or empty key', () => {
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'month',
          selectedWeekKey: 'x',
          weekTree: false,
          visibleWeeks: [{ start }],
          getWeeksForMonth: () => [],
        }),
      ).toBe('')
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'week',
          selectedWeekKey: '',
          weekTree: false,
          visibleWeeks: [{ start }],
          getWeeksForMonth: () => [],
        }),
      ).toBe('')
    })

    it('flat mode keeps key when it matches an enabled row', () => {
      const key = String(start.getTime())
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'week',
          selectedWeekKey: key,
          weekTree: false,
          visibleWeeks: [{ start }],
          getWeeksForMonth: () => [],
        }),
      ).toBe(key)
    })

    it('flat mode clears when disabled or missing', () => {
      const key = String(start.getTime())
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'week',
          selectedWeekKey: key,
          weekTree: false,
          visibleWeeks: [{ start, disabled: true }],
          getWeeksForMonth: () => [],
        }),
      ).toBe('')
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'week',
          selectedWeekKey: '999',
          weekTree: false,
          visibleWeeks: [{ start }],
          getWeeksForMonth: () => [],
        }),
      ).toBe('')
    })

    it('tree mode resolves via getWeeksForMonth', () => {
      const token = weekTreeToken(2024, 1, start)
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'week',
          selectedWeekKey: token,
          weekTree: true,
          visibleWeeks: [],
          getWeeksForMonth: () => [{ start }],
        }),
      ).toBe(token)
    })

    it('tree mode returns empty when week missing', () => {
      const token = weekTreeToken(2024, 1, start)
      expect(
        resolveWeekSelectDisplayValue({
          activeTimeframe: 'week',
          selectedWeekKey: token,
          weekTree: true,
          visibleWeeks: [],
          getWeeksForMonth: () => [],
        }),
      ).toBe('')
    })
  })
})
