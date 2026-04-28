import { CHART_COLORS, UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

/**
 * Bitmain Liquid Temperature Charts
 *
 * Displays supply and return liquid temperature readings for Bitmain containers.
 *
 * Features:
 * - Supply Liquid Temp - Sky Blue line
 * - Return Liquid Temp - Violet line
 * - Interactive legend for toggling series
 * - Timeline selector (1h, 6h, 24h, 7d, 30d)
 * - Current temperature display
 *
 * @example
 * ```tsx
 * <BitMainLiquidTempCharts
 *   tag="container1"
 *   chartTitle="Liquid Temperature"
 *   data={tempData}
 *   timeline="24h"
 *   showLegend
 *   showRangeSelector
 * />
 * ```
 */
export const BitMainLiquidTempCharts = ({
  tag,
  chartTitle = 'Liquid Temperature',
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
      unit: UNITS.TEMPERATURE_C,
      valueDecimals: 1,
      lines: [
        {
          label: 'Supply Liquid Temp',
          backendAttribute: 'supply_liquid_temp_group',
          borderColor: CHART_COLORS.SKY_BLUE,
          visible: true,
        },
        {
          label: 'Return Liquid Temp',
          backendAttribute: 'return_liquid_temp_group',
          borderColor: CHART_COLORS.VIOLET,
          visible: true,
        },
      ],
      currentValueLabel: {
        backendAttribute: 'supply_liquid_temp_group',
        decimals: 1,
      },
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
      showLegend={showLegend}
      height={height}
      showRangeSelector={showRangeSelector}
      footer={footer}
    />
  )
}
