import type { ReactElement } from 'react'

import type { FinancialDateRange } from '../../utils/financial-period'

import type { AvgAllInCostDataPoint } from './avg-all-in-cost-chart-input'
import { AvgAllInCostChart } from './avg-all-in-cost-chart'
import type {
  BtcPriceTimeSeriesEntry,
  CostSummaryMonetaryTotals,
  CostTimeSeriesEntry,
} from './build-cost-summary-view-model'
import { OperationsEnergyChart } from './operations-energy-chart'
import { ProductionCostChart } from './production-cost-chart'

export type CostChartsProps = {
  costLog: ReadonlyArray<CostTimeSeriesEntry>
  btcPriceLog: ReadonlyArray<BtcPriceTimeSeriesEntry>
  totals: CostSummaryMonetaryTotals | null
  dateRange: FinancialDateRange | null
  avgAllInCostData?: ReadonlyArray<AvgAllInCostDataPoint>
  isLoading?: boolean
}

/**
 * Convenience wrapper that renders the three cost-page charts in declaration
 * order. Pages that need bespoke layouts (e.g. `CostContent`'s 2x2 Mosaic)
 * compose the individual chart components directly instead.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const CostCharts = ({
  costLog,
  btcPriceLog,
  totals,
  dateRange,
  avgAllInCostData,
  isLoading,
}: CostChartsProps): ReactElement => (
  <div className="mdk-cost__charts">
    <ProductionCostChart
      costLog={costLog}
      btcPriceLog={btcPriceLog}
      dateRange={dateRange}
      isLoading={isLoading}
    />
    <AvgAllInCostChart data={avgAllInCostData} dateRange={dateRange} isLoading={isLoading} />
    <OperationsEnergyChart totals={totals} isLoading={isLoading} />
  </div>
)
