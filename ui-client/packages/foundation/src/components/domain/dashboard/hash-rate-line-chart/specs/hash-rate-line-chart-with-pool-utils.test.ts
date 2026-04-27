import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HashRateDataPoint, HashRateLogEntry } from '../hash-rate-line-chart-utils'
import type {
  MinerPoolDataItem,
  PoolStat,
} from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-utils'
import {
  buildChartData,
  buildLegends,
  calculateAggrPoolData,
  calculateMinMaxAvg,
  calculateTimeRange,
  downsampleToTimeline,
  extractUniquePoolTypes,
  filterAndDownsampleMinerPoolData,
  getHashRateTimeRange,
  getMajorDatasetItems,
  getThresholdKey,
  normalizeDatasets,
  transformHashRateData,
} from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-utils'

import { decimalToMegaNumber, getTimeRange } from '@mdk/core'
import type { Timeline } from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-constants'
import { WEBAPP_DISPLAY_NAME } from '../../../../../constants'

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    CHART_COLORS: {
      SKY_BLUE: '#00bcd4',
      METALLIC_BLUE: '#4682b4',
      purple: '#9c27b0',
    },
    decimalToMegaNumber: vi.fn((v: number) => v * 1000),
    getTimeRange: vi.fn(() => 'Last 24 hours'),
  }
})

vi.mock('../../../../../../utils/device-utils', () => ({
  getHashrateString: vi.fn((v: number) => `${v} TH/s`),
}))

vi.mock('../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-constants', () => ({
  SITE_OPERATION_CHART_COLORS: ['#color0', '#color1', '#color2', '#color3'],
  TIMELINE_INTERVAL_MS: {
    '5m': 5 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '3h': 3 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
  },
  TIMELINE_TO_THRESHOLD_KEY: {
    '5m': 'M5',
    '30m': 'M30',
    '3h': 'H3',
    '1D': 'D1',
  },
}))

const makePoolStat = (poolType: string, hashrate: number): PoolStat => ({ poolType, hashrate })

const makeMinerPoolItem = (ts: number | string, stats: PoolStat[]): MinerPoolDataItem => ({
  ts,
  stats,
})

const makeDataPoint = (x: number, y: number): HashRateDataPoint => ({ x, y })

const makeEntry = (ts: number, hashrate?: number): HashRateLogEntry => ({
  ts,
  hashrate_mhs_1m_sum_aggr: hashrate,
})

const makeLegend = (label: string, color: string, poolType?: string): Legend => ({
  label,
  color,
  ...(poolType && { poolType }),
})

describe('hash-rate-line-chart-with-pool-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('downsampleToTimeline', () => {
    it('returns empty array for empty input', () => {
      expect(downsampleToTimeline([], '5m')).toEqual([])
    })

    it('returns empty array for null-like input', () => {
      expect(downsampleToTimeline(null as unknown as MinerPoolDataItem[], '5m')).toEqual([])
    })

    it('deduplicates by ts for M5 timeline', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(1000, [makePoolStat('f2', 200)]),
        makeMinerPoolItem(2000, [makePoolStat('f2', 300)]),
      ]
      const result = downsampleToTimeline(data, '5m')
      expect(result).toHaveLength(2)
    })

    it('sorts by ts for M5 timeline', () => {
      const data = [
        makeMinerPoolItem(3000, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(1000, [makePoolStat('f2', 200)]),
        makeMinerPoolItem(2000, [makePoolStat('f2', 300)]),
      ]
      const result = downsampleToTimeline(data, '5m')
      expect(result.map((r) => Number(r.ts))).toEqual([1000, 2000, 3000])
    })

    it('buckets data by interval for non-M5 timelines', () => {
      const intervalMs = 30 * 60 * 1000
      const base = Math.floor(Date.now() / intervalMs) * intervalMs
      const data = [
        makeMinerPoolItem(base, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(base + 1000, [makePoolStat('f2', 200)]),
        makeMinerPoolItem(base + intervalMs, [makePoolStat('f2', 300)]),
      ]
      const result = downsampleToTimeline(data, '30m')
      expect(result).toHaveLength(2)
    })

    it('averages hashrates within the same bucket', () => {
      const intervalMs = 30 * 60 * 1000
      const base = Math.floor(1_000_000 / intervalMs) * intervalMs
      const data = [
        makeMinerPoolItem(base, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(base + 1000, [makePoolStat('f2', 300)]),
      ]
      const result = downsampleToTimeline(data, '30m')
      expect(result[0].stats[0].hashrate).toBe(200)
    })

    it('sorts buckets by ts ascending', () => {
      const intervalMs = 30 * 60 * 1000
      const base1 = 2 * intervalMs
      const base2 = intervalMs
      const data = [
        makeMinerPoolItem(base1, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(base2, [makePoolStat('f2', 200)]),
      ]
      const result = downsampleToTimeline(data, '30m')
      expect(Number(result[0].ts)).toBeLessThan(Number(result[1].ts))
    })

    it('handles single item for non-M5 timeline', () => {
      const data = [makeMinerPoolItem(5000, [makePoolStat('f2', 100)])]
      const result = downsampleToTimeline(data, '30m')
      expect(result).toHaveLength(1)
    })
  })

  describe('getMajorDatasetItems', () => {
    it('returns empty array when majorData is undefined', () => {
      const legend = makeLegend('TestPool Hash Rate', '#ff0000', 'test_pool')
      expect(getMajorDatasetItems(undefined, legend)).toEqual([])
    })

    it('returns empty array when majorData is empty', () => {
      const legend = makeLegend('TestPool Hash Rate', '#ff0000', 'test_pool')
      expect(getMajorDatasetItems([], legend)).toEqual([])
    })

    it('maps ts to x', () => {
      const legend = makeLegend('TestPool Hash Rate', '#ff0000', 'test_pool')
      const data = [makeMinerPoolItem(9999, [makePoolStat('test_pool', 100)])]
      const result = getMajorDatasetItems(data, legend)
      expect(result[0].x).toBe(9999)
    })

    it('calls decimalToMegaNumber with matching pool hashrate', () => {
      const legend = makeLegend('TestPool Hash Rate', '#ff0000', 'test_pool')
      const data = [makeMinerPoolItem(1000, [makePoolStat('test_pool', 500)])]
      getMajorDatasetItems(data, legend)
      expect(decimalToMegaNumber).toHaveBeenCalledWith(500)
    })

    it('defaults hashrate to 0 when pool type not found', () => {
      const legend = makeLegend('Antpool Hash Rate', '#ff0000', 'antpool')
      const data = [makeMinerPoolItem(1000, [makePoolStat('test_pool', 500)])]
      getMajorDatasetItems(data, legend)
      expect(decimalToMegaNumber).toHaveBeenCalledWith(0)
    })

    it('returns correct y from decimalToMegaNumber', () => {
      decimalToMegaNumber.mockReturnValue(500_000)
      const legend = makeLegend('TestPool Hash Rate', '#ff0000', 'test_pool')
      const data = [makeMinerPoolItem(1000, [makePoolStat('test_pool', 500)])]
      const result = getMajorDatasetItems(data, legend)
      expect(result[0].y).toBe(500_000)
    })

    it('maps multiple items correctly', () => {
      const legend = makeLegend('TestPool Hash Rate', '#ff0000', 'test_pool')
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('test_pool', 100)]),
        makeMinerPoolItem(2000, [makePoolStat('test_pool', 200)]),
      ]
      const result = getMajorDatasetItems(data, legend)
      expect(result).toHaveLength(2)
      expect(result[0].x).toBe(1000)
      expect(result[1].x).toBe(2000)
    })
  })

  describe('normalizeDatasets', () => {
    it('returns empty array for empty input', () => {
      expect(normalizeDatasets([], {})).toEqual([])
    })

    it('deduplicates data points by x', () => {
      const datasets = [
        {
          label: 'A',
          color: '#ff0000',
          data: [makeDataPoint(1, 100), makeDataPoint(1, 200), makeDataPoint(2, 300)],
        },
      ]
      const result = normalizeDatasets(datasets, {})
      expect(result[0].data).toHaveLength(2)
    })

    it('sorts data points by x ascending', () => {
      const datasets = [
        {
          label: 'A',
          color: '#ff0000',
          data: [makeDataPoint(3, 300), makeDataPoint(1, 100), makeDataPoint(2, 200)],
        },
      ]
      const result = normalizeDatasets(datasets, {})
      expect(result[0].data.map((d) => d.x)).toEqual([1, 2, 3])
    })

    it('sets borderColor from dataset color', () => {
      const datasets = [{ label: 'A', color: '#ff0000', data: [] }]
      const result = normalizeDatasets(datasets, {})
      expect(result[0].borderColor).toBe('#ff0000')
    })

    it('falls back to SKY_BLUE when color is undefined', () => {
      const datasets = [{ label: 'A', color: undefined as unknown as string, data: [] }]
      const result = normalizeDatasets(datasets, {})
      expect(result[0].borderColor).toBe('#00bcd4')
    })

    it('sets visible=true when label is not in legendHidden', () => {
      const datasets = [{ label: 'A', color: '#ff0000', data: [] }]
      const result = normalizeDatasets(datasets, {})
      expect(result[0].visible).toBe(true)
    })

    it('sets visible=false when label is in legendHidden', () => {
      const datasets = [{ label: 'A', color: '#ff0000', data: [] }]
      const result = normalizeDatasets(datasets, { A: true })
      expect(result[0].visible).toBe(false)
    })

    it('handles dataset with undefined data', () => {
      const datasets = [{ label: 'A', color: '#ff0000', data: undefined }]
      const result = normalizeDatasets(datasets, {})
      expect(result[0].data).toEqual([])
    })

    it('processes multiple datasets independently', () => {
      const datasets = [
        { label: 'A', color: '#ff0000', data: [makeDataPoint(1, 100)] },
        { label: 'B', color: '#00ff00', data: [makeDataPoint(2, 200)] },
      ]
      const result = normalizeDatasets(datasets, { B: true })
      expect(result[0].visible).toBe(true)
      expect(result[1].visible).toBe(false)
    })
  })

  describe('getThresholdKey', () => {
    it('returns M5 for 5m timeline', () => {
      expect(getThresholdKey('5m')).toBe('M5')
    })

    it('returns M30 for 30m timeline', () => {
      expect(getThresholdKey('30m')).toBe('M30')
    })

    it('returns H3 for 3h timeline', () => {
      expect(getThresholdKey('3h')).toBe('H3')
    })

    it('returns D1 for 1D timeline', () => {
      expect(getThresholdKey('1D')).toBe('D1')
    })

    it('falls back to M5 for unknown timeline', () => {
      expect(getThresholdKey('unknown' as Timeline)).toBe('5m')
    })
  })

  describe('getHashRateTimeRange', () => {
    it('returns null for empty array', () => {
      expect(getHashRateTimeRange([])).toBeNull()
    })

    it('returns null when all timestamps are 0', () => {
      expect(getHashRateTimeRange([makeEntry(0)])).toBeNull()
    })

    it('returns correct start as min timestamp', () => {
      const result = getHashRateTimeRange([makeEntry(1000), makeEntry(3000), makeEntry(2000)])
      expect(result?.start).toBe(1000)
    })

    it('returns correct end as max timestamp', () => {
      const result = getHashRateTimeRange([makeEntry(1000), makeEntry(3000), makeEntry(2000)])
      expect(result?.end).toBe(3000)
    })

    it('returns correct range for single entry', () => {
      const result = getHashRateTimeRange([makeEntry(5000)])
      expect(result?.start).toBe(5000)
      expect(result?.end).toBe(5000)
    })

    it('filters out zero timestamps', () => {
      const result = getHashRateTimeRange([makeEntry(0), makeEntry(1000), makeEntry(2000)])
      expect(result?.start).toBe(1000)
    })

    it('handles nested array (first item is array)', () => {
      const nested = [[makeEntry(1000), makeEntry(2000)]] as unknown as HashRateLogEntry[][]
      const result = getHashRateTimeRange(nested)
      expect(result?.start).toBe(1000)
      expect(result?.end).toBe(2000)
    })
  })

  describe('filterAndDownsampleMinerPoolData', () => {
    it('returns undefined when minerPoolData is undefined', () => {
      expect(filterAndDownsampleMinerPoolData(undefined, null, '5m')).toBeUndefined()
    })

    it('returns all data when hashRateTimeRange is null', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(2000, [makePoolStat('f2', 200)]),
      ]
      const result = filterAndDownsampleMinerPoolData(data, null, '5m')
      expect(result).toHaveLength(2)
    })

    it('filters data outside time range', () => {
      const data = [
        makeMinerPoolItem(500, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(1500, [makePoolStat('f2', 200)]),
        makeMinerPoolItem(3000, [makePoolStat('f2', 300)]),
      ]
      const result = filterAndDownsampleMinerPoolData(data, { start: 1000, end: 2000 }, '5m')
      expect(result).toHaveLength(1)
      expect(Number(result![0].ts)).toBe(1500)
    })

    it('includes items exactly at start and end boundaries', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(2000, [makePoolStat('f2', 200)]),
      ]
      const result = filterAndDownsampleMinerPoolData(data, { start: 1000, end: 2000 }, '5m')
      expect(result).toHaveLength(2)
    })

    it('passes filtered data through downsampleToTimeline', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('f2', 100)]),
        makeMinerPoolItem(1000, [makePoolStat('f2', 200)]),
      ]
      const result = filterAndDownsampleMinerPoolData(data, null, '5m')
      expect(result).toHaveLength(1)
    })
  })

  describe('transformHashRateData', () => {
    it('returns empty array for empty input', () => {
      expect(transformHashRateData([])).toEqual([])
    })

    it('maps ts to x', () => {
      const result = transformHashRateData([makeEntry(1000, 500)])
      expect(result[0].x).toBe(1000)
    })

    it('maps hashrate_mhs_1m_sum_aggr to y', () => {
      const result = transformHashRateData([makeEntry(1000, 500)])
      expect(result[0].y).toBe(500)
    })

    it('defaults y to 0 when hashrate is undefined', () => {
      const result = transformHashRateData([makeEntry(1000, undefined)])
      expect(result[0].y).toBe(0)
    })

    it('defaults x to 0 when ts is undefined', () => {
      const entry = { hashrate_mhs_1m_sum_aggr: 100 } as unknown as HashRateLogEntry
      const result = transformHashRateData([entry])
      expect(result[0].x).toBe(0)
    })

    it('handles multiple entries', () => {
      const data = [makeEntry(1000, 100), makeEntry(2000, 200), makeEntry(3000, 300)]
      const result = transformHashRateData(data)
      expect(result).toHaveLength(3)
      expect(result.map((r) => r.x)).toEqual([1000, 2000, 3000])
    })

    it('handles nested array input', () => {
      const nested = [
        [makeEntry(1000, 100), makeEntry(2000, 200)],
      ] as unknown as HashRateLogEntry[][]
      const result = transformHashRateData(nested)
      expect(result).toHaveLength(2)
    })
  })

  describe('calculateAggrPoolData', () => {
    it('returns empty array when minerPoolData is undefined', () => {
      expect(calculateAggrPoolData(undefined)).toEqual([])
    })

    it('returns empty array for empty input', () => {
      expect(calculateAggrPoolData([])).toEqual([])
    })

    it('maps ts to x', () => {
      const data = [makeMinerPoolItem(1000, [makePoolStat('f2', 100)])]
      const result = calculateAggrPoolData(data)
      expect(result[0].x).toBe(1000)
    })

    it('sums all pool hashrates per item', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('f2', 100), makePoolStat('antpool', 200)]),
      ]
      calculateAggrPoolData(data)
      expect(decimalToMegaNumber).toHaveBeenCalledWith(300)
    })

    it('returns y from decimalToMegaNumber', () => {
      decimalToMegaNumber.mockReturnValue(999_000)
      const data = [makeMinerPoolItem(1000, [makePoolStat('f2', 100)])]
      const result = calculateAggrPoolData(data)
      expect(result[0].y).toBe(999_000)
    })

    it('handles items with empty stats', () => {
      const data = [makeMinerPoolItem(1000, [])]
      calculateAggrPoolData(data)
      expect(decimalToMegaNumber).toHaveBeenCalledWith(0)
    })
  })

  describe('calculateMinMaxAvg', () => {
    it('returns empty object for empty data', () => {
      expect(calculateMinMaxAvg([])).toEqual({})
    })

    it('calculates correct min', () => {
      const result = calculateMinMaxAvg([
        makeDataPoint(1, 100),
        makeDataPoint(2, 500),
        makeDataPoint(3, 300),
      ])
      expect(result.min).toBe('100 MH/s')
    })

    it('calculates correct max', () => {
      const result = calculateMinMaxAvg([
        makeDataPoint(1, 100),
        makeDataPoint(2, 500),
        makeDataPoint(3, 300),
      ])
      expect(result.max).toBe('500 MH/s')
    })

    it('calculates correct avg', () => {
      const result = calculateMinMaxAvg([
        makeDataPoint(1, 100),
        makeDataPoint(2, 200),
        makeDataPoint(3, 300),
      ])
      expect(result.avg).toBe('200 MH/s')
    })

    it('handles single data point — min, max and avg are equal', () => {
      const result = calculateMinMaxAvg([makeDataPoint(1, 400)])
      expect(result.min).toBe('400 MH/s')
      expect(result.max).toBe('400 MH/s')
      expect(result.avg).toBe('400 MH/s')
    })

    it('guards against MAX_SAFE_INTEGER min when y is always 0', () => {
      const result = calculateMinMaxAvg([makeDataPoint(1, 0)])
      expect(result.min).toBe('0 MH/s')
    })

    it('guards against MIN_SAFE_INTEGER max when y is always 0', () => {
      const result = calculateMinMaxAvg([makeDataPoint(1, 0)])
      expect(result.max).toBe('0 MH/s')
    })
  })

  describe('calculateTimeRange', () => {
    it('calls getTimeRange with last and first x values', () => {
      const data = [makeDataPoint(1000, 100), makeDataPoint(2000, 200), makeDataPoint(3000, 300)]
      calculateTimeRange(data)
      expect(getTimeRange).toHaveBeenCalledWith(3000, 1000)
    })

    it('calls getTimeRange with 0, 0 for empty data', () => {
      calculateTimeRange([])
      expect(getTimeRange).toHaveBeenCalledWith(0, 0)
    })

    it('calls getTimeRange with same value for single entry', () => {
      calculateTimeRange([makeDataPoint(5000, 100)])
      expect(getTimeRange).toHaveBeenCalledWith(5000, 5000)
    })

    it('returns value from getTimeRange', () => {
      expect(calculateTimeRange([makeDataPoint(1000, 100)])).toBe('Last 24 hours')
    })
  })

  describe('extractUniquePoolTypes', () => {
    it('returns empty array when minerPoolData is undefined', () => {
      expect(extractUniquePoolTypes(undefined)).toEqual([])
    })

    it('returns empty array for empty input', () => {
      expect(extractUniquePoolTypes([])).toEqual([])
    })

    it('returns unique pool types', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('test_pool', 100), makePoolStat('antpool', 200)]),
        makeMinerPoolItem(2000, [makePoolStat('test_pool', 300)]),
      ]
      const result = extractUniquePoolTypes(data)
      expect(result).toEqual(['test_pool', 'antpool'])
    })

    it('deduplicates pool types across items', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('test_pool', 100)]),
        makeMinerPoolItem(2000, [makePoolStat('test_pool', 200)]),
      ]
      const result = extractUniquePoolTypes(data)
      expect(result).toHaveLength(1)
    })

    it('ignores empty poolType strings', () => {
      const data = [
        makeMinerPoolItem(1000, [makePoolStat('', 100), makePoolStat('test_pool', 200)]),
      ]
      const result = extractUniquePoolTypes(data)
      expect(result).not.toContain('')
    })

    it('handles items with empty stats arrays', () => {
      const data = [makeMinerPoolItem(1000, [])]
      expect(extractUniquePoolTypes(data)).toEqual([])
    })
  })

  describe('buildLegends', () => {
    it('returns empty array when hasData is false', () => {
      expect(buildLegends(['test_pool'], false)).toEqual([])
    })

    it('returns only default legend when no pool types', () => {
      const result = buildLegends([], true)
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe(`${WEBAPP_DISPLAY_NAME} Hash Rate`)
    })

    it('default legend has SKY_BLUE color', () => {
      const result = buildLegends([], true)
      expect(result[0].color).toBe('#00bcd4')
    })

    it('returns default + aggr + pool legends when pool types present', () => {
      const result = buildLegends(['test_pool'], true)
      expect(result).toHaveLength(3)
    })

    it('aggr legend has METALLIC_BLUE color', () => {
      const result = buildLegends(['test_pool'], true)
      expect(result[1].color).toBe('#4682b4')
      expect(result[1].label).toBe('Aggr Pool Hash Rate')
    })

    it('capitalizes first letter of pool type label', () => {
      const result = buildLegends(['test_pool'], true)
      expect(result[2].label).toBe('Test_pool Hash Rate')
    })

    it('sets poolType on pool legend', () => {
      const result = buildLegends(['test_pool'], true)
      expect(result[2].poolType).toBe('test_pool')
    })

    it('assigns SITE_OPERATION_CHART_COLORS offset by 1', () => {
      const result = buildLegends(['test_pool'], true)
      expect(result[2].color).toBe('#color1')
    })

    it('handles multiple pool types', () => {
      const result = buildLegends(['test_pool', 'antpool'], true)
      expect(result).toHaveLength(4)
    })

    it('falls back to purple when SITE_OPERATION_CHART_COLORS index out of range', () => {
      const result = buildLegends(['a', 'b', 'c', 'd', 'e'], true)
      const lastPool = result[result.length - 1]
      expect(lastPool.color).toBe('#9c27b0')
    })
  })

  describe('buildChartData', () => {
    const hashRateData = [makeDataPoint(1000, 100)]
    const aggrPoolData = [makeDataPoint(2000, 200)]
    const minerPoolData = [makeMinerPoolItem(1000, [makePoolStat('test_pool', 100)])]

    const defaultLegend = makeLegend(`${WEBAPP_DISPLAY_NAME} Hash Rate`, '#00bcd4')
    const aggrLegend = makeLegend('Aggr Pool Hash Rate', '#4682b4')
    const poolLegend = makeLegend('Test_pool Hash Rate', '#color1', 'test_pool')

    it('returns datasets array', () => {
      const result = buildChartData({
        legends: [defaultLegend],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: {},
        timeRange: 'Last 24 hours',
      })
      expect(Array.isArray(result.datasets)).toBe(true)
    })

    it('assigns hashRateData to first legend (index 0)', () => {
      const result = buildChartData({
        legends: [defaultLegend],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: {},
        timeRange: 'Last 24 hours',
      })
      expect(result.datasets[0].data).toEqual(hashRateData)
    })

    it('assigns aggrPoolData to second legend (index 1)', () => {
      const result = buildChartData({
        legends: [defaultLegend, aggrLegend],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: {},
        timeRange: 'Last 24 hours',
      })
      expect(result.datasets[1].data).toEqual(aggrPoolData)
    })

    it('uses getMajorDatasetItems for legends beyond index 1', () => {
      const result = buildChartData({
        legends: [defaultLegend, aggrLegend, poolLegend],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: {},
        timeRange: 'Last 24 hours',
      })
      expect(result.datasets[2].data).toBeDefined()
    })

    it('passes timeRange through to result', () => {
      const result = buildChartData({
        legends: [defaultLegend],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: {},
        timeRange: 'Last 3 hours',
      })
      expect(result.timeRange).toBe('Last 3 hours')
    })

    it('respects legendHidden for visibility', () => {
      const result = buildChartData({
        legends: [defaultLegend],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: { [`${WEBAPP_DISPLAY_NAME} Hash Rate`]: true },
        timeRange: 'Last 24 hours',
      })
      expect(result.datasets[0].visible).toBe(false)
    })

    it('returns empty datasets when legends is empty', () => {
      const result = buildChartData({
        legends: [],
        hashRateData,
        aggrPoolData,
        minerPoolData,
        legendHidden: {},
        timeRange: 'Last 24 hours',
      })
      expect(result.datasets).toEqual([])
    })
  })
})
