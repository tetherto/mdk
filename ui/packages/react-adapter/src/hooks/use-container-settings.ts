import { type ContainerSettingsEntry, containerSettingsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export type UseContainerSettingsOptions = {
  /** Narrow to one settings-model (`bd`, `mbt`, `hydro`, `immersion`). */
  model?: string
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseContainerSettingsResult = {
  /** Per-model threshold/parameter rows (flat array — verified live). */
  settings: ContainerSettingsEntry[]
  /** Settings row for an exact container model string, or `undefined`. */
  settingsForModel: (model: string) => ContainerSettingsEntry | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Fetches per-model container thresholds/parameters from
 * `GET /auth/global/data?type=containerSettings`. Feeds the threshold
 * status indicators (tank pressure, oil/water temperature) on the
 * container widgets and detail tabs.
 *
 * @category op-centre
 */
export const useContainerSettings = (
  options: UseContainerSettingsOptions = {},
): UseContainerSettingsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...containerSettingsQuery(queryClient, options.model ? { model: options.model } : {}),
    refetchInterval: options.refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
  })

  const settings = result.data ?? []

  return {
    settings,
    settingsForModel: (model: string) => settings.find((entry) => entry.model === model),
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
