import type { ReactElement } from 'react'

import type { BarChartDataResult } from '../../utils/to-bar-chart-data'

import { BitcoinProducedChart } from './components/bitcoin-produced-chart'
import { MonthlyEbitdaChart } from './components/monthly-ebitda-chart'

export type EbitdaChartsProps = {
  showEbitdaBarChart: boolean
  ebitdaChartData: BarChartDataResult
  btcDisplayData: BarChartDataResult
  isLoading: boolean
  hasBtcProducedAllZeros: boolean
}

/**
 * Chart panel inside the EBITDA section visualising revenue, cost, and EBITDA over time.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EbitdaCharts = ({
  showEbitdaBarChart,
  ebitdaChartData,
  btcDisplayData,
  isLoading,
  hasBtcProducedAllZeros,
}: EbitdaChartsProps): ReactElement => (
  <div className="mdk-ebitda__charts">
    {showEbitdaBarChart && <MonthlyEbitdaChart chartData={ebitdaChartData} />}
    <BitcoinProducedChart
      chartData={btcDisplayData}
      isLoading={isLoading}
      hasAllZeros={hasBtcProducedAllZeros}
    />
  </div>
)
