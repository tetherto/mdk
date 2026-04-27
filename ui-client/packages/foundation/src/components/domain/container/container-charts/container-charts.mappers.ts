import { secondsToMs } from '@mdk/core'

import type { LineChartCardData } from '../../line-chart-card/types'

import type { OverviewChartResult } from './container-charts.types'

export const overviewChartResultToLineChartCardData = (
  result: OverviewChartResult,
): LineChartCardData => ({
  yTicksFormatter: result.yTicksFormatter,
  datasets: result.datasets.map((ds) => ({
    label: ds.label,
    borderColor: ds.borderColor,
    data: ds.data.map((p) => ({
      x: secondsToMs(typeof p.x === 'string' ? Number(p.x) : p.x),
      y: p.y,
    })),
  })),
})
