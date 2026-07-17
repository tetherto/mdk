import { CHART_COLORS, type LineChartData } from '@primitives'

import type { ThresholdLineChartInput } from './energy-balance.types'

/**
 * Maps threshold line chart input (series + horizontal constants) to lightweight-charts data.
 */
export const toLineChartData = (input?: ThresholdLineChartInput): LineChartData => {
  if (!input?.series?.length) {
    return { datasets: [] }
  }

  const timestamps = input.series[0]?.points.map((p) => p.ts) ?? []

  const seriesDatasets = input.series.map((s) => ({
    label: s.label,
    borderColor: s.color ?? CHART_COLORS.orange,
    data: s.points.map((p) => ({ x: p.ts, y: p.value })),
  }))

  const constantDatasets =
    input.constants?.map((c) => ({
      label: c.label,
      borderColor: c.color ?? CHART_COLORS.green,
      data: timestamps.map((ts) => ({ x: ts, y: c.value })),
    })) ?? []

  return {
    datasets: [...seriesDatasets, ...constantDatasets],
  }
}
