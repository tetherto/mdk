import { BarChart, ChartContainer, CURRENCY, CurrencyToggler, formatValueUnit, standardBarChartScalesXY, UNITS } from '@core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import { energyPerMwTooltip } from '../energy-balance-chart.constants'

import type { BarChartDataResult } from '../../../utils/to-bar-chart-data'
import type { DisplayMode } from '../build-energy-balance-view-model'

export type EnergyRevenueChartProps = {
  chartData: BarChartDataResult
  displayMode: DisplayMode
  barLabelFormatter: (v: number) => string
  onDisplayModeChange: (mode: DisplayMode) => void
  height?: number
}

/**
 * Bar chart showing site energy revenue per MWh, with USD/BTC currency toggle.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyRevenueChart = ({
  chartData,
  displayMode,
  barLabelFormatter,
  onDisplayModeChange,
  height = 300,
}: EnergyRevenueChartProps): ReactElement => {
  const unit =
    displayMode === CURRENCY.USD_LABEL
      ? `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`
      : `${CURRENCY.BTC}/${UNITS.ENERGY_MWH}`

  const tooltip = useMemo(() => energyPerMwTooltip(displayMode), [displayMode])

  const chartHeader = useMemo(
    () => (
      <div className="mdk-energy-balance__chart-header">
        <h2 className="mdk-energy-balance__chart-header-title">
          {`Site Energy Revenue (${unit})`}
        </h2>
        <CurrencyToggler
          currencies={[CURRENCY.USD_LABEL, CURRENCY.BTC_LABEL]}
          value={displayMode}
          onChange={(mode) => onDisplayModeChange(mode as DisplayMode)}
        />
      </div>
    ),
    [unit, displayMode, onDisplayModeChange],
  )

  return (
    <section className="mdk-energy-balance__panel mdk-energy-balance__panel--primary">
      <ChartContainer header={chartHeader}>
        <BarChart
          height={height}
          data={chartData}
          formatYLabel={(value) => formatValueUnit(value)}
          formatDataLabel={barLabelFormatter}
          legendPosition="bottom"
          legendAlign="start"
          tooltip={tooltip}
          showDataLabels
          options={{ scales: standardBarChartScalesXY }}
        />
      </ChartContainer>
    </section>
  )
}
