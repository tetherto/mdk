import { describe, expect, it } from 'vitest'

import { CONTAINER_CHART_PAIR_INDICES, TAGS_LABEL } from '../container-charts.constants'

describe('container-charts.constants', () => {
  it('exposes pair indices for dual tank/supply series', () => {
    expect(CONTAINER_CHART_PAIR_INDICES).toEqual([1, 2])
  })

  it('exposes human-readable labels for known combination keys', () => {
    expect(TAGS_LABEL['bd-d40-s19xp_am-s19xp']).toBe('Bitdeer S19XP')
    expect(TAGS_LABEL['as-immersion_am-s19xp']).toBe('Bitmain Immersion S19XP')
    expect(TAGS_LABEL['as-hk3_am-s19xp_h']).toBe('Bitmain Hydro S19XP')
  })

  it('includes all eight preset combinations', () => {
    expect(Object.keys(TAGS_LABEL)).toHaveLength(8)
  })
})
