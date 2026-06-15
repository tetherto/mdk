import {
  type IncidentRow,
  type ListThingsDevice,
  listThingsQuery,
  mapDevicesToIncidents,
} from '@tetherto/mdk-ui-core'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

const ACTIVE_ALERTS_QUERY = JSON.stringify({ 'last.alerts': { $ne: null } })
const ACTIVE_ALERTS_FIELDS = JSON.stringify({
  id: 1,
  type: 1,
  'info.pos': 1,
  'info.container': 1,
  'last.alerts': 1,
})

const headOrEmpty = (value: ListThingsDevice[][] | undefined | null): ListThingsDevice[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? first : []
}

export type UseActiveIncidentsOptions = {
  /** Polling interval in ms. Defaults to 20s (matches Moria). Pass 0 to disable. */
  refetchInterval?: number
  /** Date formatter for the row body. Defaults to ISO string. */
  formatDate?: (d: Date) => string
}

/**
 * TanStack Query hook returning the list of currently-firing alerts, shaped
 * for `<ActiveIncidentsCard items={...} />`.
 *
 * @category dashboard
 */
export const useActiveIncidents = (
  options: UseActiveIncidentsOptions = {},
): UseQueryResult<IncidentRow[], Error> => {
  const queryClient = useQueryClient()
  const factory = listThingsQuery(queryClient, {
    status: 1,
    query: ACTIVE_ALERTS_QUERY,
    fields: ACTIVE_ALERTS_FIELDS,
  })

  return useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? 20_000,
    select: (raw) => mapDevicesToIncidents(headOrEmpty(raw), options.formatDate),
  })
}
