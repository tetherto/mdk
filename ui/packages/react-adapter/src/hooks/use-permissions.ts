import type { AuthConfig, PermissionCheck } from '@tetherto/mdk-ui-core'
import { checkPermission } from '@tetherto/mdk-ui-core'
import { useMemo } from 'react'

import { useAuth } from './store-hooks'

/**
 * Hook to check if the current user has a specific permission.
 * Reads `permissions` from the headless `authStore` via `@tetherto/mdk-react-adapter`.
 *
 * @example
 * ```tsx
 * const canRead = useCheckPerm({ perm: 'users:read' })
 * const canWrite = useCheckPerm({ write: true })
 * const isAdmin = useCheckPerm({ cap: 'admin' })
 * ```
 *
 * @category permission
 */
export const useCheckPerm = ({ perm, write, cap }: PermissionCheck): boolean => {
  const { permissions } = useAuth()
  const config = permissions as AuthConfig | null | undefined

  return useMemo(() => checkPermission(config, { perm, write, cap }), [config, perm, write, cap])
}
