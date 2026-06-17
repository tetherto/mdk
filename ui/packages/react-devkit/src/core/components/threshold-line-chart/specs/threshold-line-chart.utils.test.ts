import { describe, expect, it } from 'vitest'

import { hasNonZeroData, toThresholdLineChartData } from '../utils'

describe('hasNonZeroData', () => {
  it('returns false when series are missing or all zero', () => {
    expect(hasNonZeroData(undefined)).toBe(false)
    expect(
      hasNonZeroData({
        series: [{ label: 'Power', points: [{ timestamp: 1, value: 0 }] }],
      }),
    ).toBe(false)
  })

  it('returns true when any point is non-zero', () => {
    expect(
      hasNonZeroData({
        series: [{ label: 'Power', points: [{ timestamp: 1, value: 12 }] }],
      }),
    ).toBe(true)
  })
})

describe('toThresholdLineChartData', () => {
  it('maps series and thresholds to ascending line datasets', () => {
    const t1 = Date.parse('2025-01-01')
    const t2 = Date.parse('2025-01-02')

    const result = toThresholdLineChartData({
      series: [
        {
          label: 'Power',
          color: '#f00',
          points: [
            { timestamp: '2025-01-02', value: 20 },
            { timestamp: '2025-01-01', value: 10 },
          ],
        },
      ],
      thresholds: [{ label: 'Cap', value: 25, color: '#0f0' }],
    })

    expect(result.datasets).toHaveLength(2)
    expect(result.datasets[0]?.data.map((p) => p.x)).toEqual([t1, t2])
    expect(result.datasets[1]?.label).toBe('Cap')
    expect(result.datasets[1]?.data).toEqual([
      expect.objectContaining({ x: t1, y: 25 }),
      expect.objectContaining({ x: t2, y: 25 }),
    ])
  })

  it('spans threshold lines across timestamps from every series', () => {
    const t1 = Date.parse('2025-01-01')
    const t2 = Date.parse('2025-01-02')

    const result = toThresholdLineChartData({
      series: [
        { label: 'Empty', points: [] },
        {
          label: 'Power',
          points: [
            { timestamp: '2025-01-02', value: 20 },
            { timestamp: '2025-01-01', value: 10 },
          ],
        },
      ],
      thresholds: [{ label: 'Cap', value: 25 }],
    })

    expect(result.datasets[1]?.data.map((p) => p.x)).toEqual([t1, t2])
  })
})
