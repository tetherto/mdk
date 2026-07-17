import type { FinancialDateRange } from '../../utils/financial-period'
import { getPeriodKey, getPeriodType } from '../../utils/financial-period'
import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'

import { COST_BAR_WIDTH, COST_COLOR, REVENUE_COLOR } from './cost-chart-shared'

export type AvgAllInCostDataPoint = {
  ts: number
  revenueUSDPerMWh: number
  costUSDPerMWh: number
}

export type BuildAvgAllInCostInputArgs = {
  data?: ReadonlyArray<AvgAllInCostDataPoint>
  dateRange: FinancialDateRange | null
}

/**
 * Build the Chart.js input for the Avg All-in Cost bar chart.
 *
 * Returns `null` when the consumer hasn't wired revenue/cost data through yet
 * so the component can render its empty-state placeholder.
 */
export const buildAvgAllInCostInput = ({
  data,
  dateRange,
}: BuildAvgAllInCostInputArgs): ToBarChartDataInput | null => {
  if (!data || data.length === 0) return null

  const periodType = getPeriodType(dateRange)
  const sorted = [...data].sort((a, b) => a.ts - b.ts)

  return {
    labels: sorted.map((entry) => getPeriodKey(entry.ts, periodType)),
    barWidth: COST_BAR_WIDTH,
    series: [
      {
        label: 'Revenue',
        values: sorted.map((entry) => entry.revenueUSDPerMWh),
        color: REVENUE_COLOR,
      },
      {
        label: 'Cost',
        values: sorted.map((entry) => entry.costUSDPerMWh),
        color: COST_COLOR,
      },
    ],
  }
}
