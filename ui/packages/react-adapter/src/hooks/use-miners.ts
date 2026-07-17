import { type MinerEntry, type MinersParams, minersQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UseMinersOptions = MinersParams & {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseMinersResult = {
  /** Miner rows for the current page (with assigned `poolConfig`) — feed the Miner Explorer transform. */
  data: MinerEntry[]
  /** Site-wide miner count from the response envelope (the endpoint is paginated, so this is ≥ `data.length`). */
  totalCount: number
  isLoading: boolean
  error: unknown
  refetch: () => void
}

type MinersEnvelope = { data?: MinerEntry[]; totalCount?: number }

/** `GET /auth/miners` answers with a paginated envelope (`{ data, totalCount,
 * offset, limit, hasMore }`) rather than a bare array. Older fixtures returned
 * the array directly, so accept both: unwrap the envelope when present, else
 * treat the payload as the row list. */
const unwrapMiners = (raw: unknown): { rows: MinerEntry[]; totalCount: number } => {
  if (Array.isArray(raw)) return { rows: raw as MinerEntry[], totalCount: raw.length }
  const envelope = (raw ?? {}) as MinersEnvelope
  const rows = Array.isArray(envelope.data) ? envelope.data : []
  return { rows, totalCount: envelope.totalCount ?? rows.length }
}

/**
 * Fetches miners with their assigned `poolConfig` from `GET /auth/miners`.
 * Unwraps the paginated response envelope and returns the page rows for the
 * Miner Explorer table plus the site-wide `totalCount`; row shaping (status
 * mapping, pool label) stays in the component/devkit layer.
 *
 * @category dashboard
 */
export const useMiners = (options: UseMinersOptions = {}): UseMinersResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const { refetchInterval, enabled, ...params } = options
  const factory = minersQuery(queryClient, params)

  const result = useQuery({
    ...factory,
    refetchInterval: refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: enabled ?? !!token,
  })

  const { rows, totalCount } = unwrapMiners(result.data)

  return {
    data: rows,
    totalCount,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
