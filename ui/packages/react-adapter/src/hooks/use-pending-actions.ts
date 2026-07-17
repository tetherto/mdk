import { type ActionsParams, actionsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UsePendingActionsOptions = {
  /** Server-side filters (e.g. `{ status: ['VOTING', 'APPROVED'] }`). */
  params?: ActionsParams
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UsePendingActionsResult = {
  /** Submitted/voting actions returned by the backend (the review-tray source). */
  data: unknown[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches submitted actions from `GET /auth/actions` — the server-side
 * voting/approval queue (distinct from the local `actionsStore` staging
 * buffer). Vote/cancel mutations invalidate this query's key.
 *
 * @category dashboard
 */
export const usePendingActions = (
  options: UsePendingActionsOptions = {},
): UsePendingActionsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const factory = actionsQuery(queryClient, options.params ?? {})

  const result = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
  })

  return {
    data: Array.isArray(result.data) ? result.data : [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
