import { BarChart, ChartContainer, CURRENCY, standardBarChartScalesXY } from '@core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import type { FinancialDateRange } from '../../utils/financial-period'
import { toBarChartData } from '../../utils/to-bar-chart-data'

import type { BtcPriceTimeSeriesEntry, CostTimeSeriesEntry } from './build-cost-summary-view-model'
import {
  usdChartTooltip,
} from '../../utils/financial-bar-chart.constants'
import { COST_BAR_CHART_HEIGHT, usdFormatter } from './cost-chart-shared'
import { buildProductionCostInput } from './production-cost-chart-input'

export type ProductionCostChartProps = {
  costLog: ReadonlyArray<CostTimeSeriesEntry>
  btcPriceLog: ReadonlyArray<BtcPriceTimeSeriesEntry>
  dateRange: FinancialDateRange | null
  isLoading?: boolean
}

/**
 * Production cost over time, overlaid with BTC price.
 *
 * Mirrors the OSS `ProductionCostPriceChart` - both series rendered as bars on
 * the same x-axis (bucket labels derived from `dateRange.period`).
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const ProductionCostChart = ({
  costLog,
  btcPriceLog,
  dateRange,
  isLoading = false,
}: ProductionCostChartProps): ReactElement => {
  const chartData = useMemo(
    () => toBarChartData(buildProductionCostInput({ costLog, btcPriceLog, dateRange })),
    [costLog, btcPriceLog, dateRange],
  )

  return (
    <div className="mdk-cost__chart">
      <h2 className="mdk-cost__chart-title">Production Cost / Price</h2>
      <div className="mdk-cost__chart-unit">{CURRENCY.USD}</div>
      <ChartContainer loading={isLoading} empty={!isLoading && chartData.isEmpty}>
        <BarChart
          data={chartData}
          showLegend
          legendPosition="bottom"
          legendAlign="start"
          tooltip={usdChartTooltip}
          formatYLabel={usdFormatter}
          height={COST_BAR_CHART_HEIGHT}
          options={{ scales: standardBarChartScalesXY }}
        />
      </ChartContainer>
    </div>
  )
}
