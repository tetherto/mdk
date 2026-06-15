import { describe, expect, it } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import type { CostSummaryResponse } from '@/types/finance'
import type { FinancialDateRange } from '../../../utils/financial-period'

import {
  buildCostSummaryQueryParams,
  buildCostSummaryViewModel,
} from '../build-cost-summary-view-model'

const sampleSummary = {
  totalEnergyCostsUSD: 3_000,
  totalOperationalCostsUSD: 1_500,
  totalCostsUSD: 4_500,
  totalConsumptionMWh: 250,
  avgAllInCostPerMWh: 18,
  avgEnergyCostPerMWh: 12,
  avgBtcPrice: 60_500,
}

const sampleLog = [
  {
    ts: new Date('2025-01-15T12:00:00.000Z').getTime(),
    consumptionMWh: 100,
    energyCostsUSD: 1_200,
    operationalCostsUSD: 600,
    totalCostsUSD: 1_800,
    allInCostPerMWh: 18,
    energyCostPerMWh: 12,
    btcPrice: 60_000,
  },
  {
    ts: new Date('2025-02-15T12:00:00.000Z').getTime(),
    consumptionMWh: 150,
    energyCostsUSD: 1_800,
    operationalCostsUSD: 900,
    totalCostsUSD: 2_700,
    allInCostPerMWh: 18,
    energyCostPerMWh: 12,
    btcPrice: 61_000,
  },
]

const sampleResponse: CostSummaryResponse = {
  log: sampleLog,
  summary: sampleSummary,
}

describe('buildCostSummaryQueryParams', () => {
  it('returns null when the date range is missing', () => {
    expect(buildCostSummaryQueryParams(null)).toBeNull()
  })

  it('returns null when start is missing', () => {
    expect(buildCostSummaryQueryParams({ start: 0, end: 2, period: PERIOD.MONTHLY })).toBeNull()
  })

  it('returns null when end is missing', () => {
    expect(buildCostSummaryQueryParams({ start: 1, end: 0, period: PERIOD.MONTHLY })).toBeNull()
  })

  it('maps a valid range to API params with finance period strings', () => {
    const dr: FinancialDateRange = { start: 1, end: 2, period: PERIOD.MONTHLY }
    expect(buildCostSummaryQueryParams(dr)).toEqual({
      start: 1,
      end: 2,
      period: 'monthly',
    })
  })

  it('defaults to monthly when no period is provided on the date range', () => {
    expect(buildCostSummaryQueryParams({ start: 1, end: 2 })).toEqual({
      start: 1,
      end: 2,
      period: 'monthly',
    })
  })

  it('maps weekly / daily / yearly periods correctly', () => {
    expect(buildCostSummaryQueryParams({ start: 1, end: 2, period: PERIOD.WEEKLY })?.period).toBe(
      'weekly',
    )
    expect(buildCostSummaryQueryParams({ start: 1, end: 2, period: PERIOD.DAILY })?.period).toBe(
      'daily',
    )
    expect(buildCostSummaryQueryParams({ start: 1, end: 2, period: PERIOD.YEARLY })?.period).toBe(
      'yearly',
    )
  })
})

describe('buildCostSummaryViewModel', () => {
  describe('when data is undefined', () => {
    const vm = buildCostSummaryViewModel({ data: undefined })

    it('returns null metrics', () => {
      expect(vm.metrics).toBeNull()
    })

    it('returns null totals', () => {
      expect(vm.totals).toBeNull()
    })

    it('returns null avgBtcPrice', () => {
      expect(vm.avgBtcPrice).toBeNull()
    })

    it('returns empty time-series arrays so consumers can map without branching', () => {
      expect(vm.costLog).toEqual([])
      expect(vm.btcPriceLog).toEqual([])
    })
  })

  describe('with a full response', () => {
    const vm = buildCostSummaryViewModel({ data: sampleResponse })

    it('builds the three headline display metrics', () => {
      expect(vm.metrics).not.toBeNull()
      expect(vm.metrics?.allInCost).toEqual({
        label: 'All-in Cost',
        unit: '$/MWh',
        value: 18,
        isHighlighted: true,
      })
      expect(vm.metrics?.energyCost).toEqual({
        label: 'Energy Cost',
        unit: '$/MWh',
        value: 12,
      })
      expect(vm.metrics?.operationsCost).toEqual({
        label: 'Operations Cost',
        unit: '$/MWh',
        value: 1_500 / 250,
      })
    })

    it('maps each log entry into a normalized cost time-series row', () => {
      expect(vm.costLog).toEqual([
        {
          ts: sampleLog[0]!.ts,
          totalCostUSD: 1_800,
          energyCostUSD: 1_200,
          operationalCostUSD: 600,
        },
        {
          ts: sampleLog[1]!.ts,
          totalCostUSD: 2_700,
          energyCostUSD: 1_800,
          operationalCostUSD: 900,
        },
      ])
    })

    it('extracts a BTC price time-series from the same log', () => {
      expect(vm.btcPriceLog).toEqual([
        { ts: sampleLog[0]!.ts, priceUSD: 60_000 },
        { ts: sampleLog[1]!.ts, priceUSD: 61_000 },
      ])
    })

    it('mirrors the API summary monetary totals', () => {
      expect(vm.totals).toEqual({
        totalEnergyCostsUSD: 3_000,
        totalOperationalCostsUSD: 1_500,
        totalCostsUSD: 4_500,
        totalConsumptionMWh: 250,
      })
    })

    it('exposes the API avg btc price', () => {
      expect(vm.avgBtcPrice).toBe(60_500)
    })
  })

  describe('edge cases', () => {
    it('flags operationsCost as null when totalConsumptionMWh is zero to avoid divide-by-zero', () => {
      const vm = buildCostSummaryViewModel({
        data: {
          log: [],
          summary: {
            ...sampleSummary,
            totalConsumptionMWh: 0,
            totalOperationalCostsUSD: 999,
          },
        },
      })
      expect(vm.metrics?.operationsCost.value).toBeNull()
    })

    it('passes through pre-aggregated $/MWh metrics even when their value is null', () => {
      const vm = buildCostSummaryViewModel({
        data: {
          log: [],
          summary: {
            ...sampleSummary,
            avgAllInCostPerMWh: null,
            avgEnergyCostPerMWh: null,
          },
        },
      })
      expect(vm.metrics?.allInCost.value).toBeNull()
      expect(vm.metrics?.energyCost.value).toBeNull()
    })

    it('returns empty time-series and non-null totals when the API returned summary but no log', () => {
      const vm = buildCostSummaryViewModel({
        data: { log: [], summary: sampleSummary },
      })
      expect(vm.costLog).toEqual([])
      expect(vm.btcPriceLog).toEqual([])
      expect(vm.totals).not.toBeNull()
      expect(vm.metrics).not.toBeNull()
    })

    it('returns empty time-series and null totals when summary is missing but log is present (defensive)', () => {
      const vm = buildCostSummaryViewModel({
        data: { log: sampleLog, summary: undefined as never },
      })
      expect(vm.totals).toBeNull()
      expect(vm.metrics).toBeNull()
      expect(vm.costLog.length).toBe(2)
      expect(vm.btcPriceLog.length).toBe(2)
    })
  })
})
