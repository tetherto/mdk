import { describe, expect, it } from 'vitest'
import { AUTH_LEVELS, AUTH_PERMISSIONS, USER_ROLE } from '../permissions.constants'

describe('permissions constants', () => {
  describe('auth permissions', () => {
    it('should have all permission types', () => {
      expect(AUTH_PERMISSIONS.TEMP).toBe('temp')
      expect(AUTH_PERMISSIONS.MINER).toBe('miner')
      expect(AUTH_PERMISSIONS.USERS).toBe('users')
      expect(AUTH_PERMISSIONS.ALERTS).toBe('alerts')
      expect(AUTH_PERMISSIONS.TICKETS).toBe('tickets')
      expect(AUTH_PERMISSIONS.ACTIONS).toBe('actions')
      expect(AUTH_PERMISSIONS.REVENUE).toBe('revenue')
      expect(AUTH_PERMISSIONS.CONTAINER).toBe('container')
      expect(AUTH_PERMISSIONS.POWERMETER).toBe('powermeter')
      expect(AUTH_PERMISSIONS.ELECTRICITY).toBe('electricity')
    })

    it('should have lowercase permission names', () => {
      Object.values(AUTH_PERMISSIONS).forEach((permission) => {
        expect(permission).toBe(permission.toLowerCase())
      })
    })

    it('should have all expected permissions', () => {
      const permissions = Object.values(AUTH_PERMISSIONS)
      expect(permissions.length).toBeGreaterThan(10)
    })
  })

  describe('auth levels', () => {
    it('should have read and write levels', () => {
      expect(AUTH_LEVELS.READ).toBe('r')
      expect(AUTH_LEVELS.WRITE).toBe('w')
    })

    it('should have single character codes', () => {
      Object.values(AUTH_LEVELS).forEach((level) => {
        expect(level.length).toBe(1)
      })
    })
  })

  describe('user roles', () => {
    it('should have all user role types', () => {
      expect(USER_ROLE.ADMIN).toBe('admin')
      expect(USER_ROLE.READ_ONLY).toBe('read_only_user')
      expect(USER_ROLE.SITE_MANAGER).toBe('site_manager')
      expect(USER_ROLE.SITE_OPERATOR).toBe('site_operator')
      expect(USER_ROLE.FIELD_OPERATOR).toBe('field_operator')
      expect(USER_ROLE.REPAIR_TECHNICIAN).toBe('repair_technician')
      expect(USER_ROLE.REPORTING_TOOL_MANAGER).toBe('reporting_tool_manager')
    })

    it('should have snake_case role names', () => {
      Object.values(USER_ROLE).forEach((role) => {
        expect(role).toMatch(/^[a-z_]+$/)
      })
    })

    it('should have all defined roles', () => {
      const roles = Object.values(USER_ROLE)
      expect(roles).toHaveLength(7)
    })
  })
})
