import { describe, expect, it } from 'vitest'

import { drawnSliceValues } from '../doughnut-chart.utils'

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)
const angle = (value: number, values: number[]): number => (value / sum(values)) * 360

describe('drawnSliceValues', () => {
  it('draws a 0.5% slice at the minimum angle and keeps the total', () => {
    const values = [99.5, 0.5]
    const drawn = drawnSliceValues(values, 10)

    expect(angle(drawn[1]!, drawn)).toBeCloseTo(10)
    expect(sum(drawn)).toBeCloseTo(sum(values))
  })

  it('leaves slices already above the minimum to scale', () => {
    expect(drawnSliceValues([50, 30, 20], 10)).toEqual([50, 30, 20])
  })

  it('keeps the larger slices in proportion to each other', () => {
    const drawn = drawnSliceValues([600, 300, 1], 20)

    expect(drawn[0]! / drawn[1]!).toBeCloseTo(2)
    expect(angle(drawn[2]!, drawn)).toBeCloseTo(20)
  })

  it('raises a slice pushed under the minimum by raising another', () => {
    // 1 is raised first; the rest then share 340°, which leaves 18 at about 17.4°
    const drawn = drawnSliceValues([334, 18, 1], 20)

    expect(angle(drawn[1]!, drawn)).toBeCloseTo(20)
    expect(angle(drawn[2]!, drawn)).toBeCloseTo(20)
    expect(sum(drawn)).toBeCloseTo(353)
  })

  it('ignores hidden and zero slices', () => {
    const drawn = drawnSliceValues([1000, 0, 0.5, 99.5], 10, { 0: true })

    expect(drawn[0]).toBe(1000)
    expect(drawn[1]).toBe(0)
    expect(angle(drawn[2]!, [drawn[2]!, drawn[3]!])).toBeCloseTo(10)
  })

  it('returns the values unchanged without a minimum or when it cannot fit', () => {
    expect(drawnSliceValues([99.5, 0.5], 0)).toEqual([99.5, 0.5])
    expect(drawnSliceValues([1, 1, 1, 1], 100)).toEqual([1, 1, 1, 1])
    expect(drawnSliceValues([], 10)).toEqual([])
  })
})
