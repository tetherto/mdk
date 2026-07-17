import { CURRENCY } from "@primitives"
import { describe, expect, it } from "vitest"

import type { EnergyBalanceLogEntry, EnergyBalanceResponse } from "@domain/types/finance"

import {
  barLabelFormatter,
  btcBarLabelFormatter,
  buildEnergyBalanceQueryParams,
  buildEnergyBalanceViewModel,
  rateLabelFormatter,
  usdBarLabelFormatter,
  usdBarLabelFormatterWithDecimals,
} from "./build-energy-balance-view-model"

const DAY_MS = 24 * 60 * 60 * 1_000
const dateRange = { start: DAY_MS, end: 40 * DAY_MS }

const entry = (overrides: Partial<EnergyBalanceLogEntry> = {}): EnergyBalanceLogEntry =>
  ({
    ts: DAY_MS,
    powerW: 2_000_000,
    consumptionMWh: 48,
    revenueBTC: 0.5,
    revenueUSD: 30_000,
    energyRevenuePerMWh: 625,
    energyCostUSD: 4_000,
    totalCostUSD: 10_000,
    curtailmentRate: 0.1,
    operationalIssuesRate: 0.05,
    ...overrides,
  }) as EnergyBalanceLogEntry

const response = (overrides: Partial<EnergyBalanceResponse> = {}): EnergyBalanceResponse =>
  ({
    log: [entry()],
    summary: { avgCurtailmentRate: 0.1, avgOperationalIssuesRate: 0.05 },
    ...overrides,
  }) as EnergyBalanceResponse

const build = (overrides: Partial<Parameters<typeof buildEnergyBalanceViewModel>[0]> = {}) =>
  buildEnergyBalanceViewModel({
    dateRange,
    data: response(),
    revenueDisplayMode: CURRENCY.USD_LABEL,
    costDisplayMode: CURRENCY.USD_LABEL,
    availablePowerMW: 5,
    ...overrides,
  })

describe("label formatters", () => {
  it("format zero as the literal 0 and pass other values through", () => {
    for (const formatter of [barLabelFormatter, usdBarLabelFormatter, usdBarLabelFormatterWithDecimals, btcBarLabelFormatter]) {
      expect(formatter(0)).toBe("0")
      expect(formatter(12)).toContain("12")
    }
    expect(rateLabelFormatter(1.23456)).toContain("1.2346")
  })
})

describe("buildEnergyBalanceQueryParams", () => {
  it("returns null without a complete date range", () => {
    expect(buildEnergyBalanceQueryParams(null)).toBeNull()
    expect(buildEnergyBalanceQueryParams({ start: 0, end: DAY_MS })).toBeNull()
    expect(buildEnergyBalanceQueryParams({ start: DAY_MS, end: 0 })).toBeNull()
  })

  it("maps a complete range to query params with a finance period", () => {
    expect(buildEnergyBalanceQueryParams({ start: DAY_MS, end: 2 * DAY_MS })).toEqual({
      start: DAY_MS,
      end: 2 * DAY_MS,
      period: "monthly",
    })
  })
})

describe("buildEnergyBalanceViewModel", () => {
  it("reports no data without a date range or log entries", () => {
    const withoutRange = build({ dateRange: null })
    expect(withoutRange.hasData).toBe(false)
    expect(withoutRange.revenueMetrics).toBeNull()
    expect(withoutRange.costMetrics).toBeNull()

    const withoutLog = build({ data: response({ log: [] }) })
    expect(withoutLog.hasData).toBe(false)

    const withoutData = build({ data: undefined })
    expect(withoutData.hasData).toBe(false)
  })

  it("builds percentage revenue metrics from the summary", () => {
    const model = build()

    expect(model.hasData).toBe(true)
    expect(model.revenueMetrics).toEqual({ curtailmentRate: 10, operationalIssuesRate: 5 })
  })

  it("defaults missing summary rates to zero and drops metrics without a summary", () => {
    const partialSummary = build({ data: response({ summary: {} as never }) })
    expect(partialSummary.revenueMetrics).toEqual({ curtailmentRate: 0, operationalIssuesRate: 0 })

    const noSummary = build({ data: response({ summary: undefined }) })
    expect(noSummary.revenueMetrics).toBeNull()
  })

  it("aggregates the cost metrics over the period rows", () => {
    const model = build()

    // One row: 2 MW, 4k energy + 6k operational costs, 30k revenue.
    expect(model.costMetrics).toEqual({
      avgPowerConsumption: 2,
      avgEnergyCost: 2_000,
      avgAllInCost: 5_000,
      avgPowerAvailability: 5,
      avgOperationsCost: 3_000,
      avgEnergyRevenue: 15_000,
    })
  })

  it("defaults absent numeric fields to zero in the period rows", () => {
    const model = build({
      data: response({
        log: [entry({
          powerW: undefined as never,
          consumptionMWh: 0,
          revenueBTC: undefined as never,
          revenueUSD: undefined as never,
          energyRevenuePerMWh: undefined,
          energyCostUSD: undefined,
          totalCostUSD: undefined,
          curtailmentRate: undefined,
          operationalIssuesRate: undefined,
        })],
      }),
    })

    expect(model.costMetrics).toEqual({
      avgPowerConsumption: 0,
      avgEnergyCost: 0,
      avgAllInCost: 0,
      avgPowerAvailability: 5,
      avgOperationsCost: 0,
      avgEnergyRevenue: 0,
    })
    expect(model.averageDowntimeData.curtailment).toEqual([0])
    expect(model.averageDowntimeData.operationalIssues).toEqual([0])
  })

  it("selects the USD revenue series and formatters in USD mode", () => {
    const model = build()

    expect(model.energyRevenueChartInput.series[0]?.label).toBe("Revenue (USD/MWh)")
    expect(model.energyRevenueChartInput.series[0]?.values).toEqual([625])
    expect(model.revenueBarLabelFormatter).toBe(usdBarLabelFormatterWithDecimals)
    expect(model.costBarLabelFormatter).toBe(usdBarLabelFormatter)
    expect(model.energyCostChartInput.btcUnit).toBeNull()
    // All-in cost per MW: 10k / 2 MW.
    expect(model.energyCostChartInput.series[0]?.values).toEqual([5_000])
  })

  it("selects the BTC revenue series and formatters in BTC mode", () => {
    const model = build({
      revenueDisplayMode: CURRENCY.BTC_LABEL,
      costDisplayMode: CURRENCY.BTC_LABEL,
    })

    expect(model.energyRevenueChartInput.series[0]?.label).toContain(CURRENCY.BTC_LABEL)
    // 0.5 BTC / 48 MWh.
    expect(model.energyRevenueChartInput.series[0]?.values).toEqual([0.5 / 48])
    expect(model.revenueBarLabelFormatter).toBe(btcBarLabelFormatter)
    expect(model.costBarLabelFormatter).toBe(btcBarLabelFormatter)
  })

  it("scales the BTC cost chart to sats below the threshold", () => {
    const model = build({
      costDisplayMode: CURRENCY.BTC_LABEL,
      data: response({ log: [entry({ revenueBTC: 0.000_1 })] }),
    })

    expect(model.energyCostChartInput.btcUnit).toBe(CURRENCY.SATS)
    // Revenue: (0.0001 / 48) BTC/MWh in sats.
    expect(model.energyCostChartInput.series[1]?.values?.[0]).toBeCloseTo((0.000_1 / 48) * 100_000_000, 3)
  })

  it("keeps the BTC cost chart in BTC above the sats threshold", () => {
    const model = build({
      costDisplayMode: CURRENCY.BTC_LABEL,
      data: response({ log: [entry({ consumptionMWh: 0.1, revenueBTC: 0.2 })] }),
    })

    expect(model.energyCostChartInput.btcUnit).toBe(CURRENCY.BTC_LABEL)
  })

  it("zeroes the BTC all-in cost when power or revenue is missing", () => {
    const model = build({
      costDisplayMode: CURRENCY.BTC_LABEL,
      data: response({ log: [entry({ powerW: 0, revenueBTC: 0 })] }),
    })

    expect(model.energyCostChartInput.series[0]?.values).toEqual([0])
  })

  it("builds the power charts around the availability constant", () => {
    const model = build()

    expect(model.powerChartInput.series[0]?.points).toEqual([{ ts: DAY_MS, value: 2 }])
    expect(model.powerChartInput.constants[0]?.value).toBe(5)
    expect(model.powerChartCostInput.constants[0]?.value).toBe(5)
  })

  it("derives the period type from the date range", () => {
    expect(build().periodType).toBe("month")
    expect(build({ dateRange: null }).periodType).toBe("month")
  })
})
