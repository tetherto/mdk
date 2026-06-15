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
  metrics: CostSummaryDisplayMetrics | null
  costLog: ReadonlyArray<CostTimeSeriesEntry>
  btcPriceLog: ReadonlyArray<BtcPriceTimeSeriesEntry>
  totals: CostSummaryMonetaryTotals | null
}

export type CostQueryStateProps = {
  isLoading?: boolean
  error?: unknown
}

export type CostContentProps = CostViewModelProps &
  CostQueryStateProps & {
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
