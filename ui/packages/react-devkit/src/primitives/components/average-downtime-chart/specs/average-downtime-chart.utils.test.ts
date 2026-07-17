import { describe, expect, it } from 'vitest'

import { CHART_COLORS } from '../../../constants/colors'
import {
  buildAverageDowntimeBarChartData,
  buildAverageDowntimeTooltip,
  hasAverageDowntimeData,
} from '../utils'

describe('buildAverageDowntimeBarChartData', () => {
  it('returns stacked datasets for curtailment and op. issues', () => {
    const result = buildAverageDowntimeBarChartData({
      labels: ['A', 'B'],
      curtailment: [0.1, 0.2],
      operationalIssues: [0.3, 0.4],
    })

    expect(result.labels).toEqual(['A', 'B'])
    expect(result.datasets).toHaveLength(2)
    expect(result.datasets[0]).toMatchObject({
      label: 'Curtailment',
      data: [0.1, 0.2],
      stack: 'DT',
      borderColor: CHART_COLORS.VIOLET,
    })
    expect(result.datasets[1]).toMatchObject({
      label: 'Op. Issues',
      data: [0.3, 0.4],
      stack: 'DT',
      borderColor: CHART_COLORS.SKY_BLUE,
    })
  })
})

describe('hasAverageDowntimeData', () => {
  it('is false when periods or series are missing', () => {
    expect(hasAverageDowntimeData(undefined)).toBe(false)
    expect(hasAverageDowntimeData({ labels: [] })).toBe(false)
    expect(hasAverageDowntimeData({ labels: ['A'], curtailment: [], operationalIssues: [] })).toBe(
      false,
    )
  })

  it('is true when rate series exist even if all values are zero', () => {
    expect(
      hasAverageDowntimeData({ labels: ['A', 'B'], curtailment: [0, 0], operationalIssues: [0, 0] }),
    ).toBe(true)
  })

  it('is true when either series has values', () => {
    expect(hasAverageDowntimeData({ labels: ['A'], curtailment: [0.01] })).toBe(true)
    expect(hasAverageDowntimeData({ labels: ['A'], operationalIssues: [0.02] })).toBe(true)
  })
})

describe('buildAverageDowntimeTooltip', () => {
  it('formats tooltip values as percentages', () => {
    const formatted = buildAverageDowntimeTooltip((value) => String(value * 100)).valueFormatter!(
      0.125,
      {} as never,
    )

    expect(formatted).toBe('12.5%')
  })
})
