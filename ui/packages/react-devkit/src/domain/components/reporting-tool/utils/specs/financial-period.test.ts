import { describe, expect, it } from 'vitest'

import { PERIOD } from '@domain/constants/ranges'
import {
  checkIfAllValuesAreZero,
  getPeriodKey,
  getPeriodType,
  MS_PER_DAY,
} from '../financial-period'

describe('financial-period', () => {
  describe('MS_PER_DAY', () => {
    it('is exactly 24 hours in milliseconds', () => {
      expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000)
    })
  })

  describe('getPeriodKey', () => {
    // 2026-03-15 is a Sunday (UTC). Use UTC-anchored timestamps so tests are
    // host-tz independent for year/month formatting and weekday lookup.
    const sunday = new Date('2026-03-15T12:00:00Z').getTime()

    it('formats month buckets as yyyy-MM', () => {
      const key = getPeriodKey(sunday, 'month')
      expect(key).toMatch(/^2026-03$/)
    })

    it('formats week buckets as MM-dd', () => {
      const key = getPeriodKey(sunday, 'week')
      expect(key).toMatch(/^03-1[45]$/)
    })

    it('formats day buckets as the weekday short name', () => {
      const key = getPeriodKey(sunday, 'day')
      expect(['Sat', 'Sun']).toContain(key)
    })

    it('falls back to yyyy-MM for unknown period types', () => {
      const key = getPeriodKey(sunday, 'unknown' as unknown as 'month')
      expect(key).toMatch(/^2026-03$/)
    })
  })

  describe('getPeriodType', () => {
    it('returns month for null / no period', () => {
      expect(getPeriodType(null)).toBe('month')
      expect(getPeriodType({ start: 0, end: 0 })).toBe('month')
    })

    it('returns month for PERIOD.MONTHLY', () => {
      expect(getPeriodType({ start: 0, end: 0, period: PERIOD.MONTHLY })).toBe('month')
    })

    it('returns day when daily span is <= 7 days', () => {
      const start = 0
      const sixDays = 6 * MS_PER_DAY
      expect(getPeriodType({ start, end: sixDays, period: PERIOD.DAILY })).toBe('day')
      expect(getPeriodType({ start, end: 7 * MS_PER_DAY, period: PERIOD.DAILY })).toBe('day')
    })

    it('returns week when daily span is > 7 days', () => {
      const start = 0
      expect(getPeriodType({ start, end: 8 * MS_PER_DAY, period: PERIOD.DAILY })).toBe('week')
      expect(getPeriodType({ start, end: 30 * MS_PER_DAY, period: PERIOD.DAILY })).toBe('week')
    })

    it('returns month for other PERIOD values (weekly / yearly)', () => {
      expect(getPeriodType({ start: 0, end: MS_PER_DAY, period: PERIOD.WEEKLY })).toBe('month')
      expect(getPeriodType({ start: 0, end: MS_PER_DAY, period: PERIOD.YEARLY })).toBe('month')
    })
  })

  describe('checkIfAllValuesAreZero', () => {
    it('returns true for null / undefined', () => {
      expect(checkIfAllValuesAreZero(null)).toBe(true)
      expect(checkIfAllValuesAreZero(undefined)).toBe(true)
    })

    it('returns true for missing or empty series', () => {
      expect(checkIfAllValuesAreZero({})).toBe(true)
      expect(checkIfAllValuesAreZero({ series: [] })).toBe(true)
    })

    it('returns true when every series has no values', () => {
      expect(checkIfAllValuesAreZero({ series: [{}, { values: [] }] })).toBe(true)
    })

    it('returns true when every value across every series is zero', () => {
      expect(
        checkIfAllValuesAreZero({
          series: [{ values: [0, 0, 0] }, { values: [0] }],
        }),
      ).toBe(true)
    })

    it('returns false when any value in any series is non-zero', () => {
      expect(checkIfAllValuesAreZero({ series: [{ values: [0, 0, 1] }] })).toBe(false)
      expect(
        checkIfAllValuesAreZero({
          series: [{ values: [0, 0] }, { values: [0, -0.0001] }],
        }),
      ).toBe(false)
    })
  })
})
