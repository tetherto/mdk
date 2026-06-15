import type { QueryClient } from '@tanstack/query-core'
import type {
  AuthTokenRequest,
  AuthTokenResponse,
  ExtDataParams,
  HistoryLogParams,
  ListThingsDevice,
  ListThingsParams,
  MinerpoolExtDataEntry,
  TailLogEntry,
  TailLogParams,
} from '../types/api-mining.types'
import { getApiBaseUrl } from './client'
import { queryKeys } from './keys'
import { mdkFetch } from './mdk-fetch'

/**
 * Plain `fetch` JSON helper. Throws on non-2xx; resolves to parsed body otherwise.
 * Adapters are free to substitute their own fetch implementation by passing
 * one explicitly to the factories below.
 */
export type Fetcher = <T>(url: string, init?: RequestInit) => Promise<T>

const defaultFetcher: Fetcher = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return (await response.json()) as T
}

const buildUrl = (base: string, path: string): string => {
  const trimmedBase = base.replace(/\/+$/, '')
  const trimmedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${trimmedPath}`
}

const appendQuery = (url: string, params: Record<string, unknown>): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    search.set(key, typeof value === 'string' ? value : String(value))
  }
  const qs = search.toString()
  return qs.length === 0 ? url : `${url}?${qs}`
}

/**
 * TanStack Query factory for the `/auth` session lookup.
 * Pass into `useQuery(authQuery(client))` to fetch the current session.
 *
 * @category query
 */
export const authQuery = (client: QueryClient, fetcher: Fetcher = defaultFetcher) => ({
  queryKey: queryKeys.auth(),
  queryFn: () => fetcher(buildUrl(getApiBaseUrl(client), '/auth')),
})

/**
 * TanStack Query factory for the full `/devices` inventory listing.
 *
 * @category query
 */
export const devicesQuery = (client: QueryClient, fetcher: Fetcher = defaultFetcher) => ({
  queryKey: queryKeys.devices(),
  queryFn: () => fetcher(buildUrl(getApiBaseUrl(client), '/devices')),
})

/**
 * TanStack Query factory for a single device by id (`/devices/:id`).
 *
 * @category query
 */
export const deviceQuery = (
  client: QueryClient,
  id: string,
  fetcher: Fetcher = defaultFetcher,
) => ({
  queryKey: queryKeys.device(id),
  queryFn: () => fetcher(buildUrl(getApiBaseUrl(client), `/devices/${encodeURIComponent(id)}`)),
})

/**
 * TanStack Query factory for live telemetry of a device
 * (`/telemetry/:deviceId`).
 *
 * @category query
 */
export const telemetryQuery = (
  client: QueryClient,
  deviceId: string,
  fetcher: Fetcher = defaultFetcher,
) => ({
  queryKey: queryKeys.telemetry(deviceId),
  queryFn: () =>
    fetcher(buildUrl(getApiBaseUrl(client), `/telemetry/${encodeURIComponent(deviceId)}`)),
})

/**
 * TanStack Query factory for `GET /auth/tail-log`. Returns the raw nested
 * response shape (`Array<Array<TailLogEntry>>`) — callers unwrap with
 * `_head(response)` (or a typed `select` projection).
 *
 * @category query
 */
export const tailLogQuery = (
  client: QueryClient,
  params: TailLogParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.tailLog(params),
  queryFn: () =>
    fetcher<TailLogEntry[][]>(
      appendQuery(buildUrl(getApiBaseUrl(client), '/auth/tail-log'), params),
    ),
})

/**
 * TanStack Query factory for `GET /auth/list-things`. `query` and `fields`
 * are Mongo-style selectors passed as already-stringified JSON.
 *
 * @category query
 */
export const listThingsQuery = (
  client: QueryClient,
  params: ListThingsParams = {},
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.listThings(params),
  queryFn: () =>
    fetcher<ListThingsDevice[][]>(
      appendQuery(buildUrl(getApiBaseUrl(client), '/auth/list-things'), params),
    ),
})

/**
 * TanStack Query factory for `GET /auth/history-log`. `logType` is required
 * (`'alerts' | 'info'`).
 *
 * @category query
 */
export const historyLogQuery = (
  client: QueryClient,
  params: HistoryLogParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.historyLog(params),
  queryFn: () =>
    fetcher<Record<string, unknown>[]>(
      appendQuery(buildUrl(getApiBaseUrl(client), '/auth/history-log'), params),
    ),
})

/**
 * TanStack Query factory for `GET /auth/ext-data`. Generic in the response
 * row type so adapters can pin the result to a typed envelope (see
 * `minerpoolStatsQuery` for the canonical narrowing). `query` is a
 * JSON-stringified provider-specific selector.
 *
 * @category query
 */
export const extDataQuery = <TRow = unknown>(
  client: QueryClient,
  params: ExtDataParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.extData(params),
  queryFn: () =>
    fetcher<TRow[][]>(appendQuery(buildUrl(getApiBaseUrl(client), '/auth/ext-data'), params)),
})

/**
 * Convenience wrapper around `extDataQuery` pinned to `type=minerpool` and
 * `query={"key":"stats"}`. Returns the canonical `MinerpoolExtDataEntry[][]`
 * envelope so the pool counts hook can `_head(_head(...))` without casts.
 *
 * @category query
 */
export const minerpoolStatsQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) =>
  extDataQuery<MinerpoolExtDataEntry>(
    client,
    { type: 'minerpool', query: JSON.stringify({ key: 'stats' }) },
    fetcher,
  )

/**
 * TanStack Mutation factory for `POST /auth/token`. Used by `useTokenPolling`
 * to refresh the session token every 250 s.
 *
 * @category query
 */
export const authTokenMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.authToken(),
  mutationFn: (body: AuthTokenRequest = {}) =>
    fetcher<AuthTokenResponse>(buildUrl(getApiBaseUrl(client), '/auth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
})
