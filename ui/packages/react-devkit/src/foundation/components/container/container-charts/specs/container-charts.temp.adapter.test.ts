import { describe, expect, it } from 'vitest'

import type { ChartEntry } from '../container-charts.types'
import { getOverviewChartTempAdapter } from '../container-charts.temp.adapter'

const BITDEER_DEVICE = 'container-bd-d40-m30'
const BITMAIN_HYDRO_DEVICE = 'bitmain-hydro-h3'
const BITMAIN_DEVICE = 'bitmain-standard-s19'
const MICROBT_DEVICE = 'container-mbt-wm30s'

const makeEntry = (deviceName: string, data: Record<string, number>): ChartEntry => ({
  ts: 1700000000,
  container_specific_stats_group_aggr: { [deviceName]: data },
})

describe('getOverviewChartTempAdapter', () => {
  describe('null / undefined input', () => {
    it('returns empty result for null data', () => {
      const result = getOverviewChartTempAdapter(null, 'hot')
      expect(result.datasets).toEqual([])
      expect(result.timeRange).toBeNull()
      expect(typeof result.yTicksFormatter).toBe('function')
      expect(result.yTicksFormatter(42 as never)).toEqual(String(42))
    })

    it('returns empty result for undefined data', () => {
      const result = getOverviewChartTempAdapter(undefined, 'cold')
      expect(result.datasets).toEqual([])
    })
  })

  describe('Bitdeer device — hot prefix', () => {
    it('creates two tank datasets when both tank props exist', () => {
      const entry = makeEntry(BITDEER_DEVICE, {
        hot_temp_c_w_1_group: 55,
        hot_temp_c_w_2_group: 60,
      })
      const result = getOverviewChartTempAdapter([entry], 'hot')
      const labels = result.datasets.map((d) => d.label)
      expect(labels).toContain(`${BITDEER_DEVICE}-Temp-H-Tank-1`)
      expect(labels).toContain(`${BITDEER_DEVICE}-Temp-H-Tank-2`)
      expect(result.datasets).toHaveLength(2)
    })

    it('skips a tank dataset when its prop is null', () => {
      const entry = makeEntry(BITDEER_DEVICE, {
        hot_temp_c_w_1_group: 55,
      })
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(`${BITDEER_DEVICE}-Temp-H-Tank-1`)
    })

    it('uses cold prefix "L" for cold adapter', () => {
      const entry = makeEntry(BITDEER_DEVICE, {
        cold_temp_c_w_1_group: 30,
      })
      const result = getOverviewChartTempAdapter([entry], 'cold')
      expect(result.datasets[0]?.label).toBe(`${BITDEER_DEVICE}-Temp-L-Tank-1`)
    })

    it('skips all tanks when entry data is missing', () => {
      const entry = makeEntry(BITDEER_DEVICE, {})
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('Bitmain hydro device — supply_liquid_temp_group', () => {
    it('creates a dataset using supply_liquid_temp_group', () => {
      const entry = makeEntry(BITMAIN_HYDRO_DEVICE, { supply_liquid_temp_group: 45 })
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(BITMAIN_HYDRO_DEVICE)
      expect(result.datasets[0]?.data[0]).toEqual({ x: 1700000000, y: 45 })
    })

    it('skips dataset when supply_liquid_temp_group is null', () => {
      const entry = makeEntry(BITMAIN_HYDRO_DEVICE, { supply_liquid_temp_group: null as never })
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('Bitmain non-hydro device — primary_supply_temp_group', () => {
    it('creates a dataset using primary_supply_temp_group', () => {
      const entry = makeEntry(BITMAIN_DEVICE, { primary_supply_temp_group: 38 })
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.data[0]).toEqual({ x: 1700000000, y: 38 })
    })

    it('skips dataset when primary_supply_temp_group is null', () => {
      const entry = makeEntry(BITMAIN_DEVICE, {})
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('MicroBT device — unit_inlet_temp_t2_group', () => {
    it('creates a dataset using unit_inlet_temp_t2_group', () => {
      const entry = makeEntry(MICROBT_DEVICE, { unit_inlet_temp_t2_group: 28 })
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(MICROBT_DEVICE)
    })

    it('skips dataset when unit_inlet_temp_t2_group is null', () => {
      const entry = makeEntry(MICROBT_DEVICE, {})
      const result = getOverviewChartTempAdapter([entry], 'hot')
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('timeRange and yTicksFormatter', () => {
    it('sets timeRange from first and last entry timestamps', () => {
      const entries: ChartEntry[] = [
        makeEntry(BITDEER_DEVICE, { hot_temp_c_w_1_group: 50 }),
        {
          ts: 1700003600,
          container_specific_stats_group_aggr: { [BITDEER_DEVICE]: { hot_temp_c_w_1_group: 52 } },
        },
      ]
      const result = getOverviewChartTempAdapter(entries, 'hot')
      expect(result.timeRange).not.toBeNull()
    })

    it('yTicksFormatter formats value with temperature unit', () => {
      const entries: ChartEntry[] = [makeEntry(BITDEER_DEVICE, { hot_temp_c_w_1_group: 55 })]
      const result = getOverviewChartTempAdapter(entries, 'hot')
      const formatted = result.yTicksFormatter(55 as never)
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('55')
    })

    it('accumulates data points across multiple entries for same device', () => {
      const entries: ChartEntry[] = [
        makeEntry(BITDEER_DEVICE, { hot_temp_c_w_1_group: 50 }),
        {
          ts: 1700003600,
          container_specific_stats_group_aggr: { [BITDEER_DEVICE]: { hot_temp_c_w_1_group: 55 } },
        },
      ]
      const result = getOverviewChartTempAdapter(entries, 'hot')
      const tank1Dataset = result.datasets.find((d) => d.label.includes('Tank-1'))
      expect(tank1Dataset?.data).toHaveLength(2)
    })
  })

  describe('empty data array', () => {
    it('returns empty datasets for empty array', () => {
      const result = getOverviewChartTempAdapter([], 'hot')
      expect(result.datasets).toEqual([])
    })
  })
})
