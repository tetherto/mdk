import { CHART_COLORS, convertKwToW, UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import type {
  ChartDataPayload,
  ContainerChartsBuilderProps,
} from '../../../../container-charts-builder'
import ContainerChartsBuilder from '../../../../container-charts-builder'

/**
 * Bitmain Power Charts
 *
 * Displays power consumption for Bitmain containers with distribution boxes.
 * Shows total power and individual power for each distribution box.
 * Automatically calculates total power from the sum of both boxes and formats
 * the display units (kW/MW) based on the power magnitude.
 *
 * Features:
 * - Total Power - Sky Blue line (sum of both boxes)
 * - Dist. Box 1 Power - Violet line
 * - Dist. Box 2 Power - Red line
 * - Interactive legend for toggling series
 * - Timeline selector (1h, 6h, 24h, 7d, 30d)
 * - Current power consumption display with auto unit (W/kW/MW)
 * - Automatic kW to W conversion for chart display
 *
 * @example
 * ```tsx
 * <BitMainPowerCharts
 *   tag="container1"
 *   chartTitle="Power Consumption"
 *   data={powerData}
 *   timeline="24h"
 *   showLegend
 *   showRangeSelector
 * />
 * ```
 */
export const BitMainPowerCharts = ({
  tag,
  chartTitle = 'Power Consumption',
  dateRange,
  data,
  timeline = '24h',
  height,
  fixedTimezone,
  showLegend = true,
  showRangeSelector = true,
  footer,
}: ContainerChartsBuilderProps): ReactElement => {
  const chartDataPayload = useMemo<ChartDataPayload>(() => {
    return {
      unit: UNITS.POWER_W, // Display unit is kW, but values will be converted to W in the formatter
      valueDecimals: 2,
      lines: [
        {
          label: 'Total Power',
          backendAttribute: 'total_power_computed', // Computed from box1 + box2
          borderColor: CHART_COLORS.SKY_BLUE,
          borderWidth: 3,
          visible: true,
        },
        {
          label: 'Dist. Box 1 Power',
          backendAttribute: 'distribution_box1_power_group',
          borderColor: CHART_COLORS.VIOLET,
          visible: true,
        },
        {
          label: 'Dist. Box 2 Power',
          backendAttribute: 'distribution_box2_power_group',
          borderColor: CHART_COLORS.red,
          visible: true,
        },
      ],
      currentValueLabel: {
        backendAttribute: 'total_power_computed',
        decimals: 2,
      },
      valueFormatter: convertKwToW,
    }
  }, [])

  // Preprocess data to add computed total_power field
  const processedData = useMemo(() => {
    if (!data?.length) return []

    return data.map((entry) => {
      const containerStatsGroup = entry?.container_specific_stats_group_aggr

      if (!containerStatsGroup) return entry

      // Process each container in the group
      const processedContainerStats: Record<string, Record<string, unknown>> = {}

      Object.entries(containerStatsGroup).forEach(([containerKey, containerStats]) => {
        const box1Power = Number(containerStats?.distribution_box1_power_group ?? 0)
        const box2Power = Number(containerStats?.distribution_box2_power_group ?? 0)
        const totalPower = box1Power + box2Power

        processedContainerStats[containerKey] = {
          ...containerStats,
          total_power_computed: totalPower,
        }
      })

      return {
        ...entry,
        container_specific_stats_group_aggr: processedContainerStats,
      }
    })
  }, [data])

  return (
    <ContainerChartsBuilder
      tag={tag}
      chartTitle={chartTitle}
      dateRange={dateRange}
      chartDataPayload={chartDataPayload}
      data={processedData}
      timeline={timeline}
      fixedTimezone={fixedTimezone}
      showLegend={showLegend}
      height={height}
      showRangeSelector={showRangeSelector}
      footer={footer}
    />
  )
}
