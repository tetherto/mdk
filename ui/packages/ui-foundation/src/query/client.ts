import { MutationCache, QueryCache, QueryClient } from '@tanstack/query-core'

import { authStore } from '../store/auth-store'
import { MdkFetchError } from '../types/api-mining.types'

const DEFAULT_API_BASE_URL = 'http://localhost:3000'

/**
 * HTTP status the App Node returns once the bearer token has expired. Any
 * request — not just the token-refresh poll — can surface it, so it is handled
 * globally (see {@link createMdkQueryClient}).
 */
export const SESSION_EXPIRED_STATUS = 401

const isSessionExpired = (error: unknown): boolean =>
  error instanceof MdkFetchError && error.status === SESSION_EXPIRED_STATUS

const readViteEnv = (key: string): string | undefined => {
  try {
    // `import.meta` is a syntactic form. We read it via a runtime indirection
    // so this file remains importable from CommonJS Node tooling that doesn't
    // know about it. Static analysers can't see through the indirection,
    // hence the `// eslint-disable-next-line` below.
    // eslint-disable-next-line no-new-func
    const reader = new Function('return import.meta') as () => {
      env?: Record<string, string | undefined>
    }
    return reader()?.env?.[key]
  } catch {
    return undefined
  }
}

const readNodeEnv = (key: string): string | undefined => {
  try {
    return typeof process !== 'undefined' ? process.env?.[key] : undefined
  } catch {
    return undefined
  }
}

/**
 * Resolves the Gateway API base URL using the priority order described in
 * HLD §2.4 / §5:
 *
 *   1. Explicit override (caller-supplied, typically from `MdkProvider`).
 *      An explicit empty string (`''`) is honored as "use relative URLs" —
 *      the canonical signal that requests should go through a reverse proxy
 *      (e.g. the Vite dev-server proxy or a production ingress).
 *   2. Build-time env var: `VITE_MDK_API_URL` (Vite) or `MDK_API_URL` (Node).
 *   3. Hardcoded default (`http://localhost:3000`).
 *
 * @category query
 */
export const resolveApiBaseUrl = (override?: string): string => {
  if (override === '') return ''
  if (override && override.trim().length > 0) return override.trim()

  const viteEnv = readViteEnv('VITE_MDK_API_URL')
  if (viteEnv && viteEnv.trim().length > 0) return viteEnv.trim()

  const nodeEnv = readNodeEnv('MDK_API_URL')
  if (nodeEnv && nodeEnv.trim().length > 0) return nodeEnv.trim()

  return DEFAULT_API_BASE_URL
}

export type CreateMdkQueryClientOptions = {
  apiBaseUrl?: string
  /**
   * Fired after the session token is cleared because the backend reported it
   * expired (HTTP 401 on any query or mutation). The host app can use this to
   * navigate to its sign-in page. Redirecting is optional — clearing the token
   * already drops any `RequireAuth`-guarded UI to its sign-in fallback.
   */
  onSessionExpired?: () => void
  /** Optional QueryClient default options pass-through. */
  defaultOptions?: ConstructorParameters<typeof QueryClient>[0] extends infer P
    ? P extends { defaultOptions?: infer D }
      ? D
      : never
    : never
}

/**
 * Build a TanStack `QueryClient` configured with the resolved API base URL.
 * The base URL is exposed via `client.getDefaultOptions().queries.meta` so
 * callers can read it without importing the `resolveApiBaseUrl` helper.
 *
 * @category query
 */
export const createMdkQueryClient = (options: CreateMdkQueryClientOptions = {}): QueryClient => {
  const baseUrl = resolveApiBaseUrl(options.apiBaseUrl)

  // Global session-expiry guard: any query/mutation that fails with a 401
  // means the backend has ended the session, so clear the token immediately.
  // `RequireAuth` reads the token reactively, so this alone bounces the user
  // to the sign-in fallback — without waiting for the ~250s token-refresh
  // poll. `reset()` is guarded to stay idempotent when several requests 401
  // together, and to avoid firing `onSessionExpired` once per failed request.
  const handleSessionExpiry = (error: unknown): void => {
    if (!isSessionExpired(error)) return
    if (authStore.getState().token === null) return
    authStore.getState().reset()
    options.onSessionExpired?.()
  }

  return new QueryClient({
    queryCache: new QueryCache({ onError: handleSessionExpiry }),
    mutationCache: new MutationCache({ onError: handleSessionExpiry }),
    defaultOptions: {
      ...options.defaultOptions,
      queries: {
        staleTime: 30_000,
        // Don't burn a retry on an expired session — the 401 won't recover, so
        // surface it (and trigger the guard above) on the first response.
        retry: (failureCount, error) => !isSessionExpired(error) && failureCount < 1,
        ...options.defaultOptions?.queries,
        meta: { apiBaseUrl: baseUrl, ...options.defaultOptions?.queries?.meta },
      },
      mutations: {
        retry: 0,
        ...options.defaultOptions?.mutations,
        meta: { apiBaseUrl: baseUrl, ...options.defaultOptions?.mutations?.meta },
      },
    },
  })
}

/**
 * Read the configured base URL back from a `QueryClient` produced by
 * `createMdkQueryClient`. Falls back to the default if metadata is absent.
 *
 * @category query
 */
export const getApiBaseUrl = (client: QueryClient): string => {
  const meta = client.getDefaultOptions().queries?.meta as { apiBaseUrl?: string } | undefined
  return meta?.apiBaseUrl ?? DEFAULT_API_BASE_URL
}
