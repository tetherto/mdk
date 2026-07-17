// @vitest-environment jsdom
import type { AuthConfig } from '@tetherto/mdk-ui-foundation'
import { authStore, checkPermission } from '@tetherto/mdk-ui-foundation'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCheckPerm } from '../use-permissions'

vi.mock('@tetherto/mdk-ui-foundation', async () => {
  const actual = await vi.importActual<typeof import('@tetherto/mdk-ui-foundation')>('@tetherto/mdk-ui-foundation')
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

describe('useCheckPerm', () => {
  const mockCheckPermission = vi.mocked(checkPermission)

  beforeEach(() => {
    vi.clearAllMocks()
    authStore.getState().reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    authStore.getState().reset()
  })

  describe('permission checks with a valid config', () => {
    const mockConfig: AuthConfig = {
      permissions: ['users:read', 'posts:write', 'comments:rw'],
      write: true,
      caps: ['admin', 'moderator'],
      superAdmin: false,
    }

    beforeEach(() => {
      setPermissions(mockConfig)
    })

    it('checks permission with perm property', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { perm: 'users:read' })
    })

    it('checks permission with write property', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useCheckPerm({ write: true }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { write: true })
    })

    it('checks permission with cap property', () => {
      mockCheckPermission.mockReturnValue(true)
      const { result } = renderHook(() => useCheckPerm({ cap: 'admin' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(mockConfig, { cap: 'admin' })
    })

    it('checks permission with multiple properties', () => {
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

    it('returns false when permission check fails', () => {
      mockCheckPermission.mockReturnValue(false)
      const { result } = renderHook(() => useCheckPerm({ perm: 'admin:delete' }))

      expect(result.current).toBe(false)
    })
  })

  describe('missing or empty config', () => {
    it('handles a null config', () => {
      setPermissions(null)
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith(null, { perm: 'users:read' })
    })

    it('handles an empty config object', () => {
      setPermissions({})
      mockCheckPermission.mockReturnValue(false)

      const { result } = renderHook(() => useCheckPerm({ perm: 'users:read' }))

      expect(result.current).toBe(false)
      expect(mockCheckPermission).toHaveBeenCalledWith({}, { perm: 'users:read' })
    })
  })

  describe('memoization', () => {
    beforeEach(() => {
      setPermissions({ permissions: ['users:read'] })
      mockCheckPermission.mockReturnValue(true)
    })

    it('does not recompute when nothing changes', () => {
      const { rerender } = renderHook(() => useCheckPerm({ perm: 'users:read' }))
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
      rerender()
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)
    })

    it('recomputes when the config changes', () => {
      const { rerender } = renderHook(() => useCheckPerm({ perm: 'users:read' }))
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      setPermissions({ permissions: ['users:write'] })
      rerender()

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
    })

    it('recomputes when the perm parameter changes', () => {
      const { rerender } = renderHook(({ perm }) => useCheckPerm({ perm }), {
        initialProps: { perm: 'users:read' },
      })
      expect(mockCheckPermission).toHaveBeenCalledTimes(1)

      rerender({ perm: 'users:write' })

      expect(mockCheckPermission).toHaveBeenCalledTimes(2)
    })
  })

  describe('superAdmin config', () => {
    it('returns true for superAdmin', () => {
      setPermissions({ superAdmin: true })
      mockCheckPermission.mockReturnValue(true)

      const { result } = renderHook(() => useCheckPerm({ perm: 'any:permission' }))

      expect(result.current).toBe(true)
      expect(mockCheckPermission).toHaveBeenCalledWith(
        { superAdmin: true },
        { perm: 'any:permission' },
      )
    })
  })
})
