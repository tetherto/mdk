import { describe, expect, it } from 'vitest'

import type { MetricsConsumptionGroupedResponse } from '../../../../../../types/metrics'
import {
  ENERGY_REPORT_MINER_VIEW_SLICES,
  sliceConfig,
  toEnergyReportBarChartInput,
  transformToBarData,
} from '../energy-report-miner.utils'

describe('ENERGY_REPORT_MINER_VIEW_SLICES', () => {
  it('exports MINER_TYPE and MINER_UNIT', () => {
    expect(ENERGY_REPORT_MINER_VIEW_SLICES.MINER_TYPE).toBe('MINER_TYPE')
    expect(ENERGY_REPORT_MINER_VIEW_SLICES.MINER_UNIT).toBe('MINER_UNIT')
  })
})

describe('sliceConfig', () => {
  it('MINER_UNIT filterCategory drops leaked rollup keys', () => {
    const { filterCategory } = sliceConfig[ENERGY_REPORT_MINER_VIEW_SLICES.MINER_UNIT]
    expect(filterCategory!('maintenance')).toBe(false)
    expect(filterCategory!('group-1')).toBe(false)
    expect(filterCategory!('bitdeer-1')).toBe(true)
  })
})

describe('transformToBarData', () => {
  const mockResponse = (
    log: MetricsConsumptionGroupedResponse['log'],
  ): MetricsConsumptionGroupedResponse => ({
    log,
    summary: { avgPowerW: null, totalConsumptionMWh: 0 },
  })

  it('returns empty chart data when response is undefined', () => {
    const chart = transformToBarData(undefined, ENERGY_REPORT_MINER_VIEW_SLICES.MINER_TYPE, [])
    expect(chart.labels).toEqual([])
    expect(chart.dataSet1.data).toEqual([])
  })

  it('uses the latest log entry for the bar values', () => {
    const response = mockResponse([
      { ts: 1, powerW: { 'miner-wm-m56': 100 }, consumptionMWh: { 'miner-wm-m56': 0.0024 } },
      { ts: 2, powerW: { 'miner-wm-m56': 250 }, consumptionMWh: { 'miner-wm-m56': 0.006 } },
    ])
    const chart = transformToBarData(response, ENERGY_REPORT_MINER_VIEW_SLICES.MINER_TYPE, [])
    expect(chart.dataSet1.data).toEqual([250])
  })

  it('drops leaked rollup keys for MINER_UNIT', () => {
    const response = mockResponse([
      {
        ts: 1,
        powerW: { 'bitdeer-1': 100, 'group-1': 50, maintenance: 25 },
        consumptionMWh: null,
      },
    ])
    const chart = transformToBarData(response, ENERGY_REPORT_MINER_VIEW_SLICES.MINER_UNIT, [])
    expect(chart.dataSet1.data).toEqual([100])
    expect(chart.labels).toEqual(['Bitdeer 1'])
  })

  it('toEnergyReportBarChartInput converts watts to MW for chart scale', () => {
    const response = mockResponse([
      { ts: 1, powerW: { 'miner-am-s21': 45_000_000 }, consumptionMWh: null },
    ])
    const input = toEnergyReportBarChartInput(
      response,
      ENERGY_REPORT_MINER_VIEW_SLICES.MINER_TYPE,
      [],
    )
    expect(input.series[0]?.values).toEqual([45])
  })
})
