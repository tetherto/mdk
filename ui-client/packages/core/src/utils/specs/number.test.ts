import { describe, expect, it } from 'vitest'

import {
  convertUnits,
  getPercentChange,
  percentage,
  safeNumber,
  shouldDisplayValue,
} from '../number'

describe('percentage', () => {
  it('calculates percentage correctly', () => {
    expect(percentage(25, 100)).toBe(25)
    expect(percentage(1, 3)).toBeCloseTo(33.33, 1)
  })

  it('returns decimal when keepOriginalRelation is true', () => {
    expect(percentage(25, 100, true)).toBe(0.25)
  })

  it('returns 0 for zero or falsy inputs', () => {
    expect(percentage(0, 100)).toBe(0)
    expect(percentage(50, 0)).toBe(0)
  })
})

describe('convertUnits', () => {
  it('converts between SI units', () => {
    expect(convertUnits(1000, 'decimal', 'k')).toBe(1)
    expect(convertUnits(1, 'M', 'k')).toBe(1000)
    expect(convertUnits(1, 'G', 'M')).toBe(1000)
  })
})

describe('shouldDisplayValue', () => {
  it('returns true for valid non-zero numbers', () => {
    expect(shouldDisplayValue(42)).toBe(true)
    expect(shouldDisplayValue(-1)).toBe(true)
  })

  it('returns false for zero, null, undefined, NaN', () => {
    expect(shouldDisplayValue(0)).toBe(false)
    expect(shouldDisplayValue(null)).toBe(false)
    expect(shouldDisplayValue(undefined)).toBe(false)
    expect(shouldDisplayValue(Number.NaN)).toBe(false)
  })
})

describe('getPercentChange', () => {
  it('calculates percent change', () => {
    expect(getPercentChange(110, 100)).toBe(10)
    expect(getPercentChange(90, 100)).toBe(-10)
  })

  it('returns null for invalid inputs', () => {
    expect(getPercentChange(100, 0)).toBe(null)
    expect(getPercentChange(Infinity, 100)).toBe(null)
  })
})

describe('safeNumber', () => {
  it('returns number for valid inputs', () => {
    expect(safeNumber(42)).toBe(42)
    expect(safeNumber('3.14')).toBe(3.14)
  })

  it('returns 0 for non-numeric inputs', () => {
    expect(safeNumber(null)).toBe(0)
    expect(safeNumber(undefined)).toBe(0)
    expect(safeNumber('abc')).toBe(0)
  })
})
