/**
 * The authentication seam.
 *
 * Before this existed, "how the session works" was spread across four places
 * that each reached for the same singleton: `createMdkQueryClient` cleared
 * `authStore` on a 401, `mdkFetch` read the token off it, `useTokenPolling`
 * hardcoded a 250 s `POST /auth/token` cadence, and the host app hand-rolled the
 * `?authToken=` capture in its entry file. Swapping any one of those meant
 * forking the package.
 *
 * An `AuthProvider` gathers those decisions into one object the app supplies.
 * MDK ships two: `bearerTokenAuth()` here (bearer token in `authStore`, 401 ends
 * the session — the generic default), and `gatewayRedirectAuth()` in the mining
 * preset, which adds the Gateway's OAuth redirect, token-refresh poll and role
 * parsing.
 *
 * @category auth
 */

import type { QueryClient } from '@tanstack/query-core'

import { authStore } from '../store/auth-store.js'
import { MdkFetchError } from '../types/api-mining.types.js'

/**
 * HTTP status a backend returns once the bearer token has expired. Any request —
 * not just a token refresh — can surface it, which is why the guard lives on the
 * QueryClient rather than in one hook.
 *
 * @category auth
 */
export const SESSION_EXPIRED_STATUS = 401

/**
 * Default session-ended test: an `MdkFetchError` carrying 401.
 *
 * @category auth
 */
export const isSessionExpiredError = (error: unknown): boolean =>
  error instanceof MdkFetchError && error.status === SESSION_EXPIRED_STATUS

/**
 * The subset of `authStore` a provider needs. Structural rather than the concrete
 * store type so both the persisted singleton and a `createAuthStore()` instance
 * satisfy it — which is what lets tests and demo modes stay hermetic.
 *
 * @category auth
 */
export type AuthTokenStore = {
  getState: () => {
    token: string | null
    setToken: (token: string | null) => void
    setPermissions: (permissions: unknown | null) => void
    reset: () => void
  }
}

/**
 * Everything MDK needs to know about a session, in one replaceable object.
 *
 * Only `getToken` and `signOut` are required — a provider for an API that needs
 * no credentials implements those two and nothing else (see `noAuth`).
 *
 * @category auth
 */
export type AuthProvider = {
  /** The current bearer token, or `null` when signed out. Read per request. */
  getToken: () => string | null
  /**
   * Adopt a session from the environment — typically a token on the OAuth
   * redirect URL. Called once at app start, before the first render.
   */
  bootstrap?: () => void
  /** Start an interactive sign-in (usually a full-page redirect). */
  signIn?: () => void | Promise<void>
  /** End the session and clear any stored token. */
  signOut: () => void
  /**
   * Obtain a fresh token and adopt it. Resolve `null` to leave the current
   * session alone.
   *
   * The implementation stores the new token itself — storage stays inside the
   * provider, exactly as it does for `bootstrap`, so a caller never needs to
   * know which store this provider writes to. The resolved token is
   * informational (tests, logging); acting on it is not required.
   *
   * Receives the `QueryClient` so an implementation can reuse the runtime it
   * carries (base URL, transport) instead of being handed a
   * second, possibly divergent, transport config.
   */
  refresh?: (client: QueryClient) => Promise<string | null>
  /** How often to call `refresh`. Omit, or `0`, to disable polling entirely. */
  refreshIntervalMs?: number
  /** Roles encoded in a token, for role-based routing. */
  getRoles?: (token: string) => string[]
  /**
   * Permission config encoded in a token, written to `authStore.permissions` on
   * every token change and read by `useCheckPerm` / `useHasPerms`.
   *
   * Left unset by both bundled providers, because neither the Gateway token nor
   * any Gateway endpoint carries a permission document — so there is nothing
   * truthful to derive one from. Deriving `AuthConfig` from the token's role
   * list would silently widen what the UI offers, which is not a refactor's call
   * to make. Supply this (or keep calling `authStore.setPermissions` directly)
   * when your backend does expose one.
   */
  getPermissions?: (token: string) => unknown
  /** Whether an error means the backend ended the session. Defaults to a 401 test. */
  isSessionEnded?: (error: unknown) => boolean
}

export type BearerTokenAuthOptions = {
  /** Token store. Defaults to the persisted `authStore` singleton. */
  store?: AuthTokenStore
  /** Override the session-ended test (e.g. a backend that signals 403). */
  isSessionEnded?: (error: unknown) => boolean
  /** See {@link AuthProvider.getPermissions}. */
  getPermissions?: (token: string) => unknown
}

/**
 * Bearer-token session held in `authStore`: read the token per request, clear it
 * when the backend reports the session ended.
 *
 * This is the default `createMdkQueryClient` applies when no provider is passed,
 * and it reproduces exactly what the client and `mdkFetch` did inline before the
 * seam existed. It has no sign-in and no refresh — those are backend-specific,
 * so a preset supplies them.
 *
 * @category auth
 */
export const bearerTokenAuth = (options: BearerTokenAuthOptions = {}): AuthProvider => {
  const store = options.store ?? authStore

  return {
    getToken: () => store.getState().token,
    signOut: () => {
      store.getState().reset()
    },
    isSessionEnded: options.isSessionEnded ?? isSessionExpiredError,
    ...(options.getPermissions ? { getPermissions: options.getPermissions } : {}),
  }
}

/**
 * No authentication: no token, no sign-in, nothing to expire.
 *
 * For a fixture-backed demo, where there is no server to authenticate against:
 * every app route on a real stack answers 401, so this is not a way onto one.
 * `RequireAuth` gates on token presence, so a demo using
 * this needs to render its content outside that guard (or seed a placeholder
 * token) — `noAuth` deliberately does not fake one, because a fake token would
 * be sent as a real `Authorization` header.
 *
 * @category auth
 */
export const noAuth = (): AuthProvider => ({
  getToken: () => null,
  signOut: () => {},
  /* Nothing can end a session that was never started — without this, a 500 from
   * an open endpoint would trip the client's session guard. */
  isSessionEnded: () => false,
})

/**
 * Write a token into a provider's store, applying `getPermissions` alongside it.
 *
 * The two writes belong together: `permissions` derived from a stale token is
 * worse than none, so nothing should set the token without refreshing them.
 * Passing `null` clears both.
 *
 * @category auth
 */
export const applySession = (
  provider: AuthProvider,
  store: AuthTokenStore,
  token: string | null,
): void => {
  const state = store.getState()
  if (token === null || token.length === 0) {
    state.reset()
    return
  }
  state.setToken(token)
  if (provider.getPermissions) state.setPermissions(provider.getPermissions(token))
}
