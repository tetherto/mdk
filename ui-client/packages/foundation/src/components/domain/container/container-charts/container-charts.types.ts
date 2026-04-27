import type { TimeRangeType } from '@mdk/core'

export type ChartDataPoint = {
  x: number | string
  y: number
}

export type ChartDataset = {
  type: 'line'
  label: string
  data: ChartDataPoint[]
  borderColor: string
  pointRadius: number
}

export type EntryData = {
  [key: string]: number | null | undefined
}

export type ChartEntry = {
  ts: number | string
  container_specific_stats_group_aggr: Record<string, EntryData | null | undefined>
}

export type ChartDataByDevice = {
  [deviceName: string]: ChartDataset
}

export type OverviewChartResult = {
  yTicksFormatter: (value: number) => string
  timeRange: TimeRangeType | null
  datasets: ChartDataset[]
}
