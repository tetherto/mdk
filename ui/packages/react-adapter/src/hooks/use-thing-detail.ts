import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import { flattenKernelEnvelope, getByIdsQuery, listThingsQuery, OP_CENTER_LIST_THINGS_FIELDS  } from '@tetherto/mdk-ui-foundation/presets/mining'
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
  /** The thing row (full Op Center projection), or `undefined` when absent. */
  thing: ListThingsDevice | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches a single thing by id from `GET /auth/list-things` with the full
 * Op Center field projection — the data source for the Explorer detail
 * panel and the container Thing-detail view.
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
      fields: OP_CENTER_LIST_THINGS_FIELDS,
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
