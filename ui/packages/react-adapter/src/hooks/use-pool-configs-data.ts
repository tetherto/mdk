import { type PoolConfigEntry, poolConfigsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UsePoolConfigsDataOptions = {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UsePoolConfigsDataResult = {
  /** Raw pool-configuration rows — feed straight into the devkit `usePoolConfigs` transform. */
  data: PoolConfigEntry[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches raw pool configurations from `GET /auth/configs/pool`. Returns the
 * untransformed rows in the `{ data, isLoading, error }` shape the devkit
 * `usePoolConfigs` transform consumes — keeping tag/endpoint parsing in the
 * component layer per the MDK layering rule.
 *
 * @category dashboard
 */
export const usePoolConfigsData = (
  options: UsePoolConfigsDataOptions = {},
): UsePoolConfigsDataResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const factory = poolConfigsQuery(queryClient)

  const result = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
  })

  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
