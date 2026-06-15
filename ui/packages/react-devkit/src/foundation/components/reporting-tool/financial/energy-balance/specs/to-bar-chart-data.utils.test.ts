import { describe, expect, it } from 'vitest'

import { toBarChartData } from '../../../utils/to-bar-chart-data'

describe('toBarChartData', () => {
  it('transforms series input into Chart.js labels and datasets', () => {
    const result = toBarChartData({
      labels: ['Jan', 'Feb'],
      series: [
        { label: 'Revenue', values: [100, 200], color: '#ff0000' },
        { label: 'Cost', values: [80, 90], color: '#00ff00' },
      ],
    })

    expect(result.labels).toEqual(['Jan', 'Feb'])
    expect(result.datasets).toHaveLength(2)
    expect(result.datasets[0]).toMatchObject({
      type: 'bar',
      label: 'Revenue',
      data: [100, 200],
    })
  })

  it('supports stacked series', () => {
    const result = toBarChartData({
      labels: ['A'],
      series: [
        { label: 'A', values: [1], stack: 's1' },
        { label: 'B', values: [2], stack: 's1' },
      ],
    })

    expect(result.datasets[0]).toMatchObject({ stack: 's1' })
    expect(result.datasets[1]).toMatchObject({ stack: 's1' })
  })
})
