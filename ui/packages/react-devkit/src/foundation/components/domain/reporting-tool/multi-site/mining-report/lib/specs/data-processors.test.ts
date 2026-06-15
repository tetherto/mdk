import type { LogEntry } from '../../Report.types'
import {
  applyDayLimit,
  createCostAggregator,
  createEfficiencyAggregator,
  createHashrateAggregator,
  extractNominalValues,
  findRegionBySite,
  groupLogsByPeriod,
  processAggregatedData,
  processNetworkData,
  processSortedLogs,
} from '../data-processors'

describe('data-processors', () => {
  describe('processSortedLogs', () => {
    it('flattens and sorts by ts', () => {
      const logs = [[{ ts: 200 }, { ts: 100 }], [{ ts: 150 }]]
      const result = processSortedLogs(logs as LogEntry[][])
      expect(result).toHaveLength(3)
      expect(result[0].ts).toBe(100)
      expect(result[2].ts).toBe(200)
    })
    it('applies limit when provided', () => {
      const logs = [[{ ts: 1 }, { ts: 2 }, { ts: 3 }]]
      const result = processSortedLogs(logs as LogEntry[][], 2)
      expect(result).toHaveLength(2)
      expect(result[0].ts).toBe(2)
      expect(result[1].ts).toBe(3)
    })
    it('handles null/undefined logs', () => {
      expect(processSortedLogs(null as never)).toEqual([])
    })
  })

  describe('groupLogsByPeriod', () => {
    it('groups logs by label from formatter', () => {
      const formatter = (ts: number) => new Date(ts).toISOString().slice(0, 10)
      const aggregator = {
        init: () => ({ count: 0 }),
        process: (bucket: { count: number }, _row: LogEntry) => {
          bucket.count += 1
        },
      }
      const logs = [[{ ts: 1704067200000 }, { ts: 1704067200000 }]] as LogEntry[][]
      const result = groupLogsByPeriod(logs, formatter, aggregator)
      expect(Object.keys(result).length).toBeGreaterThan(0)
    })
  })

  describe('applyDayLimit', () => {
    it('returns last N labels by ts', () => {
      const buckets = {
        a: { ts: 1 },
        b: { ts: 2 },
        c: { ts: 3 },
      }
      const result = applyDayLimit(buckets, 2)
      expect(result).toHaveLength(2)
      expect(result).toContain('c')
      expect(result).toContain('b')
    })
  })

  describe('createHashrateAggregator', () => {
    it('init returns phsSum and usdSum 0', () => {
      const agg = createHashrateAggregator()
      expect(agg.init()).toEqual({ phsSum: 0, usdSum: 0 })
    })
    it('process updates bucket', () => {
      const agg = createHashrateAggregator()
      const bucket = { ts: 0, ...agg.init() }
      agg.process(bucket, {
        ts: 100,
        hashrateMHS: 1e9,
        currentBTCPrice: 50000,
        hashRevenueBTC_PHS_d: 0.1,
        hashRevenueUSD_PHS_d: 5000,
      } as LogEntry)
      expect(bucket.phsSum).toBe(1)
      expect(bucket.ts).toBe(100)
    })
  })

  describe('createCostAggregator', () => {
    it('init returns cost structure', () => {
      const agg = createCostAggregator()
      const init = agg.init()
      expect(init.energyCost).toBe(0)
      expect(init.count).toBe(0)
    })
  })

  describe('createEfficiencyAggregator', () => {
    it('init returns efficiencySum and count', () => {
      const agg = createEfficiencyAggregator()
      expect(agg.init()).toEqual({ efficiencySum: 0, count: 0 })
    })
  })

  describe('processNetworkData', () => {
    it('returns map of ts to usd and phs', () => {
      const logs = [
        {
          ts: 1000,
          hashrateMHS: 1e9,
          hashRevenueBTC_PHS_d: 0.01,
          currentBTCPrice: 50000,
          hashRevenueUSD_PHS_d: 500,
        },
      ] as LogEntry[]
      const result = processNetworkData(logs)
      expect(result[1000]).toBeDefined()
      expect(result[1000].phs).toBe(1)
      expect(result[1000].usd).toBe(500)
    })
  })

  describe('processAggregatedData', () => {
    it('returns slice when no start/end and fallbackLimit applied', () => {
      const byLabel = { '01-01': { producedBTC: 1 } }
      const result = processAggregatedData(byLabel, ['01-01', '01-02'], 'daily', null, null, 5)
      expect(result.length).toBe(2)
    })
  })

  describe('findRegionBySite', () => {
    it('returns null when siteCode or api missing', () => {
      expect(findRegionBySite(null, 'site1')).toBeNull()
      expect(findRegionBySite({ regions: [] } as never, null)).toBeNull()
    })
    it('returns region when match found', () => {
      const api = { regions: [{ region: 'site1', nominalHashrate: 100 }] }
      const result = findRegionBySite(api as never, 'site1')
      expect(result?.region).toBe('site1')
    })
  })

  describe('extractNominalValues', () => {
    it('returns zeros when region null', () => {
      const result = extractNominalValues(null)
      expect(result).toEqual({ hashratePHs: 0, efficiency: 0, minerCapacity: 0 })
    })
    it('returns extracted values from region', () => {
      const region = {
        nominalHashrate: 1e15,
        nominalEfficiency: 50,
        nominalMinerCapacity: 100,
      }
      const result = extractNominalValues(region as never)
      expect(result.hashratePHs).toBe(1)
      expect(result.efficiency).toBe(50)
      expect(result.minerCapacity).toBe(100)
    })
  })
})
