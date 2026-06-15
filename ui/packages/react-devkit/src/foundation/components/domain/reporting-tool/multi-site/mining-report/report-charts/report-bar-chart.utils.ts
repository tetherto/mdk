import type { BarChartInput } from '@core'

import type { BarChartData } from '../lib/chart-builders'

export const miningBarChartToInput = (
  data: BarChartData,
  barWidth?: number,
): BarChartInput & { barWidth?: number } => ({
  labels: data.labels,
  barWidth,
  series: data.series.map((s) => ({
    label: s.label,
    values: s.values,
    color: s.color,
    stack: s.stack as string | undefined,
    gradient: s.gradient,
  })),
  lines: data.lines?.map((l) => ({
    label: l.label,
    values: l.values,
    color: l.color,
    yAxisID: l.yAxisID as string | undefined,
  })),
})
