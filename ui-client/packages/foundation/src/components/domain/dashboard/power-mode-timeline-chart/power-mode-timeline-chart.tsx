import { memo, useMemo } from 'react'
import { CHART_TITLES } from '../../../../constants/charts'
import { TimelineChart } from '../../timeline-chart'
import type { PowerModeTimelineEntry } from './power-mode-timeline-chart.helper'
import {
  getPowerModeTimelineChartData,
  transformToTimelineChartData,
} from './power-mode-timeline-chart.helper'

export type PowerModeTimelineChartProps = Partial<{
  data: PowerModeTimelineEntry[]
  dataUpdates: PowerModeTimelineEntry[]
  isLoading: boolean
  timezone: string
  title: string
}>

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
