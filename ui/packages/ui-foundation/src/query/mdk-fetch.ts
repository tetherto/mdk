/**
 * Bearer-token aware `fetch` wrapper for Gateway routes. Reads the current
 * token from `authStore` at call time (never captured at construction) so a
 * fresh token issued by `useTokenPolling` is applied to the next request
 * automatically.
 */

import { authStore } from '../store/auth-store.js'
import { MdkFetchError } from '../types/api-mining.types.js'
import type { Fetcher } from './runtime.js'

const TOKEN_GETTER_DEFAULT = (): string | null => authStore.getState().token

const contentTypeOf = (response: Response): string =>
  (response.headers.get('content-type') ?? '').toLowerCase()

const isJsonResponse = (response: Response): boolean =>
  contentTypeOf(response).includes('application/json')

/** Structured-text media types that are not under `text/*`. */
const TEXT_TYPE_MARKERS = ['json', 'xml', 'javascript', 'yaml', 'x-www-form-urlencoded']

/**
 * Whether a response body is text. A missing content type counts as text, as
 * before. Anything else (archives, images, `application/octet-stream`) is binary
 * and must not go through `response.text()`, which decodes it as UTF-8 and
 * replaces invalid bytes, corrupting the file.
 */
const isTextResponse = (response: Response): boolean => {
  const contentType = contentTypeOf(response)
  return (
    contentType === '' ||
    contentType.startsWith('text/') ||
    TEXT_TYPE_MARKERS.some((marker) => contentType.includes(marker))
  )
}

/**
 * Build a `Fetcher` that injects `Authorization: Bearer <token>` from the
 * supplied token getter (defaults to `authStore`). Non-2xx responses throw
 * an `MdkFetchError` carrying the HTTP status and parsed body.
 *
 * A 2xx body comes back by content type: JSON parsed, text (`text/*`, other
 * JSON, XML, JavaScript, YAML, form data, or no content type) as a string, and
 * anything else as a `Blob`,
 * so a file download keeps its exact bytes: `mdkFetch<Blob>(url)`. Pass an
 * `Accept` header when the route negotiates; the default is `application/json`.
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
    if (isJsonResponse(response)) return (await response.json()) as T
    if (isTextResponse(response)) return (await response.text()) as unknown as T
    return (await response.blob()) as unknown as T
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
