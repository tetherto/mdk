import type { FinancialDateRange } from '../../utils/financial-period'
import { getPeriodKey, getPeriodType } from '../../utils/financial-period'
import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'

import type { BtcPriceTimeSeriesEntry, CostTimeSeriesEntry } from './build-cost-summary-view-model'
import { BTC_PRICE_COLOR, COST_BAR_WIDTH, PRODUCTION_COST_COLOR } from './cost-chart-shared'

export type BuildProductionCostInputArgs = {
  costLog: ReadonlyArray<CostTimeSeriesEntry>
  btcPriceLog: ReadonlyArray<BtcPriceTimeSeriesEntry>
  dateRange: FinancialDateRange | null
}

/**
 * Build the Chart.js input for the Production Cost / Price bar chart.
 *
 * Merges `costLog` and `btcPriceLog` by `ts` instead of zipping by index so
 * a missing or out-of-order BTC-price bucket never silently misaligns with
 * its production-cost counterpart. Missing values are rendered as 0 bars,
 * matching the OSS empty-bucket behavior.
 */
export const buildProductionCostInput = ({
  costLog,
  btcPriceLog,
  dateRange,
}: BuildProductionCostInputArgs): ToBarChartDataInput => {
  const periodType = getPeriodType(dateRange)

  const costByTs = new Map<number, number>()
  for (const entry of costLog) costByTs.set(entry.ts, entry.totalCostUSD)

  const btcByTs = new Map<number, number>()
  for (const entry of btcPriceLog) btcByTs.set(entry.ts, entry.priceUSD)

  const sortedTs = Array.from(new Set([...costByTs.keys(), ...btcByTs.keys()])).sort(
    (a, b) => a - b,
  )

  return {
    labels: sortedTs.map((ts) => getPeriodKey(ts, periodType)),
    barWidth: COST_BAR_WIDTH,
    series: [
      {
        label: 'Production Cost',
        values: sortedTs.map((ts) => costByTs.get(ts) ?? 0),
        color: PRODUCTION_COST_COLOR,
      },
      {
        label: 'BTC Price',
        values: sortedTs.map((ts) => btcByTs.get(ts) ?? 0),
        color: BTC_PRICE_COLOR,
      },
    ],
  }
}
