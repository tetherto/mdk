import {
  type PoolBalanceHistoryEntry,
  type PoolBalanceHistoryParams,
  poolBalanceHistoryQuery,
} from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UsePoolBalanceHistoryOptions = PoolBalanceHistoryParams & {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever a pool is set and a token is present. */
  enabled?: boolean
}

export type UsePoolBalanceHistoryResult = {
  /** Per-pool revenue/hashrate history samples. */
  data: PoolBalanceHistoryEntry[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches per-pool revenue/hashrate history from
 * `GET /auth/pools/:pool/balance-history`. The query is disabled until a
 * non-empty `pool` is supplied.
 *
 * @category dashboard
 */
export const usePoolBalanceHistory = (
  pool: string,
  options: UsePoolBalanceHistoryOptions = {},
): UsePoolBalanceHistoryResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const { refetchInterval, enabled, ...params } = options
  const factory = poolBalanceHistoryQuery(queryClient, pool, params)

  const result = useQuery({
    ...factory,
    refetchInterval: refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: (enabled ?? !!token) && pool.length > 0,
  })

  return {
    // `GET /auth/pools/:pool/balance-history` wraps the samples in `{ log }`.
    data: result.data?.log ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
