import { BarChart, ChartContainer, CURRENCY, CurrencyToggler, formatValueUnit, UNITS } from '@core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import { financialBarChartScalesXY } from '../../../utils/financial-bar-chart.constants'
import { energyCostChartTooltip } from '../energy-balance-chart.constants'

import type { BarChartDataResult } from '../../../utils/to-bar-chart-data'
import type { DisplayMode } from '../build-energy-balance-view-model'
import type { EnergyCostChartInput } from '../energy-balance.types'

export type EnergyCostChartProps = {
  chartData: BarChartDataResult
  btcUnit: EnergyCostChartInput['btcUnit']
  displayMode: DisplayMode
  barLabelFormatter: (v: number) => string
  onDisplayModeChange: (mode: DisplayMode) => void
  height?: number
}

/**
 * Bar chart comparing site revenue vs cost per MWh, with USD/BTC currency toggle.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyCostChart = ({
  chartData,
  btcUnit,
  displayMode,
  barLabelFormatter,
  onDisplayModeChange,
  height = 300,
}: EnergyCostChartProps): ReactElement => {
  const unit =
    displayMode === CURRENCY.USD_LABEL
      ? `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`
      : `${btcUnit ?? CURRENCY.BTC_LABEL}/${UNITS.ENERGY_MWH}`

  const tooltip = useMemo(
    () => energyCostChartTooltip(displayMode, btcUnit, barLabelFormatter),
    [displayMode, btcUnit, barLabelFormatter],
  )

  const chartHeader = useMemo(
    () => (
      <div className="mdk-energy-balance__chart-header">
        <h2 className="mdk-energy-balance__chart-header-title">
          {`Site Revenue vs Cost (${unit})`}
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
          options={{ scales: financialBarChartScalesXY }}
        />
      </ChartContainer>
    </section>
  )
}
