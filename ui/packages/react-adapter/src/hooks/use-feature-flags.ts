import type { FeatureConfigResponse } from '@tetherto/mdk-ui-foundation'
import { featureConfigQuery } from '@tetherto/mdk-ui-foundation/presets/mining'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthToken } from './use-auth-token'

export type UseFeatureFlagsOptions = {
  /** Disable the query. Defaults to running whenever an auth token is present. */
  enabled?: boolean
}

export type UseFeatureFlagsResult = {
  /** The raw deployment feature-config document (empty object while loading). */
  flags: FeatureConfigResponse
  /** Check a single flag by key — `false` for absent or non-truthy flags. */
  isEnabled: (flag: string) => boolean
  isLoading: boolean
  error: unknown
  refetch: () => void
}

const EMPTY_FLAGS: FeatureConfigResponse = {}

/**
 * Fetches the deployment feature flags from `GET /auth/featureConfig`
 * (camelCase route — there is no `/auth/feature-config`). Static
 * deployment config — fetched once per session, no polling. Gates
 * optional tabs/sub-routes (`containerCharts`, `poolStats`, ...). The MDK
 * is single-site only — multi-site keys the backend may return are
 * deliberately not surfaced.
 *
 * @remarks
 * `/auth/featureConfig` is served by the default `site-monitor` Gateway plugin
 * ([`backend/core/plugins/site-monitor`](https://github.com/tetherto/mdk/tree/main/backend/core/plugins/site-monitor))
 * — no custom plugin needed.
 *
 * @category op-center
 */
export const useFeatureFlags = (options: UseFeatureFlagsOptions = {}): UseFeatureFlagsResult => {
  const queryClient = useQueryClient()
  const token = useAuthToken()

  const result = useQuery({
    ...featureConfigQuery(queryClient),
    enabled: options.enabled ?? !!token,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const flags = result.data ?? EMPTY_FLAGS

  return {
    flags,
    isEnabled: (flag: string) => Boolean(flags[flag]),
    isLoading: result.isLoading,
    error: result.error,
    refetch: () => void result.refetch(),
  }
}
