import {
  fillMissingMonths,
  fillMissingMonthsInAggregated,
  fillMissingMonthsInSeries,
  fillMissingPeriodsInAggregated,
  generateMonthRange,
  generateTimeRange,
  getLabelFormat,
} from '../date-range-utils'

import { PERIOD } from '@/constants/ranges'

describe('date-range-utils', () => {
  describe('getLabelFormat', () => {
    it('returns MM-yy for monthly period', () => {
      expect(getLabelFormat(PERIOD.MONTHLY)).toBe('MM-yy')
    })
    it('returns dd-MM for other periods', () => {
      expect(getLabelFormat('daily')).toBe('dd-MM')
      expect(getLabelFormat('weekly')).toBe('dd-MM')
    })
  })

  describe('generateTimeRange', () => {
    it('returns empty array for invalid dates', () => {
      expect(generateTimeRange('invalid', 'invalid')).toEqual([])
      expect(generateTimeRange(Number.NaN as never, new Date())).toEqual([])
    })
    it('returns daily periods by default', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-03')
      const result = generateTimeRange(start, end)
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0]).toHaveProperty('label')
      expect(result[0]).toHaveProperty('ts')
      expect(result[0]).toHaveProperty('date')
    })
    it('returns monthly periods when period is monthly', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-03-01')
      const result = generateTimeRange(start, end, PERIOD.MONTHLY)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('generateMonthRange', () => {
    it('returns month range between start and end', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-03-01')
      const result = generateMonthRange(start, end)
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0].label).toBeDefined()
      expect(result[0].ts).toBeDefined()
    })
  })

  describe('fillMissingMonths', () => {
    it('fills missing months with zero value', () => {
      const existingData = [{ label: '01-01', ts: 1704067200000, value: 100 }]
      const start = new Date('2024-01-01')
      const end = new Date('2024-03-01')
      const result = fillMissingMonths(existingData, start, end)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.some((r) => r.value === 0)).toBe(true)
    })
  })

  describe('fillMissingMonthsInAggregated', () => {
    it('returns original data when no start/end', () => {
      const data = [{ label: '01-01', ts: 1, producedBTC: 0 }] as never[]
      expect(fillMissingMonthsInAggregated(data, null, null)).toEqual(data)
      expect(fillMissingMonthsInAggregated(data, undefined, undefined)).toEqual(data)
    })
    it('returns zero-filled items when aggregatedData empty', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-02-01')
      const result = fillMissingMonthsInAggregated([], start, end)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('producedBTC', 0)
    })
  })

  describe('fillMissingPeriodsInAggregated', () => {
    it('returns original data when no start/end', () => {
      const data = [{ label: '01-01', ts: 1 }] as never[]
      expect(fillMissingPeriodsInAggregated(data, null, null)).toEqual(data)
    })
    it('returns zero-filled items when aggregatedData empty and dates provided', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-05')
      const result = fillMissingPeriodsInAggregated([], start, end, 'daily')
      expect(result.length).toBeGreaterThan(0)
    })
    it('fills missing periods and preserves numeric, array, and object fields', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-03')
      const data = [
        { label: '01-01', ts: start.getTime(), numField: 5, arrField: [1, 2], objField: { a: 1 } },
      ]
      const result = fillMissingPeriodsInAggregated(data as never[], start, end)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
    it('returns existing item when label matches', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-02')
      const data = [{ label: '01-01', ts: start.getTime(), value: 42 }]
      const result = fillMissingPeriodsInAggregated(data as never[], start, end)
      const found = result.find((r) => r.label === '01-01')
      expect(found?.value).toBe(42)
    })
  })

  describe('generateTimeRange — additional periods', () => {
    it('returns weekly periods when period is weekly', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-02-01')
      const result = generateTimeRange(start, end, 'weekly')
      expect(result.length).toBeGreaterThanOrEqual(4)
    })

    it('accepts numeric timestamp inputs', () => {
      const start = new Date('2024-01-01').getTime()
      const end = new Date('2024-01-03').getTime()
      const result = generateTimeRange(start, end)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('accepts ISO string inputs', () => {
      const result = generateTimeRange('2024-01-01', '2024-01-03')
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('fillMissingMonths — with labelExtractor', () => {
    it('uses custom labelExtractor when provided', () => {
      const existingData = [{ customLabel: '01-24', ts: 1704067200000, value: 50 }]
      const start = new Date('2024-01-01')
      const end = new Date('2024-03-01')
      const result = fillMissingMonths(
        existingData,
        start,
        end,
        'MM-yy',
        (item) => item.customLabel as string,
      )
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('fillMissingMonthsInSeries', () => {
    it('returns empty array for empty input', () => {
      expect(fillMissingMonthsInSeries([], '2024-01-01', '2024-03-01')).toEqual([])
    })

    it('fills missing months with 0 for series data', () => {
      const seriesData = [{ labels: ['01-24'], values: [100], name: 'series1' }]
      const result = fillMissingMonthsInSeries(seriesData, '2024-01-01', '2024-03-01')
      expect(result).toHaveLength(1)
      expect(result[0].values.length).toBeGreaterThanOrEqual(2)
    })

    it('handles series with no values', () => {
      const seriesData = [{ labels: [], values: [], name: 'empty' }]
      const result = fillMissingMonthsInSeries(seriesData, '2024-01-01', '2024-02-01')
      expect(result).toHaveLength(1)
    })
  })
})
