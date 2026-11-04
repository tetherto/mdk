import type { AuthConfig, PermissionCheck } from '@tetherto/mdk-ui-foundation'
import { checkPermission } from '@tetherto/mdk-ui-foundation'
import { useMemo } from 'react'

import { useAuth } from './store-hooks'

/**
 * Hook to check if the current user has a specific permission.
 * Reads `permissions` from the headless `authStore` via `@tetherto/mdk-react-adapter`.
 *
 * Levels after the `:` are matched one character at a time, so `'users:r'` is
 * satisfied by a `users:rw` grant. A multi-letter level such as `'users:read'`
 * asks for the levels `r`, `e`, `a` and `d`, and only matches a grant spelled
 * exactly that way.
 *
 * @example
 * ```tsx
 * const canRead = useCheckPerm({ perm: 'users:r' })
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
