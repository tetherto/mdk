/**
 * String utilities
 *
 * Pure functions for string parsing, transformation, and extraction.
 */

// ============================================================================
// Auth Token Parsing
// ============================================================================

/**
 * Parse an auth token string to extract role names
 *
 * @example
 * ```ts
 * getRolesFromAuthToken('...roles:admin:viewer:...')
 * // ['admin', 'viewer']
 * ```
 */
export const getRolesFromAuthToken = (authToken?: string): string[] => {
  if (!authToken) return []

  const rolesMatch = authToken.match(/roles:([a-z_*:]*)/)
  if (!rolesMatch?.[1]) return []

  return rolesMatch[1].split(':').filter(Boolean)
}

// ============================================================================
// Location String Parsing
// ============================================================================

/**
 * Format a dot-separated location string into a readable label
 *
 * @example
 * ```ts
 * getLocationLabel('site_a.lab_1')  // "Site A Lab 1"
 * getLocationLabel(null)            // "Unknown"
 * getLocationLabel('unknown')       // "Unknown"
 * ```
 */
export const getLocationLabel = (location: string | null | undefined): string => {
  if (location == null || location === 'unknown') {
    return 'Unknown'
  }

  return location
    .split('.')
    .join(' ')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Get the major (site) part of a "site.location" string
 *
 * @example
 * ```ts
 * getMajorLocation('brazil.lab_1')  // "brazil"
 * getMajorLocation('invalid')        // "unknown"
 * ```
 */
export const getMajorLocation = (location: string): string => {
  const parts = location.split('.')
  if (parts.length !== 2) {
    return 'unknown'
  }

  return parts[0]!
}

/**
 * Get the minor (sub-location) part of a "site.location" string
 *
 * @example
 * ```ts
 * getMinorLocation('brazil.lab_1')  // "lab_1"
 * getMinorLocation('invalid')        // "unknown"
 * ```
 */
export const getMinorLocation = (location: string): string => {
  const parts = location.split('.')
  if (parts.length !== 2) {
    return 'unknown'
  }

  return parts[1]!
}

// ============================================================================
// Color String Utilities
// ============================================================================

/**
 * Normalize a hex color by removing the leading `#`
 *
 * @example
 * ```ts
 * normalizeHexColor('#ff0000')  // "ff0000"
 * normalizeHexColor('ff0000')   // "ff0000"
 * ```
 */
export const normalizeHexColor = (color: string): string =>
  color.startsWith('#') ? color.slice(1) : color

/**
 * Safely converts unknown value to string for display
 * Returns empty string if value is null or undefined
 */
export const safeString = (value: unknown): string => {
  if (value == null) {
    return ''
  }
  return String(value)
}
