/**
 * API contracts for the App Node mining endpoints consumed by MDK UI Shell.
 *
 * All requests target the `/auth/...` namespace and require a
 * `Authorization: Bearer <token>` header. Responses are intentionally typed
 * loosely (`Record<string, unknown>` shapes, optional fields) because the
 * backend returns the union of aggregate fields requested in `aggrFields`
 * and the chart components consume them with `lodash.get` semantics.
 */

/**
 * A single time-bucketed entry from `GET /auth/tail-log`. Backend returns
 * `Array<Array<TailLogEntry>>` (outer wrapping is the per-worker grouping —
 * single-site dashboards take `_head(response)`).
 *
 * @category api
 */
export type TailLogEntry = {
  ts: number
  /** All other fields are dynamic aggregates requested via `aggrFields`. */
  [key: string]: unknown
}

/**
 * Narrowed variant where the hashrate aggregate is present. The dashboard
 * chart components default to this attribute when no `powerAttribute` override
 * is provided.
 *
 * @category api
 */
export type HashRateLogEntry = TailLogEntry & {
  hashrate_mhs_1m_sum_aggr?: number
  hashrate_mhs_5m_sum_aggr?: number
}

/**
 * Power-mode timeline entry — carries grouped per-miner mode/status maps
 * keyed by miner id. Consumed by `PowerModeTimelineChart`.
 *
 * @category api
 */
export type PowerModeTimelineEntry = TailLogEntry & {
  power_mode_group_aggr?: Record<string, string>
  status_group_aggr?: Record<string, string>
}

/**
 * Severity literal expected by the `ActiveIncidentsCard` row component.
 *
 * @category api
 */
export type AlertSeverity = 'critical' | 'high' | 'medium'

/**
 * Single alert record carried on a device under `last.alerts`. The list-things
 * endpoint returns alerts as nested arrays — see `getAlertsForDevices` for
 * the canonical extractor.
 *
 * @category api
 */
export type DeviceAlert = {
  uuid?: string
  name: string
  description: string
  message?: string
  severity: string
  createdAt: number | string
  type?: string
}

/**
 * Subset of the `list-things` device shape consumed by the dashboard
 * (`SiteStatsBar`, `ActiveIncidentsCard`). The full device is much larger;
 * we only type what we read.
 *
 * @category api
 */
export type ListThingsDevice = {
  id: string
  type: string
  status?: string
  info?: {
    pos?: string
    container?: string
    [key: string]: unknown
  }
  last?: {
    alerts?: DeviceAlert[] | null
    stats?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * Request body for `POST /auth/token`. The token endpoint refreshes the
 * session and (optionally) downgrades the role set.
 *
 * @category api
 */
export type AuthTokenRequest = {
  roles?: string[]
  ttl?: number
  ips?: string[]
  scope?: string
}

/**
 * Response from `POST /auth/token`.
 *
 * @category api
 */
export type AuthTokenResponse = {
  token: string
}

/**
 * Query parameters for `GET /auth/tail-log`. Mirrors the Fastify schema in
 * `miningos-app-node`. `aggrFields` is a JSON-stringified object describing
 * which aggregate columns to include in each row.
 *
 * @category api
 */
export type TailLogParams = {
  key: string
  type?: string
  tag?: string
  start?: number
  end?: number
  offset?: number
  limit?: number
  fields?: string
  aggrFields?: string
  aggrTimes?: string
  mergeSitesData?: boolean
  applyAggrCrossthg?: boolean
}

/**
 * Query parameters for `GET /auth/list-things`. `query` and `fields` are
 * JSON-stringified Mongo-style selectors.
 *
 * @category api
 */
export type ListThingsParams = {
  type?: string
  tag?: string
  status?: number | string
  query?: string
  fields?: string
  limit?: number
  offset?: number
}

/**
 * Query parameters for `GET /auth/history-log` (alerts / info-level history).
 *
 * @category api
 */
export type HistoryLogParams = {
  logType: 'alerts' | 'info'
  start?: number
  end?: number
  limit?: number
  offset?: number
  query?: string
}

/**
 * Query parameters for `GET /auth/ext-data` — a small key-value gateway the
 * backend exposes for non-tail-log data sources (minerpool, mempool, etc.).
 *
 * @category api
 */
export type ExtDataParams = {
  /** Provider id — e.g. `minerpool`, `mempool`. */
  type: string
  /** JSON-stringified provider-specific filter. */
  query?: string
}

/**
 * Per-pool stats entry returned by `GET /auth/ext-data?type=minerpool`. Each
 * configured pool (`f2pool`, `ocean`, …) contributes one row.
 *
 * @category api
 */
export type PoolMinerStats = {
  poolType?: string
  /** Subaccount / user the pool worker submits shares under. */
  username?: string
  /**
   * Pool-reported hashrate in **H/s** (raw hashes per second — `poolapi`
   * upstream convention). Note this differs from the tail-log convention
   * which carries MH/s. Divide by `1e15` for PH/s, by `1e9` for TH/s.
   */
  hashrate?: number
  /** Total workers configured at the pool. */
  worker_count?: number
  /** Workers currently submitting shares. */
  active_workers_count?: number
  balance?: number
  unsettled?: number
  revenue_24h?: number
  estimated_today_income?: number
}

/**
 * Single minerpool ext-data envelope. Backend nests these in `Array<Array<…>>`
 * (per-pool grouping + per-timestamp grouping), so consumers `_head(_head(…))`.
 *
 * @category api
 */
export type MinerpoolExtDataEntry = {
  ts?: string
  stats?: PoolMinerStats[]
}

/**
 * Single sample from the paginated `type=minerpool, key=stats-history`
 * ext-data feed used by the multi-series Hash Rate chart. Each entry
 * carries a timestamp and a snapshot of every configured pool's
 * `hashrate` at that point in time.
 *
 * @category api
 */
export type MinerpoolStatsHistoryEntry = {
  ts: number
  stats: PoolMinerStats[]
}

/**
 * Typed error thrown by the bearer fetcher. `status` mirrors the HTTP status
 * so callers can branch on auth failures without parsing `message`.
 *
 * @category api
 */
export class MdkFetchError extends Error {
  status: number
  body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'MdkFetchError'
    this.status = status
    this.body = body
  }
}
