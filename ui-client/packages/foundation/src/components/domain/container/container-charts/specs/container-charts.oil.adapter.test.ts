import { describe, expect, it } from 'vitest'

import type { ChartEntry } from '../container-charts.types'
import { getOverviewChartOilAdapter } from '../container-charts.oil.adapter'

const BITDEER_DEVICE = 'container-bd-d40-m30'
const ANTSPACE_IMM_DEVICE = 'container-as-immersion-v2'
const UNKNOWN_DEVICE = 'container-unknown-type'

const makeEntry = (deviceName: string, data: Record<string, number | null>): ChartEntry => ({
  ts: 1700000000,
  container_specific_stats_group_aggr: { [deviceName]: data },
})

describe('getOverviewChartOilAdapter', () => {
  describe('null / undefined input', () => {
    it('returns empty result for null', () => {
      const result = getOverviewChartOilAdapter(null)
      expect(result.datasets).toEqual([])
      expect(result.timeRange).toBeNull()
      expect(typeof result.yTicksFormatter).toBe('function')
      expect(result.yTicksFormatter(80 as never)).toEqual(String(80))
    })

    it('returns empty result for undefined', () => {
      const result = getOverviewChartOilAdapter(undefined)
      expect(result.datasets).toEqual([])
    })
  })

  describe('Bitdeer device — cold oil temperature', () => {
    it('creates two tank datasets when both tank props exist', () => {
      const entry = makeEntry(BITDEER_DEVICE, {
        cold_temp_c_1_group: 45,
        cold_temp_c_2_group: 48,
      })
      const result = getOverviewChartOilAdapter([entry])
      const labels = result.datasets.map((d) => d.label)
      expect(labels).toContain(`${BITDEER_DEVICE}-Oil-Tank-1`)
      expect(labels).toContain(`${BITDEER_DEVICE}-Oil-Tank-2`)
      expect(result.datasets).toHaveLength(2)
    })

    it('skips a tank dataset when its prop is null', () => {
      const entry = makeEntry(BITDEER_DEVICE, {
        cold_temp_c_1_group: 45,
        cold_temp_c_2_group: null,
      })
      const result = getOverviewChartOilAdapter([entry])
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(`${BITDEER_DEVICE}-Oil-Tank-1`)
    })

    it('skips all datasets when both tank props are missing', () => {
      const entry = makeEntry(BITDEER_DEVICE, {})
      const result = getOverviewChartOilAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })

    it('records data points for each tank', () => {
      const entry = makeEntry(BITDEER_DEVICE, { cold_temp_c_1_group: 45, cold_temp_c_2_group: 47 })
      const result = getOverviewChartOilAdapter([entry])
      const tank1 = result.datasets.find((d) => d.label.includes('Tank-1'))
      expect(tank1?.data[0]).toEqual({ x: 1700000000, y: 45 })
    })
  })

  describe('Antspace Immersion device — second supply temperature', () => {
    it('creates two supply datasets when both props exist', () => {
      const entry = makeEntry(ANTSPACE_IMM_DEVICE, {
        second_supply_temp1_group: 60,
        second_supply_temp2_group: 62,
      })
      const result = getOverviewChartOilAdapter([entry])
      const labels = result.datasets.map((d) => d.label)
      expect(labels).toContain(`${ANTSPACE_IMM_DEVICE}-Oil-temp-1`)
      expect(labels).toContain(`${ANTSPACE_IMM_DEVICE}-Oil-temp-2`)
      expect(result.datasets).toHaveLength(2)
    })

    it('skips a supply dataset when its prop is null', () => {
      const entry = makeEntry(ANTSPACE_IMM_DEVICE, {
        second_supply_temp1_group: 60,
        second_supply_temp2_group: null,
      })
      const result = getOverviewChartOilAdapter([entry])
      expect(result.datasets).toHaveLength(1)
    })

    it('skips all datasets when both supply props are missing', () => {
      const entry = makeEntry(ANTSPACE_IMM_DEVICE, {})
      const result = getOverviewChartOilAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })

    it('records data points for each supply', () => {
      const entry = makeEntry(ANTSPACE_IMM_DEVICE, {
        second_supply_temp1_group: 60,
        second_supply_temp2_group: 62,
      })
      const result = getOverviewChartOilAdapter([entry])
      const supply1 = result.datasets.find((d) => d.label.includes('temp-1'))
      expect(supply1?.data[0]).toEqual({ x: 1700000000, y: 60 })
    })
  })

  describe('unknown device type', () => {
    it('produces no datasets for an unknown device', () => {
      const entry = makeEntry(UNKNOWN_DEVICE, { some_temp: 50 })
      const result = getOverviewChartOilAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('entry data object is falsy', () => {
    it('skips device when entryData is null', () => {
      const entry: ChartEntry = {
        ts: 1700000000,
        container_specific_stats_group_aggr: { [BITDEER_DEVICE]: null as never },
      }
      const result = getOverviewChartOilAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('timeRange and yTicksFormatter', () => {
    it('sets timeRange from first and last entry timestamps', () => {
      const entries: ChartEntry[] = [
        makeEntry(BITDEER_DEVICE, { cold_temp_c_1_group: 45 }),
        {
          ts: 1700003600,
          container_specific_stats_group_aggr: { [BITDEER_DEVICE]: { cold_temp_c_1_group: 46 } },
        },
      ]
      const result = getOverviewChartOilAdapter(entries)
      expect(result.timeRange).not.toBeNull()
    })

    it('yTicksFormatter formats value with temperature unit', () => {
      const entries: ChartEntry[] = [makeEntry(BITDEER_DEVICE, { cold_temp_c_1_group: 45 })]
      const result = getOverviewChartOilAdapter(entries)
      const formatted = result.yTicksFormatter(45 as never)
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('45')
    })

    it('accumulates data points across multiple entries for same device', () => {
      const entries: ChartEntry[] = [
        makeEntry(BITDEER_DEVICE, { cold_temp_c_1_group: 45 }),
        {
          ts: 1700003600,
          container_specific_stats_group_aggr: { [BITDEER_DEVICE]: { cold_temp_c_1_group: 46 } },
        },
      ]
      const result = getOverviewChartOilAdapter(entries)
      const tank1 = result.datasets.find((d) => d.label.includes('Tank-1'))
      expect(tank1?.data).toHaveLength(2)
    })
  })

  describe('empty data array', () => {
    it('returns empty datasets for empty array', () => {
      const result = getOverviewChartOilAdapter([])
      expect(result.datasets).toEqual([])
    })
  })
})
