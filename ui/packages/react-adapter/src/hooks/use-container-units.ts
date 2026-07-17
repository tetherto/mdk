import { type ListThingsDevice, listThingsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { headOrEmpty } from './list-things-utils'
import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'
import type { ContainerUnit } from './use-sites-overview-data'

/**
 * `t-container` is the tag every container thing carries (mirrors
 * `useSiteContainerCapacity`, which reads the same tag from the tail-log).
 * QA against a live MiningOS to confirm the tag/field projection.
 */
const CONTAINER_TAG = 't-container'
const CONTAINER_FIELDS = JSON.stringify({
  id: 1,
  type: 1,
  'info.container': 1,
  'info.poolConfig': 1,
  'info.nominalMinerCapacity': 1,
  'last.snap.stats.status': 1,
})

export type UseContainerUnitsOptions = {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseContainerUnitsResult = {
  /** Raw container rows — feed the `useSitesOverview` merge / Site Detail resolution. */
  data: ContainerUnit[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches the site's container things from `GET /auth/list-things` (tag
 * `t-container`). Returns the raw rows the Sites Overview merge needs —
 * `id`, `type`, `info.container`, `info.poolConfig`, and the container
 * status under `last.snap.stats.status`. Per-container miner counts and
 * hashrate are merged on top by {@link useSitesOverview}; this hook only
 * sources the inventory.
 *
 * @category dashboard
 */
export const useContainerUnits = (
  options: UseContainerUnitsOptions = {},
): UseContainerUnitsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const factory = listThingsQuery(queryClient, {
    status: 1,
    tag: CONTAINER_TAG,
    fields: CONTAINER_FIELDS,
  })

  const result = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
    select: (raw: ListThingsDevice[][]) => headOrEmpty(raw) as unknown as ContainerUnit[],
  })

  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
