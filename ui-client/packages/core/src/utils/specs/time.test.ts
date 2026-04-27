import { describe, expect, it } from 'vitest'

import {
  breakTimeIntoIntervals,
  getLastNDaysEndingYesterday,
  getSmallestAndLargestTs,
  getTimeRange,
  secondsToMs,
  TimeRangeTypes,
  timeRangeWalker,
} from '../time'

describe('getTimeRange', () => {
  it('returns DAY when timestamps are undefined', () => {
    expect(getTimeRange(undefined, undefined)).toBe(TimeRangeTypes.DAY)
    expect(getTimeRange(1000, undefined)).toBe(TimeRangeTypes.DAY)
    expect(getTimeRange(undefined, 1000)).toBe(TimeRangeTypes.DAY)
  })

  it('returns DAY when range is 0', () => {
    expect(getTimeRange(1000, 1000)).toBe(TimeRangeTypes.DAY)
  })

  it('returns MINUTE when range is within 24 hours', () => {
    const oneHour = 60 * 60 * 1000
    const start = 1000
    const end = start + oneHour
    expect(getTimeRange(end, start)).toBe(TimeRangeTypes.MINUTE)
    expect(getTimeRange(start + 24 * oneHour, start)).toBe(TimeRangeTypes.MINUTE)
  })

  it('returns DAY when range exceeds 24 hours', () => {
    const oneDay = 24 * 60 * 60 * 1000
    const start = 1000
    expect(getTimeRange(start + oneDay + 1000, start)).toBe(TimeRangeTypes.DAY)
  })
})

describe('breakTimeIntoIntervals', () => {
  it('breaks time range into equal intervals', () => {
    const intervals = breakTimeIntoIntervals(0, 10000, 3000)
    expect(intervals).toEqual([
      { start: 0, end: 3000 },
      { start: 3000, end: 6000 },
      { start: 6000, end: 9000 },
      { start: 9000, end: 10000 },
    ])
  })

  it('handles exact division', () => {
    const intervals = breakTimeIntoIntervals(0, 9000, 3000)
    expect(intervals).toEqual([
      { start: 0, end: 3000 },
      { start: 3000, end: 6000 },
      { start: 6000, end: 9000 },
    ])
  })

  it('handles single interval', () => {
    const intervals = breakTimeIntoIntervals(0, 1000, 2000)
    expect(intervals).toEqual([{ start: 0, end: 1000 }])
  })
})

describe('getSmallestAndLargestTs', () => {
  it('returns null for empty array', () => {
    expect(getSmallestAndLargestTs([])).toEqual({ start: null, end: null })
  })

  it('returns same value for single interval', () => {
    expect(getSmallestAndLargestTs([{ start: 100, end: 200 }])).toEqual({
      start: 100,
      end: 200,
    })
  })

  it('finds min start and max end from multiple intervals', () => {
    const intervals = [
      { start: 500, end: 800 },
      { start: 100, end: 300 },
      { start: 200, end: 1000 },
    ]
    expect(getSmallestAndLargestTs(intervals)).toEqual({
      start: 100,
      end: 1000,
    })
  })
})

describe('getLastNDaysEndingYesterday', () => {
  it('returns 7 days ending yesterday by default', () => {
    const referenceDate = new Date('2024-01-15T12:00:00')
    const result = getLastNDaysEndingYesterday(7, referenceDate)

    expect(result.start).toBeDefined()
    expect(result.end).toBeDefined()
    expect(result.end).toBeGreaterThan(result.start)

    const daysDiff = Math.floor((result.end - result.start) / (24 * 60 * 60 * 1000))
    expect(daysDiff).toBeGreaterThanOrEqual(6)
    expect(daysDiff).toBeLessThanOrEqual(7)
  })

  it('handles custom number of days', () => {
    const referenceDate = new Date('2024-01-15T12:00:00')
    const result = getLastNDaysEndingYesterday(3, referenceDate)

    expect(result.start).toBeDefined()
    expect(result.end).toBeDefined()
    expect(result.end).toBeGreaterThan(result.start)

    const daysDiff = Math.floor((result.end - result.start) / (24 * 60 * 60 * 1000))
    expect(daysDiff).toBeGreaterThanOrEqual(2)
    expect(daysDiff).toBeLessThanOrEqual(3)
  })
})

describe('timeRangeWalker', () => {
  it('generates timestamps with given duration', () => {
    const generator = timeRangeWalker(1000, 7200000, { hours: 1 })
    const timestamps = Array.from(generator)

    expect(timestamps.length).toBeGreaterThan(1)
    expect(timestamps[0]).toBe(1000)
  })

  it('throws when timestamps are missing', () => {
    expect(() => {
      const gen = timeRangeWalker(0, 0, { hours: 1 })
      gen.next()
    }).toThrow('startTs and endTs must be provided')
  })

  it('yields timestamps when start equals end', () => {
    const generator = timeRangeWalker(1000, 1000, { minutes: 1 })
    const timestamps = Array.from(generator)

    expect(timestamps.length).toBeGreaterThanOrEqual(1)
    expect(timestamps[0]).toBe(1000)
  })
})

describe('secondsToMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(secondsToMs(0)).toBe(0)
    expect(secondsToMs(1)).toBe(1000)
    expect(secondsToMs(60)).toBe(60000)
    expect(secondsToMs(3600)).toBe(3600000)
  })
})
