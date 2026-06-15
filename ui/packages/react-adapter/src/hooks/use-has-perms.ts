import type { AuthConfig, PermissionCheck } from '@tetherto/mdk-ui-core'
import { checkPermission } from '@tetherto/mdk-ui-core'
import { useMemo } from 'react'

import { useAuth } from './store-hooks'

/**
 * Permission request — single string, array of strings (first wins), or full check object.
 */
export type PermissionRequest = string | string[] | PermissionCheck

/**
 * Hook returning a permission-check callback bound to the current `authStore.permissions`.
 *
 * @example
 * ```tsx
 * const hasPerms = useHasPerms()
 * if (hasPerms('users:read')) { ... }
 * if (hasPerms({ write: true })) { ... }
 * if (hasPerms({ cap: 'admin' })) { ... }
 * ```
 *
 * @category permission
 */
export const useHasPerms = (): ((req: PermissionRequest) => boolean) => {
  const { permissions } = useAuth()
  const config = permissions as AuthConfig | null | undefined

  return useMemo(
    () =>
      (req: PermissionRequest): boolean => {
        if (typeof req === 'string') {
          return checkPermission(config, { perm: req })
        }

        if (Array.isArray(req)) {
          const firstPerm = req[0]
          return firstPerm ? checkPermission(config, { perm: firstPerm }) : false
        }

        return checkPermission(config, req)
      },
    [config],
  )
}
