import { useMemo } from 'react'

import type { HashrateGroupedLog } from './hashrate.types'

export type HashrateGroupedQueryData = {
  log?: HashrateGroupedLog
}

export type HashrateQueryState = {
  data?: HashrateGroupedQueryData
  isLoading?: boolean
  error?: unknown
}

export type UseHashrateOptions = {
  /**
   * Result of fetching the v2 `/auth/metrics/hashrate?groupBy=...` endpoint.
   *
   * Wire whichever data layer you use (RTK Query, TanStack Query, fixtures)
   * and pass the result here - this hook never fetches itself.
   */
  query?: HashrateQueryState
}

export type UseHashrateResult = {
  log: HashrateGroupedLog | undefined
  isLoading: boolean
  error: unknown
}

/**
 * Base hook for a single Hashrate tab (single-site mode). Normalizes a
 * grouped-hashrate query result to the `{ log, isLoading, error }` shape
 * consumed by `<HashrateSiteView>`, `<HashrateMinerTypeView>`, and
 * `<HashrateMiningUnitView>`. Call once per tab the consumer needs to render -
 * each tab fetches independently because they use different `groupBy` axes
 * and (typically) different date ranges.
 *
 * @category hooks
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @tier agent-ready
 */
export const useHashrate = ({ query }: UseHashrateOptions = {}): UseHashrateResult => {
  const log = useMemo(() => query?.data?.log, [query?.data?.log])

  return {
    log,
    isLoading: query?.isLoading ?? false,
    error: query?.error ?? null,
  }
}
