import { Mosaic } from '@core'
import type { ReactElement } from 'react'

import type { PeriodType } from '../../utils/financial-period'
import type { BarChartDataResult } from '../../utils/to-bar-chart-data'

import type { DisplayMode } from './build-energy-balance-view-model'
import { DowntimeChart } from './components/downtime-chart'
import { EnergyBalancePowerChart } from './components/energy-balance-power-chart'
import { EnergyRevenueChart } from './components/energy-revenue-chart'
import type { EnergyRevenueMetrics, ThresholdLineChartInput } from './energy-balance.types'
import { EnergyBalanceRevenueMetrics } from './energy-balance-revenue-metrics'

export type EnergyBalanceRevenueChartsProps = {
  revenueChartData: BarChartDataResult
  downtimeChartData: BarChartDataResult
  powerChartInput: ThresholdLineChartInput
  displayMode: DisplayMode
  barLabelFormatter: (v: number) => string
  onDisplayModeChange: (mode: DisplayMode) => void
  periodType: PeriodType
  revenueMetrics: EnergyRevenueMetrics
}

/**
 * Mosaic layout of revenue, downtime, and power charts for the energy balance revenue tab.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalanceRevenueCharts = ({
  revenueChartData,
  downtimeChartData,
  powerChartInput,
  displayMode,
  barLabelFormatter,
  onDisplayModeChange,
  periodType,
  revenueMetrics,
}: EnergyBalanceRevenueChartsProps): ReactElement => (
  <Mosaic
    className="mdk-energy-balance__revenue-mosaic"
    template={['revenue revenue', 'left power']}
    gap="16px"
    columns="1fr 1fr"
  >
    <Mosaic.Item area="revenue">
      <EnergyRevenueChart
        chartData={revenueChartData}
        displayMode={displayMode}
        barLabelFormatter={barLabelFormatter}
        onDisplayModeChange={onDisplayModeChange}
      />
    </Mosaic.Item>

    <Mosaic.Item area="left" className="mdk-energy-balance__revenue-mosaic-left">
      <div className="mdk-energy-balance__revenue-left">
        <EnergyBalanceRevenueMetrics metrics={revenueMetrics} />
        <DowntimeChart chartData={downtimeChartData} fillHeight />
      </div>
    </Mosaic.Item>

    <Mosaic.Item area="power" className="mdk-energy-balance__revenue-mosaic-power">
      <EnergyBalancePowerChart chartInput={powerChartInput} periodType={periodType} fillHeight />
    </Mosaic.Item>
  </Mosaic>
)
