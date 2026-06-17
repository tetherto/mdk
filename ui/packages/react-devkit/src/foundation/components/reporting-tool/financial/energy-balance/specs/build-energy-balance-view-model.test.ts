import { describe, expect, it } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import type { EnergyBalanceResponse } from '@/types/finance'
import type { FinancialDateRange } from '../../utils/financial-period'

import {
  buildEnergyBalanceQueryParams,
  buildEnergyBalanceViewModel,
  type DisplayMode,
} from '../build-energy-balance-view-model'

const usdMode: DisplayMode = 'USD'
const btcMode: DisplayMode = 'BTC'

const baseSummary = {
  totalRevenueBTC: 1.5,
  totalRevenueUSD: 90_000,
  totalCostUSD: 30_000,
  totalProfitUSD: 60_000,
  avgCostPerMWh: 40,
  avgRevenuePerMWh: 80,
  totalConsumptionMWh: 1200,
  avgCurtailmentRate: 0.05,
  avgOperationalIssuesRate: 0.02,
  avgPowerUtilization: 0.9,
}

const sampleLog = [
  {
    ts: new Date('2025-01-15T12:00:00.000Z').getTime(),
    powerW: 10_000_000,
    consumptionMWh: 240,
    revenueBTC: 0.05,
    revenueUSD: 3_000,
    btcPrice: 60_000,
    energyCostUSD: 1_000,
    totalCostUSD: 1_500,
    energyRevenuePerMWh: 12.5,
    allInCostPerMWh: 6.25,
    profitUSD: 1_500,
    curtailmentMWh: 5,
    curtailmentRate: 0.02,
    operationalIssuesRate: 0.01,
    powerUtilization: 0.9,
  },
  {
    ts: new Date('2025-02-15T12:00:00.000Z').getTime(),
    powerW: 12_000_000,
    consumptionMWh: 288,
    revenueBTC: 0.06,
    revenueUSD: 3_600,
    btcPrice: 61_000,
    energyCostUSD: 1_200,
    totalCostUSD: 1_800,
    energyRevenuePerMWh: 12.5,
    allInCostPerMWh: 6.25,
    profitUSD: 1_800,
    curtailmentMWh: 6,
    curtailmentRate: 0.025,
    operationalIssuesRate: 0.01,
    powerUtilization: 0.92,
  },
]

const sampleResponse: EnergyBalanceResponse = {
  log: sampleLog,
  summary: baseSummary,
}

describe('buildEnergyBalanceQueryParams', () => {
  it('returns null when date range is missing or incomplete', () => {
    expect(buildEnergyBalanceQueryParams(null)).toBeNull()
    expect(buildEnergyBalanceQueryParams({ start: 1, end: 0, period: PERIOD.MONTHLY })).toBeNull()
  })

  it('returns start, end, and finance period when range is valid', () => {
    const dr: FinancialDateRange = { start: 1, end: 2, period: PERIOD.MONTHLY }
    expect(buildEnergyBalanceQueryParams(dr)).toEqual({ start: 1, end: 2, period: 'monthly' })
  })

  it('maps all period values', () => {
    expect(buildEnergyBalanceQueryParams({ start: 1, end: 2, period: PERIOD.DAILY })?.period).toBe(
      'daily',
    )
    expect(buildEnergyBalanceQueryParams({ start: 1, end: 2, period: PERIOD.WEEKLY })?.period).toBe(
      'weekly',
    )
    expect(buildEnergyBalanceQueryParams({ start: 1, end: 2, period: PERIOD.YEARLY })?.period).toBe(
      'yearly',
    )
  })
})

describe('buildEnergyBalanceViewModel', () => {
  const range: FinancialDateRange = {
    start: sampleLog[0]!.ts,
    end: sampleLog[1]!.ts,
    period: PERIOD.MONTHLY,
  }

  it('returns empty/zero view model when data is missing', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: undefined,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.hasData).toBe(false)
    expect(vm.revenueMetrics).toBeNull()
    expect(vm.costMetrics).toBeNull()
    expect(vm.energyRevenueChartInput.series[0]?.values).toHaveLength(0)
  })

  it('returns empty view model when date range is null', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: null,
      data: sampleResponse,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.hasData).toBe(false)
  })

  it('builds revenue and cost metrics from log and summary', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: sampleResponse,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.hasData).toBe(true)
    expect(vm.revenueMetrics?.curtailmentRate).toBeCloseTo(5)
    expect(vm.revenueMetrics?.operationalIssuesRate).toBeCloseTo(2)
    expect(vm.costMetrics?.avgPowerConsumption).toBeGreaterThan(0)
  })

  it('builds chart inputs with correct label count', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: sampleResponse,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.energyRevenueChartInput.labels).toHaveLength(2)
    expect(vm.averageDowntimeData.labels).toHaveLength(2)
    expect(vm.averageDowntimeData.curtailment).toHaveLength(2)
    expect(vm.averageDowntimeData.operationalIssues).toHaveLength(2)
    expect(vm.powerChartInput.series).toHaveLength(1)
    expect(vm.powerChartInput.constants).toHaveLength(1)
  })

  it('switches revenue chart series label when BTC mode is selected', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: sampleResponse,
      revenueDisplayMode: btcMode,
      costDisplayMode: usdMode,
    })
    expect(vm.energyRevenueChartInput.series[0]?.label).toContain('BTC')
  })

  it('produces USD cost chart input when cost mode is USD', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: sampleResponse,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.energyCostChartInput.btcUnit).toBeNull()
    expect(vm.energyCostChartInput.series).toHaveLength(2)
  })

  it('uses power chart cost-tab colors distinct from revenue-tab colors', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: sampleResponse,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.powerChartInput.series[0]?.color).not.toBe(vm.powerChartCostInput.series[0]?.color)
  })

  it('sets period and periodType from dateRange', () => {
    const vm = buildEnergyBalanceViewModel({
      dateRange: range,
      data: sampleResponse,
      revenueDisplayMode: usdMode,
      costDisplayMode: usdMode,
    })
    expect(vm.period).toBe('monthly')
    expect(vm.periodType).toBe('month')
  })
})
