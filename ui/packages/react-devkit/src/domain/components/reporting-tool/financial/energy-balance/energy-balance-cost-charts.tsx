import type { ReactElement } from 'react'

import type { PeriodType } from '../../utils/financial-period'
import type { BarChartDataResult } from '../../utils/to-bar-chart-data'

import type { DisplayMode } from './build-energy-balance-view-model'
import { EnergyBalancePowerChart } from './components/energy-balance-power-chart'
import { EnergyCostChart } from './components/energy-cost-chart'
import type { EnergyCostChartInput, ThresholdLineChartInput } from './energy-balance.types'

export type EnergyBalanceCostChartsProps = {
  costChartData: BarChartDataResult
  btcUnit: EnergyCostChartInput['btcUnit']
  powerChartInput: ThresholdLineChartInput
  displayMode: DisplayMode
  barLabelFormatter: (v: number) => string
  onDisplayModeChange: (mode: DisplayMode) => void
  /** Show the revenue-vs-cost bar chart only for non-daily periods. */
  showCostBarChart: boolean
  periodType: PeriodType
}

/**
 * Layout container for the energy cost tab charts: revenue-vs-cost bar chart and power line chart.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalanceCostCharts = ({
  costChartData,
  btcUnit,
  powerChartInput,
  displayMode,
  barLabelFormatter,
  onDisplayModeChange,
  showCostBarChart,
  periodType,
}: EnergyBalanceCostChartsProps): ReactElement => (
  <div className="mdk-energy-balance__charts">
    {showCostBarChart && (
      <EnergyCostChart
        chartData={costChartData}
        btcUnit={btcUnit}
        displayMode={displayMode}
        barLabelFormatter={barLabelFormatter}
        onDisplayModeChange={onDisplayModeChange}
      />
    )}
    <EnergyBalancePowerChart chartInput={powerChartInput} periodType={periodType} />
  </div>
)
