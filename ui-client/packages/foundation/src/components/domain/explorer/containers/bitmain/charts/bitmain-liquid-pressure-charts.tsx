import { CHART_COLORS, convertMpaToBar, UNITS } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

const LIQUID_PRESSURE_CHART_VALUE_DECIMALS = 3

/**
 * Bitmain Liquid Pressure Charts
 *
 * Displays supply and return liquid pressure readings for Bitmain containers.
 * Converts pressure values from MPa to bar for display.
 *
 * Features:
 * - Supply Liquid Pressure - Sky Blue line
 * - Return Liquid Pressure - Violet line
 * - Automatic MPa to bar conversion
 * - Interactive legend for toggling series
 * - Timeline selector (1h, 6h, 24h, 7d, 30d)
 * - Current pressure display
 *
 * @example
 * ```tsx
 * <BitMainLiquidPressureCharts
 *   tag="container1"
 *   chartTitle="Liquid Pressure"
 *   data={pressureData}
 *   timeline="24h"
 *   showLegend
 *   showRangeSelector
 * />
 * ```
 */
export const BitMainLiquidPressureCharts = ({
  tag,
  chartTitle = 'Liquid Pressure',
  dateRange,
  data,
  timeline = '24h',
  height,
  fixedTimezone,
  showLegend = true,
  showRangeSelector = true,
  footer,
}: ContainerChartsBuilderProps): ReactElement => {
  const chartDataPayload = useMemo<ChartDataPayload>(
    () => ({
      unit: UNITS.PRESSURE_BAR,
      valueDecimals: LIQUID_PRESSURE_CHART_VALUE_DECIMALS,
      lines: [
        {
          label: 'Supply Liquid Pressure',
          backendAttribute: 'supply_liquid_pressure_group',
          borderColor: CHART_COLORS.SKY_BLUE,
          visible: true,
        },
        {
          label: 'Return Liquid Pressure',
          backendAttribute: 'return_liquid_pressure_group',
          borderColor: CHART_COLORS.VIOLET,
          visible: true,
        },
      ],
      currentValueLabel: {
        backendAttribute: 'supply_liquid_pressure_group',
        decimals: LIQUID_PRESSURE_CHART_VALUE_DECIMALS,
      },
      valueFormatter: (value: number): number => convertMpaToBar(value),
    }),
    [],
  )

  return (
    <ContainerChartsBuilder
      tag={tag}
      chartTitle={chartTitle}
      dateRange={dateRange}
      chartDataPayload={chartDataPayload}
      data={data}
      timeline={timeline}
      fixedTimezone={fixedTimezone}
      height={height}
      showLegend={showLegend}
      showRangeSelector={showRangeSelector}
      footer={footer}
    />
  )
}
