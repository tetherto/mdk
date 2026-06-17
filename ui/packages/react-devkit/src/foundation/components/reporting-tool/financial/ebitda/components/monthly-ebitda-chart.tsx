import { BarChart, ChartContainer, CURRENCY, formatValueUnit, standardBarChartScalesXY } from '@core'
import type { ReactElement } from 'react'

import type { BarChartDataResult } from '../../../utils/to-bar-chart-data'
import {
  usdChartTooltip,
} from '../../../utils/financial-bar-chart.constants'

export type MonthlyEbitdaChartProps = {
  chartData: BarChartDataResult
  height?: number
}

/**
 * Bar chart comparing EBITDA across the most recent months for trend visualisation.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const MonthlyEbitdaChart = ({
  chartData,
  height = 360,
}: MonthlyEbitdaChartProps): ReactElement => (
  <div className="mdk-ebitda__chart">
    <h2 className="mdk-ebitda__chart-title">Monthly EBITDA</h2>
    <ChartContainer loading={false} empty={chartData.isEmpty}>
      <BarChart
        data={chartData}
        showDataLabels
        formatDataLabel={(value) => String(formatValueUnit(value, CURRENCY.USD))}
        showLegend
        legendPosition="bottom"
        legendAlign="start"
        tooltip={usdChartTooltip}
        formatYLabel={(value) => formatValueUnit(value, CURRENCY.USD)}
        height={height}
        options={{ scales: standardBarChartScalesXY }}
      />
    </ChartContainer>
  </div>
)
