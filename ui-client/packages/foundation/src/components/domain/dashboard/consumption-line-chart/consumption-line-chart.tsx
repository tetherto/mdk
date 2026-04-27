import { useMemo } from 'react'
import { DATE_RANGE } from '../../../../constants'
import { CHART_TITLES } from '../../../../constants/charts'
import type { TimelineOption } from '../../line-chart-card'
import { LineChartCard } from '../../line-chart-card'
import type { TailLogEntry } from './consumption-line-chart-helper'
import { buildConsumptionData } from './consumption-line-chart-helper'

type ConsumptionLineChartProps = {
  tag: string
  isDetailed: boolean
  skipMinMaxAvg: boolean
  powerAttribute: string
  label: string
  data: TailLogEntry[]
  isOneMinEnabled: boolean
  totalTransformerConsumption: boolean
  rawConsumptionW: number | string
  timelineOptions: TimelineOption[]
  timeline: string
  defaultTimeline: string
  onTimelineChange: (timeline: string) => void
}

export const ConsumptionLineChart = ({
  tag = 't-miner',
  isDetailed,
  skipMinMaxAvg = false,
  powerAttribute,
  label,
  data = [],
  isOneMinEnabled,
  totalTransformerConsumption,
  rawConsumptionW,
  timelineOptions,
  timeline,
  defaultTimeline,
  onTimelineChange,
}: Partial<ConsumptionLineChartProps>) => {
  const chartData = useMemo(
    () =>
      buildConsumptionData({
        data,
        tag,
        skipMinMaxAvg,
        powerAttribute,
        totalTransformerConsumption,
        rawConsumptionW,
        label,
      }),
    [data, tag, skipMinMaxAvg, powerAttribute, totalTransformerConsumption, rawConsumptionW, label],
  )

  return (
    <LineChartCard
      title={CHART_TITLES.POWER_CONSUMPTION}
      data={chartData}
      minHeight={200}
      timelineOptions={timelineOptions}
      timeline={timeline}
      defaultTimeline={defaultTimeline ?? (isOneMinEnabled ? DATE_RANGE.M1 : DATE_RANGE.M5)}
      onTimelineChange={onTimelineChange}
      detailLegends={isDetailed}
      shouldResetZoom
    />
  )
}
