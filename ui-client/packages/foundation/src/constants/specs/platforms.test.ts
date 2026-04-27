import { describe, expect, it } from 'vitest'
import { OsTypes } from '../platforms'

describe('platform constants', () => {
  it('should have OS types defined', () => {
    expect(OsTypes.IOS).toBe('iOS')
    expect(OsTypes.MAC).toBe('Mac')
    expect(OsTypes.Linux).toBe('Linux')
    expect(OsTypes.Windows).toBe('Windows')
    expect(OsTypes.Android).toBe('Android')
  })

  it('should have all major operating systems', () => {
    const osValues = Object.values(OsTypes)
    expect(osValues).toHaveLength(5)
    expect(osValues).toContain('iOS')
    expect(osValues).toContain('Mac')
    expect(osValues).toContain('Linux')
    expect(osValues).toContain('Windows')
    expect(osValues).toContain('Android')
  })
})
