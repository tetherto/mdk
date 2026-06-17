export type ThresholdLineChartPoint = {
  value: number
  timestamp: string | number
}

export type ThresholdLineChartSeries = {
  label: string
  color?: string
  fill?: boolean
  points: ThresholdLineChartPoint[]
}

export type ThresholdLineChartThreshold = {
  label: string
  value: number
  color?: string
}

export type ThresholdLineChartData = {
  series: ThresholdLineChartSeries[]
  thresholds?: ThresholdLineChartThreshold[]
}

export type ThresholdLineChartProps = Partial<{
  title: string
  unit: string
  height: number
  /** When true, uses a taller default height (360px). */
  isTall: boolean
  className: string
  emptyMessage: string
  isLegendVisible: boolean
  data: ThresholdLineChartData
  yTicksFormatter: (value: number) => string
}>
