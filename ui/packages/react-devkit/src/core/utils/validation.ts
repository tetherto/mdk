/**
 * Validation utilities
 */

/**
 * Check if value is empty
 */
export const isEmpty = (value: unknown): boolean => {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0

  return false
}

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

  return emailRegex.test(email)
}

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    // eslint-disable-next-line no-new
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a value is null or undefined
 */
export const isNil = (value: unknown): value is null | undefined => {
  return value === null || value === undefined
}

/**
 * Check if value is a plain object (not array, not null, not Date, not RegExp)
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  // Exclude Date and RegExp objects
  if (value instanceof Date || value instanceof RegExp) {
    return false
  }

  return true
}
