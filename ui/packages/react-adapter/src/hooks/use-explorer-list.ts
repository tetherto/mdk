import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import { listThingsQuery } from '@tetherto/mdk-ui-foundation/presets/mining'
import { buildExplorerListThingsParams, type ExplorerTabValue, flattenKernelEnvelope } from '@tetherto/mdk-ui-foundation/presets/mining'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

/** Stable empty-result reference — a fresh `[]` each render churns consumers. */
const EMPTY_THINGS: ListThingsDevice[] = []

export type UseExplorerListOptions = {
  /** Page size — defaults to the foundation's container list limit (1000). */
  limit?: number
  offset?: number
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseExplorerListResult = {
  /** Thing rows for the tab, flattened across the per-Kernel envelope. */
  things: ListThingsDevice[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches the thing list behind one Explorer tab (`container` / `miner` /
 * `cabinet`) from `GET /auth/list-things`, tag-filtered and projected by the
 * foundation's Explorer params builder. Rows are flattened across the
 * per-Kernel envelope so rack-sharded deployments list every shard's things.
 *
 * @remarks
 * The `/auth/list-things` endpoint is illustrative. MDK does not ship a built-in
 * endpoint for it — create your own via a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) matching
 * your Worker/business logic. No reference implementation of `/auth/list-things`
 * ships in this repo.
 *
 * @category op-center
 */
export const useExplorerList = (
  tab: ExplorerTabValue,
  options: UseExplorerListOptions = {},
): UseExplorerListResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...listThingsQuery(
      queryClient,
      buildExplorerListThingsParams(tab, { limit: options.limit, offset: options.offset }),
    ),
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
    select: (raw: ListThingsDevice[][]) => flattenKernelEnvelope(raw),
  })

  return {
    things: result.data ?? EMPTY_THINGS,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
