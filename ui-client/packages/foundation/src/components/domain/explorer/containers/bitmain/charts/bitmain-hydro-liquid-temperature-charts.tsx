import { CHART_COLORS, UNITS } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

/**
 * Bitmain Hydro Liquid Temperature Charts
 *
 * Displays secondary liquid supply temperature readings (Temp1 and Temp2) for Bitmain Hydro containers.
 *
 * Features:
 * - Sec. Liquid supply Temp1 - Sky Blue line
 * - Sec. Liquid supply Temp2 - Violet line
 * - Interactive legend for toggling series
 * - Timeline selector (1h, 6h, 24h, 7d, 30d)
 * - Current temperature display
 *
 * @example
 * ```tsx
 * <BitMainHydroLiquidTemperatureCharts
 *   tag="container1"
 *   chartTitle="Liquid Temperature"
 *   data={tempData}
 *   timeline="24h"
 *   showLegend
 *   showRangeSelector
 * />
 * ```
 */
export const BitMainHydroLiquidTemperatureCharts = ({
  tag,
  chartTitle = 'Hydro Liquid Temperature',
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
          label: 'Sec. Liquid supply Temp1',
          backendAttribute: 'second_supply_temp1_group',
          borderColor: CHART_COLORS.SKY_BLUE,
          visible: true,
        },
        {
          label: 'Sec. Liquid supply Temp2',
          backendAttribute: 'second_supply_temp2_group',
          borderColor: CHART_COLORS.VIOLET,
          visible: true,
        },
      ],
      currentValueLabel: {
        backendAttribute: 'second_supply_temp1_group',
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
