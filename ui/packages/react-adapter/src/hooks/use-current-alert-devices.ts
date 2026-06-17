import {
  buildCurrentAlertDevicesParams,
  type ListThingsDevice,
  listThingsQuery,
} from '@tetherto/mdk-ui-core'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

export type UseCurrentAlertDevicesOptions = {
  /** Polling interval in ms. Defaults to 20s (matches Moria). Pass 0 to disable. */
  refetchInterval?: number
  /**
   * Alerts search chips (the devices store's `filterTags`). Included in the
   * backend `list-things` selector — chips trigger a refetch that narrows the
   * dataset server-side, mirroring Moria's alerts search.
   */
  filterTags?: string[]
}

/**
 * TanStack Query hook returning the **raw** devices that currently carry one
 * or more alerts, as the nested `ListThingsDevice[][]` the devkit `<Alerts>` /
 * `<CurrentAlerts>` table expects (the table heads the outer array itself).
 *
 * Unlike `useActiveIncidents` — which maps the same endpoint down to the
 * dashboard card's `IncidentRow[]` — this hook leaves the payload unshaped so
 * the table can derive its own filter tokens and per-row status. Both hit
 * `/auth/list-things`; this one requests a wider field set, so it uses a
 * distinct cache key.
 *
 * @category alerts
 */
export const useCurrentAlertDevices = (
  options: UseCurrentAlertDevicesOptions = {},
): UseQueryResult<ListThingsDevice[][], Error> => {
  const queryClient = useQueryClient()
  const factory = listThingsQuery(queryClient, buildCurrentAlertDevicesParams(options.filterTags))

  return useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? 20_000,
  })
}
