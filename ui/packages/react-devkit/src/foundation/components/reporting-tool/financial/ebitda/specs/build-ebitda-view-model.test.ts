import { describe, expect, it } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import type { EbitdaResponse } from '@/types/finance'
import { type FinancialDateRange, toFinancePeriod } from '../../../utils/financial-period'

import { buildEbitdaQueryParams, buildEbitdaViewModel } from '../build-ebitda-view-model'

const baseSummary = {
  totalRevenueBTC: 2.5,
  totalRevenueUSD: 150_000,
  totalCostsUSD: 40_000,
  totalEbitdaSelling: 110_000,
  totalEbitdaHodl: 95_000,
  avgBtcProductionCost: 18_000,
  currentBtcPrice: 60_000,
}

const sampleLog = [
  {
    ts: new Date('2025-01-15T12:00:00.000Z').getTime(),
    revenueBTC: 0.1,
    revenueUSD: 6000,
    btcPrice: 60_000,
    powerW: 1e6,
    hashrateMhs: 1e9,
    consumptionMWh: 100,
    energyCostsUSD: 1000,
    operationalCostsUSD: 500,
    totalCostsUSD: 1500,
    ebitdaSelling: 4500,
    ebitdaHodl: 4000,
    btcProductionCost: 15_000,
  },
  {
    ts: new Date('2025-02-15T12:00:00.000Z').getTime(),
    revenueBTC: 0.12,
    revenueUSD: 7200,
    btcPrice: 61_000,
    powerW: 1e6,
    hashrateMhs: 1e9,
    consumptionMWh: 110,
    energyCostsUSD: 1100,
    operationalCostsUSD: 550,
    totalCostsUSD: 1650,
    ebitdaSelling: 5550,
    ebitdaHodl: 5000,
    btcProductionCost: 16_000,
  },
]

const sampleResponse: EbitdaResponse = {
  log: sampleLog,
  summary: baseSummary,
}

describe('toFinancePeriod', () => {
  it('maps PERIOD values to finance API period strings', () => {
    expect(toFinancePeriod(PERIOD.DAILY)).toBe('daily')
    expect(toFinancePeriod(PERIOD.WEEKLY)).toBe('weekly')
    expect(toFinancePeriod(PERIOD.MONTHLY)).toBe('monthly')
    expect(toFinancePeriod(PERIOD.YEARLY)).toBe('yearly')
    expect(toFinancePeriod(undefined)).toBe('monthly')
  })
})

describe('buildEbitdaQueryParams', () => {
  it('returns null when date range is missing or incomplete', () => {
    expect(buildEbitdaQueryParams(null)).toBeNull()
    expect(buildEbitdaQueryParams({ start: 1, end: 0, period: PERIOD.MONTHLY })).toBeNull()
  })

  it('returns start, end, and finance period when range is valid', () => {
    const dr: FinancialDateRange = {
      start: 1,
      end: 2,
      period: PERIOD.MONTHLY,
    }
    expect(buildEbitdaQueryParams(dr)).toEqual({
      start: 1,
      end: 2,
      period: 'monthly',
    })
  })
})

describe('buildEbitdaViewModel', () => {
  it('returns empty view state when data or range is missing', () => {
    const range: FinancialDateRange = {
      start: 1,
      end: 2,
      period: PERIOD.MONTHLY,
    }
    const empty = buildEbitdaViewModel({ dateRange: range, data: undefined })
    expect(empty.metrics).toBeNull()
    expect(empty.ebitdaChartInput).toBeNull()
    expect(empty.showEbitdaBarChart).toBe(false)
  })

  it('builds metrics and chart inputs when log and summary exist', () => {
    const range: FinancialDateRange = {
      start: sampleLog[0]!.ts,
      end: sampleLog[1]!.ts,
      period: PERIOD.MONTHLY,
    }
    const vm = buildEbitdaViewModel({ dateRange: range, data: sampleResponse })
    expect(vm.metrics).not.toBeNull()
    expect(vm.metrics?.bitcoinProduced).toBe(2.5)
    expect(vm.ebitdaChartInput?.labels?.length).toBe(2)
    expect(vm.btcProducedChartInput?.series?.[0]?.values).toEqual([0.1, 0.12])
    expect(vm.showEbitdaBarChart).toBe(true)
  })

  it('hides EBITDA bar chart for daily period', () => {
    const range: FinancialDateRange = {
      start: sampleLog[0]!.ts,
      end: sampleLog[1]!.ts,
      period: PERIOD.DAILY,
    }
    const vm = buildEbitdaViewModel({ dateRange: range, data: sampleResponse })
    expect(vm.showEbitdaBarChart).toBe(false)
  })

  it('marks BTC produced all-zero when every revenueBTC is 0', () => {
    const zeroLog = sampleLog.map((e) => ({ ...e, revenueBTC: 0 }))
    const range: FinancialDateRange = {
      start: zeroLog[0]!.ts,
      end: zeroLog[1]!.ts,
      period: PERIOD.MONTHLY,
    }
    const vm = buildEbitdaViewModel({
      dateRange: range,
      data: { log: zeroLog, summary: baseSummary },
    })
    expect(vm.hasBtcProducedAllZeros).toBe(true)
  })
})
