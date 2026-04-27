import { describe, expect, it } from 'vitest'

import { USER_ROLE } from '../permissions.constants'
import {
  MULTI_SITE_USER_ROLES,
  SETTINGS_ERROR_CODES,
  USER_ROLES,
  usersReadPermission,
  usersWritePermission,
} from '../settings.constants'

describe('settings.constants', () => {
  it('USER_ROLES contains all single-site roles', () => {
    expect(USER_ROLES).toHaveLength(7)
    const values = USER_ROLES.map((r) => r.value)
    expect(values).toContain(USER_ROLE.ADMIN)
    expect(values).toContain(USER_ROLE.SITE_MANAGER)
    expect(values).toContain(USER_ROLE.SITE_OPERATOR)
    expect(values).toContain(USER_ROLE.FIELD_OPERATOR)
    expect(values).toContain(USER_ROLE.REPAIR_TECHNICIAN)
    expect(values).toContain(USER_ROLE.REPORTING_TOOL_MANAGER)
    expect(values).toContain(USER_ROLE.READ_ONLY)
  })

  it('MULTI_SITE_USER_ROLES contains only admin and read-only', () => {
    expect(MULTI_SITE_USER_ROLES).toHaveLength(2)
    const values = MULTI_SITE_USER_ROLES.map((r) => r.value)
    expect(values).toContain(USER_ROLE.ADMIN)
    expect(values).toContain(USER_ROLE.READ_ONLY)
  })

  it('permission strings are correctly composed', () => {
    expect(usersWritePermission).toBe('users:w')
    expect(usersReadPermission).toBe('users:r')
  })

  it('SETTINGS_ERROR_CODES has expected keys', () => {
    expect(SETTINGS_ERROR_CODES.ERR_USER_EXISTS).toBe('User already exists')
    expect(SETTINGS_ERROR_CODES.ERR_AUTH_FAIL_NO_PERMS).toBe('Not permitted')
    expect(SETTINGS_ERROR_CODES.DEFAULT).toBe('An error occurred')
  })
})
