import { describe, expect, it } from 'vitest'
import { getLatestSample } from '../latest-sample'

describe('getLatestSample', () => {
  it('returns the last entry of a populated array', () => {
    expect(getLatestSample([1, 2, 3])).toBe(3)
  })

  it('returns undefined for an empty array', () => {
    expect(getLatestSample([])).toBeUndefined()
  })

  it('returns undefined for null / undefined inputs', () => {
    expect(getLatestSample(null)).toBeUndefined()
    expect(getLatestSample(undefined)).toBeUndefined()
  })

  it('preserves the element type without copying', () => {
    const last = { ts: 99, value: 42 }
    const arr = [{ ts: 1, value: 1 }, last]
    expect(getLatestSample(arr)).toBe(last)
  })
})
