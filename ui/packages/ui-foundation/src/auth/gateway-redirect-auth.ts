/**
 * The Gateway redirect session flow, as an `AuthProvider`.
 *
 * Reproduces exactly what the shell template and `useTokenPolling` did by hand:
 * sign-in is a full-page redirect to `${oauthBaseUrl}/oauth/google`, the Gateway
 * bounces back with `?authToken=`, the token is captured and scrubbed from the
 * address bar, then refreshed via `POST /auth/token` every 250 s. A 401 or 500
 * on the refresh ends the session.
 *
 * Gathering it here is what makes it replaceable: an app on a different backend
 * passes a different provider and none of this runs.
 *
 * @category auth
 */

import type { QueryClient } from '@tanstack/query-core'

import { mdkFetch } from '../query/mdk-fetch.js'
import { buildUrl, type Fetcher, getApiBaseUrl, getFetcher } from '../query/runtime.js'
import { authStore } from '../store/auth-store.js'
import type { AuthTokenRequest, AuthTokenResponse } from '../types/api-mining.types.js'
import { MdkFetchError } from '../types/api-mining.types.js'
import { getRolesFromAuthToken } from '../utils/token-utils.js'
import { extractAuthTokenFromUrl, stripAuthTokenFromUrl } from '../utils/url-utils.js'
import {
  applySession,
  type AuthProvider,
  type AuthTokenStore,
  bearerTokenAuth,
} from './provider.js'

/** The Gateway's token refresh route. */
const AUTH_TOKEN_PATH = '/auth/token'

/**
 * `POST /auth/token` — exchanges the current session for a fresh token. The
 * refresh call `gatewayRedirectAuth` makes on its cadence.
 *
 * @category auth
 */
export const authTokenMutation = (
  client: QueryClient,
  fetcher: Fetcher = getFetcher(client) ?? mdkFetch,
) => ({
  mutationKey: ['auth', 'token'] as const,
  mutationFn: (body: AuthTokenRequest = {}) =>
    fetcher<AuthTokenResponse>(buildUrl(getApiBaseUrl(client), AUTH_TOKEN_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
})

/**
 * Refresh cadence — 250 s. The Gateway's
 * token TTL defaults to 5 min, so this refreshes comfortably inside the window.
 */
export const GATEWAY_REFRESH_INTERVAL_MS = 250_000

/** Path appended to `oauthBaseUrl` to begin the Google sign-in redirect. */
const GOOGLE_OAUTH_PATH = '/oauth/google'

/* A 500 from the token endpoint is the Gateway's shape for "this token is no
 * longer valid", not a transient fault — retrying it never recovers, so it ends
 * the session the same way a 401 does. */
const GATEWAY_SESSION_ENDED_STATUSES = new Set([401, 500])

/* Trim trailing slashes without a regex: an unanchored `/\/+$/` backtracks
 * polynomially (ReDoS) on long slash-heavy input; this linear scan does not. */
const trimTrailingSlashes = (value: string): string => {
  let end = value.length
  while (end > 0 && value.charAt(end - 1) === '/') end -= 1
  return value.slice(0, end)
}

export type GatewayRedirectAuthOptions = {
  /**
   * Base URL of the OAuth backend, no trailing slash. Must be absolute — sign-in
   * is a full-page navigation, which a reverse proxy does not intercept.
   */
  oauthBaseUrl?: string
  /** Token store. Defaults to the persisted `authStore` singleton. */
  store?: AuthTokenStore
  /** Override the refresh cadence (ms). Pass `0` to disable polling. */
  refreshIntervalMs?: number
  /**
   * Derive `authStore.permissions` from a token. Unset by default: no Gateway
   * token or endpoint carries a permission document, so there is nothing to
   * derive one from, and inventing a mapping from the role list would widen what
   * the UI offers. See `AuthProvider.getPermissions`.
   */
  getPermissions?: (token: string) => unknown
}

/**
 * Build the mining Gateway auth provider.
 *
 * ```tsx
 * <MdkProvider
 *   apiBaseUrl={API_BASE_URL}
 *   auth={gatewayRedirectAuth({ oauthBaseUrl: OAUTH_BASE_URL })}
 * >
 * ```
 *
 * @category auth
 */
export const gatewayRedirectAuth = (
  options: GatewayRedirectAuthOptions = {},
): AuthProvider => {
  const store = options.store ?? authStore
  const base = bearerTokenAuth({ store, getPermissions: options.getPermissions })

  const provider: AuthProvider = {
    ...base,

    /**
     * Capture `?authToken=` off the OAuth redirect and strip it from the URL, so
     * the token never lingers in the address bar or in browser history.
     */
    bootstrap: () => {
      if (typeof window === 'undefined') return
      const token = extractAuthTokenFromUrl(window.location.search)
      if (token === null || token.length === 0) return
      if (token === store.getState().token) return

      applySession(provider, store, token)

      const cleaned = stripAuthTokenFromUrl(window.location.search)
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${cleaned}${window.location.hash}`,
      )
    },

    signIn: () => {
      if (typeof window === 'undefined') return
      if (options.oauthBaseUrl === undefined || options.oauthBaseUrl.length === 0) {
        throw new Error(
          'gatewayRedirectAuth: signIn needs an absolute `oauthBaseUrl`. '
          + 'Pass it when building the provider (typically from VITE_OAUTH_BASE_URL).',
        )
      }
      window.location.href = `${trimTrailingSlashes(options.oauthBaseUrl)}${GOOGLE_OAUTH_PATH}`
    },

    refresh: async (client: QueryClient): Promise<string | null> => {
      const token = store.getState().token
      if (token === null || token.length === 0) return null

      /* Re-sends the current roles so the new token carries the same grants —
       * the Gateway re-issues against what it is given, not against the old
       * token's claims. */
      const response = await authTokenMutation(client).mutationFn({
        roles: getRolesFromAuthToken(token),
      })
      const next = response?.token ?? null
      if (next !== null) applySession(provider, store, next)
      return next
    },

    refreshIntervalMs: options.refreshIntervalMs ?? GATEWAY_REFRESH_INTERVAL_MS,

    getRoles: getRolesFromAuthToken,

    isSessionEnded: (error: unknown): boolean =>
      error instanceof MdkFetchError && GATEWAY_SESSION_ENDED_STATUSES.has(error.status),
  }

  return provider
}
