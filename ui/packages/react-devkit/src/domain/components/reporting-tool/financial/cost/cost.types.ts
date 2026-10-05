import type { ReactElement } from 'react'

import type { FinancialDateRange } from '../../utils/financial-period'

import type { AvgAllInCostDataPoint } from './avg-all-in-cost-chart-input'
import type {
  BtcPriceTimeSeriesEntry,
  CostSummaryDisplayMetrics,
  CostSummaryMonetaryTotals,
  CostTimeSeriesEntry,
} from './build-cost-summary-view-model'

/**
 * Subset of `useCostSummary` output that the Cost composite page needs.
 * Defined as a standalone type so consumers wiring up their own data flow can
 * pass an object of this shape without coupling to the hook's full return.
 */
export type CostViewModelProps = {
  /** Headline $/MWh tiles (all-in, energy, operations). Pass `null` while loading. */
  metrics: CostSummaryDisplayMetrics | null
  /** Monthly/weekly production-cost time series for the Production Cost / Price chart */
  costLog: ReadonlyArray<CostTimeSeriesEntry>
  /** BTC price time series aligned to `costLog` buckets */
  btcPriceLog: ReadonlyArray<BtcPriceTimeSeriesEntry>
  /** Period totals (energy + operations USD) for the Operations vs Energy doughnut */
  totals: CostSummaryMonetaryTotals | null
}

export type CostQueryStateProps = {
  /**
   * Shows a loading spinner overlay over the chart grid
   * @default false
   */
  isLoading?: boolean
  /** When truthy, renders an error message in place of the chart grid */
  error?: unknown
}

export type CostContentProps = CostViewModelProps &
  CostQueryStateProps & {
    /** Active date range; drives x-axis labels across all charts */
    dateRange: FinancialDateRange | null
    /** Optional revenue/cost time-series for the Avg All-in Cost panel. */
    avgAllInCostData?: ReadonlyArray<AvgAllInCostDataPoint>
  }

export type CostChromeProps = {
  /** Period selector element. Pass `<TimeframeControls>` for the OSS-style year/month picker. */
  controls: ReactElement
  /**
   * Optional "Set Monthly Cost" header action slot.
   *
   * A `ReactElement` slot (rather than an href string) so consumers can hand in
   * router-aware components like `<Link>` or `<Button onClick={...} />` without
   * triggering a full page reload.
   */
  setCostAction?: ReactElement
}

export type CostProps = CostContentProps & CostChromeProps
