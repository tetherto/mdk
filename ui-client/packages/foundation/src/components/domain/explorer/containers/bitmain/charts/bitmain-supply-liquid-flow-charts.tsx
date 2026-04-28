import { CHART_COLORS, UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

/**
 * Bitmain Supply Liquid Flow Charts
 *
 * Displays supply liquid flow rate for Bitmain containers in cubic meters per hour (m³/h).
 *
 * Features:
 * - Supply Liquid Flow - Sky Blue line
 * - Interactive timeline selector (1h, 6h, 24h, 7d, 30d)
 * - Current flow rate display
 * - Optional legend and range selector
 *
 * @example
 * ```tsx
 * <BitMainSupplyLiquidFlowCharts
 *   tag="container1"
 *   chartTitle="Supply Liquid Flow"
 *   data={flowData}
 *   timeline="24h"
 *   showRangeSelector
 * />
 * ```
 */
export const BitMainSupplyLiquidFlowCharts = ({
  tag,
  chartTitle = 'Supply Liquid Flow',
  dateRange,
  data,
  timeline = '24h',
  height,
  fixedTimezone,
  showLegend = false, // Single series, legend not needed by default
  showRangeSelector = true,
  footer,
}: ContainerChartsBuilderProps): ReactElement => {
  const chartDataPayload = useMemo<ChartDataPayload>(
    () => ({
      unit: UNITS.FLOW_M3H_UNICODE,
      valueDecimals: 2,
      lines: [
        {
          label: 'Supply Liquid Flow',
          backendAttribute: 'supply_liquid_flow_group',
          borderColor: CHART_COLORS.SKY_BLUE,
          borderWidth: 2,
          visible: true,
        },
      ],
      currentValueLabel: {
        backendAttribute: 'supply_liquid_flow_group',
        decimals: 2,
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
      height={height}
      showLegend={showLegend}
      showRangeSelector={showRangeSelector}
      footer={footer}
    />
  )
}
