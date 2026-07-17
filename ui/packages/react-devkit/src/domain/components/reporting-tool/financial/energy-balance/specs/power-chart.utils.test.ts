import { describe, expect, it } from 'vitest'

import { toLineChartData } from '../power-chart.utils'

describe('toLineChartData', () => {
  it('returns empty datasets when input is undefined', () => {
    expect(toLineChartData(undefined)).toEqual({ datasets: [] })
  })

  it('maps series and constant lines to line chart datasets', () => {
    const result = toLineChartData({
      series: [
        {
          label: 'Power Consumption',
          color: '#ff0000',
          points: [
            { ts: 1000, value: 20 },
            { ts: 2000, value: 21 },
          ],
        },
      ],
      constants: [
        {
          label: 'Power Availability',
          value: 22.5,
          color: '#00ff00',
        },
      ],
    })

    expect(result.datasets).toHaveLength(2)
    expect(result.datasets[0]).toMatchObject({
      label: 'Power Consumption',
      borderColor: '#ff0000',
      data: [
        { x: 1000, y: 20 },
        { x: 2000, y: 21 },
      ],
    })
    expect(result.datasets[1]).toMatchObject({
      label: 'Power Availability',
      borderColor: '#00ff00',
      data: [
        { x: 1000, y: 22.5 },
        { x: 2000, y: 22.5 },
      ],
    })
  })
})
