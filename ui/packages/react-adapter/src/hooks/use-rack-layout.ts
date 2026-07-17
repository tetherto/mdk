import { flattenKernelEnvelope, listRacksQuery, type Rack } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UseRackLayoutParams = {
  /** Worker type whose racks to list (`miner`, `container`, ...). Required by the backend. */
  type: string | undefined
}

export type UseRackLayoutOptions = {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running when a token and `type` are present. */
  enabled?: boolean
}

export type UseRackLayoutResult = {
  /** Rack rows flattened across the per-Kernel envelope. */
  racks: Rack[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches the rack structure for a worker type from `GET /auth/list-racks`
 * (`type` is required — the backend 400s with `ERR_TYPE_INVALID` without
 * it). Feeds the Explorer rack grouping.
 *
 * @category op-centre
 */
export const useRackLayout = (
  params: UseRackLayoutParams,
  options: UseRackLayoutOptions = {},
): UseRackLayoutResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...listRacksQuery(queryClient, { type: params.type ?? '' }),
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? (!!token && !!params.type),
    select: (raw: Rack[][]) => flattenKernelEnvelope(raw),
  })

  return {
    racks: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
