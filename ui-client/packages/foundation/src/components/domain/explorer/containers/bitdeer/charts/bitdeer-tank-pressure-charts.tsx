import { CHART_COLORS, UNITS } from '@tetherto/core'

/**
 * Tank Pressure Charts for Bitdeer containers
 *
 * Displays pressure readings from Tank1 and Tank2 in bar units.
 *
 * @example
 * ```tsx
 * <BitdeerTankPressureCharts
 *   tag="container1"
 *   chartTitle="Tank Pressure"
 *   data={pressureData}
 *   timeline="24h"
 * />
 * ```
 */
import type { ReactElement } from 'react'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

const TANK_PRESSURE_CHART_VALUE_DECIMALS = 1

const TANK_PRESSURE_CHART_DATA_PAYLOAD: ChartDataPayload = {
  unit: UNITS.PRESSURE_BAR,
  valueDecimals: TANK_PRESSURE_CHART_VALUE_DECIMALS,
  lines: [
    {
      label: 'Tank1 Pressure',
      backendAttribute: 'tank1_bar_group',
      borderColor: CHART_COLORS.yellow,
      visible: true,
    },
    {
      label: 'Tank2 Pressure',
      backendAttribute: 'tank2_bar_group',
      borderColor: CHART_COLORS.VIOLET,
      visible: true,
    },
  ],
  currentValueLabel: {
    backendAttribute: 'tank1_bar_group', // Default to tank1
    decimals: TANK_PRESSURE_CHART_VALUE_DECIMALS,
  },
}

export const BitdeerTankPressureCharts = ({
  tag,
  chartTitle = 'Tank Pressure',
  dateRange,
  data,
  timeline,
  fixedTimezone,
  height,
}: ContainerChartsBuilderProps): ReactElement => (
  <ContainerChartsBuilder
    tag={tag}
    chartTitle={chartTitle}
    dateRange={dateRange}
    chartDataPayload={TANK_PRESSURE_CHART_DATA_PAYLOAD}
    data={data}
    timeline={timeline}
    fixedTimezone={fixedTimezone}
    height={height}
  />
)
