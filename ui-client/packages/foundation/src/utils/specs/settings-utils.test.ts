import { describe, expect, it } from 'vitest'

import type { SettingsUser } from '../../types/settings.types'
import {
  filterUsers,
  formatLastActive,
  formatRoleLabel,
  validateSettingsJson,
} from '../settings-utils'

describe('filterUsers', () => {
  const users: SettingsUser[] = [
    { id: '1', email: 'test1@test.com', role: 'admin' },
    { id: '2', email: 'test2@test.com', role: 'read_only_user' },
  ]

  it('should return all users when no filter is provided', () => {
    const result = filterUsers({ users, email: '', role: null })
    expect(result).toStrictEqual(users)
  })

  it('should filter users by partial email', () => {
    const result = filterUsers({ users, email: 'test', role: null })
    expect(result).toStrictEqual(users)
  })

  it('should filter users by email', () => {
    const result = filterUsers({ users, email: 'test2@test.com', role: null })
    expect(result).toStrictEqual(users.slice(1))
  })

  it('should filter users by role', () => {
    const result = filterUsers({ users, email: '', role: 'read_only_user' })
    expect(result).toStrictEqual(users.slice(1))
  })

  it('should filter users by both email and role', () => {
    const result = filterUsers({ users, email: 'test2@test.com', role: 'read_only_user' })
    expect(result).toStrictEqual(users.slice(1))
  })

  it('should not return users when no match occurs', () => {
    const result = filterUsers({ users, email: 'test3@test.com', role: 'read_only_user' })
    expect(result).toStrictEqual([])
  })
})

describe('formatRoleLabel', () => {
  it('should format single-word role', () => {
    expect(formatRoleLabel('admin')).toBe('Admin')
  })

  it('should format multi-word role with underscores', () => {
    expect(formatRoleLabel('read_only_user')).toBe('Read Only User')
  })

  it('should format site_operator', () => {
    expect(formatRoleLabel('site_operator')).toBe('Site Operator')
  })
})

describe('formatLastActive', () => {
  it('should return dash for undefined', () => {
    expect(formatLastActive(undefined)).toBe('-')
  })

  it('should return dash for invalid date', () => {
    expect(formatLastActive('not-a-date')).toBe('-')
  })

  it('should format valid ISO timestamp', () => {
    const result = formatLastActive('2026-03-15T14:30:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}/)
  })
})

describe('validateSettingsJson', () => {
  it('returns false for null input', () => {
    expect(validateSettingsJson(null)).toBe(false)
  })

  it('returns false for non-object input', () => {
    expect(validateSettingsJson('string')).toBe(false)
    expect(validateSettingsJson(42)).toBe(false)
    expect(validateSettingsJson(true)).toBe(false)
  })

  it('returns true when object has headerControls key', () => {
    expect(validateSettingsJson({ headerControls: {} })).toBe(true)
  })

  it('returns true when object has featureFlags key', () => {
    expect(validateSettingsJson({ featureFlags: {} })).toBe(true)
  })

  it('returns true when object has timestamp key', () => {
    expect(validateSettingsJson({ timestamp: '2024-01-01' })).toBe(true)
  })

  it('returns false when object has none of the expected keys', () => {
    expect(validateSettingsJson({ unknownKey: true })).toBe(false)
  })

  it('returns true when object has all expected keys', () => {
    expect(
      validateSettingsJson({
        headerControls: {},
        featureFlags: {},
        timestamp: '2024-01-01',
      }),
    ).toBe(true)
  })
})
