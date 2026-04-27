import { renderHook } from '@testing-library/react'
import { useSelector } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthConfig } from '../../utils/auth-utils'
import { checkPermission } from '../../utils/auth-utils'
import { useCheckPerm } from '../use-permissions'

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

describe('useCheckPerm', () => {
  const mockUseSelector = vi.mocked(useSelector)
  const mockCheckPermission = vi.mocked(checkPermission)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('permission checks with valid config', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write', 'comments:rw'],
      write: true,
      caps: ['admin', 'moderator'],
      superAdmin: false,
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should check permission with perm property', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:read' })
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
    })

    it('should check permission with write property', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ write: true }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { write: true })
    })

    it('should check permission with cap property', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ cap: 'admin' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { cap: 'admin' })
    })

    it('should check permission with multiple properties', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() =>
        useCheckPerm({ perm: 'users:write', write: true, cap: 'admin' }),
      )

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {
        perm: 'users:write',
        write: true,
        cap: 'admin',
      })
    })

    it('should return false when permission check fails', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'admin:delete' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'admin:delete' })
    })

    it('should check permission with all three properties', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() =>
        useCheckPerm({ perm: 'posts:write', write: true, cap: 'moderator' }),
      )

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {
        perm: 'posts:write',
        write: true,
        cap: 'moderator',
      })
    })
  })

  describe('permission checks with null/undefined config', () => {
    it('should handle null config', () => {
      mockUseSelector.mockReturnValue(null)
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(null, { perm: 'users:read' })
    })

    it('should handle undefined config', () => {
      mockUseSelector.mockReturnValue(undefined)
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(undefined, { perm: 'users:read' })
    })

    it('should handle empty config object', () => {
      mockUseSelector.mockReturnValue({})
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith({}, { perm: 'users:read' })
    })

    it('should handle config with empty permissions array', () => {
      mockUseSelector.mockReturnValue({ permissions: [] })
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(false)
    })

    it('should handle config with empty caps array', () => {
      mockUseSelector.mockReturnValue({ caps: [] })
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ cap: 'admin' }))

      expect(result.current).toBe(false)
    })
  })

  describe('empty permission checks', () => {
    const mockConfig: AuthConfig = { permissions: [] }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should handle empty permission check object', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({}))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, {})
    })

    it('should handle all undefined properties', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() =>
        useCheckPerm({ perm: undefined, write: undefined, cap: undefined }),
      )

      expect(result.current).toBe(false)
    })
  })

  describe('segregated read/write permission levels', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:rw', 'posts:r', 'comments:w', 'admin:rwx'],
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should check read-only permission', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'posts:r' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'posts:r' })
    })

    it('should check write-only permission', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'comments:w' }))

      expect(result.current).toBe(true)
    })

    it('should check read/write permission', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:rw' }))

      expect(result.current).toBe(true)
    })

    it('should check full access permission (rwx)', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'admin:rwx' }))

      expect(result.current).toBe(true)
    })

    it('should check subset of permissions', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:r' }))

      expect(result.current).toBe(true)
    })
  })

  describe('memoization behavior', () => {
    const mockConfig: AuthConfig = { permissions: ['users:read'] }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
      mockCheckPermission.mockReturnValue(true)
    })

    it('should not recompute when config and params are unchanged', () => {
      const { rerender } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      rerender()

      // Should still be called only once due to memoization
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
    })

    it('should recompute when config changes', () => {
      const newConfig: AuthConfig = { permissions: ['users:write'] }

      const { rerender } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      mockUseSelector.mockReturnValue(newConfig)
      rerender()

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
      expect(mockCheckPermission).toHaveBeenLastCalledWith(newConfig, { perm: 'users:read' })
    })

    it('should recompute when perm parameter changes', () => {
      const { rerender } = renderHook(({ perm }) => useCheckPerm({ perm }), {
        initialProps: { perm: 'users:read' },
      })

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      rerender({ perm: 'users:write' })

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
      expect(mockCheckPermission).toHaveBeenLastCalledWith(mockConfig, { perm: 'users:write' })
    })

    it('should recompute when write parameter changes', () => {
      const { rerender } = renderHook(({ write }) => useCheckPerm({ write }), {
        initialProps: { write: true },
      })

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      rerender({ write: false })

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
      expect(mockCheckPermission).toHaveBeenLastCalledWith(mockConfig, { write: false })
    })

    it('should recompute when cap parameter changes', () => {
      const { rerender } = renderHook(({ cap }) => useCheckPerm({ cap }), {
        initialProps: { cap: 'admin' },
      })

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      rerender({ cap: 'moderator' })

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
      expect(mockCheckPermission).toHaveBeenLastCalledWith(mockConfig, { cap: 'moderator' })
    })

    it('should not recompute when unrelated props change', () => {
      const { rerender } = renderHook(
        ({ perm }: { perm: string; otherProp: string }) => useCheckPerm({ perm }),
        { initialProps: { perm: 'users:read', otherProp: 'value1' } },
      )

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      rerender({ perm: 'users:read', otherProp: 'value2' })

      // Should not recompute since perm hasn't changed
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
    })

    it('should recompute when any dependency changes', () => {
      const { rerender } = renderHook(
        ({ perm, write, cap }) => useCheckPerm({ perm, write, cap }),
        {
          initialProps: {
            perm: 'users:read',
            write: true,
            cap: 'admin',
          },
        },
      )

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      // Change perm
      rerender({ perm: 'users:write', write: true, cap: 'admin' })
      expect(mockCheckPermission).toHaveBeenCalledTimes(2)

      // Change write
      rerender({ perm: 'users:write', write: false, cap: 'admin' })
      expect(mockCheckPermission).toHaveBeenCalledTimes(3)

      // Change cap
      rerender({ perm: 'users:write', write: false, cap: 'moderator' })
      expect(mockCheckPermission).toHaveBeenCalledTimes(4)
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue({ permissions: [] })
    })

    it('should handle empty string permission', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: '' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { perm: '' })
    })

    it('should handle write: false', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ write: false }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { write: false })
    })

    it('should handle permission with special characters', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:r_w_x' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), {
        perm: 'users:r_w_x',
      })
    })

    it('should handle permission with multiple colons', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'admin:users:read' }))

      expect(result.current).toBe(true)
    })

    it('should handle very long permission string', () => {
      mockCheckPermission.mockReturnValue(false)
      const longPerm = `${'a'.repeat(1000)}:read`

      const { result } = renderHook(() => useCheckPerm({ perm: longPerm }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { perm: longPerm })
    })

    it('should handle permission with unicode characters', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:読む' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), {
        perm: 'users:読む',
      })
    })

    it('should handle permission with whitespace', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: '  users:read  ' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), {
        perm: '  users:read  ',
      })
    })

    it('should handle empty cap string', () => {
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ cap: '' }))

      expect(result.current).toBe(false)
    })
  })

  describe('superAdmin config', () => {
    it('should return true for superAdmin with any permission', () => {
      mockUseSelector.mockReturnValue({ superAdmin: true })
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'any:permission' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(
        { superAdmin: true },
        { perm: 'any:permission' },
      )
    })

    it('should return true for superAdmin with write check', () => {
      mockUseSelector.mockReturnValue({ superAdmin: true })
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ write: true }))

      expect(result.current).toBe(true)
    })

    it('should return true for superAdmin with cap check', () => {
      mockUseSelector.mockReturnValue({ superAdmin: true })
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ cap: 'any' }))

      expect(result.current).toBe(true)
    })
  })

  describe('integration with Redux selector', () => {
    it('should call useSelector with correct function', () => {
      mockUseSelector.mockReturnValue({ permissions: [] })
      mockCheckPermission.mockReturnValue(false)

      renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(mockUseSelector).toHaveBeenCalledTimes(1)
      expect(mockUseSelector).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should receive state from useSelector', () => {
      const mockState = {
        auth: {
          permissions: { permissions: ['users:read'] },
        },
      }

      mockUseSelector.mockImplementation((selector) => selector(mockState as any))
      mockCheckPermission.mockReturnValue(true)

      renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(mockUseSelector).toHaveBeenCalled()
    })

    it('should re-render when selector returns new value', () => {
      const config1 = { permissions: ['users:read'] }
      const config2 = { permissions: ['users:write'] }

      mockUseSelector.mockReturnValue(config1)
      mockCheckPermission.mockReturnValue(true)

      const { rerender } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
      expect(mockCheckPermission).toHaveBeenCalledWith(config1, { perm: 'users:read' })

      mockUseSelector.mockReturnValue(config2)
      rerender()

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
      expect(mockCheckPermission).toHaveBeenCalledWith(config2, { perm: 'users:read' })
    })
  })

  describe('multiple simultaneous permission checks', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write'],
      write: true,
      caps: ['admin'],
    }

    beforeEach(() => {
      mockUseSelector.mockReturnValue(mockConfig)
    })

    it('should handle multiple hooks checking different permissions', () => {
      mockCheckPermission.mockReturnValue(true)

      const { result: result1 } = renderHook(() => useCheckPerm({ perm: 'users:read' }))
      const { result: result2 } = renderHook(() => useCheckPerm({ perm: 'posts:write' }))
      const { result: result3 } = renderHook(() => useCheckPerm({ write: true }))

      expect(result1.current).toBe(true)
      expect(result2.current).toBe(true)
      expect(result3.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple hooks with different return values', () => {
      mockCheckPermission
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      const { result: result1 } = renderHook(() => useCheckPerm({ perm: 'users:read' }))
      const { result: result2 } = renderHook(() => useCheckPerm({ perm: 'admin:delete' }))
      const { result: result3 } = renderHook(() => useCheckPerm({ cap: 'admin' }))

      expect(result1.current).toBe(true)
      expect(result2.current).toBe(false)
      expect(result3.current).toBe(true)
    })
  })
})
