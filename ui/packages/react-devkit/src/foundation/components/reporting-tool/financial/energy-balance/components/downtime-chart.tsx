import { BarChart, ChartContainer, cn, formatValueUnit, UNITS } from '@core'
import type { ReactElement } from 'react'

import type { BarChartDataResult } from '../../../utils/to-bar-chart-data'
import { financialBarChartScalesXY } from '../../../utils/financial-bar-chart.constants'
import { rateLabelFormatter } from '../build-energy-balance-view-model'
import {
  downtimeRateChartTooltip,
  ENERGY_BALANCE_DOWNTIME_CHART_HEIGHT,
  ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT,
} from '../energy-balance-chart.constants'

export type DowntimeChartProps = {
  height?: number
  fillHeight?: boolean
  chartData: BarChartDataResult
}

/**
 * Bar chart showing average downtime percentage broken down by time period.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const DowntimeChart = ({
  chartData,
  height = ENERGY_BALANCE_DOWNTIME_CHART_HEIGHT,
  fillHeight = false,
}: DowntimeChartProps): ReactElement => (
  <section
    className={cn('mdk-energy-balance__panel', fillHeight && 'mdk-energy-balance__panel--fill')}
  >
    <ChartContainer title={`Average Downtime (${UNITS.PERCENT})`}>
      <BarChart
        height={fillHeight ? ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT : height}
        data={chartData}
        isStacked
        formatYLabel={(value) => formatValueUnit(value)}
        formatDataLabel={rateLabelFormatter}
        legendPosition="bottom"
        legendAlign="start"
        tooltip={downtimeRateChartTooltip}
        showDataLabels
        options={{ scales: financialBarChartScalesXY }}
      />
    </ChartContainer>
  </section>
)
