import type { EndpointMap } from './runtime'

/**
 * The mining Gateway's request paths (HLD §5) — one concrete
 * {@link EndpointMap}, and the default one, but no longer the only possible one.
 * A consumer pointing MDK at their own backend passes their own map to
 * `createMdkQueryClient`; the factories resolve paths from whichever map the
 * client carries.
 *
 * Paths are **templates**: a `:name` segment is substituted by `resolvePath`,
 * which URL-encodes the value. Templates rather than string concatenation at the
 * call site: this table alone describes the whole API surface, and encoding
 * happens in one place instead of relying on every caller to remember it.
 *
 * @remarks
 * Not every `/auth/*` path here is illustrative: `site` and `featureConfig` are served by the default
 * `site-monitor` Gateway plugin. `tailLog`/`tailLogMulti` have no built-in plugin either, but the
 * [full-site](https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site) and
 * [mvp-site](https://github.com/tetherto/mdk/tree/main/examples/mvp-site/backend/gateway-plugins/site) example
 * plugins serve the same tail-log data under a different route (`/site/history`) — useful as a pattern
 * reference, not a drop-in match. Every other path has no built-in or reference implementation anywhere in
 * this repo — create your own via a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) matching your Worker/business logic. See
 * the consuming hook's own JSDoc (`ui/packages/react-adapter/src/hooks/`) for the exact status of the endpoint
 * it calls.
 *
 * @category query
 */
export const API_ENDPOINTS = {
  // Session / auth
  auth: '/auth',
  authToken: '/auth/token',
  userInfo: '/auth/userinfo',

  // Mining tail-log / listings
  tailLog: '/auth/tail-log',
  tailLogMulti: '/auth/tail-log/multi',
  listThings: '/auth/list-things',
  historyLog: '/auth/history-log',
  extData: '/auth/ext-data',

  // Operational Center — site / racks / PDU / config reads
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
  poolConfigForDevice: '/auth/pools/config/:minerId',
  containerPoolStats: '/auth/pools/stats/containers',
  pools: '/auth/pools',
  poolBalanceHistory: '/auth/pools/:pool/balance-history',
  miners: '/auth/miners',

  // Pool Manager — action / voting workflow
  actions: '/auth/actions',
  submitAction: '/auth/actions/:type',
  submitBatchAction: '/auth/actions/:type/batch',
  voteAction: '/auth/actions/:type/:id/vote',
  cancelActions: '/auth/actions/:type/cancel',
} as const satisfies EndpointMap

/** Union of the configured endpoint path templates. */
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
