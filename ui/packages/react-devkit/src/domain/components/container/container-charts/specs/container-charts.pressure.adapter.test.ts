import { describe, expect, it } from 'vitest'

import type { ChartEntry } from '../container-charts.types'
import { getOverviewChartPressureAdapter } from '../container-charts.pressure.adapter'

const BITDEER_DEVICE = 'container-bd-d40-m30'
const ANTSPACE_HYDRO_DEVICE = 'container-as-hk3'
const MICROBT_DEVICE = 'container-mbt-wm30s'
const UNKNOWN_DEVICE = 'container-unknown-type'

const makeEntry = (deviceName: string, data: Record<string, number | null>): ChartEntry => ({
  ts: 1700000000,
  container_specific_stats_group_aggr: { [deviceName]: data },
})

describe('getOverviewChartPressureAdapter', () => {
  describe('null / undefined input', () => {
    it('returns empty result for null', () => {
      const result = getOverviewChartPressureAdapter(null)
      expect(result.datasets).toEqual([])
      expect(result.timeRange).toBeNull()
      expect(typeof result.yTicksFormatter).toBe('function')
      expect(result.yTicksFormatter(2.5 as never)).toEqual(String(2.5))
    })

    it('returns empty result for undefined', () => {
      const result = getOverviewChartPressureAdapter(undefined)
      expect(result.datasets).toEqual([])
    })
  })

  describe('Bitdeer device — tank pressure', () => {
    it('creates two tank datasets when both tank props exist', () => {
      const entry = makeEntry(BITDEER_DEVICE, { tank1_bar_group: 2.5, tank2_bar_group: 2.8 })
      const result = getOverviewChartPressureAdapter([entry])
      const labels = result.datasets.map((d) => d.label)
      expect(labels).toContain(`${BITDEER_DEVICE}-Pressure-Tank-1`)
      expect(labels).toContain(`${BITDEER_DEVICE}-Pressure-Tank-2`)
      expect(result.datasets).toHaveLength(2)
    })

    it('skips a tank dataset when its prop is null', () => {
      const entry = makeEntry(BITDEER_DEVICE, { tank1_bar_group: 2.5, tank2_bar_group: null })
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(`${BITDEER_DEVICE}-Pressure-Tank-1`)
    })

    it('skips all datasets when both tank props are missing', () => {
      const entry = makeEntry(BITDEER_DEVICE, {})
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })

    it('records data points for each tank', () => {
      const entry = makeEntry(BITDEER_DEVICE, { tank1_bar_group: 3.1, tank2_bar_group: 3.2 })
      const result = getOverviewChartPressureAdapter([entry])
      const tank1 = result.datasets.find((d) => d.label.includes('Tank-1'))
      expect(tank1?.data[0]).toEqual({ x: 1700000000, y: 3.1 })
    })
  })

  describe('Antspace Hydro device — supply_liquid_pressure_group', () => {
    it('creates a dataset using supply_liquid_pressure_group', () => {
      const entry = makeEntry(ANTSPACE_HYDRO_DEVICE, { supply_liquid_pressure_group: 2.9 })
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(ANTSPACE_HYDRO_DEVICE)
      expect(result.datasets[0]?.data[0]).toEqual({ x: 1700000000, y: 2.9 })
    })

    it('skips dataset when supply_liquid_pressure_group is null', () => {
      const entry = makeEntry(ANTSPACE_HYDRO_DEVICE, { supply_liquid_pressure_group: null })
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })

    it('skips dataset when supply_liquid_pressure_group is missing', () => {
      const entry = makeEntry(ANTSPACE_HYDRO_DEVICE, {})
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('MicroBT device — unit_outlet_pressure_p3_group', () => {
    it('creates a dataset using unit_outlet_pressure_p3_group', () => {
      const entry = makeEntry(MICROBT_DEVICE, { unit_outlet_pressure_p3_group: 1.8 })
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]?.label).toBe(MICROBT_DEVICE)
    })

    it('skips dataset when unit_outlet_pressure_p3_group is null', () => {
      const entry = makeEntry(MICROBT_DEVICE, { unit_outlet_pressure_p3_group: null })
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('unknown device type', () => {
    it('produces no datasets for an unknown device', () => {
      const entry = makeEntry(UNKNOWN_DEVICE, { some_pressure: 3.5 })
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('entry data object is null/undefined', () => {
    it('skips device when entryData is null', () => {
      const entry: ChartEntry = {
        ts: 1700000000,
        container_specific_stats_group_aggr: { [BITDEER_DEVICE]: null as never },
      }
      const result = getOverviewChartPressureAdapter([entry])
      expect(result.datasets).toHaveLength(0)
    })
  })

  describe('timeRange and yTicksFormatter', () => {
    it('sets timeRange from first and last entry timestamps', () => {
      const entries: ChartEntry[] = [
        makeEntry(BITDEER_DEVICE, { tank1_bar_group: 2.5 }),
        {
          ts: 1700003600,
          container_specific_stats_group_aggr: { [BITDEER_DEVICE]: { tank1_bar_group: 2.6 } },
        },
      ]
      const result = getOverviewChartPressureAdapter(entries)
      expect(result.timeRange).not.toBeNull()
    })

    it('yTicksFormatter formats value with pressure unit', () => {
      const entries: ChartEntry[] = [makeEntry(BITDEER_DEVICE, { tank1_bar_group: 2.5 })]
      const result = getOverviewChartPressureAdapter(entries)
      const formatted = result.yTicksFormatter(2.5 as never)
      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('2.5')
    })

    it('accumulates data points across multiple entries', () => {
      const entries: ChartEntry[] = [
        makeEntry(BITDEER_DEVICE, { tank1_bar_group: 2.5 }),
        {
          ts: 1700003600,
          container_specific_stats_group_aggr: { [BITDEER_DEVICE]: { tank1_bar_group: 2.6 } },
        },
      ]
      const result = getOverviewChartPressureAdapter(entries)
      const tank1 = result.datasets.find((d) => d.label.includes('Tank-1'))
      expect(tank1?.data).toHaveLength(2)
    })
  })

  describe('empty data array', () => {
    it('returns empty datasets for empty array', () => {
      const result = getOverviewChartPressureAdapter([])
      expect(result.datasets).toEqual([])
    })
  })
})
