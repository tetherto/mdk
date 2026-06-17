export type AverageDowntimeChartData = {
  labels: string[]
  curtailment?: number[]
  operationalIssues?: number[]
}

export type AverageDowntimeChartProps = Partial<{
  title: string
  unit: string
  height: number
  barWidth: number
  className: string
  isLoading: boolean
  emptyMessage: string
  data: AverageDowntimeChartData
  /** Formats Y-axis ticks, tooltips, and bar data labels (values are 0–1 rates). */
  yTicksFormatter: (value: number) => string
  showDataLabels: boolean
}>
