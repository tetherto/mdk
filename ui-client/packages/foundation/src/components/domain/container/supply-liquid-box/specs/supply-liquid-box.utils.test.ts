import { describe, expect, it } from 'vitest'
import { firstNumeric } from '../supply-liquid-box.utils'

describe('supply-liquid-box.utils', () => {
  describe('firstNumeric', () => {
    it('returns the first argument that is a finite number', () => {
      expect(firstNumeric(35, 40)).toBe(35)
      expect(firstNumeric(undefined, 40, 50)).toBe(40)
    })

    it('returns 0 when it is the first valid number', () => {
      expect(firstNumeric(0, 99)).toBe(0)
      expect(firstNumeric(Number.NaN, 0)).toBe(0)
    })

    it('returns negative numbers', () => {
      expect(firstNumeric(-12.5)).toBe(-12.5)
    })

    it('skips NaN and continues to the next candidate', () => {
      expect(firstNumeric(Number.NaN, 2.5)).toBe(2.5)
      expect(firstNumeric(Number.NaN, Number.NaN, 3)).toBe(3)
    })

    it('returns undefined when no candidate is a valid number', () => {
      expect(firstNumeric()).toBeUndefined()
      expect(firstNumeric(undefined, null, '42')).toBeUndefined()
      expect(firstNumeric(Number.NaN, Number.NaN)).toBeUndefined()
    })

    it('ignores non-number types', () => {
      expect(firstNumeric('35', 35)).toBe(35)
      expect(firstNumeric({}, [], false, true, 7)).toBe(7)
    })

    it('returns Infinity when it appears first (still typeof number and not NaN)', () => {
      expect(firstNumeric(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
    })
  })
})
