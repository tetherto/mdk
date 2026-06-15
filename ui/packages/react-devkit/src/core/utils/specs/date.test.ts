import { describe, expect, it } from 'vitest'

import {
  getBeginningOfMonth,
  getPastDateFromDate,
  getTimeRoundedToMinute,
  isValidTimestamp,
  parseMonthLabelToDate,
} from '../date'

describe('isValidTimestamp', () => {
  it('validates good timestamps', () => {
    expect(isValidTimestamp(Date.now())).toBe(true)
    expect(isValidTimestamp(new Date())).toBe(true)
    expect(isValidTimestamp('2024-01-15')).toBe(true)
  })

  it('rejects bad timestamps', () => {
    expect(isValidTimestamp('not-a-date')).toBe(false)
    expect(isValidTimestamp(Number.NaN)).toBe(false)
  })
})

describe('parseMonthLabelToDate', () => {
  it('parses MM-YYYY format', () => {
    const date = parseMonthLabelToDate('03-2025')
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(2)
  })

  it('parses MM-YY format', () => {
    const date = parseMonthLabelToDate('01-26')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(0)
  })

  it('returns null for invalid labels', () => {
    expect(parseMonthLabelToDate('invalid')).toBe(null)
    expect(parseMonthLabelToDate(123)).toBe(null)
  })
})

describe('getPastDateFromDate', () => {
  it('returns a date N days in the past', () => {
    const now = Date.now()
    const result = getPastDateFromDate({ dateTs: now, days: 7 })
    const diff = now - result.getTime()
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
  })
})

describe('getBeginningOfMonth', () => {
  it('returns the 1st of the month at midnight', () => {
    const ref = new Date(2025, 5, 15, 10, 30)
    const result = getBeginningOfMonth(ref)
    expect(result.getDate()).toBe(1)
    expect(result.getMonth()).toBe(5)
    expect(result.getHours()).toBe(0)
  })
})

describe('getTimeRoundedToMinute', () => {
  it('zeroes out seconds and milliseconds', () => {
    const input = new Date(2025, 0, 1, 12, 30, 45, 123)
    const result = new Date(getTimeRoundedToMinute(input))
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(result.getMinutes()).toBe(30)
  })
})
