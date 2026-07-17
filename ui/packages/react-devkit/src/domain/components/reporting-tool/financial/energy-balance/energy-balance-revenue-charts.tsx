import { AverageDowntimeChart, type AverageDowntimeChartData, cn, Mosaic, UNITS } from '@primitives'
import type { ReactElement } from 'react'

import type { PeriodType } from '../../utils/financial-period'

import type { DisplayMode } from './build-energy-balance-view-model'
import type { BarChartDataResult } from '../../utils/to-bar-chart-data'
import { EnergyBalancePowerChart } from './components/energy-balance-power-chart'
import { EnergyRevenueChart } from './components/energy-revenue-chart'
import { ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT } from './energy-balance-chart.constants'
import type { EnergyRevenueMetrics, ThresholdLineChartInput } from './energy-balance.types'
import { EnergyBalanceRevenueMetrics } from './energy-balance-revenue-metrics'

export type EnergyBalanceRevenueChartsProps = {
  revenueChartData: BarChartDataResult
  averageDowntimeData: AverageDowntimeChartData
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
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalanceRevenueCharts = ({
  revenueChartData,
  averageDowntimeData,
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
        <section className={cn('mdk-energy-balance__panel', 'mdk-energy-balance__panel--fill')}>
          <AverageDowntimeChart
            data={averageDowntimeData}
            title="Average Downtime"
            unit={UNITS.PERCENT}
            height={ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT}
            barWidth={45}
            showDataLabels
          />
        </section>
      </div>
    </Mosaic.Item>

    <Mosaic.Item area="power" className="mdk-energy-balance__revenue-mosaic-power">
      <EnergyBalancePowerChart chartInput={powerChartInput} periodType={periodType} fillHeight />
    </Mosaic.Item>
  </Mosaic>
)
