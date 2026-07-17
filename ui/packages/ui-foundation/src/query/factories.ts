import type { QueryClient } from '@tanstack/query-core'
import type {
  AuthTokenRequest,
  AuthTokenResponse,
  ContainerSettingsEntry,
  ExtDataParams,
  FeatureConfigResponse,
  GlobalDataParams,
  HistoryLogParams,
  ListRacksParams,
  ListThingsDevice,
  ListThingsParams,
  MinerpoolExtDataEntry,
  PduLayoutParams,
  PduLayoutResponse,
  Rack,
  SiteResponse,
  TailLogEntry,
  TailLogMultiParams,
  TailLogParams,
  ThingCommentBody,
  ThingConfigParams,
} from '../types/api-mining.types'
import { getApiBaseUrl } from './client'
import { API_ENDPOINTS, HTTP_METHODS, type HttpMethod, JSON_HEADERS } from './endpoints'
import { queryKeys } from './keys'
import { mdkFetch } from './mdk-fetch'

/**
 * Plain `fetch` JSON helper. Throws on non-2xx; resolves to parsed body otherwise.
 * Adapters are free to substitute their own fetch implementation by passing
 * one explicitly to the factories below.
 */
export type Fetcher = <T>(url: string, init?: RequestInit) => Promise<T>

/**
 * The slice of TanStack's query-function context the factories care about: the
 * `AbortSignal` fired when a query is cancelled. Optional + defaulted by
 * {@link createGetQueryFn} so factory unit tests can call `queryFn()` with no
 * args; in real `useQuery` usage TanStack always supplies a live signal.
 */
export type QueryFnContext = { signal?: AbortSignal }

const defaultFetcher: Fetcher = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return (await response.json()) as T
}

export const buildUrl = (base: string, path: string): string => {
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
 * Build a signal-aware GET `queryFn` for an already-resolved `url`. This is the
 * single place the `AbortSignal` is threaded into the fetcher: TanStack cancels
 * a query (firing the signal) when its last observer unmounts on navigation,
 * or when an invalidation supersedes a request that is still in flight — so the
 * request `abort()`s instead of running to completion and discarding its
 * result. `T` pins the parsed response type for the caller.
 *
 * @category query
 */
export const createGetQueryFn =
  <T>(fetcher: Fetcher, url: string) =>
  ({ signal }: QueryFnContext = {}): Promise<T> =>
    fetcher<T>(url, { signal })

/**
 * TanStack Query factory for the `/auth` session lookup.
 * Pass into `useQuery(authQuery(client))` to fetch the current session.
 *
 * @category query
 */
export const authQuery = (client: QueryClient, fetcher: Fetcher = defaultFetcher) => ({
  queryKey: queryKeys.auth(),
  queryFn: createGetQueryFn(fetcher, buildUrl(getApiBaseUrl(client), API_ENDPOINTS.auth)),
})

/**
 * TanStack Query factory for the full `/devices` inventory listing.
 *
 * @category query
 */
export const devicesQuery = (client: QueryClient, fetcher: Fetcher = defaultFetcher) => ({
  queryKey: queryKeys.devices(),
  queryFn: createGetQueryFn(fetcher, buildUrl(getApiBaseUrl(client), API_ENDPOINTS.devices)),
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
  queryFn: createGetQueryFn(
    fetcher,
    buildUrl(getApiBaseUrl(client), `${API_ENDPOINTS.devices}/${encodeURIComponent(id)}`),
  ),
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
  queryFn: createGetQueryFn(
    fetcher,
    buildUrl(getApiBaseUrl(client), `${API_ENDPOINTS.telemetry}/${encodeURIComponent(deviceId)}`),
  ),
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
  queryFn: createGetQueryFn<TailLogEntry[][]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.tailLog), params),
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
  queryFn: createGetQueryFn<ListThingsDevice[][]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.listThings), params),
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
  queryFn: createGetQueryFn<Record<string, unknown>[]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.historyLog), params),
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
  queryFn: createGetQueryFn<TRow[][]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.extData), params),
  ),
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
 * TanStack Query factory for `GET /auth/tail-log/multi` — the batched
 * variant of tail-log (`keys` is a comma-separated list of `stat-*` keys).
 * Returns the same per-worker nested envelope as `tailLogQuery`, one series
 * per requested key.
 *
 * @category query
 */
export const tailLogMultiQuery = (
  client: QueryClient,
  params: TailLogMultiParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.tailLogMulti(params),
  queryFn: createGetQueryFn<TailLogEntry[][]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.tailLogMulti), params),
  ),
})

/**
 * TanStack Query factory for `GET /auth/site` — the configured site label.
 *
 * @category query
 */
export const siteQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.site(),
  queryFn: createGetQueryFn<SiteResponse>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.site),
  ),
})

/**
 * TanStack Query factory for `GET /auth/list-racks`. `type` (worker type,
 * e.g. `miner` / `container`) is required — the backend 400s with
 * `ERR_TYPE_INVALID` without it. Response is the per-Kernel nested envelope.
 *
 * @category query
 */
export const listRacksQuery = (
  client: QueryClient,
  params: ListRacksParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.listRacks(params),
  queryFn: createGetQueryFn<Rack[][]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.listRacks), params),
  ),
})

/**
 * TanStack Query factory for `GET /auth/pdu-layout` — the static PDU socket
 * grid for a container type. The backend sources it from the container
 * worker's `pduGridLayout` config keyed by the exact type string, and 400s
 * with `ERR_PDU_LAYOUT_NOT_FOUND` when no layout is provisioned.
 *
 * @category query
 */
export const pduLayoutQuery = (
  client: QueryClient,
  params: PduLayoutParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.pduLayout(params),
  queryFn: createGetQueryFn<PduLayoutResponse>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.pduLayout), params),
  ),
})

/**
 * TanStack Query factory for `GET /auth/global/data`. Generic in the row
 * type — see `containerSettingsQuery` for the canonical narrowing.
 *
 * @category query
 */
export const globalDataQuery = <TRow = unknown>(
  client: QueryClient,
  params: GlobalDataParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.globalData(params),
  queryFn: createGetQueryFn<TRow[]>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.globalData), params),
  ),
})

/**
 * Convenience wrapper around `globalDataQuery` pinned to
 * `type=containerSettings` — per-model container thresholds/parameters.
 * Verified live: the response is a flat `ContainerSettingsEntry[]`, not the
 * per-Kernel envelope.
 *
 * @category query
 */
export const containerSettingsQuery = (
  client: QueryClient,
  options: { model?: string; overwriteCache?: boolean } = {},
  fetcher: Fetcher = mdkFetch,
) =>
  globalDataQuery<ContainerSettingsEntry>(
    client,
    { type: 'containerSettings', ...options },
    fetcher,
  )

/**
 * TanStack Query factory for `GET /auth/thing-config` — a thing type's
 * config document (Settings tab). Both params are required by the backend
 * schema. Response shape is worker-specific, so callers narrow via the
 * generic.
 *
 * @category query
 */
export const thingConfigQuery = <TConfig = Record<string, unknown>>(
  client: QueryClient,
  params: ThingConfigParams,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.thingConfig(params),
  queryFn: createGetQueryFn<TConfig>(
    fetcher,
    appendQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.thingConfig), params),
  ),
})

/**
 * TanStack Query factory for `GET /auth/global-config` — the global system
 * config document. Shape is deployment-specific (not yet captured live), so
 * callers narrow via the generic.
 *
 * @category query
 */
export const globalConfigQuery = <TConfig = Record<string, unknown>>(
  client: QueryClient,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.globalConfig(),
  queryFn: createGetQueryFn<TConfig>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.globalConfig),
  ),
})

/**
 * TanStack Query factory for `GET /auth/featureConfig` — deployment feature
 * flags, including the multi-site mode switch. Note the camelCase path:
 * there is no `/auth/feature-config` route (a kebab-case request falls
 * through to the SPA fallback).
 *
 * @category query
 */
export const featureConfigQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.featureConfig(),
  queryFn: createGetQueryFn<FeatureConfigResponse>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.featureConfig),
  ),
})

/**
 * TanStack Mutation factory for `POST /auth/token`. Used by `useTokenPolling`
 * to refresh the session token every 250 s.
 *
 * @category query
 */
export const authTokenMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.authToken(),
  mutationFn: (body: AuthTokenRequest = {}) =>
    fetcher<AuthTokenResponse>(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.authToken), {
      method: HTTP_METHODS.POST,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }),
})

/* Shared implementation for the three /auth/thing/comment verbs — one
 * Fastify schema covers add (POST), edit (PUT), and delete (DELETE). */
const thingCommentMutationFn =
  (client: QueryClient, method: HttpMethod, fetcher: Fetcher) =>
  (body: ThingCommentBody) =>
    fetcher(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.thingComment), {
      method,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })

/**
 * TanStack Mutation factory for `POST /auth/thing/comment` — add a device
 * comment. Requires the `comments:write` permission; the backend stamps the
 * author from the session token.
 *
 * @category query
 */
export const addThingCommentMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.addThingComment(),
  mutationFn: thingCommentMutationFn(client, HTTP_METHODS.POST, fetcher),
})

/**
 * TanStack Mutation factory for `PUT /auth/thing/comment` — edit an existing
 * device comment (`body.id` identifies it).
 *
 * @category query
 */
export const editThingCommentMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.editThingComment(),
  mutationFn: thingCommentMutationFn(client, HTTP_METHODS.PUT, fetcher),
})

/**
 * TanStack Mutation factory for `DELETE /auth/thing/comment` — remove an
 * existing device comment (`body.id` identifies it; the schema still
 * requires the full body on delete).
 *
 * @category query
 */
export const deleteThingCommentMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.deleteThingComment(),
  mutationFn: thingCommentMutationFn(client, HTTP_METHODS.DELETE, fetcher),
})
