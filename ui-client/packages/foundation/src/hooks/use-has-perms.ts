import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { selectPermissions } from '../state/slices/auth-slice'
import type { AuthConfig, PermissionCheck } from '../utils/auth-utils'
import { checkPermission } from '../utils/auth-utils'

/**
 * Permission request type - can be a single permission string, array of permissions, or full permission check object
 */
export type PermissionRequest = string | string[] | PermissionCheck

/**
 * Hook to check user permissions
 *
 * @returns Function that checks if user has the requested permission(s)
 *
 * @example
 * ```tsx
 * const hasPerms = useHasPerms()
 *
 * // Check single permission
 * if (hasPerms('users:read')) {
 *   // User has read access to users
 * }
 *
 * // Check first permission from array
 * if (hasPerms(['users:write', 'users:read'])) {
 *   // User has users:write permission
 * }
 *
 * // Check with full permission object
 * if (hasPerms({ perm: 'users:write' })) {
 *   // User has write permission
 * }
 *
 * // Check write capability
 * if (hasPerms({ write: true })) {
 *   // User has write access
 * }
 *
 * // Check capability
 * if (hasPerms({ cap: 'admin' })) {
 *   // User has admin capability
 * }
 * ```
 */
export const useHasPerms = (): ((req: PermissionRequest) => boolean) => {
  const config = useSelector(selectPermissions) as AuthConfig | null | undefined

  return useMemo(
    () =>
      (req: PermissionRequest): boolean => {
        // Handle string permission
        if (typeof req === 'string') {
          return checkPermission(config, { perm: req })
        }

        // Handle array of permissions (check first one)
        if (Array.isArray(req)) {
          const firstPerm = req[0]
          return firstPerm ? checkPermission(config, { perm: firstPerm }) : false
        }

        // Handle permission check object
        return checkPermission(config, req)
      },
    [config],
  )
}
