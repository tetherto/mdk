import { BarChart, ChartContainer, CURRENCY, formatValueUnit } from '@core'
import type { ReactElement } from 'react'

import type { BarChartDataResult } from '../../../utils/to-bar-chart-data'
import {
  btcChartTooltip,
  financialBarChartScalesXY,
} from '../../../utils/financial-bar-chart.constants'

export type BitcoinProducedChartProps = {
  chartData: BarChartDataResult
  isLoading?: boolean
  hasAllZeros?: boolean
  height?: number
}

/**
 * Time-series chart of bitcoin produced per day across the selected reporting window.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const BitcoinProducedChart = ({
  chartData,
  isLoading = false,
  hasAllZeros = false,
  height = 360,
}: BitcoinProducedChartProps): ReactElement => (
  <div className="mdk-ebitda__chart">
    <h2 className="mdk-ebitda__chart-title">Bitcoin Produced</h2>
    <ChartContainer loading={false} empty={!isLoading && (hasAllZeros || chartData.isEmpty)}>
      <BarChart
        data={chartData}
        showDataLabels
        formatDataLabel={(value) => String(formatValueUnit(value, CURRENCY.BTC))}
        showLegend
        legendPosition="bottom"
        legendAlign="start"
        tooltip={btcChartTooltip}
        formatYLabel={(value) => formatValueUnit(value, CURRENCY.BTC)}
        height={height}
        options={{ scales: financialBarChartScalesXY }}
      />
    </ChartContainer>
  </div>
)
