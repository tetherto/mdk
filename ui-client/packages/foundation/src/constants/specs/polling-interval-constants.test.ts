import { describe, expect, it } from 'vitest'
import {
  POLLING_1m,
  POLLING_2m,
  POLLING_5s,
  POLLING_10s,
  POLLING_15s,
  POLLING_20s,
  POLLING_30s,
} from '../polling-interval-constants'

describe('polling interval constants', () => {
  it('should have polling intervals in milliseconds', () => {
    expect(POLLING_5s).toBe(5000)
    expect(POLLING_10s).toBe(10000)
    expect(POLLING_15s).toBe(15000)
    expect(POLLING_20s).toBe(20000)
    expect(POLLING_30s).toBe(30000)
    expect(POLLING_1m).toBe(60000)
    expect(POLLING_2m).toBe(120000)
  })

  it('should have intervals in ascending order', () => {
    expect(POLLING_5s).toBeLessThan(POLLING_10s)
    expect(POLLING_10s).toBeLessThan(POLLING_15s)
    expect(POLLING_15s).toBeLessThan(POLLING_20s)
    expect(POLLING_20s).toBeLessThan(POLLING_30s)
    expect(POLLING_30s).toBeLessThan(POLLING_1m)
    expect(POLLING_1m).toBeLessThan(POLLING_2m)
  })

  it('should have 2 minute interval as double of 1 minute', () => {
    expect(POLLING_2m).toBe(POLLING_1m * 2)
  })

  it('should have all intervals as positive numbers', () => {
    expect(POLLING_5s).toBeGreaterThan(0)
    expect(POLLING_1m).toBeGreaterThan(0)
    expect(POLLING_2m).toBeGreaterThan(0)
  })
})
