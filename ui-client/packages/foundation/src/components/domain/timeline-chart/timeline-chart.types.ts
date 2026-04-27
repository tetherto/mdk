export type TimelineChartDataPoint = {
  x: [number, number]
  y: string | undefined
}

export type TimelineChartDataset = {
  label: string
  data: TimelineChartDataPoint[]
  borderColor?: string[]
  backgroundColor?: string[]
  color?: string
}

export type TimelineChartData = {
  labels: string[]
  datasets: TimelineChartDataset[]
}

export type ChartRange = {
  min: Date | number
  max: Date | number
}

export type AxisTitleText = {
  x: string
  y: string
}

export type TimelineChartProps = {
  initialData: TimelineChartData
  newData?: TimelineChartData
  skipUpdates?: boolean
  range?: ChartRange
  axisTitleText?: AxisTitleText
  isLoading?: boolean
  title?: string
  height?: number
}
