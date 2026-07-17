import { BarChart, ChartContainer, formatValueUnit, standardBarChartScalesXY } from '@primitives'
import { type JSX, useMemo } from 'react'

import { toBarChartData } from '../../utils/to-bar-chart-data'
import { buildRevenueChartViewModel } from './build-revenue-chart-view-model'
import { REVENUE_CHART_HEIGHT } from './revenue-chart.constants'
import type { RevenueChartProps } from './revenue-chart.types'
import './revenue-chart.scss'

/**
 * Stacked bar chart displaying monthly revenue per site.
 * Automatically switches between BTC and Sats display based on value scale.
 * Receives pre-fetched data as props — no internal data fetching.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const RevenueChart = ({
  data = [],
  isLoading = false,
  siteList = [],
  legendPosition = 'bottom',
  legendAlign = 'start',
}: RevenueChartProps): JSX.Element => {
  const { chartInput, currencyUnit } = useMemo(
    () => buildRevenueChartViewModel(data, siteList),
    [data, siteList],
  )

  const chartData = useMemo(() => toBarChartData(chartInput), [chartInput])

  const chartHeader = useMemo(
    () => (
      <div className="mdk-revenue-chart__header">
        <span className="mdk-revenue-chart__title">Revenue</span>
        <span className="mdk-revenue-chart__unit">{currencyUnit}</span>
      </div>
    ),
    [currencyUnit],
  )

  return (
    <ChartContainer header={chartHeader} loading={isLoading} empty={chartData.isEmpty}>
      <BarChart
        data={chartData}
        isStacked
        showLegend
        legendPosition={legendPosition}
        legendAlign={legendAlign}
        formatYLabel={(value) => String(formatValueUnit(value))}
        height={REVENUE_CHART_HEIGHT}
        options={{ scales: standardBarChartScalesXY }}
      />
    </ChartContainer>
  )
}

RevenueChart.displayName = 'RevenueChart'
