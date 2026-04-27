import { describe, expect, it, vi } from 'vitest'
import { USER_ROLE } from '../../constants/permissions.constants'
import type { AuthConfig } from '../auth-utils'
import { checkPermission, getSignInRedirectUrl } from '../auth-utils'
import * as tokenUtils from '../token-utils'

describe('checkPermission', () => {
  describe('config validation', () => {
    it('should return false when config is null', () => {
      const result = checkPermission(null, { perm: 'read' })
      expect(result).toBe(false)
    })

    it('should return false when config is undefined', () => {
      const result = checkPermission(undefined, { perm: 'read' })
      expect(result).toBe(false)
    })
  })

  describe('superAdmin access', () => {
    it('should return true for superAdmin regardless of permissions', () => {
      const config: AuthConfig = { superAdmin: true }
      const result = checkPermission(config, { perm: 'any_permission' })
      expect(result).toBe(true)
    })

    it('should return true for superAdmin with write check', () => {
      const config: AuthConfig = { superAdmin: true, write: false }
      const result = checkPermission(config, { write: true })
      expect(result).toBe(true)
    })

    it('should return true for superAdmin with cap check', () => {
      const config: AuthConfig = { superAdmin: true, caps: [] }
      const result = checkPermission(config, { cap: 'admin' })
      expect(result).toBe(true)
    })
  })

  describe('write permission checks', () => {
    it('should return true when write is requested and user has write permission', () => {
      const config: AuthConfig = { write: true }
      const result = checkPermission(config, { write: true })
      expect(result).toBe(true)
    })

    it('should return false when write is requested but user lacks write permission', () => {
      const config: AuthConfig = { write: false }
      const result = checkPermission(config, { write: true })
      expect(result).toBe(false)
    })

    it('should return false when write permission is undefined', () => {
      const config: AuthConfig = {}
      const result = checkPermission(config, { write: true })
      expect(result).toBe(false)
    })
  })

  describe('capability checks', () => {
    it('should return true when user has the requested capability', () => {
      const config: AuthConfig = { caps: ['admin', 'moderator', 'viewer'] }
      const result = checkPermission(config, { cap: 'admin' })
      expect(result).toBe(true)
    })

    it('should return false when user does not have the requested capability', () => {
      const config: AuthConfig = { caps: ['viewer'] }
      const result = checkPermission(config, { cap: 'admin' })
      expect(result).toBe(false)
    })

    it('should return false when caps array is empty', () => {
      const config: AuthConfig = { caps: [] }
      const result = checkPermission(config, { cap: 'admin' })
      expect(result).toBe(false)
    })

    it('should return false when caps is undefined', () => {
      const config: AuthConfig = {}
      const result = checkPermission(config, { cap: 'admin' })
      expect(result).toBe(false)
    })
  })

  describe('permission checks - direct match', () => {
    it('should return true when permission is directly included', () => {
      const config: AuthConfig = { permissions: ['users:read', 'posts:write'] }
      const result = checkPermission(config, { perm: 'users:read' })
      expect(result).toBe(true)
    })

    it('should return false when permission is not included', () => {
      const config: AuthConfig = { permissions: ['users:read'] }
      const result = checkPermission(config, { perm: 'posts:write' })
      expect(result).toBe(false)
    })

    it('should return false when permissions array is empty', () => {
      const config: AuthConfig = { permissions: [] }
      const result = checkPermission(config, { perm: 'users:read' })
      expect(result).toBe(false)
    })
  })

  describe('permission checks - segregated read/write levels', () => {
    it('should return true when user has all requested permission levels', () => {
      const config: AuthConfig = { permissions: ['users:rw'] }
      const result = checkPermission(config, { perm: 'users:r' })
      expect(result).toBe(true)
    })

    it('should return true when user has exact permission levels', () => {
      const config: AuthConfig = { permissions: ['users:rw'] }
      const result = checkPermission(config, { perm: 'users:rw' })
      expect(result).toBe(true)
    })

    it('should return false when user lacks some requested permission levels', () => {
      const config: AuthConfig = { permissions: ['users:r'] }
      const result = checkPermission(config, { perm: 'users:rw' })
      expect(result).toBe(false)
    })

    it('should return true when user has multiple levels and only one is requested', () => {
      const config: AuthConfig = { permissions: ['posts:rwx'] }
      const result = checkPermission(config, { perm: 'posts:w' })
      expect(result).toBe(true)
    })

    it('should return true when user has permission with multiple levels (rwx)', () => {
      const config: AuthConfig = { permissions: ['admin:rwx'] }
      const result = checkPermission(config, { perm: 'admin:rx' })
      expect(result).toBe(true)
    })

    it('should return false when access type does not match', () => {
      const config: AuthConfig = { permissions: ['users:rw'] }
      const result = checkPermission(config, { perm: 'posts:rw' })
      expect(result).toBe(false)
    })

    it('should handle permission without levels', () => {
      const config: AuthConfig = { permissions: ['users:'] }
      const result = checkPermission(config, { perm: 'users:r' })
      expect(result).toBe(false)
    })

    it('should handle multiple permissions with different levels', () => {
      const config: AuthConfig = { permissions: ['users:r', 'posts:w', 'comments:rw'] }
      const result1 = checkPermission(config, { perm: 'users:r' })
      const result2 = checkPermission(config, { perm: 'posts:w' })
      const result3 = checkPermission(config, { perm: 'comments:rw' })
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
    })

    it('should return false when permission levels are subset', () => {
      const config: AuthConfig = { permissions: ['users:r'] }
      const result = checkPermission(config, { perm: 'users:rx' })
      expect(result).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should return false when no permission check is provided', () => {
      const config: AuthConfig = { permissions: ['users:read'] }
      const result = checkPermission(config, {})
      expect(result).toBe(false)
    })

    it('should prioritize superAdmin over other checks', () => {
      const config: AuthConfig = {
        superAdmin: true,
        write: false,
        permissions: [],
        caps: [],
      }
      expect(checkPermission(config, { write: true })).toBe(true)
      expect(checkPermission(config, { perm: 'any' })).toBe(true)
      expect(checkPermission(config, { cap: 'any' })).toBe(true)
    })

    it('should check write before cap', () => {
      const config: AuthConfig = { write: true, caps: [] }
      const result = checkPermission(config, { write: true, cap: 'admin' })
      expect(result).toBe(true)
    })

    it('should check write before perm', () => {
      const config: AuthConfig = { write: true, permissions: [] }
      const result = checkPermission(config, { write: true, perm: 'users:read' })
      expect(result).toBe(true)
    })

    it('should check cap before perm', () => {
      const config: AuthConfig = { caps: ['admin'], permissions: [] }
      const result = checkPermission(config, { cap: 'admin', perm: 'users:read' })
      expect(result).toBe(true)
    })

    it('should handle malformed permission strings', () => {
      const config: AuthConfig = { permissions: ['malformed'] }
      const result = checkPermission(config, { perm: 'malformed:r' })
      expect(result).toBe(false)
    })
  })
})

describe('getSignInRedirectUrl', () => {
  describe('default redirect behavior', () => {
    it('should return "/" when authToken is null', () => {
      const result = getSignInRedirectUrl(null)
      expect(result).toBe('/')
    })

    it('should return "/" when authToken is undefined', () => {
      const result = getSignInRedirectUrl(undefined)
      expect(result).toBe('/')
    })

    it('should return "/" when authToken is empty string', () => {
      const result = getSignInRedirectUrl('')
      expect(result).toBe('/')
    })
  })

  describe('role-based redirects', () => {
    it('should redirect to /reporting-tool for REPORTING_TOOL_MANAGER role', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue([
        USER_ROLE.REPORTING_TOOL_MANAGER,
      ])

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/reporting-tool')
    })

    it('should return "/" for unknown roles', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue(['unknown_role'])

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/')
    })

    it('should return "/" when getRolesFromAuthToken returns empty array', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue([])

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/')
    })

    it('should return "/" when getRolesFromAuthToken returns null', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue(null as unknown as string[])

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/')
    })

    it('should only use the first role from multiple roles', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue([
        USER_ROLE.REPORTING_TOOL_MANAGER,
        'admin',
        'viewer',
      ])

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/reporting-tool')
    })

    it('should ignore roles after the first one', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue([
        'viewer',
        USER_ROLE.REPORTING_TOOL_MANAGER,
      ])

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/')
    })
  })

  describe('integration with getRolesFromAuthToken', () => {
    it('should call getRolesFromAuthToken with the provided token', () => {
      const spy = vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue(['admin'])

      getSignInRedirectUrl('test-token')

      expect(spy).toHaveBeenCalledWith('test-token')
    })

    it('should handle undefined from getRolesFromAuthToken', () => {
      vi.spyOn(tokenUtils, 'getRolesFromAuthToken').mockReturnValue(
        undefined as unknown as string[],
      )

      const result = getSignInRedirectUrl('valid-token')
      expect(result).toBe('/')
    })
  })
})
