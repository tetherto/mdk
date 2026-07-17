import {
  buildContainerDetailParams,
  flattenKernelEnvelope,
  type ListThingsDevice,
  listThingsQuery,
} from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { OP_CENTRE_REALTIME_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

/**
 * Stable empty-result reference. Returning a fresh `[]` on every render churns
 * the identity of `containers`, which would re-fire the socket-derivation
 * effect in `useExplorerSelection` each render (→ setState loop).
 */
const EMPTY_CONTAINERS: ListThingsDevice[] = []

export type UseContainerSnapshotsOptions = {
  /** Polling interval in ms. Defaults to the Op-Centre realtime cadence. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever a token is present and keys are selected. */
  enabled?: boolean
}

export type UseContainerSnapshotsResult = {
  /** Detail snapshots for the requested containers (full `last.snap.stats` + config). */
  containers: ListThingsDevice[]
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches the detail snapshots for the selected containers — the richer
 * projection ({@link buildContainerDetailParams}) that carries
 * `container_specific.pdu_data` plus the tank / cooling / power-mode config the
 * detail panel controls read. `containerKeys` are the raw container keys (the
 * `selectedDevicesTags` outer keys / miners' `info.container`); the foundation
 * builder tags and filters them. Rows are flattened across the per-kernel envelope.
 *
 * Feeds the socket transform (`deriveSelectedSockets`) and the container
 * detail panel; skips the request entirely when nothing is selected.
 *
 * @category op-centre
 */
export const useContainerSnapshots = (
  containerKeys: string[],
  options: UseContainerSnapshotsOptions = {},
): UseContainerSnapshotsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...listThingsQuery(queryClient, buildContainerDetailParams(containerKeys)),
    refetchInterval: options.refetchInterval ?? OP_CENTRE_REALTIME_POLL_INTERVAL_MS,
    enabled: (options.enabled ?? !!token) && containerKeys.length > 0,
    select: (raw: ListThingsDevice[][]) => flattenKernelEnvelope(raw),
  })

  return {
    containers: result.data ?? EMPTY_CONTAINERS,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
