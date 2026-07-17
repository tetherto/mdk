import { getListQuery, type ListThingsDevice, listThingsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { headOrEmpty } from './list-things-utils'
import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

/**
 * `list-things` query filtered to `t-miner` with the nested device projection
 * `mapDeviceToMinerRecord` consumes. Unlike the flat `/auth/miners` DTO, this
 * carries `info.poolConfig` id needed to resolve pool names.
 */
const MINER_TAG = 't-miner'
const MINER_QUERY = JSON.stringify({ tags: { $in: [MINER_TAG] } })
const MINER_FIELDS = JSON.stringify({
  id: 1,
  info: 1,
  code: 1,
  type: 1,
  rack: 1,
  containerId: 1,
  tags: 1,
  'last.ts': 1,
  'last.snap.stats.status': 1,
  'last.snap.stats.hashrate_mhs': 1,
})

export type UseMinerDevicesOptions = {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query (e.g. before auth). Defaults to running only when an auth token is present. */
  enabled?: boolean
  /**
   * Search tags for server-side filtering. When non-empty, issues a `list-things`
   * request with a MongoDB `$regex` query across `id`, `code`, `info.serialNum`,
   * `info.macAddress`, etc. Query key changes per tag list so React Query refetches
   * as the user types.
   */
  searchTags?: string[]
  /**
   * Categorical dropdown filters (model / status / pool) passed to `getListQuery`.
   * Keys are MongoDB field paths; values are arrays of accepted strings.
   */
  filters?: Record<string, string[]>
}

export type UseMinerDevicesResult = {
  /** Nested `list-things` miner rows — feed `<PoolManager miners={...} />`. */
  data: ListThingsDevice[]
  isLoading: boolean
  isFetching: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches miner devices from `GET /auth/list-things` (tag `t-miner`) in the
 * nested shape the devkit Miner Explorer expects. Prefer this over
 * {@link useMiners} when feeding the devkit — only the nested
 * `info.poolConfig` id can resolve pool names.
 *
 * Pass `searchTags` or `filters` to trigger server-side filtering via
 * `getListQuery(searchTags, filters, ['t-miner'])`.
 *
 * @category dashboard
 */
export const useMinerDevices = (options: UseMinerDevicesOptions = {}): UseMinerDevicesResult => {
  const { searchTags = [], filters = {} } = options
  const queryClient = useQueryClient()
  const token = useAuthToken()

  // When any search tag or filter is active, delegate to getListQuery so the
  // query key changes and React Query fires a fresh request on every update.
  const hasActiveQuery = searchTags.length > 0 || Object.keys(filters).length > 0
  const query = hasActiveQuery ? getListQuery(searchTags, filters, [MINER_TAG]) : MINER_QUERY

  const factory = listThingsQuery(queryClient, {
    status: 1,
    query,
    fields: MINER_FIELDS,
  })

  const result = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
    select: (raw: ListThingsDevice[][]) => headOrEmpty(raw),
  })

  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
