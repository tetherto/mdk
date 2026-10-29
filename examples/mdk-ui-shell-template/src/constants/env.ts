/**
 * Typed accessors for the env vars consumed by MDK UI Shell.
 *
 * `API_BASE_URL` is allowed to be empty: that's the canonical signal that
 * API calls should use relative URLs and rely on a reverse proxy (the Vite
 * dev server in dev, your ingress in prod). `OAUTH_BASE_URL` must be
 * absolute because the sign-in flow is a full-page navigation, not an XHR.
 */

/**
 * Human-facing application name — shown in the browser tab and the Home landing
 * page. Set it to your app's name (it is the single source of truth for the
 * display name).
 */
export const APP_NAME = 'MDK UI Shell'

/**
 * Dev-only auth bypass. When `VITE_AUTH_BYPASS=true`, the app skips the `/signin`
 * gate, disables token-refresh polling, and boots with a stub token so you land
 * straight on the dashboard without an OAuth backend. Never enable in production.
 */
export const AUTH_BYPASS: boolean = import.meta.env.VITE_AUTH_BYPASS === 'true'

/**
 * How users sign in. `password` (an MDK stack's Gateway: `POST /auth/login`
 * through the Kernel's token issuer) or `oauth` (the mining Gateway's Google
 * redirect, the default). `mdk create dashboard` sets `password`.
 */
export const AUTH_MODE: 'password' | 'oauth' =
  import.meta.env.VITE_AUTH_MODE === 'password' ? 'password' : 'oauth'

const required = (key: string, value: string | undefined): string => {
  if (value === undefined || value.trim().length === 0) {
    console.warn(`[mdk-ui-shell] missing required env var: ${key}`)
    return ''
  }
  return value
}

/**
 * Gateway API base URL. Empty string means "use relative URLs" — the Vite dev
 * proxy (or a production reverse proxy) handles routing.
 *
 * `VITE_MDK_API_URL` is the name MDK itself reads; `VITE_API_BASE_URL` is the
 * deprecated alias, honoured here for one major so an existing `.env` keeps
 * working. Both are read at this layer rather than being left to MDK's own env
 * chain, because the shell deliberately defaults to `''` (proxy the requests)
 * where MDK defaults to `http://localhost:3000`.
 */
export const API_BASE_URL: string
  = import.meta.env.VITE_MDK_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * OAuth backend base URL. Required and must be absolute (the sign-in flow
 * is a full-page navigation, which proxies don't intercept).
 */
export const OAUTH_BASE_URL: string =
  AUTH_MODE === 'oauth'
    ? required('VITE_OAUTH_BASE_URL', import.meta.env.VITE_OAUTH_BASE_URL)
    : (import.meta.env.VITE_OAUTH_BASE_URL ?? '')
