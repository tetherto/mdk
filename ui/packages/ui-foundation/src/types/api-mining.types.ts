/**
 * API contracts for the Gateway mining endpoints consumed by MDK UI Shell.
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
 * Shape returned by `GET /auth/list-things` for a single device entry.
 * Fields are typed to the union of what the known field projections request
 * (miner explorer, container units, dashboard). Consumers that project fewer
 * fields still satisfy this type via the `[key: string]: unknown` index sig.
 *
 * @category api
 */
export type ListThingsDevice = {
  id: string
  type: string
  status?: string
  tags?: string[]
  code?: string
  rack?: string
  containerId?: string
  username?: string
  address?: string | null
  err?: string | null
  info?: {
    pos?: string
    container?: string
    poolConfig?: string
    [key: string]: unknown
  }
  last?: {
    ts?: number
    err?: string | null
    snap?: { stats?: Record<string, unknown>; [key: string]: unknown }
    alerts?: DeviceAlert[] | null
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
 * `miningos-gateway`. `aggrFields` is a JSON-stringified object describing
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
 * A single historical alert row returned by `GET /auth/history-log?logType=alerts`.
 *
 * The backend may return the owning device either nested under `thing`
 * (`{ id, type, info, tags }`) or flattened onto the row (`deviceId`,
 * `deviceType`, `container`, `position`, `tags`). {@link mapHistoryLogToAlerts}
 * normalises both shapes into a `thing` object so the devkit `<Alerts>` /
 * `<HistoricalAlerts>` tables can derive the device label, short code, and
 * filter tokens the same way they do for current alerts.
 *
 * @category api
 */
export type HistoricalAlert = {
  uuid?: string
  name: string
  description: string
  message?: string
  severity: string
  createdAt: number | string
  code?: string | number
  /** Owning device, when the backend nests it. */
  thing?: {
    id?: string
    type?: string
    code?: string
    info?: {
      container?: string
      pos?: string
      [key: string]: unknown
    }
    tags?: string[]
    [key: string]: unknown
  }
  /** Flattened device fields, when the backend does not nest `thing`. */
  deviceId?: string
  deviceType?: string
  container?: string
  position?: string
  tags?: string[]
  [key: string]: unknown
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
 * Query parameters for `GET /auth/tail-log/multi` — the batched variant of
 * tail-log. `keys` is required (comma-separated `stat-*` keys); the rest
 * mirrors the Fastify schema in `miningos-gateway`. {todo: update miningos-gateway}
 *
 * @category api
 */
export type TailLogMultiParams = {
  keys: string
  start?: number
  end?: number
  offset?: number
  limit?: number
  fields?: string
  aggrFields?: string
  aggrTimes?: string
  overwriteCache?: boolean
}

/**
 * Response from `GET /auth/site` — the configured site label.
 *
 * @category api
 */
export type SiteResponse = {
  site: string
}

/**
 * Query parameters for `GET /auth/pdu-layout`. `type` is the full container
 * type string (e.g. `container-bd-d40-m56`).
 *
 * @category api
 */
export type PduLayoutParams = {
  type: string
  overwriteCache?: boolean
}

/**
 * One socket in a PDU grid. `enabled` reflects the static layout default;
 * live on/off state comes from the device's `pdu_data` merge.
 *
 * @category api
 */
export type PduLayoutSocket = {
  socket: string
  enabled: boolean
  cooling?: boolean
}

/**
 * One PDU row in the static grid layout. `power_w` / `current_a` / `offline`
 * are absent in the static layout and filled from live `pdu_data`.
 *
 * @category api
 */
export type PduLayoutItem = {
  pdu: string
  sockets: PduLayoutSocket[]
  power_w?: number | string
  current_a?: number | string
  offline?: boolean
}

/**
 * Response from `GET /auth/pdu-layout` (verified live 2026-07-01). The
 * backend sources this from the container worker's `pduGridLayout` config,
 * keyed by the exact container type, and 400s with
 * `ERR_PDU_LAYOUT_NOT_FOUND` when no layout is provisioned for the type.
 *
 * @category api
 */
export type PduLayoutResponse = {
  type: string
  layout: PduLayoutItem[]
}

/**
 * Query parameters for `GET /auth/list-racks`. `type` is the worker type
 * (e.g. `miner`, `container`) — omitting it returns `ERR_TYPE_INVALID`.
 *
 * @category api
 */
export type ListRacksParams = {
  type: string
  overwriteCache?: boolean
}

/**
 * A single rack entry from `GET /auth/list-racks`. Typed loosely — the
 * `listRacks` RPC response shape has not been captured against a live
 * backend yet (staging returned no rack data at verification time).
 *
 * @category api
 */
export type Rack = {
  id?: string
  name?: string
  [key: string]: unknown
}

/**
 * Query parameters for `GET /auth/global/data`. `type` selects the global
 * data set (e.g. `containerSettings`); `model` optionally narrows container
 * settings to one settings-model (`bd`, `mbt`, `hydro`, `immersion`).
 *
 * @category api
 */
export type GlobalDataParams = {
  type: string
  model?: string
  overwriteCache?: boolean
}

/**
 * Threshold band for one container parameter. Which levels are present
 * varies per parameter (verified live: `oilTemperature` carries
 * `alert`/`alarm`, `waterTemperature` carries `alarmLow`/`alarmHigh`).
 *
 * @category api
 */
export type ContainerThresholdLevels = {
  criticalLow?: number
  alarmLow?: number
  alert?: number
  normal?: number
  alarm?: number
  alarmHigh?: number
  criticalHigh?: number
}

/**
 * One row of `GET /auth/global/data?type=containerSettings` (verified live
 * 2026-07-01 — the response is a flat array, not the per-Kernel envelope).
 * `thresholds` is keyed by threshold type (`oilTemperature`, `tankPressure`,
 * `waterTemperature`, ...).
 *
 * @category api
 */
export type ContainerSettingsEntry = {
  model: string
  site?: string
  parameters?: Record<string, unknown>
  thresholds?: Record<string, ContainerThresholdLevels>
}

/**
 * Query parameters for `GET /auth/thing-config` — both fields are required
 * by the Fastify schema.
 *
 * @category api
 */
export type ThingConfigParams = {
  type: string
  requestType: string
}

/**
 * Response from `GET /auth/featureConfig` (note the camelCase path — there
 * is no `/auth/feature-config` route). Typed loosely: the flag set is
 * deployment-specific. The backend may also return multi-site keys
 * (`isMultiSiteModeEnabled`, `siteList`) — the MDK is single-site only and
 * deliberately does not surface them.
 *
 * @category api
 */
export type FeatureConfigResponse = {
  [key: string]: unknown
}

/**
 * Body for `POST | PUT | DELETE /auth/thing/comment` (add / edit / delete a
 * device comment — one Fastify schema covers all three verbs).
 * `rackId` + `thingId` + `comment` are required; `id` and `ts` identify an
 * existing comment for edit/delete; `pos` is passed through to the worker.
 * The backend stamps the author from the session token.
 *
 * @category api
 */
export type ThingCommentBody = {
  rackId: string
  thingId: string
  comment: string
  /** Existing comment id — required when editing or deleting. */
  id?: string
  pos?: string
  ts?: number
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
