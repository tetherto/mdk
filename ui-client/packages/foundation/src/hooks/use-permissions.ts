import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { selectPermissions } from '../state/slices/auth-slice'
import type { RootState } from '../types/redux'
import type { AuthConfig, PermissionCheck } from '../utils/auth-utils'
import { checkPermission } from '../utils/auth-utils'

/**
 * Hook to check if user has specific permission
 *
 * Memoized for performance - only recalculates when permissions config changes.
 *
 * @param permissionCheck - Permission criteria to check
 * @param permissionCheck.perm - The permission string to check (e.g., 'users:read')
 * @param permissionCheck.write - Whether write access is required
 * @param permissionCheck.cap - The capability to check (e.g., 'admin')
 * @returns true if user has the requested permission
 *
 * @example
 * ```tsx
 * function UserManagement() {
 *   const canRead = useCheckPerm({ perm: 'users:read' })
 *   const canWrite = useCheckPerm({ write: true })
 *   const isAdmin = useCheckPerm({ cap: 'admin' })
 *
 *   return (
 *     <div>
 *       {canRead && <UserList />}
 *       {canWrite && <CreateButton />}
 *       {isAdmin && <AdminPanel />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Check multiple permission criteria
 * const canEditPosts = useCheckPerm({
 *   perm: 'posts:write',
 *   write: true
 * })
 * ```
 *
 * @example
 * ```tsx
 * // Segregated read/write levels
 * const canFullAccess = useCheckPerm({ perm: 'users:rw' })
 * const canReadOnly = useCheckPerm({ perm: 'users:r' })
 * ```
 */
export const useCheckPerm = ({ perm, write, cap }: PermissionCheck): boolean => {
  const config = useSelector((state: RootState) => selectPermissions(state))

  return useMemo(
    () => checkPermission(config as AuthConfig | null | undefined, { perm, write, cap }),
    [config, perm, write, cap],
  )
}
