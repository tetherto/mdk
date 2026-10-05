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
  /** Initial timeline data */
  initialData: TimelineChartData
  /** Streaming updates appended to the initial data */
  newData?: TimelineChartData
  /**
   * Ignore `newData`
   * @default false
   */
  skipUpdates?: boolean
  /** Visible time window */
  range?: ChartRange
  /**
   * Axis title strings
   * @default { x: "Time", y: "" }
   */
  axisTitleText?: AxisTitleText
  /**
   * Show loader
   * @default false
   */
  isLoading?: boolean
  /** Chart title */
  title?: string
  /** Chart pixel height */
  height?: number
}
