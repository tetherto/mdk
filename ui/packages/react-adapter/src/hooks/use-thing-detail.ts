import {
  flattenKernelEnvelope,
  getByIdsQuery,
  type ListThingsDevice,
  listThingsQuery,
  OP_CENTRE_LIST_THINGS_FIELDS,
} from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { ALERTS_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UseThingDetailOptions = {
  /** Polling interval in ms. Defaults to 20s (detail panels track live state). Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running when a token and `id` are present. */
  enabled?: boolean
}

export type UseThingDetailResult = {
  /** The thing row (full Op Centre projection), or `undefined` when absent. */
  thing: ListThingsDevice | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches a single thing by id from `GET /auth/list-things` with the full
 * Op Centre field projection — the data source for the Explorer detail
 * panel and the container Thing-detail view.
 *
 * @category op-centre
 */
export const useThingDetail = (
  id: string | undefined,
  options: UseThingDetailOptions = {},
): UseThingDetailResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...listThingsQuery(queryClient, {
      query: getByIdsQuery(id ? [id] : []),
      status: 1,
      fields: OP_CENTRE_LIST_THINGS_FIELDS,
      limit: 1,
    }),
    refetchInterval: options.refetchInterval ?? ALERTS_POLL_INTERVAL_MS,
    enabled: options.enabled ?? (!!token && !!id),
    select: (raw: ListThingsDevice[][]) => flattenKernelEnvelope(raw)[0],
  })

  return {
    thing: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
