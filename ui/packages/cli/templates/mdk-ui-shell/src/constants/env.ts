/**
 * Typed accessors for the env vars consumed by MDK UI Shell.
 *
 * `API_BASE_URL` is allowed to be empty: that's the canonical signal that
 * API calls should use relative URLs and rely on a reverse proxy (the Vite
 * dev server in dev, your ingress in prod). `OAUTH_BASE_URL` must be
 * absolute because the sign-in flow is a full-page navigation, not an XHR.
 */

const required = (key: string, value: string | undefined): string => {
  if (value === undefined || value.trim().length === 0) {
    console.warn(`[mdk-ui-shell] missing required env var: ${key}`)
    return ''
  }
  return value
}

/**
 * Gateway API base URL. Empty string means "use relative URLs" — the Vite
 * dev proxy (or a production reverse proxy) handles routing.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * OAuth backend base URL. Required and must be absolute (the sign-in flow
 * is a full-page navigation, which proxies don't intercept).
 */
export const OAUTH_BASE_URL: string = required(
  'VITE_OAUTH_BASE_URL',
  import.meta.env.VITE_OAUTH_BASE_URL,
)
