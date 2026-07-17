/**
 * Centralised Gateway REST endpoint paths (HLD §5), the URL counterpart to
 * the query-key registry in `./keys`. Query/mutation factories build request
 * URLs from these constants via `buildUrl(getApiBaseUrl(client), …)` rather
 * than inlining path literals, so the API surface lives in one place.
 *
 * Static paths are listed here directly. Paths with a dynamic segment
 * (`/devices/:id`, `/auth/pools/:pool/balance-history`, the action-workflow
 * verbs) compose from the base constant at the call site with the id
 * `encodeURIComponent`-escaped.
 *
 * @category query
 */
export const API_ENDPOINTS = {
  // Session / auth
  auth: '/auth',
  authToken: '/auth/token',
  userInfo: '/auth/userinfo',

  // Devices / telemetry (base segments — the `:id` is appended by the factory)
  devices: '/devices',
  telemetry: '/telemetry',

  // Mining tail-log / listings
  tailLog: '/auth/tail-log',
  tailLogMulti: '/auth/tail-log/multi',
  listThings: '/auth/list-things',
  historyLog: '/auth/history-log',
  extData: '/auth/ext-data',

  // Operational Centre — site / racks / PDU / config reads
  site: '/auth/site',
  siteStatusLive: '/auth/site/status/live',
  listRacks: '/auth/list-racks',
  pduLayout: '/auth/pdu-layout',
  globalData: '/auth/global/data',
  thingConfig: '/auth/thing-config',
  globalConfig: '/auth/global-config',
  featureConfig: '/auth/featureConfig',
  thingComment: '/auth/thing/comment',

  // Pool Manager — reads
  poolConfigs: '/auth/configs/pool',
  poolConfigForDevice: '/auth/pools/config',
  containerPoolStats: '/auth/pools/stats/containers',
  pools: '/auth/pools',
  miners: '/auth/miners',

  // Pool Manager — action / voting workflow (base; verbs appended by factory)
  actions: '/auth/actions',
} as const

/** Union of the configured endpoint path strings. */
export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]

/**
 * HTTP verbs used by the mutation factories. Reads use the fetcher's implicit
 * GET, so only the mutating verbs are listed here.
 *
 * @category query
 */
export const HTTP_METHODS = {
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const

/** Union of the mutating HTTP verbs (`'POST' | 'PUT' | 'DELETE'`). */
export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS]

/** `Content-Type: application/json` request header shared by the JSON writes. */
export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
