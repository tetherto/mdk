/**
 * Bearer-token aware `fetch` wrapper used by every authenticated mining
 * endpoint. Reads the current token from `authStore` at call time (never
 * captured at construction) so a fresh token issued by `useTokenPolling` is
 * applied to the next request automatically.
 *
 * Returns a `Fetcher` shape compatible with the existing query factories
 * (`./factories`). Tests can substitute their own fetcher by passing it
 * explicitly to a factory.
 */

import { authStore } from '../store/auth-store'
import { MdkFetchError } from '../types/api-mining.types'
import type { Fetcher } from './factories'

const TOKEN_GETTER_DEFAULT = (): string | null => authStore.getState().token

const isJsonResponse = (response: Response): boolean => {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json')
}

/**
 * Build a `Fetcher` that injects `Authorization: Bearer <token>` from the
 * supplied token getter (defaults to `authStore`). Non-2xx responses throw
 * an `MdkFetchError` carrying the HTTP status and parsed body.
 *
 * @category query
 */
export const createBearerFetcher = (
  options: {
    /** Override the token source — defaults to `authStore.getState().token`. */
    getToken?: () => string | null
    /** Override `fetch` — pass a stub in tests. */
    fetchImpl?: typeof fetch
  } = {},
): Fetcher => {
  const getToken = options.getToken ?? TOKEN_GETTER_DEFAULT

  const bearerFetch = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const token = getToken()
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')

    // Resolve `fetch` at call time so test stubs applied via `vi.stubGlobal`
    // are honoured. Capturing it at factory-creation time would freeze the
    // reference to whatever `fetch` was on the global at module-load.
    const fetchImpl = options.fetchImpl ?? globalThis.fetch
    const response = await fetchImpl(url, { ...init, headers })

    if (!response.ok) {
      let body: unknown
      try {
        body = isJsonResponse(response) ? await response.json() : await response.text()
      } catch {
        body = undefined
      }
      throw new MdkFetchError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`,
        body,
      )
    }

    if (response.status === 204) return undefined as T
    if (!isJsonResponse(response)) return (await response.text()) as unknown as T
    return (await response.json()) as T
  }

  return bearerFetch
}

/**
 * Module-level singleton bearer fetcher reading from the global `authStore`.
 * Used as the default by the mining query factories (`tailLogQuery`, etc.).
 *
 * @category query
 */
export const mdkFetch: Fetcher = createBearerFetcher()
