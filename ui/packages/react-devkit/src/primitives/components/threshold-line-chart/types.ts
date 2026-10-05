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
  /** Chart title (unit appended when `unit` is set) */
  title: string
  /** Shown in title and axis/tooltip formatting */
  unit: string
  /**
   * Chart height in pixels (`360` when `isTall`)
   * @default 280
   */
  height: number
  /**
   * When true, uses a taller default height (360px).
   * @default false
   */
  isTall: boolean
  /** Extra class on the container */
  className: string
  /** Message when data is missing or all zero */
  emptyMessage: string
  /**
   * Legend with click-to-hide series
   * @default true
   */
  isLegendVisible: boolean
  /** `series` points plus optional `thresholds` lines */
  data: ThresholdLineChartData
  /** Custom Y-axis tick labels */
  yTicksFormatter: (value: number) => string
}>
