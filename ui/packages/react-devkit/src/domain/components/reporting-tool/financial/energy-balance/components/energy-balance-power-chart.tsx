import { ChartContainer, cn, LineChart, UNITS } from '@primitives'
import type { ReactElement } from 'react'
import { useState } from 'react'

import type { PeriodType } from '../../../utils/financial-period'
import { toLineChartData } from '../power-chart.utils'
import {
  ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT,
  ENERGY_BALANCE_POWER_CHART_HEIGHT,
} from '../energy-balance-chart.constants'
import type { ThresholdLineChartInput } from '../energy-balance.types'

export type EnergyBalancePowerChartProps = {
  /**
   * Chart height when `fillHeight` is false
   * @default 280
   */
  height?: number
  /**
   * Stretch the panel and chart to fill a mosaic cell (uses height `320` and `mdk-energy-balance__panel--fill`). Used on the revenue tab power column in `EnergyBalanceRevenueCharts`.
   * @default false
   */
  fillHeight?: boolean
  /** Controls x-axis date formatting (`month` uses `MM-yy`) */
  periodType: PeriodType
  /** Series and optional threshold line for power vs availability */
  chartInput: ThresholdLineChartInput
}

/**
 * Line chart visualising power consumption against threshold for the energy balance view.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalancePowerChart = ({
  chartInput,
  periodType,
  fillHeight = false,
  height = ENERGY_BALANCE_POWER_CHART_HEIGHT,
}: EnergyBalancePowerChartProps): ReactElement => {
  const [visibility, setVisibility] = useState<boolean[]>([])
  const lineData = toLineChartData(chartInput)

  const dataWithVisibility = {
    datasets: lineData.datasets.map((ds, i) => ({ ...ds, visible: visibility[i] ?? true })),
  }

  const legendData = lineData.datasets.map((ds, i) => ({
    label: ds.label as string,
    color: ds.borderColor as string,
    hidden: !(visibility[i] ?? true),
  }))

  const handleToggle = (index: number): void => {
    setVisibility((prev) => {
      const next = lineData.datasets.map((_, i) => prev[i] ?? true)
      next[index] = !next[index]
      return next
    })
  }

  return (
    <section
      className={cn('mdk-energy-balance__panel', fillHeight && 'mdk-energy-balance__panel--fill')}
    >
      <ChartContainer
        title={`Power (${UNITS.ENERGY_MW})`}
        legendData={legendData}
        onToggleDataset={handleToggle}
      >
        <LineChart
          height={fillHeight ? ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT : height}
          data={dataWithVisibility}
          unit={UNITS.ENERGY_MW}
          customDateFormat={periodType === 'month' ? 'MM-yy' : undefined}
        />
      </ChartContainer>
    </section>
  )
}
