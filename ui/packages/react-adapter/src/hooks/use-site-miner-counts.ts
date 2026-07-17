import { type ListThingsDevice, listThingsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

const COUNT_QUERY = JSON.stringify({ type: { $regex: '^miner-' } })
const COUNT_FIELDS = JSON.stringify({ id: 1, type: 1, 'last.status': 1 })

export type SiteMinerCounts = {
  total: number
  online: number
  offline: number
  error: number
}

const headOrEmpty = (value: ListThingsDevice[][] | undefined | null): ListThingsDevice[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? first : []
}

const aggregate = (devices: ListThingsDevice[]): SiteMinerCounts => {
  const counts: SiteMinerCounts = { total: 0, online: 0, offline: 0, error: 0 }
  for (const device of devices) {
    counts.total += 1
    const status = device.last?.status ?? device.status
    if (status === 'online' || status === 'on') counts.online += 1
    else if (status === 'error' || status === 'alert') counts.error += 1
    else counts.offline += 1
  }
  return counts
}

export type UseSiteMinerCountsOptions = {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
}

/**
 * Counts active miners by status for the header `<HeaderMinersBox />`.
 * Hits `/auth/list-things?status=1` with a tight projection (id, type,
 * last.status only) so the response stays small even on big sites.
 *
 * @category dashboard
 */
export const useSiteMinerCounts = (
  options: UseSiteMinerCountsOptions = {},
): UseQueryResult<SiteMinerCounts, Error> => {
  const queryClient = useQueryClient()
  const factory = listThingsQuery(queryClient, {
    status: 1,
    query: COUNT_QUERY,
    fields: COUNT_FIELDS,
  })

  return useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? 60_000,
    select: (raw) => aggregate(headOrEmpty(raw)),
  })
}
