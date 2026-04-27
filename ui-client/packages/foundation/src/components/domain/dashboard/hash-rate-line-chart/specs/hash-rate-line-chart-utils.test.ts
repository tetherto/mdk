import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HashRateLogEntry } from '../hash-rate-line-chart-utils'
import { getHashRateGraphData } from '../hash-rate-line-chart-utils'

import { CHART_COLORS, getTimeRange } from '@mdk/core'
import { WEBAPP_DISPLAY_NAME } from '../../../../../constants'
import { getHashrateString, getHashrateUnit } from '../../../../../utils/device-utils'

vi.mock('@mdk/core', () => ({
  CHART_COLORS: {
    SKY_BLUE: '#00bcd4',
  },
  getTimeRange: vi.fn(() => 'Last 24 hours'),
}))

vi.mock('../../../../../utils/device-utils', () => ({
  getHashrateString: vi.fn((value: number) => `${value} TH/s`),
  getHashrateUnit: vi.fn((value: number) => ({ value, unit: 'TH/s', realValue: value })),
}))

const makeEntry = (ts: number, hashrate?: number): HashRateLogEntry => ({
  ts,
  hashrate_mhs_1m_sum_aggr: hashrate,
})

describe('getHashRateGraphData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getHashrateString).mockImplementation((value: number) => `${value} TH/s`)
    vi.mocked(getHashrateUnit).mockImplementation((value: number) => ({
      value,
      unit: 'TH/s',
      realValue: value,
    }))
    vi.mocked(getTimeRange).mockReturnValue('Last 24 hours')
  })

  describe('return shape', () => {
    it('returns yTicksFormatter function', () => {
      const result = getHashRateGraphData([])
      expect(typeof result.yTicksFormatter).toBe('function')
    })

    it('returns currentValueLabel', () => {
      const result = getHashRateGraphData([])
      expect(result.currentValueLabel).toBeDefined()
    })

    it('returns minMaxAvg object', () => {
      const result = getHashRateGraphData([])
      expect(result.minMaxAvg).toHaveProperty('min')
      expect(result.minMaxAvg).toHaveProperty('avg')
      expect(result.minMaxAvg).toHaveProperty('max')
    })

    it('returns timeRange', () => {
      const result = getHashRateGraphData([])
      expect(result.timeRange).toBeDefined()
    })

    it('returns datasets array', () => {
      const result = getHashRateGraphData([])
      expect(Array.isArray(result.datasets)).toBe(true)
    })

    it('returns exactly one dataset', () => {
      const result = getHashRateGraphData([])
      expect(result.datasets).toHaveLength(1)
    })
  })

  describe('datasets', () => {
    it('dataset type is line', () => {
      const result = getHashRateGraphData([])
      expect(result.datasets[0].type).toBe('line')
    })

    it('dataset label includes WEBAPP_DISPLAY_NAME', () => {
      const result = getHashRateGraphData([])
      expect(result.datasets[0].label).toBe(`${WEBAPP_DISPLAY_NAME} Hash Rate`)
    })

    it(`dataset label is "${WEBAPP_DISPLAY_NAME} Hash Rate"`, () => {
      const result = getHashRateGraphData([])
      expect(result.datasets[0].label).toBe(`${WEBAPP_DISPLAY_NAME} Hash Rate`)
    })

    it('dataset borderColor is SKY_BLUE', () => {
      const result = getHashRateGraphData([])
      expect(result.datasets[0].borderColor).toBe(CHART_COLORS.SKY_BLUE)
    })

    it('dataset pointRadius is 1', () => {
      const result = getHashRateGraphData([])
      expect(result.datasets[0].pointRadius).toBe(1)
    })

    it('dataset data is empty array when no entries provided', () => {
      const result = getHashRateGraphData([])
      expect(result.datasets[0].data).toEqual([])
    })

    it('maps entries to x/y data points', () => {
      const data = [makeEntry(1000, 500), makeEntry(2000, 600)]
      const result = getHashRateGraphData(data)
      expect(result.datasets[0].data).toEqual([
        { x: 1000, y: 500 },
        { x: 2000, y: 600 },
      ])
    })

    it('uses ts as x value', () => {
      const result = getHashRateGraphData([makeEntry(9999, 100)])
      expect(result.datasets[0].data[0].x).toBe(9999)
    })

    it('uses hashrate_mhs_1m_sum_aggr as y value', () => {
      const result = getHashRateGraphData([makeEntry(1000, 777)])
      expect(result.datasets[0].data[0].y).toBe(777)
    })

    it('defaults y to 0 when hashrate_mhs_1m_sum_aggr is undefined', () => {
      const result = getHashRateGraphData([makeEntry(1000, undefined)])
      expect(result.datasets[0].data[0].y).toBe(0)
    })

    it('preserves order of data points', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 200), makeEntry(3000, 300)]
      const result = getHashRateGraphData(data)
      expect(result.datasets[0].data.map((d) => d.x)).toEqual([1000, 2000, 3000])
    })
  })

  describe('yTicksFormatter', () => {
    it('calls getHashrateString with the value', () => {
      const result = getHashRateGraphData([])
      result.yTicksFormatter(1234)
      expect(vi.mocked(getHashrateString)).toHaveBeenCalledWith(1234)
    })

    it('returns the formatted string from getHashrateString', () => {
      vi.mocked(getHashrateString).mockReturnValue('1.23 PH/s')
      const result = getHashRateGraphData([])
      expect(result.yTicksFormatter(1234)).toBe('1.23 PH/s')
    })
  })

  describe('minMaxAvg', () => {
    it('calls getHashrateString for min, avg and max', () => {
      getHashRateGraphData([makeEntry(1000, 100), makeEntry(2000, 300)])
      expect(vi.mocked(getHashrateString)).toHaveBeenCalledWith(100) // min
      expect(vi.mocked(getHashrateString)).toHaveBeenCalledWith(300) // max
      expect(vi.mocked(getHashrateString)).toHaveBeenCalledWith(200) // avg
    })

    it('calculates correct min', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 500), makeEntry(3000, 300)]
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const result = getHashRateGraphData(data)
      expect(result.minMaxAvg.min).toBe('100')
    })

    it('calculates correct max', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 500), makeEntry(3000, 300)]
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const result = getHashRateGraphData(data)
      expect(result.minMaxAvg.max).toBe('500')
    })

    it('calculates correct avg', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 200), makeEntry(3000, 300)]
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const result = getHashRateGraphData(data)
      // avg = (100 + 200 + 300) / 3 = 200
      expect(result.minMaxAvg.avg).toBe('200')
    })

    it('handles single entry — min, max and avg are all the same value', () => {
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const result = getHashRateGraphData([makeEntry(1000, 400)])
      expect(result.minMaxAvg.min).toBe('400')
      expect(result.minMaxAvg.max).toBe('400')
      expect(result.minMaxAvg.avg).toBe('400')
    })

    it('treats undefined hashrate as 0', () => {
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const result = getHashRateGraphData([makeEntry(1000, undefined)])
      expect(result.minMaxAvg.min).toBe('0')
      expect(result.minMaxAvg.max).toBe('0')
      expect(result.minMaxAvg.avg).toBe('0')
    })

    it('uses data.length=1 as divisor (not 0) for empty data', () => {
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const result = getHashRateGraphData([])
      // totalAvgHashRate=0 / (0 || 1) = 0
      expect(result.minMaxAvg.avg).toBe('0')
    })

    it('returns formatted strings from getHashrateString', () => {
      vi.mocked(getHashrateString).mockReturnValue('1.50 PH/s')
      const result = getHashRateGraphData([makeEntry(1000, 100)])
      expect(result.minMaxAvg.min).toBe('1.50 PH/s')
      expect(result.minMaxAvg.max).toBe('1.50 PH/s')
      expect(result.minMaxAvg.avg).toBe('1.50 PH/s')
    })
  })

  describe('timeRange', () => {
    it('calls getTimeRange with last ts and first ts', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 200), makeEntry(3000, 300)]
      getHashRateGraphData(data)
      expect(vi.mocked(getTimeRange)).toHaveBeenCalledWith(3000, 1000)
    })

    it('calls getTimeRange with 0, 0 when data is empty', () => {
      getHashRateGraphData([])
      expect(vi.mocked(getTimeRange)).toHaveBeenCalledWith(0, 0)
    })

    it('calls getTimeRange with same value for single entry', () => {
      getHashRateGraphData([makeEntry(5000, 100)])
      expect(vi.mocked(getTimeRange)).toHaveBeenCalledWith(5000, 5000)
    })

    it('returns value from getTimeRange', () => {
      vi.mocked(getTimeRange).mockReturnValue('Last 3 hours')
      const result = getHashRateGraphData([makeEntry(1000, 100)])
      expect(result.timeRange).toBe('Last 3 hours')
    })
  })

  describe('currentValueLabel', () => {
    it('calls getHashrateUnit with realtimeHashRateData value when provided', () => {
      const data = [makeEntry(1000, 100)]
      const realtime = makeEntry(2000, 999)
      getHashRateGraphData(data, realtime)
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledWith(999)
    })

    it('falls back to last data entry when realtimeHashRateData is not provided', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 777)]
      getHashRateGraphData(data)
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledWith(777)
    })

    it('falls back to 0 when data is empty and no realtime provided', () => {
      getHashRateGraphData([])
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledWith(0)
    })

    it('falls back to 0 when last entry hashrate is undefined and no realtime', () => {
      getHashRateGraphData([makeEntry(1000, undefined)])
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledWith(0)
    })

    it('uses realtime value even when data has entries', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 200)]
      const realtime = makeEntry(3000, 500)
      getHashRateGraphData(data, realtime)
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledWith(500)
      expect(vi.mocked(getHashrateUnit)).not.toHaveBeenCalledWith(200)
    })

    it('returns value from getHashrateUnit', () => {
      const mockUnit = { value: '1.66', unit: 'PH/s', realValue: 1660000 }
      vi.mocked(getHashrateUnit).mockReturnValue(mockUnit)
      const result = getHashRateGraphData([makeEntry(1000, 100)])
      expect(result.currentValueLabel).toEqual(mockUnit)
    })

    it('calls getHashrateUnit exactly once', () => {
      getHashRateGraphData([makeEntry(1000, 100), makeEntry(2000, 200)])
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('handles empty data array without throwing', () => {
      expect(() => getHashRateGraphData([])).not.toThrow()
    })

    it('handles data with all zero hashrates', () => {
      vi.mocked(getHashrateString).mockImplementation((v) => `${v}`)
      const data = [makeEntry(1000, 0), makeEntry(2000, 0), makeEntry(3000, 0)]
      const result = getHashRateGraphData(data)
      expect(result.minMaxAvg.min).toBe('0')
      expect(result.minMaxAvg.max).toBe('0')
      expect(result.minMaxAvg.avg).toBe('0')
    })

    it('handles large number of entries', () => {
      const data = Array.from({ length: 1000 }, (_, i) => makeEntry(i * 1000, i * 100))
      expect(() => getHashRateGraphData(data)).not.toThrow()
      expect(getHashRateGraphData(data).datasets[0].data).toHaveLength(1000)
    })

    it('handles realtimeHashRateData with undefined hashrate — falls back to last entry', () => {
      const data = [makeEntry(1000, 300)]
      const realtime: HashRateLogEntry = { ts: 2000, hashrate_mhs_1m_sum_aggr: undefined }
      getHashRateGraphData(data, realtime)
      expect(vi.mocked(getHashrateUnit)).toHaveBeenCalledWith(300)
    })

    it('handles entries with extra unknown keys', () => {
      const entry: HashRateLogEntry = {
        ts: 1000,
        hashrate_mhs_1m_sum_aggr: 500,
        extra_field: 'value',
        another: 42,
      }
      expect(() => getHashRateGraphData([entry])).not.toThrow()
      expect(getHashRateGraphData([entry]).datasets[0].data[0]).toEqual({ x: 1000, y: 500 })
    })
  })
})
