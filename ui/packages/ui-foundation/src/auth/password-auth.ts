/**
 * Password sign-in against an MDK Gateway, through the Kernel's token issuer.
 *
 * The Gateway answers `POST /auth/login` with a short-lived access token in the
 * body and keeps the refresh token in an httpOnly, SameSite=Strict cookie the
 * page cannot read. This provider holds the short-lived access token in the
 * shared `authStore` (what `useAuthToken` and route guards read; pass a
 * `createAuthStore()` to keep it out of localStorage), renews it from the
 * cookie on a timer and whenever a request comes back 401, and restores the
 * session on reload with one silent refresh. Signing out ends the session at
 * the issuer.
 *
 * @category auth
 */

import type { QueryClient } from '@tanstack/query-core'

import { createBearerFetcher } from '../query/mdk-fetch'
import type { Fetcher } from '../query/runtime'
import { authStore } from '../store/auth-store'
import { MdkFetchError } from '../types/api-mining.types'
import {
  applySession,
  type AuthProvider,
  type AuthTokenStore,
  isSessionExpiredError,
} from './provider'

export type PasswordAuthOptions = {
  /** The Gateway's origin; `''` (default) for relative URLs through the dev proxy. */
  baseUrl?: string
  /** Token store. Defaults to the shared `authStore` singleton, which the React hooks read. */
  store?: AuthTokenStore
  /** Override `fetch` (tests). */
  fetchImpl?: typeof fetch
  /** How often to renew the access token. Defaults to 4 minutes (the Gateway's tokens last 10). */
  refreshIntervalMs?: number
  /** See {@link AuthProvider.getPermissions}. */
  getPermissions?: (token: string) => unknown
}

export type PasswordCredentials = { username: string; password: string }

/** The identity a token carries, as `GET /auth/me` reports it. */
export type GatewayIdentity = {
  kind: 'user' | 'serviceaccount'
  sub: string
  email?: string
  groups?: string[]
}

export type PasswordAuthProvider = AuthProvider & {
  /** Sign in; resolves once the access token is stored, rejects with an `MdkFetchError` (401 for bad credentials, 429 when throttled). */
  signInWithPassword: (credentials: PasswordCredentials) => Promise<void>
  /** Renew the access token from the refresh cookie now; `null` when there is no session to renew. */
  refreshNow: () => Promise<string | null>
  /** Restore a session after a reload (one silent refresh); resolves whether one was found. Await it before the first render. */
  restore: () => Promise<boolean>
  /** Who the current token belongs to, from the Gateway. */
  whoami: () => Promise<GatewayIdentity>
  /** A `Fetcher` that sends the token and, on a 401, renews it once and retries. Pass it to `createMdkQueryClient`. */
  fetcher: Fetcher
}

const DEFAULT_REFRESH_INTERVAL_MS = 4 * 60 * 1000

/** Web Locks name every tab of this origin refreshes under, so they take turns. */
const REFRESH_LOCK = 'mdk-auth-refresh'

type LockManagerLike = { request: <T>(name: string, fn: () => Promise<T>) => Promise<T> }

/**
 * Run `fn` holding a lock shared by every tab, where the browser has Web Locks.
 * The refresh cookie is shared too, and it rotates: two tabs presenting it at
 * once would look like a stolen token.
 */
const acrossTabs = <T>(fn: () => Promise<T>): Promise<T> => {
  const locks = (globalThis.navigator as { locks?: LockManagerLike } | undefined)?.locks
  return locks ? locks.request(REFRESH_LOCK, fn) : fn()
}

type TokenReply = { accessToken: string; expiresIn: number; tokenType: string }

/**
 * Trailing `/` stripped by index rather than with `/\/+$/`: that pattern retries
 * the same run of slashes from every start position, so a long run costs
 * quadratic time. Walking back once and slicing once is linear.
 */
const stripTrailingSlashes = (value: string): string => {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') end--
  return end === value.length ? value : value.slice(0, end)
}

/**
 * @category auth
 */
export const passwordAuth = (options: PasswordAuthOptions = {}): PasswordAuthProvider => {
  const store = options.store ?? authStore
  const base = stripTrailingSlashes(options.baseUrl ?? '')
  const fetchImpl = (): typeof fetch => options.fetchImpl ?? globalThis.fetch

  const post = async (path: string): Promise<Response> =>
    fetchImpl()(`${base}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    })

  const fail = async (response: Response): Promise<never> => {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    throw new MdkFetchError(
      response.status,
      `HTTP ${response.status}: ${response.statusText}`,
      body,
    )
  }

  let provider: PasswordAuthProvider

  // One renewal at a time: concurrent 401s share it, and the refresh token
  // (which rotates) is never presented twice, from this page (shared promise)
  // or from another tab (the cross-tab lock). Should two clients still present
  // it at once, the issuer gives both the same successor.
  let renewing: Promise<string | null> | null = null
  const refreshNow = (): Promise<string | null> => {
    if (!renewing) {
      renewing = acrossTabs(async () => {
        const response = await post('/auth/refresh')
        if (!response.ok) {
          applySession(provider, store, null)
          return null
        }
        const { accessToken } = (await response.json()) as TokenReply
        applySession(provider, store, accessToken)
        return accessToken
      }).finally(() => {
        renewing = null
      })
    }
    return renewing
  }

  const bearer = createBearerFetcher({
    getToken: () => store.getState().token,
    fetchImpl: options.fetchImpl,
  })
  const fetcher: Fetcher = async <T>(url: string, init?: RequestInit): Promise<T> => {
    try {
      return await bearer<T>(url, init)
    } catch (error) {
      if (!isSessionExpiredError(error)) throw error
      // An access token that ran out between renewals: renew once, then let a second 401 end the session.
      if ((await refreshNow()) === null) throw error
      return bearer<T>(url, init)
    }
  }

  provider = {
    getToken: () => store.getState().token,
    signInWithPassword: async ({ username, password }) => {
      const response = await fetchImpl()(`${base}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) await fail(response)
      const { accessToken } = (await response.json()) as TokenReply
      applySession(provider, store, accessToken)
    },
    signOut: () => {
      applySession(provider, store, null)
      // Best effort: the cookie is cleared and the session ended even if the page is closing.
      void post('/auth/logout').catch(() => {})
    },
    refresh: async (_client: QueryClient) => (store.getState().token ? refreshNow() : null),
    refreshIntervalMs: options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS,
    refreshNow,
    restore: async () => (await refreshNow().catch(() => null)) !== null,
    whoami: () => fetcher<GatewayIdentity>(`${base}/auth/me`),
    fetcher,
    isSessionEnded: isSessionExpiredError,
    ...(options.getPermissions ? { getPermissions: options.getPermissions } : {}),
  }
  return provider
}
