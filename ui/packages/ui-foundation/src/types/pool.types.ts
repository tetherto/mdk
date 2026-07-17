/**
 * API contracts for the MiningOS Pool Manager endpoints.
 *
 * Reads target `/auth/configs/pool`, `/auth/pools*`, and `/auth/miners`.
 * Writes go through the voting/approval workflow at `/auth/actions/*`.
 * All requests require a `Authorization: Bearer <token>` header.
 *
 * Response shapes are typed loosely (optional fields, index signatures)
 * because the backend returns provider-specific blobs the devkit consumes
 * with `lodash.get` semantics.
 */

/**
 * A single pool-URL endpoint as stored on a pool configuration. `url` is a
 * `stratum+tcp://host:port` string; the devkit `usePoolConfigs` transform
 * parses it into host/port/role for display.
 *
 * @category api
 */
export type PoolConfigUrl = {
  url: string
  pool: string
  workerName?: string
  workerPassword?: string
}

/**
 * Raw pool-configuration row from `GET /auth/configs/pool`. This is the
 * shape the devkit `usePoolConfigs` transform consumes to build a
 * `PoolSummary`.
 *
 * @category api
 */
export type PoolConfigEntry = {
  id: string
  poolConfigName: string
  description: string
  poolUrls: PoolConfigUrl[]
  miners: number
  containers: number
  updatedAt: string | number
}

/**
 * Per-container override-count row from `GET /auth/pools/stats/containers`.
 *
 * @category api
 */
export type ContainerPoolStat = {
  container: string
  overriddenConfig?: number
  [key: string]: unknown
}

/**
 * Response for `GET /auth/pools/config/:id` — the device's assigned pool
 * config id and the count of miners overriding their container's config.
 *
 * @category api
 */
export type PoolConfigForDeviceResponse = {
  poolConfig: string | null
  overriddenConfig: number
}

/**
 * Aggregated pool row from `GET /auth/pools` (hashrate / workers / balance /
 * revenue / summary). Feeds the Dashboard pool panel, not the Pools list.
 *
 * @category api
 */
export type AggregatedPool = {
  name?: string
  hashrate?: number
  workers?: number
  balance?: number
  revenue?: number
  [key: string]: unknown
}

/**
 * Site-wide totals returned alongside the pool list by `GET /auth/pools`.
 *
 * @category api
 */
export type PoolsSummary = {
  poolCount: number
  totalHashrate: number
  totalWorkers: number
  totalBalance: number
}

/**
 * Response envelope for `GET /auth/pools` — the aggregated `pools` list plus a
 * site-wide `summary`. The backend wraps the array, so consumers must read
 * `.pools` rather than treating the payload as an array.
 *
 * @category api
 */
export type PoolsResponse = {
  pools: AggregatedPool[]
  summary: PoolsSummary
}

/**
 * A single revenue/hashrate sample from
 * `GET /auth/pools/:pool/balance-history`.
 *
 * @category api
 */
export type PoolBalanceHistoryEntry = {
  ts?: number
  revenue?: number
  hashrate?: number
  /** Settled balance for the bucket (equals `revenue` in the current backend). */
  balance?: number
  [key: string]: unknown
}

/**
 * Response envelope for `GET /auth/pools/:pool/balance-history` — the backend
 * wraps the samples in `{ log }`.
 *
 * @category api
 */
export type PoolBalanceHistoryResponse = {
  log: PoolBalanceHistoryEntry[]
}

/**
 * A miner row from `GET /auth/miners`, carrying its assigned `poolConfig`.
 * Only the id is guaranteed; the rest is consumed via `lodash.get`.
 *
 * @category api
 */
export type MinerEntry = {
  id: string
  [key: string]: unknown
}

/**
 * Paginated envelope returned by `GET /auth/miners` — page `data` plus
 * site-wide pagination metadata.
 *
 * @category api
 */
export type MinersResponse = {
  data: MinerEntry[]
  totalCount: number
  offset: number
  limit: number
  hasMore: boolean
}

/**
 * Query parameters for `GET /auth/pools/:pool/balance-history`. The backend
 * requires both `start` and `end` (Unix ms) and rejects the request otherwise;
 * they are typed optional only so a param object can be built incrementally.
 *
 * @category api
 */
export type PoolBalanceHistoryParams = {
  /** Window start (Unix ms). Required by the backend. */
  start?: number
  /** Window end (Unix ms). Required by the backend. */
  end?: number
  range?: '1D' | '1W' | '1M'
}

/**
 * Query parameters for `GET /auth/miners`. `filter`, `fields`, and `sort` are
 * JSON-stringified Mongo-style selectors; `search` is free text matched across
 * id / code / serial / mac.
 *
 * @category api
 */
export type MinersParams = {
  filter?: string
  fields?: string
  sort?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Free-form query parameters for `GET /auth/actions`. Array values are
 * serialized comma-separated (e.g. `?status=VOTING,APPROVED`).
 *
 * @category api
 */
export type ActionsParams = Record<string, unknown>

/**
 * One entry in the `queries` array sent to `GET /auth/actions?queries=…`.
 *
 * @category api
 */
export type ActionTypeQuery = {
  type: 'voting' | 'ready' | 'executing' | 'done' | string
  opts?: { reverse?: boolean; limit?: number; [key: string]: unknown }
}

/**
 * A single live action returned by the backend voting queue.
 *
 * @category api
 */
export type LiveAction = {
  id: string
  /** The action verb (e.g. `setupPools`, `registerPoolConfig`). */
  action?: string
  type?: string
  status?: string
  /** Email/username of the submitter — first entry in `votesPos`. */
  votesPos?: string[]
  votesNeg?: string[]
  query?: Record<string, unknown>
  params?: VotingActionParam[]
  targets?: unknown[]
  deviceId?: string
  deviceIds?: string[]
  createdAt?: number
  updatedAt?: number
  [key: string]: unknown
}

/**
 * Response shape of `GET /auth/actions?queries=…` — a one-element array
 * whose single object maps each requested type to its result list.
 *
 * @category api
 */
export type LiveActionsResponse = {
  voting?: LiveAction[]
  ready?: LiveAction[]
  executing?: LiveAction[]
  done?: LiveAction[]
  [key: string]: LiveAction[] | undefined
}

/**
 * Object-shaped `params[]` entry on a voting submission. Pool create/update
 * carry `{ type: 'pool', data }` (+ `id` for updates); assign-pool carries
 * `{ poolConfigId, configType: 'pool' }`; `switchSocket` carries
 * `{ pdu, socket, enabled }`; `updateThing` carries the thing patch.
 *
 * @category api
 */
export type VotingActionObjectParam = {
  type?: string
  id?: string
  poolConfigId?: string
  configType?: string
  data?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * A single `params[]` entry on a voting submission. Positional and
 * action-specific: device actions carry primitives (`setPowerMode` sends
 * `['sleep']`, `setLED` sends `[true]`, `setTankEnabled` sends `[3, true]`),
 * pool/thing actions carry {@link VotingActionObjectParam} objects.
 *
 * @category api
 */
export type VotingActionParam = string | number | boolean | VotingActionObjectParam

/**
 * Body for `POST /auth/actions/:type` (default `voting`). `type` selects the
 * URL segment and is stripped from the JSON body before posting — the
 * remaining fields (`query`, `action`, `params`, `rackType`, …) form the
 * request body.
 *
 * @category api
 */
export type VotingActionPayload = {
  /** URL segment under `/auth/actions/:type`. Defaults to `voting`. */
  type?: string
  query?: Record<string, unknown>
  action?: string
  params?: VotingActionParam[]
  rackType?: string
  [key: string]: unknown
}

/**
 * Body for `POST /auth/actions/voting/batch` — a set of staged actions plus a
 * client-generated `batchActionUID` the backend uses to group them.
 *
 * @category api
 */
export type SubmitBatchActionsPayload = {
  batchActionsPayload: VotingActionPayload[]
  batchActionUID: string
  suffix?: string
  /** Batch-level annotations (e.g. `{ isBackFromMaintenance }` on miner moves). */
  metadata?: Record<string, unknown>
}

/**
 * Body for `PUT /auth/actions/voting/:id/vote`.
 *
 * @category api
 */
export type VoteActionPayload = {
  id: string | number
  approve: boolean
}

/**
 * Arguments for `DELETE /auth/actions/:type/cancel?ids=<comma>`.
 *
 * @category api
 */
export type CancelActionsPayload = {
  /** Action type URL segment (e.g. `voting`). */
  type: string
  ids: Array<string | number>
}

/**
 * A `{ value, unit }` measurement, optionally annotated with a `nominal`
 * (rated) value and a `utilization` percentage (`value / nominal * 100`).
 *
 * @category api
 */
export type SiteStatusMetric = {
  value: number
  unit: string
  nominal?: number
  utilization?: number
}

/**
 * Power metric from the live site-status snapshot. Like {@link SiteStatusMetric}
 * but with an `alert` message and a hard `error` flag.
 *
 * @category api
 */
export type SiteStatusPower = SiteStatusMetric & {
  alert?: string
  error?: boolean
}

/**
 * Miner population counts from the live site-status snapshot.
 *
 * @category api
 */
export type SiteStatusMiners = {
  online: number
  offline: number
  error: number
  total: number
  containerCapacity: number
}

/**
 * Alert counts by severity from the live site-status snapshot.
 *
 * @category api
 */
export type SiteStatusAlerts = {
  critical: number
  high: number
  medium: number
  total: number
}

/**
 * Pool-side aggregates from the live site-status snapshot.
 *
 * @category api
 */
export type SiteStatusPools = {
  totalHashrate: { value: number; unit: string }
  activeWorkers: number
  totalWorkers: number
}

/**
 * Composite live site-status snapshot from `GET /auth/site/status/live`.
 * Aggregates site-wide hashrate, power, efficiency, miner/alert/pool counts,
 * and the snapshot timestamp (`ts`, Unix ms). Polled on a short interval.
 *
 * @category api
 */
export type SiteStatusLive = {
  hashrate: SiteStatusMetric
  power: SiteStatusPower
  efficiency: SiteStatusMetric
  miners: SiteStatusMiners
  alerts: SiteStatusAlerts
  pools: SiteStatusPools
  /** Snapshot timestamp in Unix milliseconds. */
  ts: number
}
