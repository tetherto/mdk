import { COLOR } from '@core'
import { describe, expect, it } from 'vitest'

import { getMetricCardValueColor } from '../metric-card-utils'

describe('getMetricCardValueColor', () => {
  it('returns white by default', () => {
    expect(getMetricCardValueColor({})).toBe(COLOR.WHITE)
  })

  it('returns transparent white when isTransparentColor is true', () => {
    expect(getMetricCardValueColor({ isTransparentColor: true })).toBe(COLOR.WHITE_ALPHA_05)
  })

  it('returns highlight color when isHighlighted is true', () => {
    expect(getMetricCardValueColor({ isHighlighted: true })).toBe(COLOR.COLD_ORANGE)
  })

  it('prefers highlight over transparent', () => {
    expect(getMetricCardValueColor({ isHighlighted: true, isTransparentColor: true })).toBe(
      COLOR.COLD_ORANGE,
    )
  })
})
