import { describe, expect, it } from 'vitest'
import { CONSUMPTION_NOMINAL_VALUE_W } from '../nominal-values'

describe('nominal values constants', () => {
  it('should have consumption nominal value in watts', () => {
    expect(CONSUMPTION_NOMINAL_VALUE_W).toBe(22500000)
    expect(CONSUMPTION_NOMINAL_VALUE_W).toBeGreaterThan(0)
  })

  it('should be a reasonable power value', () => {
    expect(CONSUMPTION_NOMINAL_VALUE_W).toBeLessThan(100000000)
  })
})
