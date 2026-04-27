import { describe, expect, it } from 'vitest'
import { getRolesFromAuthToken } from '../token-utils'

describe('getRolesFromAuthToken', () => {
  describe('valid tokens', () => {
    it.each([
      {
        token: 'user_id:123:roles:admin:moderator:viewer',
        expected: ['admin', 'moderator', 'viewer'],
        description: 'multiple roles',
      },
      {
        token: 'user_id:456:roles:admin',
        expected: ['admin'],
        description: 'single role',
      },
      {
        token: 'session:abc:roles:super_admin:content_moderator',
        expected: ['super_admin', 'content_moderator'],
        description: 'roles with underscores',
      },
      {
        token: 'token:xyz:roles:admin:*:viewer',
        expected: ['admin', '*', 'viewer'],
        description: 'roles with asterisks',
      },
      {
        token: 'roles:admin:editor',
        expected: ['admin', 'editor'],
        description: 'roles at start',
      },
    ])('should extract $description', ({ token, expected }) => {
      expect(getRolesFromAuthToken(token)).toEqual(expected)
    })
  })

  describe('invalid or empty tokens', () => {
    it.each([
      { token: undefined, expected: [], description: 'undefined token' },
      { token: '', expected: [], description: 'empty string' },
      { token: 'user_id:789:roles:', expected: [], description: 'empty roles' },
      { token: 'invalid-format', expected: [], description: 'malformed token' },
      { token: 'user:123:permissions:read', expected: [], description: 'missing roles key' },
    ])('should return empty array for $description', ({ token, expected }) => {
      expect(getRolesFromAuthToken(token as string | undefined)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should filter out empty strings from roles', () => {
      const token = 'roles:admin::viewer'
      expect(getRolesFromAuthToken(token)).toEqual(['admin', 'viewer'])
    })

    it('should not match uppercase roles (regex only matches [a-z_*:])', () => {
      const token = 'roles:Admin:MODERATOR'
      expect(getRolesFromAuthToken(token)).toEqual([])
    })
  })
})
