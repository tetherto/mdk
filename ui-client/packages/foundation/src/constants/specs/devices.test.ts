import { describe, expect, it } from 'vitest'
import { CROSS_THING_TYPES } from '../devices'

describe('device constants', () => {
  it('should have cross-thing types defined', () => {
    expect(CROSS_THING_TYPES.POOL).toBe('pool')
    expect(CROSS_THING_TYPES.MINER).toBe('miner')
    expect(CROSS_THING_TYPES.CABINET).toBe('cabinet')
    expect(CROSS_THING_TYPES.CONTAINER).toBe('container')
  })

  it('should have all expected thing types', () => {
    const types = Object.values(CROSS_THING_TYPES)
    expect(types).toContain('pool')
    expect(types).toContain('miner')
    expect(types).toContain('cabinet')
    expect(types).toContain('container')
    expect(types).toHaveLength(4)
  })
})
