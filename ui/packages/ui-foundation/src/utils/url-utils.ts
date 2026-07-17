/**
 * Pure URL helpers shared by the auth flow. Kept framework-agnostic so the
 * react-adapter (and any future framework adapter) can call them without
 * pulling in router-specific APIs.
 */

const AUTH_TOKEN_QUERY_PARAM = 'authToken'

/**
 * Extract `?authToken=` from a URL search string. Accepts either a full URL,
 * a query string with leading `?`, or a bare query string.
 *
 * @category auth
 */
export const extractAuthTokenFromUrl = (search: string): string | null => {
  if (!search) return null
  const queryString = search.includes('?') ? search.slice(search.indexOf('?')) : `?${search}`
  try {
    const params = new URLSearchParams(queryString)
    const value = params.get(AUTH_TOKEN_QUERY_PARAM)
    return value && value.trim().length > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * Build a URL string with the `?authToken=` parameter stripped. Used after the
 * OAuth callback to remove the token from the address bar without losing any
 * other query state.
 *
 * @category auth
 */
export const stripAuthTokenFromUrl = (search: string): string => {
  if (!search) return ''
  const hasLeadingMark = search.startsWith('?')
  const queryString = hasLeadingMark ? search : `?${search}`
  try {
    const params = new URLSearchParams(queryString)
    if (!params.has(AUTH_TOKEN_QUERY_PARAM)) return search
    params.delete(AUTH_TOKEN_QUERY_PARAM)
    const next = params.toString()
    if (next.length === 0) return ''
    return hasLeadingMark ? `?${next}` : next
  } catch {
    return search
  }
}

export { AUTH_TOKEN_QUERY_PARAM }
