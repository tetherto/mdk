import { BarChart, ChartContainer, CURRENCY, standardBarChartScalesXY, UNITS } from '@primitives'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import type { FinancialDateRange } from '../../utils/financial-period'
import { toBarChartData } from '../../utils/to-bar-chart-data'

import type { AvgAllInCostDataPoint } from './avg-all-in-cost-chart-input'
import { buildAvgAllInCostInput } from './avg-all-in-cost-chart-input'
import {
  usdPerMwhChartTooltip,
} from '../../utils/financial-bar-chart.constants'
import { COST_BAR_CHART_HEIGHT, usdFormatter } from './cost-chart-shared'

export type AvgAllInCostChartProps = {
  data?: ReadonlyArray<AvgAllInCostDataPoint>
  dateRange: FinancialDateRange | null
  isLoading?: boolean
}

/**
 * Avg All-in Cost - revenue vs cost ($/MWh) bar chart over time.
 *
 * Renders the OSS `SiteEnergyVsCostChart`. The revenue/cost time-series isn't
 * carried by the cost-summary response, so consumers feed it through as a
 * separate prop (the OSS app sources it from `useAvgAllInPowerCostData`).
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const AvgAllInCostChart = ({
  data,
  dateRange,
  isLoading = false,
}: AvgAllInCostChartProps): ReactElement => {
  const chartData = useMemo(() => {
    const input = buildAvgAllInCostInput({ data, dateRange })
    return input ? toBarChartData(input) : null
  }, [data, dateRange])

  return (
    <div className="mdk-cost__chart">
      <h2 className="mdk-cost__chart-title">Avg All-in Cost</h2>
      <div className="mdk-cost__chart-unit">{`${CURRENCY.USD}/${UNITS.ENERGY_MWH}`}</div>
      <ChartContainer loading={isLoading} empty={!isLoading && (!chartData || chartData.isEmpty)}>
        {chartData ? (
          <BarChart
            data={chartData}
            showLegend
            legendPosition="bottom"
            legendAlign="start"
            tooltip={usdPerMwhChartTooltip}
            formatYLabel={usdFormatter}
            height={COST_BAR_CHART_HEIGHT}
            options={{ scales: standardBarChartScalesXY }}
          />
        ) : null}
      </ChartContainer>
    </div>
  )
}
