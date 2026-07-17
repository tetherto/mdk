import { describe, expectTypeOf, it } from 'vitest'

import type {
  MetricsConsumptionGroupBy,
  MetricsConsumptionGroupedResponse,
  MetricsConsumptionResponse,
  MetricsEfficiencyResponse,
  MetricsHashrateGroupBy,
  MetricsHashrateGroupedResponse,
  MetricsHashrateQueryParams,
  MetricsHashrateResponse,
  MetricsInterval,
  MetricsMinerStatusResponse,
  MetricsPowerModeResponse,
  MetricsPowerModeTimelineResponse,
  MetricsQueryParams,
  MetricsResponse,
  MetricsTemperatureQueryParams,
  MetricsTemperatureResponse,
} from '../metrics'

describe('metrics types', () => {
  it('MetricsQueryParams shape', () => {
    const params: MetricsQueryParams = { start: 0, end: 1 }
    expectTypeOf(params.start).toBeNumber()
    expectTypeOf(params.end).toBeNumber()
    expectTypeOf(params.overwriteCache).toEqualTypeOf<boolean | undefined>()
  })

  it('MetricsInterval is the bucket-size union', () => {
    expectTypeOf<MetricsInterval>().toEqualTypeOf<'1h' | '1d' | '1w'>()
  })

  it('MetricsResponse splits log entries from summary', () => {
    type Entry = { ts: number; value: number }
    type Summary = { avg: number | null }
    expectTypeOf<MetricsResponse<Entry, Summary>>().toEqualTypeOf<{
      log: Entry[]
      summary: Summary
    }>()
  })

  it('Hashrate group-by + grouped variant', () => {
    expectTypeOf<MetricsHashrateGroupBy>().toEqualTypeOf<'container' | 'miner'>()

    const params: MetricsHashrateQueryParams = { start: 0, end: 1, groupBy: 'container' }
    expectTypeOf(params.groupBy).toEqualTypeOf<MetricsHashrateGroupBy | undefined>()

    expectTypeOf<MetricsHashrateResponse['log'][number]['hashrateMhs']>().toBeNumber()
    expectTypeOf<MetricsHashrateGroupedResponse['log'][number]['hashrateMhs']>().toEqualTypeOf<
      Record<string, number>
    >()
    type GroupedBy = Record<string, { avgHashrateMhs: number | null; totalHashrateMhs: number }>
    expectTypeOf<MetricsHashrateGroupedResponse['summary']['groupedBy']>().toEqualTypeOf<
      GroupedBy | undefined
    >()
  })

  it('Consumption group-by + grouped variant', () => {
    expectTypeOf<MetricsConsumptionGroupBy>().toEqualTypeOf<'container' | 'miner'>()
    expectTypeOf<MetricsConsumptionResponse['log'][number]['powerW']>().toBeNumber()
    expectTypeOf<
      MetricsConsumptionGroupedResponse['log'][number]['consumptionMWh']
    >().toEqualTypeOf<Record<string, number> | null>()
  })

  it('Efficiency / miner-status / power-mode shapes', () => {
    expectTypeOf<MetricsEfficiencyResponse['summary']['avgEfficiencyWThs']>().toEqualTypeOf<
      number | null
    >()

    expectTypeOf<MetricsMinerStatusResponse['log'][number]['online']>().toBeNumber()
    expectTypeOf<MetricsMinerStatusResponse['summary']['avgMaintenance']>().toEqualTypeOf<
      number | null
    >()

    expectTypeOf<MetricsPowerModeResponse['log'][number]['notMining']>().toBeNumber()
    expectTypeOf<MetricsPowerModeResponse['summary']['avgError']>().toEqualTypeOf<number | null>()
  })

  it('Power-mode timeline returns log only (no summary)', () => {
    expectTypeOf<MetricsPowerModeTimelineResponse>().toEqualTypeOf<{
      log: Array<{
        minerId: string
        container: string
        segments: Array<{
          from: number
          to: number
          powerMode: string
          status: string
        }>
      }>
    }>()
  })

  it('Temperature query params include interval + container', () => {
    const params: MetricsTemperatureQueryParams = { start: 0, end: 1, interval: '1h' }
    expectTypeOf(params.interval).toEqualTypeOf<MetricsInterval | undefined>()
    expectTypeOf(params.container).toEqualTypeOf<string | undefined>()

    expectTypeOf<MetricsTemperatureResponse['log'][number]['containers']>().toEqualTypeOf<
      Record<string, { maxC: number; avgC: number }>
    >()
    expectTypeOf<MetricsTemperatureResponse['summary']['peakTemp']>().toEqualTypeOf<number | null>()
  })
})
