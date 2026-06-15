/**
 * Pure builder for the Cost Summary reporting page.
 *
 * No fetch, no React, no chart presentation - just derives display metrics,
 * time-series and totals from a v2 `/auth/finance/cost-summary` response.
 * The composite page (T-13) is responsible for piping these through specific
 * chart-input shapes (colors, axis formatters, tooltips).
 */

import _map from 'lodash/map'

import { CURRENCY, UNITS } from '@core'
import type { CostSummaryResponse, CostSummaryTotals, FinancePeriod } from '@/types/finance'
import type { FinancialDateRange } from '../../utils/financial-period'
import { toFinancePeriod } from '../../utils/financial-period'

const USD_PER_MWH = `${CURRENCY.USD}/${UNITS.ENERGY_MWH}` as const

export type CostSummaryQueryParams = {
  start: number
  end: number
  period: FinancePeriod
}

export type CostSummaryMetric = {
  label: string
  unit: string
  value: number | null
  isHighlighted?: boolean
}

export type CostSummaryDisplayMetrics = {
  allInCost: CostSummaryMetric
  energyCost: CostSummaryMetric
  operationsCost: CostSummaryMetric
}

export type CostTimeSeriesEntry = {
  ts: number
  totalCostUSD: number
  energyCostUSD: number
  operationalCostUSD: number
}

export type BtcPriceTimeSeriesEntry = {
  ts: number
  priceUSD: number
}

export type CostSummaryMonetaryTotals = {
  totalEnergyCostsUSD: number
  totalOperationalCostsUSD: number
  totalCostsUSD: number
  totalConsumptionMWh: number
}

export type CostSummaryViewModel = {
  metrics: CostSummaryDisplayMetrics | null
  costLog: ReadonlyArray<CostTimeSeriesEntry>
  btcPriceLog: ReadonlyArray<BtcPriceTimeSeriesEntry>
  totals: CostSummaryMonetaryTotals | null
  avgBtcPrice: number | null
}

/**
 * Build the API query params for the v2 `/auth/finance/cost-summary` endpoint.
 *
 * Returns `null` when the date range is missing or incomplete so that consumers
 * can skip the underlying query (matches the convention used by the
 * sibling EBITDA and energy-balance hooks).
 */
export const buildCostSummaryQueryParams = (
  dateRange: FinancialDateRange | null,
): CostSummaryQueryParams | null => {
  if (dateRange == null || !dateRange.start || !dateRange.end) return null

  return {
    start: dateRange.start,
    end: dateRange.end,
    period: toFinancePeriod(dateRange.period),
  }
}

/**
 * Derive the three "$/MWh" headline metrics displayed at the top of the Cost
 * page.
 *
 * - `allInCost`     comes pre-aggregated from the API.
 * - `energyCost`    comes pre-aggregated from the API.
 * - `operationsCost` is derived: `totalOperationalCostsUSD / totalConsumptionMWh`,
 *   matching the OSS Cost page calculation. Returns `null` when consumption is
 *   zero (avoid divide-by-zero / misleading "Infinity" tiles).
 */
const buildDisplayMetrics = (
  summary: CostSummaryTotals | undefined,
): CostSummaryDisplayMetrics | null => {
  if (!summary) return null

  const operationsCost =
    summary.totalConsumptionMWh > 0
      ? summary.totalOperationalCostsUSD / summary.totalConsumptionMWh
      : null

  return {
    allInCost: {
      label: 'All-in Cost',
      unit: USD_PER_MWH,
      value: summary.avgAllInCostPerMWh,
      isHighlighted: true,
    },
    energyCost: {
      label: 'Energy Cost',
      unit: USD_PER_MWH,
      value: summary.avgEnergyCostPerMWh,
    },
    operationsCost: {
      label: 'Operations Cost',
      unit: USD_PER_MWH,
      value: operationsCost,
    },
  }
}

/**
 * Build the full Cost Summary view model from a v2 response.
 *
 * - `metrics` is `null` when the response has no `summary` block, so the page
 *   can render an empty / loading state without inspecting individual values.
 * - Time-series arrays are empty (not `null`) when there is no log data; this
 *   keeps downstream `.map` / chart-feeding code branch-free.
 * - `totals` mirrors the API summary's monetary aggregates so the page can
 *   render donuts / total cards without re-reading the raw response.
 */
export const buildCostSummaryViewModel = ({
  data,
}: {
  data: CostSummaryResponse | undefined
}): CostSummaryViewModel => {
  const log = data?.log ?? []
  const summary = data?.summary

  const costLog: CostTimeSeriesEntry[] = _map(log, (entry) => ({
    ts: entry.ts,
    totalCostUSD: entry.totalCostsUSD,
    energyCostUSD: entry.energyCostsUSD,
    operationalCostUSD: entry.operationalCostsUSD,
  }))

  const btcPriceLog: BtcPriceTimeSeriesEntry[] = _map(log, (entry) => ({
    ts: entry.ts,
    priceUSD: entry.btcPrice,
  }))

  const totals: CostSummaryMonetaryTotals | null = summary
    ? {
        totalEnergyCostsUSD: summary.totalEnergyCostsUSD,
        totalOperationalCostsUSD: summary.totalOperationalCostsUSD,
        totalCostsUSD: summary.totalCostsUSD,
        totalConsumptionMWh: summary.totalConsumptionMWh,
      }
    : null

  return {
    metrics: buildDisplayMetrics(summary),
    costLog,
    btcPriceLog,
    totals,
    avgBtcPrice: summary?.avgBtcPrice ?? null,
  }
}
