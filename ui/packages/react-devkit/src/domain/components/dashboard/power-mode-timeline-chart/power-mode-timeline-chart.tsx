import { memo, useMemo } from 'react'
import { CHART_TITLES } from '../../../constants/charts'
import { TimelineChart } from '../../timeline-chart'
import type { PowerModeTimelineEntry } from './power-mode-timeline-chart.helper'
import {
  getPowerModeTimelineChartData,
  transformToTimelineChartData,
} from './power-mode-timeline-chart.helper'

/** Props for {@link PowerModeTimelineChart}. */
export type PowerModeTimelineChartProps = Partial<{
  /** Initial power-mode entries (each with start/end ts + mode). */
  data: PowerModeTimelineEntry[]
  /** Streaming updates appended to the initial data. */
  dataUpdates: PowerModeTimelineEntry[]
  /** Show a loading skeleton instead of the chart. */
  isLoading: boolean
  /** IANA timezone string for x-axis tick formatting. */
  timezone: string
  /** Chart title. */
  title: string
}>

/**
 * Timeline chart for power-mode state changes over time. Wraps
 * {@link TimelineChart} with mining-specific data shaping.
 *
 * @category charts
 * @kernelCapability device-telemetry
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PowerModeTimelineChart data={powerModeLog} timezone="UTC" />
 * ```
 * @tier agent-ready
 */
export const PowerModeTimelineChart = memo(
  ({
    data = [],
    dataUpdates = [],
    isLoading = false,
    timezone = 'UTC',
    title = CHART_TITLES.POWER_MODE_TIMELINE,
  }: PowerModeTimelineChartProps) => {
    const initialData = useMemo(
      () => transformToTimelineChartData(getPowerModeTimelineChartData(data, timezone)),
      [data, timezone],
    )

    const newData = useMemo(
      () =>
        dataUpdates.length > 0
          ? transformToTimelineChartData(getPowerModeTimelineChartData(dataUpdates, timezone))
          : undefined,
      [dataUpdates, timezone],
    )

    return (
      <TimelineChart
        initialData={initialData}
        newData={newData}
        skipUpdates={!dataUpdates.length}
        axisTitleText={{ y: 'Power Mode', x: 'Time' }}
        isLoading={isLoading}
        title={title}
      />
    )
  },
)

PowerModeTimelineChart.displayName = 'PowerModeTimelineChart'
