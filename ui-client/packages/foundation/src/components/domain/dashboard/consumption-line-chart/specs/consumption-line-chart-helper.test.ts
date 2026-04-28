import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildConsumptionData,
  getNestedValue,
  getPowerBEAttribute,
} from '../consumption-line-chart-helper'

import { formatUnit, UNITS } from '@tetherto/mdk-core-ui'
import { formatPowerConsumption, removeContainerPrefix } from '../../../../../utils/device-utils'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    ConsumptionIcon: vi.fn(() => null),
    CHART_COLORS: { SKY_BLUE: '#87ceeb' },
    formatUnit: vi.fn((v: any) => `${v.value}${v.unit}`),
  }
})

vi.mock('../../../../../utils/device-utils', () => ({
  formatPowerConsumption: vi.fn((w: number) => ({ value: w / 1000, unit: UNITS.POWER_KW })),
  removeContainerPrefix: vi.fn((tag: string) => tag.replace('container-', '')),
}))

describe('ConsumptionLineChartHelper', () => {
  describe('getPowerBEAttribute', () => {
    it('returns container_power_w_aggr path for container tags', () => {
      vi.mocked(removeContainerPrefix).mockReturnValue('BBR-01')
      expect(getPowerBEAttribute('container-BBR-01')).toBe('container_power_w_aggr.BBR-01')
    })

    it('calls removeContainerPrefix with the tag', () => {
      vi.mocked(removeContainerPrefix).mockReturnValue('BBR-01')
      getPowerBEAttribute('container-BBR-01')
      expect(removeContainerPrefix).toHaveBeenCalledWith('container-BBR-01')
    })

    it('returns transformer_power_w when totalTransformerConsumption is true', () => {
      expect(getPowerBEAttribute('some-tag', true)).toBe('transformer_power_w')
    })

    it('returns site_power_w for powermeter tags', () => {
      expect(getPowerBEAttribute('powermeter-main')).toBe('site_power_w')
    })

    it('returns power_w_sum_aggr as default', () => {
      expect(getPowerBEAttribute('t-miner')).toBe('power_w_sum_aggr')
    })

    it('container check takes priority over powermeter', () => {
      vi.mocked(removeContainerPrefix).mockReturnValue('BBR-01')
      expect(getPowerBEAttribute('container-powermeter-BBR-01')).toBe(
        'container_power_w_aggr.BBR-01',
      )
    })

    it('container check takes priority over totalTransformerConsumption', () => {
      vi.mocked(removeContainerPrefix).mockReturnValue('BBR-01')
      expect(getPowerBEAttribute('container-BBR-01', true)).toBe('container_power_w_aggr.BBR-01')
    })
  })

  describe('getNestedValue', () => {
    it('returns top-level value by single-part path', () => {
      expect(getNestedValue({ power_w: 3000 }, 'power_w')).toBe(3000)
    })

    it('returns nested value by dot-separated path', () => {
      expect(
        getNestedValue(
          { container_power_w_aggr: { 'BBR-01': 5000 } },
          'container_power_w_aggr.BBR-01',
        ),
      ).toBe(5000)
    })

    it('returns deeply nested value', () => {
      expect(getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
    })

    it('returns 0 when path does not exist', () => {
      expect(getNestedValue({ power_w: 3000 }, 'missing.path')).toBe(0)
    })

    it('returns 0 when intermediate node is null', () => {
      expect(getNestedValue({ a: null }, 'a.b')).toBe(0)
    })

    it('returns 0 when intermediate node is not an object', () => {
      expect(getNestedValue({ a: 42 }, 'a.b')).toBe(0)
    })

    it('returns 0 when value is falsy (0)', () => {
      expect(getNestedValue({ power_w: 0 }, 'power_w')).toBe(0)
    })

    it('returns 0 for empty entry', () => {
      expect(getNestedValue({}, 'power_w')).toBe(0)
    })
  })

  describe('buildConsumptionData', () => {
    beforeEach(() => {
      vi.mocked(formatPowerConsumption).mockImplementation((w: number) => ({
        value: w / 1000,
        unit: UNITS.POWER_KW,
        realValue: w,
      }))
      vi.mocked(formatUnit).mockImplementation((v: any) => `${v.value}${v.unit}`)
      vi.mocked(removeContainerPrefix).mockImplementation((tag: string) =>
        tag.replace('container-', ''),
      )
    })

    const makeEntry = (ts: number, power_w_sum_aggr: number) => ({ ts, power_w_sum_aggr })

    const twoEntries = [makeEntry(1000, 2000), makeEntry(2000, 4000)]

    describe('datasets', () => {
      it('returns a single dataset', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets).toHaveLength(1)
      })

      it('maps entries to {x, y} data points using powerBEAttribute', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets[0].data).toEqual([
          { x: 1000, y: 2000 },
          { x: 2000, y: 4000 },
        ])
      })

      it('uses ts=0 when entry has no ts', () => {
        const result = buildConsumptionData({
          data: [{ power_w_sum_aggr: 3000 }], // no ts
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets[0].data[0].x).toBe(0)
      })

      it('uses SKY_BLUE as borderColor', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets[0].borderColor).toBe('#87ceeb')
      })

      it('uses provided label', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
          label: 'My Label',
        })
        expect(result.datasets[0].label).toBe('My Label')
      })

      it('defaults to "Total Miner Consumption" for t-miner tag', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets[0].label).toBe('Total Miner Consumption')
      })

      it('defaults to "Total Consumption" for non t-miner tags', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 'powermeter-main',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets[0].label).toBe('Total Consumption')
      })

      it('currentValue is based on last entry', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.datasets[0].currentValue).toEqual({ value: 4, unit: 'kW' })
      })
    })

    describe('highlightedValue', () => {
      it('uses rawConsumptionW for site_power_w attribute', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 'powermeter-main',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
          rawConsumptionW: 8000,
        })
        expect(result.highlightedValue).toEqual({ value: '8', unit: UNITS.POWER_KW })
      })

      it('uses last entry value for non site_power_w attributes', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
          rawConsumptionW: 8000, // should be ignored for t-miner
        })
        expect(result.highlightedValue).toEqual({ value: '4', unit: UNITS.POWER_KW })
      })

      it('defaults rawConsumptionW to 0 when undefined for site_power_w', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 'powermeter-main',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.highlightedValue).toEqual({ value: '0', unit: UNITS.POWER_KW })
      })

      it('uses 0 for highlightedValue when data is empty', () => {
        const result = buildConsumptionData({
          data: [],
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.highlightedValue).toEqual({ value: '0', unit: UNITS.POWER_KW })
      })
    })

    describe('minMaxAvg', () => {
      it('returns minMaxAvg when skipMinMaxAvg is false', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.minMaxAvg).toBeDefined()
      })

      it('returns undefined minMaxAvg when skipMinMaxAvg is true', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: true,
          totalTransformerConsumption: false,
        })
        expect(result.minMaxAvg).toBeUndefined()
      })

      it('calculates correct min', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        // min is 2000W → 2kW
        expect(result.minMaxAvg?.min).toBe(`2${UNITS.POWER_KW}`)
      })

      it('calculates correct max', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        // max is 4000W → 4kW
        expect(result.minMaxAvg?.max).toBe(`4${UNITS.POWER_KW}`)
      })

      it('calculates correct avg', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        // avg = (2000 + 4000) / 2 = 3000W → 3kW
        expect(result.minMaxAvg?.avg).toBe(`3${UNITS.POWER_KW}`)
      })

      it('uses data.length=1 as denominator when data has one entry', () => {
        const result = buildConsumptionData({
          data: [makeEntry(1000, 6000)],
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(result.minMaxAvg?.avg).toBe(`6${UNITS.POWER_KW}`)
      })

      it('avoids division by zero when data is empty', () => {
        const result = buildConsumptionData({
          data: [],
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(() => result.minMaxAvg?.avg).not.toThrow()
      })
    })

    describe('powerAttribute override', () => {
      it('uses provided powerAttribute instead of derived one', () => {
        const entry = { ts: 1000, custom_power: 7000 }
        const result = buildConsumptionData({
          data: [entry],
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
          powerAttribute: 'custom_power',
        })
        expect(result.datasets[0].data[0].y).toBe(7000)
      })
    })

    describe('yTicksFormatter', () => {
      it('returns a function', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        expect(typeof result.yTicksFormatter).toBe('function')
      })

      it('formats value using formatPowerConsumption and formatUnit', () => {
        const result = buildConsumptionData({
          data: twoEntries,
          tag: 't-miner',
          skipMinMaxAvg: false,
          totalTransformerConsumption: false,
        })
        const formatted = result.yTicksFormatter!(3000)
        expect(formatPowerConsumption).toHaveBeenCalledWith(3000)
        expect(formatted).toBe(`3${UNITS.POWER_KW}`)
      })
    })
  })
})
