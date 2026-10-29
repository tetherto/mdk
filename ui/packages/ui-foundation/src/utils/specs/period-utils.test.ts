import { describe, expect, it } from 'vitest'

import {
  allowedGranularities,
  periodRange,
  presetGranularity,
  zonedDayOf,
  zonedDayStart,
} from '../period-utils'

const DAY = 86_400_000

describe('zonedDayStart / zonedDayOf', () => {
  it("gives the instant of a day's local midnight", () => {
    expect(zonedDayStart('2026-03-01', 'UTC')).toBe(Date.UTC(2026, 2, 1))
    expect(zonedDayStart('2026-03-01', 'Europe/Paris')).toBe(Date.UTC(2026, 1, 28, 23))
    expect(zonedDayStart('2026-03-01', 'America/New_York')).toBe(Date.UTC(2026, 2, 1, 5))
  })

  it('follows daylight saving time', () => {
    // Paris moves to UTC+2 on 2026-03-29.
    expect(zonedDayStart('2026-03-30', 'Europe/Paris')).toBe(Date.UTC(2026, 2, 29, 22))
  })

  it('names the local day an instant falls on', () => {
    expect(zonedDayOf(Date.UTC(2026, 1, 28, 23, 30), 'Europe/Paris')).toBe('2026-03-01')
    expect(zonedDayOf(Date.UTC(2026, 1, 28, 23, 30), 'UTC')).toBe('2026-02-28')
  })
})

describe('periodRange', () => {
  const now = Date.UTC(2026, 9, 23, 12, 30, 15)
  const endOfMinute = Date.UTC(2026, 9, 23, 12, 31)

  it('ends a rolling preset at now, rounded up to the minute', () => {
    expect(periodRange({ preset: '24h', granularity: 'hour' }, 'UTC', now)).toEqual({
      start: endOfMinute - DAY,
      end: endOfMinute,
    })
    expect(periodRange({ preset: '30d', granularity: 'day' }, 'UTC', now).start).toBe(
      endOfMinute - 30 * DAY,
    )
  })

  it('starts year to date at local January 1', () => {
    expect(periodRange({ preset: 'ytd', granularity: 'month' }, 'Europe/Paris', now).start).toBe(
      Date.UTC(2025, 11, 31, 23),
    )
  })

  it('covers a custom range through the end of its last day', () => {
    expect(
      periodRange(
        { preset: 'custom', from: '2026-10-01', to: '2026-10-07', granularity: 'day' },
        'UTC',
        now,
      ),
    ).toEqual({ start: Date.UTC(2026, 9, 1), end: Date.UTC(2026, 9, 8) })
  })

  it('reads a custom range given the wrong way round', () => {
    expect(
      periodRange(
        { preset: 'custom', from: '2026-10-07', to: '2026-10-01', granularity: 'day' },
        'UTC',
        now,
      ),
    ).toEqual({ start: Date.UTC(2026, 9, 1), end: Date.UTC(2026, 9, 8) })
  })

  it('defaults a custom range with no days to the last 30 days', () => {
    const { start, end } = periodRange({ preset: 'custom', granularity: 'day' }, 'UTC', now)
    expect(start).toBe(Date.UTC(2026, 8, 23))
    expect(end).toBe(Date.UTC(2026, 9, 24))
  })
})

describe('allowedGranularities', () => {
  it('fits the buckets to the range', () => {
    expect(allowedGranularities(DAY)).toEqual(['hour', 'day'])
    expect(allowedGranularities(14 * DAY)).toEqual(['hour', 'day', 'week'])
    expect(allowedGranularities(60 * DAY)).toEqual(['day', 'week', 'month'])
    expect(allowedGranularities(4 * 366 * DAY)).toEqual(['week', 'month'])
  })
})

describe('presetGranularity', () => {
  it('opens each preset with its own buckets', () => {
    expect(presetGranularity('24h')).toBe('hour')
    expect(presetGranularity('90d')).toBe('week')
    expect(presetGranularity('ytd')).toBe('month')
  })
})
