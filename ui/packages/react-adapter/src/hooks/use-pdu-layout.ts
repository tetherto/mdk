import { type PduLayoutItem, pduLayoutQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthToken } from './use-auth-token'

export type UsePduLayoutParams = {
  /** Full container type string (e.g. `container-bd-d40-m56`). */
  type: string | undefined
}

export type UsePduLayoutOptions = {
  /** Disable the query. Defaults to running when a token and `type` are present. */
  enabled?: boolean
}

export type UsePduLayoutResult = {
  /** Static PDU grid rows for the type, or `[]` when absent/not provisioned. */
  layout: PduLayoutItem[]
  /** True once the layout has loaded non-empty — the reference app's PDU-tab render gate. */
  hasPduLayout: boolean
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches a container type's static PDU socket grid from
 * `GET /auth/pdu-layout`. The grid is provisioned in the container worker's
 * `pduGridLayout` config keyed by the exact type string — an unprovisioned
 * type is a backend 400 (`ERR_PDU_LAYOUT_NOT_FOUND`), surfaced here as
 * `error` with an empty `layout`. Static config — no polling; live per-PDU
 * power/current comes from the thing's `pdu_data`, not this endpoint.
 *
 * @category op-centre
 */
export const usePduLayout = (
  params: UsePduLayoutParams,
  options: UsePduLayoutOptions = {},
): UsePduLayoutResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...pduLayoutQuery(queryClient, { type: params.type ?? '' }),
    enabled: options.enabled ?? (!!token && !!params.type),
    staleTime: Number.POSITIVE_INFINITY,
  })

  const layout = result.data?.layout ?? []

  return {
    layout,
    hasPduLayout: layout.length > 0,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
