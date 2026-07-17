import { type SiteStatusLive, siteStatusLiveQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { SITE_STATUS_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'

export { SITE_STATUS_POLL_INTERVAL_MS } from './poll-intervals'

/** Options for {@link useSiteStatusLive}. */
export type UseSiteStatusLiveOptions = {
  /** Polling interval in ms. Defaults to 5s. Pass `0` to disable polling. */
  refetchInterval?: number
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

/** Return shape of {@link useSiteStatusLive}. */
export type UseSiteStatusLiveResult = {
  /** Composite live site-status snapshot, or `undefined` until first load. */
  data: SiteStatusLive | undefined
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Polls `GET /auth/site/status/live?overwriteCache=true` every 5s for the
 * composite site snapshot (hashrate, power, efficiency, miner / alert / pool
 * counts). Returns the raw typed payload for a hook or component to shape into
 * dashboard cards.
 *
 * @category dashboard
 */
export const useSiteStatusLive = (
  options: UseSiteStatusLiveOptions = {},
): UseSiteStatusLiveResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const factory = siteStatusLiveQuery(queryClient)

  const result = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? SITE_STATUS_POLL_INTERVAL_MS,
    enabled: options.enabled ?? !!token,
  })

  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
