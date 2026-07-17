import {
  buildContainerWidgetsListParams,
  buildContainerWidgetsRealtimeTailLogParams,
  flattenKernelEnvelope,
  type ListThingsDevice,
  listThingsQuery,
  type TailLogEntry,
  tailLogQuery,
} from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { headHead } from './list-things-utils'
import { OP_CENTRE_REALTIME_POLL_INTERVAL_MS, POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UseContainerWidgetsOptions = {
  /** Container inventory poll interval in ms. Defaults to 60s. Pass 0 to disable. */
  containersRefetchInterval?: number
  /** Realtime snapshot poll interval in ms. Defaults to 20s. Pass 0 to disable. */
  realtimeRefetchInterval?: number
  /** Disable both queries. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseContainerWidgetsResult = {
  /** Container things with the full Op Centre projection — one widget card each. */
  containers: ListThingsDevice[]
  /**
   * Latest `stat-realtime` sample across all miners, carrying the grouped
   * aggregates (`status_group_aggr`, `power_w_group_aggr`,
   * `hashrate_mhs_1m_group_aggr`, `power_mode_group_aggr`, vendor stats)
   * keyed by miner id — the widget cards slice these per container.
   * `undefined` until the miner workers emit realtime stats.
   */
  realtime: TailLogEntry | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Data source for the Site Overview Container Widgets grid: the container
 * inventory (one card per container) plus the latest per-miner realtime
 * aggregate sample the cards derive their summaries from. Card-shaped
 * payload derivation lives with the widget components; this hook keeps the
 * two feeds polling on their own cadences.
 *
 * @category op-centre
 */
export const useContainerWidgets = (
  options: UseContainerWidgetsOptions = {},
): UseContainerWidgetsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const enabled = options.enabled ?? !!token

  const containersResult = useQuery({
    ...listThingsQuery(queryClient, buildContainerWidgetsListParams()),
    refetchInterval: options.containersRefetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled,
    select: (raw: ListThingsDevice[][]) => flattenKernelEnvelope(raw),
  })

  const realtimeResult = useQuery({
    ...tailLogQuery(queryClient, buildContainerWidgetsRealtimeTailLogParams()),
    refetchInterval: options.realtimeRefetchInterval ?? OP_CENTRE_REALTIME_POLL_INTERVAL_MS,
    enabled,
    // Realtime group aggregates are emitted by the site's aggregating node, so
    // the first envelope group carries the full miner map — same unwrap every
    // tail-log hook uses. Merging aggr maps across shards is a follow-up if a
    // deployment ever splits realtime emission across nodes.
    select: (raw: TailLogEntry[][]) => headHead(raw),
  })

  return {
    containers: containersResult.data ?? [],
    realtime: realtimeResult.data,
    isLoading: containersResult.isLoading || realtimeResult.isLoading,
    error: containersResult.error ?? realtimeResult.error,
    refetch: () => {
      void containersResult.refetch()
      void realtimeResult.refetch()
    },
  }
}
