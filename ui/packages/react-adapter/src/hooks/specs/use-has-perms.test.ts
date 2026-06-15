// @vitest-environment jsdom
import type { AuthConfig } from '@tetherto/mdk-ui-core'
import { authStore, checkPermission } from '@tetherto/mdk-ui-core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHasPerms } from '../use-has-perms'

vi.mock('@tetherto/mdk-ui-core', async () => {
  const actual = await vi.importActual<typeof import('@tetherto/mdk-ui-core')>('@tetherto/mdk-ui-core')
  return {
    ...actual,
    checkPermission: vi.fn(),
  }
})

const setPermissions = (permissions: unknown): void => {
  act(() => {
    authStore.getState().setPermissions(permissions)
  })
}

describe('useHasPerms', () => {
  const mockCheckPermission = vi.mocked(checkPermission)

  beforeEach(() => {
    vi.clearAllMocks()
    authStore.getState().reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    authStore.getState().reset()
  })

  describe('string permission requests', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write'],
      write: true,
      caps: ['admin'],
    }

    beforeEach(() => {
      setPermissions(mockConfig)
    })

    it('checks permission via a single string', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useHasPerms())
      expect(result.current('users:read')).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:read' })
    })

    it('returns false when the permission is missing', () => {
      mockCheckPermission.mockReturnValue(false)
      const { result } = renderHook(() => useHasPerms())
      expect(result.current('admin:write')).toBe(false)
    })
  })

  describe('array permission requests', () => {
    beforeEach(() => {
      setPermissions({ permissions: ['users:read', 'posts:write'] })
    })

    it('checks only the first permission in the array', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useHasPerms())
      expect(result.current(['users:write', 'users:read'])).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
      expect(mockCheckPermission).toHaveBeenCalledWith(expect.anything(), { perm: 'users:write' })
    })

    it('returns false for an empty array without calling checkPermission', () => {
      const { result } = renderHook(() => useHasPerms())
      expect(result.current([])).toBe(false)
      expect(mockCheckPermission).not.toHaveBeenCalled()
    })
  })

  describe('object permission requests', () => {
    beforeEach(() => {
      setPermissions({
        permissions: ['users:read'],
        write: true,
        caps: ['admin'],
      })
    })

    it('checks via a permission object with perm', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useHasPerms())
      expect(result.current({ perm: 'users:read' })).toBe(true)
    })

    it('checks via a permission object with write', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useHasPerms())
      expect(result.current({ write: true })).toBe(true)
    })

    it('checks via a permission object with cap', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useHasPerms())
      expect(result.current({ cap: 'admin' })).toBe(true)
    })
  })

  describe('missing or empty config', () => {
    it('handles a null config', () => {
      setPermissions(null)
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useHasPerms())

      expect(result.current('users:read')).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(null, { perm: 'users:read' })
    })
  })

  describe('memoization', () => {
    beforeEach(() => {
      setPermissions({ permissions: ['users:read'] })
    })

    it('returns the same function reference while the config is unchanged', () => {
      const { result, rerender } = renderHook(() => useHasPerms())
      const first = result.current
      rerender()
      expect(first).toBe(result.current)
    })

    it('returns a new function reference when the config changes', () => {
      const { result, rerender } = renderHook(() => useHasPerms())
      const first = result.current

      setPermissions({ permissions: ['users:write'] })
      rerender()

      expect(first).not.toBe(result.current)
    })
  })
})
