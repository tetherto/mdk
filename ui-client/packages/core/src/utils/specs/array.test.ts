import { describe, expect, it } from 'vitest'

import { circularArrayAccess, getNestedValue, getWeightedAverage } from '../array'

describe('getNestedValue', () => {
  it('gets nested values by dot path', () => {
    expect(getNestedValue({ a: { b: 42 } }, 'a.b')).toBe(42)
    expect(getNestedValue({ x: 1 }, 'x')).toBe(1)
  })

  it('returns undefined for missing paths', () => {
    expect(getNestedValue({ a: 1 }, 'b.c')).toBe(undefined)
  })
})

describe('getWeightedAverage', () => {
  it('calculates weighted average', () => {
    const data = [
      { value: 100, weight: 10 },
      { value: 200, weight: 20 },
    ]
    const result = getWeightedAverage(data, 'value', 'weight')
    expect(result.avg).toBeCloseTo(166.67, 1)
    expect(result.totalWeight).toBe(30)
  })

  it('returns 0 avg when total weight is 0', () => {
    const result = getWeightedAverage([], 'value', 'weight')
    expect(result.avg).toBe(0)
  })
})

describe('circularArrayAccess', () => {
  it('cycles through array elements', () => {
    const gen = circularArrayAccess(['a', 'b', 'c'])
    expect(gen.next().value).toBe('a')
    expect(gen.next().value).toBe('b')
    expect(gen.next().value).toBe('c')
    expect(gen.next().value).toBe('a')
  })

  it('returns immediately for empty array', () => {
    const gen = circularArrayAccess([])
    expect(gen.next().done).toBe(true)
  })
})
