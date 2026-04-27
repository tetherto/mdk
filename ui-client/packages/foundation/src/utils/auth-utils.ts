import { USER_ROLE } from '../constants/permissions.constants'
import { getRolesFromAuthToken } from './token-utils'

/**
 * Authentication configuration
 */
export type AuthConfig = {
  /** User has super admin privileges */
  superAdmin?: boolean
  /** Array of permission strings (e.g., ['users:read', 'posts:rw']) */
  permissions?: string[]
  /** User has write access */
  write?: boolean
  /** Array of capability strings (e.g., ['admin', 'moderator']) */
  caps?: string[]
}

/**
 * Permission check criteria
 */
export type PermissionCheck = {
  /** Permission string to check (e.g., 'users:read', 'posts:rw') */
  perm?: string
  /** Check if user has write access */
  write?: boolean
  /** Capability to check (e.g., 'admin', 'revenue') */
  cap?: string
}

/**
 * Check if user has segregated permission levels
 *
 * Example: User has 'users:rw', checking if they have 'users:r'
 *
 * @param userPermissions - Array of user's permissions
 * @param requestedPerm - Requested permission string
 * @returns true if user has all requested permission levels
 */
const hasSegregatedPermission = (userPermissions: string[], requestedPerm: string): boolean => {
  const [requestedAccess, requestedLevel = ''] = requestedPerm.split(':')
  const requestedLevels = requestedLevel.split('')

  // Find a permission that matches the access type and has all required levels
  return userPermissions.some((permission) => {
    const [access, levels = ''] = permission.split(':')

    // Access type must match (e.g., 'users')
    if (access !== requestedAccess) {
      return false
    }

    // Check if user has all requested levels
    const userLevels = levels.split('')
    return requestedLevels.every((level) => userLevels.includes(level))
  })
}

/**
 * Check if user has the requested permission
 *
 * Priority order:
 * 1. SuperAdmin always returns true
 * 2. Write permission check
 * 3. Capability check
 * 4. Permission string check (including segregated levels)
 *
 * @param config - User's authentication configuration
 * @param check - Permission criteria to validate
 * @param check.perm - Permission string to check (e.g., 'users:read', 'posts:rw')
 * @param check.write - Check if user has write access
 * @param check.cap - Capability to check (e.g., 'admin', 'revenue')
 * @returns true if user has the requested permission
 *
 * @example
 * ```ts
 * // Direct permission match
 * checkPermission(config, { perm: 'users:read' })
 *
 * // Segregated permission levels (user has 'users:rw', checking for 'users:r')
 * checkPermission(config, { perm: 'users:r' }) // true
 *
 * // Write access
 * checkPermission(config, { write: true })
 *
 * // Capability check
 * checkPermission(config, { cap: 'admin' })
 * ```
 */
export const checkPermission = (
  config: AuthConfig | null | undefined,
  { perm, write, cap }: PermissionCheck,
): boolean => {
  // No config = no permissions
  if (!config) {
    return false
  }

  const { superAdmin, permissions = [], write: writePermission, caps = [] } = config

  // SuperAdmin has all permissions
  if (superAdmin) {
    return true
  }

  // Check write permission
  if (write !== undefined) {
    return !!writePermission
  }

  // Check capability
  if (cap) {
    return caps.includes(cap)
  }

  // Check permission string
  if (perm) {
    // Direct match
    if (permissions.includes(perm)) {
      return true
    }

    // Check segregated read/write levels
    return hasSegregatedPermission(permissions, perm)
  }

  return false
}
/**
 * Get redirect URL based on user's primary role
 *
 * @param authToken - User's authentication token
 * @returns Redirect URL path
 *
 * @example
 * ```ts
 * getSignInRedirectUrl('token:roles:reporting_tool_manager') // '/reporting-tool'
 * getSignInRedirectUrl('token:roles:admin') // '/'
 * getSignInRedirectUrl(null) // '/'
 * ```
 */
export const getSignInRedirectUrl = (authToken: string | null | undefined): string => {
  // Default redirect
  if (!authToken?.trim()) {
    return '/'
  }

  const roles = getRolesFromAuthToken(authToken)
  const primaryRole = roles?.[0]

  // Route based on primary role
  switch (primaryRole) {
    case USER_ROLE.REPORTING_TOOL_MANAGER:
      return '/reporting-tool'
    default:
      return '/'
  }
}
