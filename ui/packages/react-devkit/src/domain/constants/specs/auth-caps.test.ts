import { describe, expect, it } from 'vitest'
import { AUTH_CAPS } from '../auth-caps.constants'

describe('auth caps constants', () => {
  it('should have capability shortcuts', () => {
    expect(AUTH_CAPS.temp).toBe('t')
    expect(AUTH_CAPS.miner).toBe('m')
    expect(AUTH_CAPS.revenue).toBe('r')
    expect(AUTH_CAPS.container).toBe('c')
    expect(AUTH_CAPS.features).toBe('f')
    expect(AUTH_CAPS.powermeter).toBe('p')
    expect(AUTH_CAPS.minerpool).toBe('mp')
    expect(AUTH_CAPS.electricity).toBe('e')
  })

  it('should have short capability codes', () => {
    Object.values(AUTH_CAPS).forEach((cap) => {
      expect(cap.length).toBeLessThanOrEqual(2)
    })
  })

  it('should have all capability types', () => {
    const caps = Object.values(AUTH_CAPS)
    expect(caps).toHaveLength(8)
  })
})
