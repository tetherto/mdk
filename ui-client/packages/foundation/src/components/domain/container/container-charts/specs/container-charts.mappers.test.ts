import { describe, expect, it } from 'vitest'

import { overviewChartResultToLineChartCardData } from '../container-charts.mappers'
import type { OverviewChartResult } from '../container-charts.types'

describe('overviewChartResultToLineChartCardData', () => {
  it('maps datasets and converts x from seconds to ms', () => {
    const input: OverviewChartResult = {
      timeRange: null,
      yTicksFormatter: (v) => `${v}°C`,
      datasets: [
        {
          type: 'line',
          label: 'A',
          borderColor: '#f00',
          pointRadius: 1,
          data: [{ x: 1700000000, y: 22 }],
        },
      ],
    }
    const out = overviewChartResultToLineChartCardData(input)
    expect(out.yTicksFormatter?.(22)).toBe('22°C')
    expect(out.datasets[0]?.data[0]).toEqual({ x: 1_700_000_000_000, y: 22 })
  })
})
