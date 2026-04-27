/**
 * Extract roles from authentication token
 *
 * Token format: "prefix:roles:role1:role2:role3"
 * Allowed role characters: lowercase letters (a-z), underscore (_), asterisk (*)
 *
 * @param authToken - Authentication token string
 * @returns Array of role strings
 *
 * @example
 * ```ts
 * // Multiple roles
 * getRolesFromAuthToken('session:abc:roles:admin:moderator:viewer')
 * // ['admin', 'moderator', 'viewer']
 *
 * // Single role with underscore
 * getRolesFromAuthToken('user:123:roles:super_admin')
 * // ['super_admin']
 *
 * // Wildcard role
 * getRolesFromAuthToken('token:xyz:roles:*')
 * // ['*']
 *
 * // No roles
 * getRolesFromAuthToken('user:123:roles:')
 * // []
 *
 * // Invalid token
 * getRolesFromAuthToken('no-roles-here')
 * // []
 * ```
 */
export function getRolesFromAuthToken(authToken?: string): string[] {
  // Guard: empty or undefined token
  if (!authToken?.trim()) {
    return []
  }

  // Extract roles section using regex
  // Pattern: roles:([a-z_*:]*) captures everything after "roles:"
  const rolesPattern = /roles:([a-z_*:]*)/
  const match = authToken.match(rolesPattern)

  // No match found or empty capture group
  if (!match?.[1]) {
    return []
  }

  const rolesString = match[1]

  // Split by colon and remove empty strings
  const roles = rolesString.split(':').filter(Boolean)

  return roles
}
