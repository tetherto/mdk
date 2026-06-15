import type {
  ExtDataParams,
  HistoryLogParams,
  ListThingsParams,
  TailLogParams,
} from '../types/api-mining.types'

/**
 * Centralised query key factories. All keys are arrays so TanStack Query
 * can perform structural equality matching for invalidations.
 *
 * Endpoint layout follows the App Node API contract (HLD §5):
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
  listThings: (params: ListThingsParams) => ['auth', 'list-things', params] as const,
  historyLog: (params: HistoryLogParams) => ['auth', 'history-log', params] as const,
  extData: (params: ExtDataParams) => ['auth', 'ext-data', params] as const,
} as const

export type QueryKeyMap = {
  [K in keyof typeof queryKeys]: ReturnType<(typeof queryKeys)[K]>
}
