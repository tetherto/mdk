import type {
  ExtDataParams,
  GlobalDataParams,
  HistoryLogParams,
  ListRacksParams,
  ListThingsParams,
  PduLayoutParams,
  TailLogMultiParams,
  TailLogParams,
  ThingConfigParams,
} from '../types/api-mining.types'
import type {
  ActionsParams,
  ActionTypeQuery,
  MinersParams,
  PoolBalanceHistoryParams,
} from '../types/pool.types'

/**
 * Centralised query key factories. All keys are arrays so TanStack Query
 * can perform structural equality matching for invalidations.
 *
 * Endpoint layout follows the Gateway API contract (HLD §5):
 *   /auth      — current session, permissions, token refresh
 *   /devices   — device list, single device
 *   /telemetry — historical and live telemetry per device
 *   /auth/tail-log, /auth/list-things, /auth/history-log — mining endpoints
 *     consumed by MDK UI Shell dashboard.
 */
export const queryKeys = {
  auth: () => ['auth'] as const,
  authPermissions: () => ['auth', 'permissions'] as const,
  authToken: () => ['auth', 'token'] as const,

  devices: () => ['devices'] as const,
  device: (id: string) => ['devices', id] as const,

  telemetry: (deviceId: string) => ['telemetry', deviceId] as const,
  telemetryRange: (deviceId: string, from: number, to: number) =>
    ['telemetry', deviceId, 'range', from, to] as const,

  tailLog: (params: TailLogParams) => ['auth', 'tail-log', params] as const,
  tailLogMulti: (params: TailLogMultiParams) => ['auth', 'tail-log', 'multi', params] as const,
  listThings: (params: ListThingsParams) => ['auth', 'list-things', params] as const,
  historyLog: (params: HistoryLogParams) => ['auth', 'history-log', params] as const,
  extData: (params: ExtDataParams) => ['auth', 'ext-data', params] as const,

  // Operational Centre — site / racks / PDU / config reads
  site: () => ['auth', 'site'] as const,
  listRacks: (params: ListRacksParams) => ['auth', 'list-racks', params] as const,
  pduLayout: (params: PduLayoutParams) => ['auth', 'pdu-layout', params] as const,
  globalData: (params: GlobalDataParams) => ['auth', 'global', 'data', params] as const,
  thingConfig: (params: ThingConfigParams) => ['auth', 'thing-config', params] as const,
  globalConfig: () => ['auth', 'global-config'] as const,
  featureConfig: () => ['auth', 'featureConfig'] as const,

  // Current user info (email, metadata) from /auth/userinfo
  userInfo: () => ['auth', 'userinfo'] as const,

  // Pool Manager — reads
  poolConfigs: () => ['auth', 'configs', 'pool'] as const,
  containerPoolStats: () => ['auth', 'pools', 'stats', 'containers'] as const,
  poolConfigForDevice: (minerId: string) => ['auth', 'pools', 'config', minerId] as const,
  pools: () => ['auth', 'pools'] as const,
  poolBalanceHistory: (pool: string, params: PoolBalanceHistoryParams) =>
    ['auth', 'pools', pool, 'balance-history', params] as const,
  miners: (params: MinersParams) => ['auth', 'miners', params] as const,
  siteStatusLive: () => ['auth', 'site', 'status', 'live'] as const,
  actions: (params: ActionsParams) => ['auth', 'actions', params] as const,
  liveActions: (queries: ActionTypeQuery[]) => ['auth', 'actions', 'live', queries] as const,

  // Pool Manager — voting/action mutations
  submitAction: () => ['auth', 'actions', 'submit'] as const,
  submitBatchAction: () => ['auth', 'actions', 'submit', 'batch'] as const,
  voteAction: () => ['auth', 'actions', 'vote'] as const,
  cancelActions: () => ['auth', 'actions', 'cancel'] as const,

  // Thing comments — add/edit/delete mutations
  addThingComment: () => ['auth', 'thing', 'comment', 'add'] as const,
  editThingComment: () => ['auth', 'thing', 'comment', 'edit'] as const,
  deleteThingComment: () => ['auth', 'thing', 'comment', 'delete'] as const,
} as const

export type QueryKeyMap = {
  [K in keyof typeof queryKeys]: ReturnType<(typeof queryKeys)[K]>
}
