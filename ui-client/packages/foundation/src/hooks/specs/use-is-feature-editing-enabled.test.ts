import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PermissionCheck } from '../../utils/auth-utils'
import { useIsFeatureEditingEnabled } from '../use-is-feature-editing-enabled'

vi.mock('../use-permissions', () => ({
  useCheckPerm: vi.fn(({ cap }: PermissionCheck) => cap === 'features'),
}))

describe('useIsFeatureEditingEnabled', () => {
  it('should return true when user has features capability', () => {
    const { result } = renderHook(() => useIsFeatureEditingEnabled())
    expect(result.current).toBe(true)
  })
})
