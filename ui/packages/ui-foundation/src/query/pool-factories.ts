/**
 * TanStack Query factories for the MiningOS Pool Manager surface.
 *
 * Reads (`GET /auth/configs/pool`, `/auth/pools*`, `/auth/miners`,
 * `/auth/actions`) and the voting/approval write workflow
 * (`POST /auth/actions/:type`, `PUT .../:id/vote`, `DELETE .../cancel`).
 *
 * Follows the same `(client, params?, fetcher = mdkFetch)` contract as the
 * core factories in `./factories`, returning plain
 * `{ queryKey, queryFn }` / `{ mutationKey, mutationFn }` objects so adapter
 * hooks own polling, retries, and cache invalidation.
 */

import type { QueryClient } from '@tanstack/query-core'

import type {
  ActionsParams,
  ActionTypeQuery,
  CancelActionsPayload,
  ContainerPoolStat,
  LiveActionsResponse,
  MinersParams,
  MinersResponse,
  PoolBalanceHistoryParams,
  PoolBalanceHistoryResponse,
  PoolConfigEntry,
  PoolConfigForDeviceResponse,
  PoolsResponse,
  SiteStatusLive,
  SubmitBatchActionsPayload,
  VoteActionPayload,
  VotingActionPayload,
} from '../types/pool.types'
import { getApiBaseUrl } from './client'
import { API_ENDPOINTS, HTTP_METHODS, JSON_HEADERS } from './endpoints'
import { buildUrl, createGetQueryFn, type Fetcher } from './factories'
import { queryKeys } from './keys'
import { mdkFetch } from './mdk-fetch'

/** Fixed URL segment for the voting/approval workflow. */
const VOTING_ACTION_TYPE = 'voting'

/** Page size for the active action types (voting / ready / executing). */
const LIVE_ACTIONS_LIMIT = 1000

/** Page size for the recently-completed (`done`) action feed. */
const DONE_ACTIONS_LIMIT = 3

/**
 * Append query params to a URL, serializing array values comma-separated
 * (e.g. `{ ids: ['a', 'b'] }` → `?ids=a,b`). Mirrors the `qs`
 * `arrayFormat: 'comma'` convention MiningOS expects, without the extra
 * dependency. `undefined` / `null` and empty arrays are skipped.
 */
export const appendCommaQuery = (url: string, params: Record<string, unknown>): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      search.set(key, value.map((entry) => String(entry)).join(','))
    } else {
      search.set(key, typeof value === 'string' ? value : String(value))
    }
  }
  const qs = search.toString()
  return qs.length === 0 ? url : `${url}?${qs}`
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Shape of the `/auth/userinfo` response.
 * Email may appear on the root or nested in `metadata`.
 *
 * @category api
 */
export type UserInfoResponse = {
  email?: string
  metadata?: {
    email?: string
    id?: number
    roles?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * `GET /auth/userinfo` — current authenticated user's profile.
 * Used to resolve the caller's email for partitioning live actions
 * into "mine vs others".
 *
 * @category query
 */
export const userInfoQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.userInfo(),
  queryFn: createGetQueryFn<UserInfoResponse>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.userInfo),
  ),
})

/**
 * `GET /auth/configs/pool` — raw pool configurations. The shape the devkit
 * `usePoolConfigs` transform consumes.
 *
 * @category query
 */
export const poolConfigsQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.poolConfigs(),
  queryFn: createGetQueryFn<PoolConfigEntry[]>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.poolConfigs),
  ),
})

/**
 * `GET /auth/pools/stats/containers` — per-container override counts.
 *
 * @category query
 */
export const containerPoolStatsQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.containerPoolStats(),
  queryFn: createGetQueryFn<ContainerPoolStat[]>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.containerPoolStats),
  ),
})

/**
 * `GET /auth/pools/config/:minerId` — pool config + override count for a
 * single device/miner.
 *
 * @category query
 */
export const poolConfigForDeviceQuery = (
  client: QueryClient,
  minerId: string,
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.poolConfigForDevice(minerId),
  queryFn: createGetQueryFn<PoolConfigForDeviceResponse>(
    fetcher,
    buildUrl(
      getApiBaseUrl(client),
      `${API_ENDPOINTS.poolConfigForDevice}/${encodeURIComponent(minerId)}`,
    ),
  ),
})

/**
 * `GET /auth/pools` — aggregated pools (hashrate / workers / balance /
 * revenue). Feeds the Dashboard pool panel.
 *
 * @category query
 */
export const poolsQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.pools(),
  queryFn: createGetQueryFn<PoolsResponse>(
    fetcher,
    buildUrl(getApiBaseUrl(client), API_ENDPOINTS.pools),
  ),
})

/**
 * `GET /auth/pools/:pool/balance-history` — per-pool revenue/hashrate
 * history for the chart view.
 *
 * @category query
 */
export const poolBalanceHistoryQuery = (
  client: QueryClient,
  pool: string,
  params: PoolBalanceHistoryParams = {},
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.poolBalanceHistory(pool, params),
  queryFn: createGetQueryFn<PoolBalanceHistoryResponse>(
    fetcher,
    appendCommaQuery(
      buildUrl(getApiBaseUrl(client), `${API_ENDPOINTS.pools}/${encodeURIComponent(pool)}/balance-history`),
      params,
    ),
  ),
})

/**
 * `GET /auth/miners` — miners with their assigned `poolConfig` (Miner
 * Explorer rows). `filter` / `fields` / `sort` are JSON-stringified selectors.
 * Returns the paginated {@link MinersResponse} envelope.
 *
 * @category query
 */
export const minersQuery = (
  client: QueryClient,
  params: MinersParams = {},
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.miners(params),
  queryFn: createGetQueryFn<MinersResponse>(
    fetcher,
    appendCommaQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.miners), params),
  ),
})

/**
 * `GET /auth/site/status/live?overwriteCache=true` — composite live site-status
 * snapshot (hashrate / power / efficiency / miner, alert & pool counts). Polled
 * on a short interval by `useSiteStatusLive`; `overwriteCache` bypasses the
 * server-side LRU cache so each poll reflects the latest sample.
 *
 * @category query
 */
export const siteStatusLiveQuery = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  queryKey: queryKeys.siteStatusLive(),
  queryFn: createGetQueryFn<SiteStatusLive>(
    fetcher,
    appendCommaQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.siteStatusLive), {
      overwriteCache: true,
    }),
  ),
})

/**
 * `GET /auth/actions` — pending/voting actions list (the review-tray
 * source). Array params serialize comma-separated.
 *
 * @category query
 */
export const actionsQuery = (
  client: QueryClient,
  params: ActionsParams = {},
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.actions(params),
  queryFn: createGetQueryFn(
    fetcher,
    appendCommaQuery(buildUrl(getApiBaseUrl(client), API_ENDPOINTS.actions), params),
  ),
})

/**
 * `GET /auth/actions?queries=…` — polls all action types in a single request
 * using the multi-type query format. Returns the typed response map
 * `{ voting, ready, executing, done }`.
 *
 * @category query
 */
export const liveActionsQuery = (
  client: QueryClient,
  queries: ActionTypeQuery[] = [
    { type: 'voting', opts: { reverse: true, limit: LIVE_ACTIONS_LIMIT } },
    { type: 'ready', opts: { reverse: true, limit: LIVE_ACTIONS_LIMIT } },
    { type: 'executing', opts: { reverse: true, limit: LIVE_ACTIONS_LIMIT } },
    { type: 'done', opts: { reverse: true, limit: DONE_ACTIONS_LIMIT } },
  ],
  fetcher: Fetcher = mdkFetch,
) => ({
  queryKey: queryKeys.liveActions(queries),
  queryFn: createGetQueryFn<[LiveActionsResponse]>(
    fetcher,
    `${buildUrl(getApiBaseUrl(client), API_ENDPOINTS.actions)}?${new URLSearchParams({
      queries: JSON.stringify(queries),
      overwriteCache: 'true',
    }).toString()}`,
  ),
})

// ---------------------------------------------------------------------------
// Writes — voting/approval workflow
// ---------------------------------------------------------------------------

/**
 * `POST /auth/actions/voting` — submit a single staged action. The backend
 * exposes a fixed `voting` path, so the client-only `type` field is stripped
 * from the body; the remaining fields (`query`, `action`, `params`,
 * `rackType`, …) form the request body.
 *
 * @category query
 */
export const submitActionMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.submitAction(),
  mutationFn: (payload: VotingActionPayload) => {
    const { type: _type, ...body } = payload
    return fetcher(
      buildUrl(getApiBaseUrl(client), `${API_ENDPOINTS.actions}/${VOTING_ACTION_TYPE}`),
      {
        method: HTTP_METHODS.POST,
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      },
    )
  },
})

/**
 * `POST /auth/actions/voting/batch` — submit a batch of staged actions in one
 * request. Expects the {@link SubmitBatchActionsPayload} body
 * (`{ batchActionsPayload, batchActionUID, suffix? }`).
 *
 * @category query
 */
export const submitBatchActionMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.submitBatchAction(),
  mutationFn: (payload: SubmitBatchActionsPayload) =>
    fetcher(
      buildUrl(getApiBaseUrl(client), `${API_ENDPOINTS.actions}/${VOTING_ACTION_TYPE}/batch`),
      {
        method: HTTP_METHODS.POST,
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      },
    ),
})

/**
 * `PUT /auth/actions/voting/:id/vote` — approve or reject a pending action.
 *
 * @category query
 */
export const voteActionMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.voteAction(),
  mutationFn: ({ id, approve }: VoteActionPayload) =>
    fetcher(
      buildUrl(
        getApiBaseUrl(client),
        `${API_ENDPOINTS.actions}/${VOTING_ACTION_TYPE}/${encodeURIComponent(String(id))}/vote`,
      ),
      {
        method: HTTP_METHODS.PUT,
        headers: JSON_HEADERS,
        body: JSON.stringify({ approve }),
      },
    ),
})

/**
 * `DELETE /auth/actions/:type/cancel?ids=<comma>` — cancel pending actions.
 *
 * @category query
 */
export const cancelActionsMutation = (client: QueryClient, fetcher: Fetcher = mdkFetch) => ({
  mutationKey: queryKeys.cancelActions(),
  mutationFn: ({ type, ids }: CancelActionsPayload) =>
    fetcher(
      appendCommaQuery(
        buildUrl(getApiBaseUrl(client), `${API_ENDPOINTS.actions}/${encodeURIComponent(type)}/cancel`),
        { ids },
      ),
      { method: HTTP_METHODS.DELETE },
    ),
})
