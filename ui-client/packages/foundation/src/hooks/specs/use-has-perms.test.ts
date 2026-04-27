import { renderHook } from '@testing-library/react'
import { useSelector } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthConfig } from '../../utils/auth-utils'
import { checkPermission } from '../../utils/auth-utils'
import { useHasPerms } from '../use-has-perms'

// Mock dependencies
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}))

vi.mock('../../utils/auth-utils', async () => {
  const actual = await vi.importActual('../../utils/auth-utils')
  return {
    ...actual,
    checkPermission: vi.fn(),
  }
})

describe('useHasPerms', () => {
  const mockCheckPermission = vi.mocked(checkPermission)
  const mockUseSelector = vi.mocked(useSelector)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('string permission requests', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write'],
      write: true,
      caps: ['admin'],
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should check permission with a single string', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:read')

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:read' })
    })

    it('should return false when user lacks the permission', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('admin:write')

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'admin:write' })
    })

    it('should handle empty string permission', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('')

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: '' })
    })

    it('should handle permission with special characters', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:r_w')

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:r_w' })
    })

    it('should handle permission with multiple colons', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:admin:read')

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:admin:read' })
    })
  })

  describe('array permission requests', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write', 'comments:delete'],
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should check only the first permission in an array', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms(['users:write', 'users:read', 'posts:write'])

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:write' })
    })

    it('should handle array with single permission', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms(['posts:write'])

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'posts:write' })
    })

    it('should return false for empty array without calling checkPermission', () => {
      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms([])

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).not.toHaveBeenCalled()
    })

    it('should ignore subsequent permissions after the first', () => {
      mockCheckPermission.mockReturnValueOnce(false).mockReturnValueOnce(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current

      // First element doesn't match
      const hasPermission = hasPerms(['nonexistent:permission', 'users:read'])

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {
        perm: 'nonexistent:permission',
      })
    })
  })

  describe('object permission requests', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write'],
      write: true,
      caps: ['admin', 'moderator'],
      superAdmin: false,
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should check permission object with perm property', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({ perm: 'users:read' })

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:read' })
    })

    it('should check permission object with write property', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({ write: true })

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { write: true })
    })

    it('should check permission object with cap property', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({ cap: 'admin' })

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { cap: 'admin' })
    })

    it('should check permission object with multiple properties', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({
        perm: 'users:write',
        write: true,
      })

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {
        perm: 'users:write',
        write: true,
      })
    })

    it('should check permission object with all properties', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({
        perm: 'users:write',
        write: true,
        cap: 'admin',
      })

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {
        perm: 'users:write',
        write: true,
        cap: 'admin',
      })
    })

    it('should handle empty permission object', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({})

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {})
    })

    it('should check permission object with write: false', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({ write: false })

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { write: false })
    })
  })

  describe('config state variations', () => {
    it('should handle null config', () => {
      mockUseSelector.mockReturnValue(null)
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:read')

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(null, { perm: 'users:read' })
    })

    it('should handle undefined config', () => {
      mockUseSelector.mockReturnValue(undefined)
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:read')

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(undefined, { perm: 'users:read' })
    })

    it('should handle empty config object', () => {
      mockUseSelector.mockReturnValue({})
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:read')

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith({}, { perm: 'users:read' })
    })

    it('should handle config with only superAdmin', () => {
      mockUseSelector.mockReturnValue({ superAdmin: true })
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('any:permission')

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(
        { superAdmin: true },
        { perm: 'any:permission' },
      )
    })

    it('should handle config with empty permissions array', () => {
      mockUseSelector.mockReturnValue({ permissions: [] })
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:read')

      expect(hasPermission).toBe(false)
    })

    it('should handle config with empty caps array', () => {
      mockUseSelector.mockReturnValue({ caps: [] })
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms({ cap: 'admin' })

      expect(hasPermission).toBe(false)
    })
  })

  describe('memoization behavior', () => {
    it('should return the same function reference when config does not change', () => {
      const mockConfig: AuthConfig = { permissions: ['users:read'] }
      mockUseSelector.mockReturnValue(mockConfig)

      const { result, rerender } = renderHook(() => useHasPerms())
      const firstFunction = result.current

      rerender()
      const secondFunction = result.current

      expect(firstFunction).toBe(secondFunction)
    })

    it('should return a new function reference when config changes', () => {
      const mockConfig1: AuthConfig = { permissions: ['users:read'] }
      const mockConfig2: AuthConfig = { permissions: ['users:write'] }

      mockUseSelector.mockReturnValue(mockConfig1)
      const { result, rerender } = renderHook(() => useHasPerms())
      const firstFunction = result.current

      mockUseSelector.mockReturnValue(mockConfig2)
      rerender()
      const secondFunction = result.current

      expect(firstFunction).not.toBe(secondFunction)
    })

    it('should return new function when config changes from null to object', () => {
      mockUseSelector.mockReturnValue(null)
      const { result, rerender } = renderHook(() => useHasPerms())
      const firstFunction = result.current

      mockUseSelector.mockReturnValue({ permissions: ['users:read'] })
      rerender()
      const secondFunction = result.current

      expect(firstFunction).not.toBe(secondFunction)
    })

    it('should return new function when config changes from object to null', () => {
      mockUseSelector.mockReturnValue({ permissions: ['users:read'] })
      const { result, rerender } = renderHook(() => useHasPerms())
      const firstFunction = result.current

      mockUseSelector.mockReturnValue(null)
      rerender()
      const secondFunction = result.current

      expect(firstFunction).not.toBe(secondFunction)
    })
  })

  describe('multiple invocations', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write'],
      write: true,
      caps: ['admin'],
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should handle multiple permission checks with same function', () => {
      mockCheckPermission
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current

      const result1 = hasPerms('users:read')
      const result2 = hasPerms('admin:delete')
      const result3 = hasPerms({ write: true })

      expect(result1).toBe(true)
      expect(result2).toBe(false)
      expect(result3).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledTimes(3)
    })

    it('should handle same permission checked multiple times', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current

      const result1 = hasPerms('users:read')
      const result2 = hasPerms('users:read')
      const result3 = hasPerms('users:read')

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledTimes(3)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:read' })
    })
  })

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue({ permissions: [] })
    })

    it('should handle very long permission string', () => {
      mockCheckPermission.mockReturnValue(false)
      const longPerm = `${'a'.repeat(1000)}:read`

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms(longPerm)

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { perm: longPerm })
    })

    it('should handle array with many permissions', () => {
      mockCheckPermission.mockReturnValue(true)
      const manyPerms = Array.from({ length: 100 })
        .fill('perm')
        .map((p, i) => `${p}${i}:read`)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms(manyPerms)

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { perm: 'perm0:read' })
    })

    it('should handle permission with unicode characters', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('users:読む')

      expect(hasPermission).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { perm: 'users:読む' })
    })

    it('should handle permission with whitespace', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())
      const hasPerms = result.current
      const hasPermission = hasPerms('  users:read  ')

      expect(hasPermission).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), {
        perm: '  users:read  ',
      })
    })
  })

  describe('integration with Redux selector', () => {
    it('should call useSelector with selectPermissions', () => {
      mockUseSelector.mockReturnValue({ permissions: [] })

      renderHook(() => useHasPerms())

      expect(mockUseSelector).toHaveBeenCalledTimes(1)
    })

    it('should re-render when selector returns new value', () => {
      const config1 = { permissions: ['users:read'] }
      const config2 = { permissions: ['users:write'] }

      mockUseSelector.mockReturnValue(config1)
      const { rerender } = renderHook(() => useHasPerms())

      mockUseSelector.mockReturnValue(config2)
      rerender()

      expect(mockUseSelector).toHaveBeenCalledTimes(2)
    })
  })
})
