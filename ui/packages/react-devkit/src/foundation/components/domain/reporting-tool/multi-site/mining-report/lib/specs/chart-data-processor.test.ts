import { describe, expect, it } from 'vitest'

import {
  createChartDataProcessor,
  processChartDataWithMissingMonths,
  processChartDataWithMissingPeriods,
  processSeriesDataWithMissingMonths,
} from '../chart-data-processor'

describe('chart-data-processor', () => {
  describe('processChartDataWithMissingMonths', () => {
    it('returns [] for empty or invalid data', () => {
      expect(processChartDataWithMissingMonths([], undefined, undefined)).toEqual([])
      expect(processChartDataWithMissingMonths(undefined as never, undefined, undefined)).toEqual(
        [],
      )
    })
    it('returns data as-is for non-monthly period', () => {
      const data = [{ label: 'a', value: 1 }] as never[]
      expect(processChartDataWithMissingMonths(data, '2025-01-01', '2025-01-31', 'daily')).toEqual(
        data,
      )
    })
    it('returns data as-is when startDate or endDate missing', () => {
      const data = [{ label: 'a', value: 1 }] as never[]
      expect(processChartDataWithMissingMonths(data, undefined, '2025-01-31')).toEqual(data)
      expect(processChartDataWithMissingMonths(data, '2025-01-01', undefined)).toEqual(data)
    })
  })

  describe('processChartDataWithMissingPeriods', () => {
    it('returns [] for empty data', () => {
      expect(processChartDataWithMissingPeriods([], undefined, undefined)).toEqual([])
    })
    it('returns data as-is when startDate or endDate missing', () => {
      const data = [{ label: 'a', value: 1 }] as never[]
      expect(processChartDataWithMissingPeriods(data, undefined, '2025-01-31')).toEqual(data)
    })
  })

  describe('processSeriesDataWithMissingMonths', () => {
    it('returns [] for empty series', () => {
      expect(processSeriesDataWithMissingMonths([], undefined, undefined)).toEqual([])
    })
    it('returns series as-is for non-monthly period', () => {
      const series = [{ labels: ['a'], values: [1] }] as never[]
      expect(
        processSeriesDataWithMissingMonths(series, '2025-01-01', '2025-01-31', 'daily'),
      ).toEqual(series)
    })
  })

  describe('createChartDataProcessor', () => {
    it('returns a function that calls original processor and processes result', () => {
      const original = (_api: unknown, _opts: unknown) => ({ aggregated: [] })
      const processor = createChartDataProcessor(original)
      const result = processor(null, { startDate: '2025-01-01', endDate: '2025-01-31' })
      expect(result).toHaveProperty('aggregated')
    })
  })
})
