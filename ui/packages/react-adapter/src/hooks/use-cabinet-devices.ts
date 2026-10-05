import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import { buildCabinetDetailParams, flattenKernelEnvelope, listThingsQuery  } from '@tetherto/mdk-ui-foundation/presets/mining'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { OP_CENTER_REALTIME_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

/** Stable empty-result reference — a fresh `[]` each render churns consumers. */
const EMPTY_DEVICES: ListThingsDevice[] = []

export type UseCabinetDevicesOptions = {
  /** Polling interval in ms. Defaults to the Op-Center realtime cadence. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever a token is present and a root is set. */
  enabled?: boolean
}

export type UseCabinetDevicesResult = {
  /** The cabinet's powermeter + temperature-sensor devices (ungrouped). */
  devices: ListThingsDevice[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches one LV cabinet's family of devices — the powermeters and temperature
 * sensors whose `info.pos` sits under the cabinet `root`
 * ({@link buildCabinetDetailParams}) — polled at the Op-Center realtime cadence
 * and flattened across the per-kernel envelope. The detail hook groups the result
 * back into a single cabinet; skips the request entirely when no root is set.
 *
 * @remarks
 * The `/auth/list-things` endpoint is illustrative. MDK does not ship a built-in
 * endpoint for it — create your own via a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) matching
 * your Worker/business logic. No reference implementation ships in this repo.
 *
 * @category op-center
 */
export const useCabinetDevices = (
  root: string,
  options: UseCabinetDevicesOptions = {},
): UseCabinetDevicesResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...listThingsQuery(queryClient, buildCabinetDetailParams(root)),
    refetchInterval: options.refetchInterval ?? OP_CENTER_REALTIME_POLL_INTERVAL_MS,
    enabled: (options.enabled ?? !!token) && root.length > 0,
    select: (raw: ListThingsDevice[][]) => flattenKernelEnvelope(raw),
  })

  return {
    devices: result.data ?? EMPTY_DEVICES,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
