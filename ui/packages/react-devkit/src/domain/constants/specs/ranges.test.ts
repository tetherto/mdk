import { describe, expect, it } from 'vitest'
import { AVG_HISTORY_RANGES, PERIOD, RANGES, TIMEFRAME_TYPE } from '../ranges'

describe('ranges constants', () => {
  it('should have date ranges defined', () => {
    expect(RANGES.LAST7).toBe('Last 7 Days')
    expect(RANGES.LAST14).toBe('Last 14 Days')
    expect(RANGES.LAST30).toBe('Last 30 Days')
    expect(RANGES.LAST90).toBe('Last 90 Days')
    expect(RANGES.YESTERDAY).toBe('Yesterday')
    expect(RANGES.CUSTOM_RANGE).toBe('Custom Range')
  })

  it('should have average history ranges', () => {
    expect(AVG_HISTORY_RANGES.LAST14).toBe('14 days')
    expect(AVG_HISTORY_RANGES.LASTMONTH).toBe('1 month')
  })

  it('should have period types', () => {
    expect(PERIOD.DAILY).toBe('daily')
    expect(PERIOD.YEARLY).toBe('yearly')
    expect(PERIOD.WEEKLY).toBe('weekly')
    expect(PERIOD.MONTHLY).toBe('monthly')
  })

  it('should have timeframe types', () => {
    expect(TIMEFRAME_TYPE.YEAR).toBe('year')
    expect(TIMEFRAME_TYPE.WEEK).toBe('week')
    expect(TIMEFRAME_TYPE.MONTH).toBe('month')
  })

  it('should have all range options', () => {
    const rangeValues = Object.values(RANGES)
    expect(rangeValues).toHaveLength(6)
  })

  it('should have all period options', () => {
    const periodValues = Object.values(PERIOD)
    expect(periodValues).toHaveLength(4)
  })
})
