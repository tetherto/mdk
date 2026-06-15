import { describe, expect, it } from 'vitest'
import {
  STAT_3_HOURS,
  STAT_5_MINUTES,
  STAT_KEY_THRESHOLD_DAYS,
  STAT_REALTIME,
} from '../tail-log-stat-keys.constants'

describe('tail log stat keys constants', () => {
  it('should have stat interval keys', () => {
    expect(STAT_3_HOURS).toBe('stat-3h')
    expect(STAT_REALTIME).toBe('stat-rtd')
    expect(STAT_5_MINUTES).toBe('stat-5m')
  })

  it('should have stat key threshold', () => {
    expect(STAT_KEY_THRESHOLD_DAYS).toBe(30)
    expect(STAT_KEY_THRESHOLD_DAYS).toBeGreaterThan(0)
  })

  it('should have stat keys with consistent format', () => {
    expect(STAT_3_HOURS).toMatch(/^stat-/)
    expect(STAT_REALTIME).toMatch(/^stat-/)
    expect(STAT_5_MINUTES).toMatch(/^stat-/)
  })
})
