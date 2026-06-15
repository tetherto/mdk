import {
  buildHashrateTailLogParams,
  type DashboardQueryRange,
  getLatestSample,
  type HashRateLogEntry,
  readHashrateMhs,
  tailLogQuery,
} from '@tetherto/mdk-ui-core'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const MHS_PER_PHS = 1_000_000_000

const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? (first as T[]) : []
}

export type SiteHashrate = {
  /** Latest aggregate value in PH/s. `undefined` while loading or with no data. */
  valuePhs: number | undefined
  /** Latest aggregate value in MH/s (raw backend unit). */
  valueMhs: number | undefined
  isLoading: boolean
}

export type UseSiteHashrateParams = DashboardQueryRange & {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
}

/**
 * Projects the freshest hashrate sample from the dashboard's tail-log
 * query. Shares the TanStack queryKey with
 * {@link useHashrateChartData}, so subscribing here does NOT trigger an
 * extra fetch — both hooks read the same cache entry.
 *
 * Use this for the header stats strip (`<HeaderHashrateBox />`).
 *
 * @category dashboard
 */
export const useSiteHashrate = (params: UseSiteHashrateParams): SiteHashrate => {
  const queryClient = useQueryClient()
  const factory = tailLogQuery(queryClient, buildHashrateTailLogParams(params))

  const { data, isLoading } = useQuery({
    ...factory,
    refetchInterval: params.refetchInterval ?? 60_000,
    select: (raw: HashRateLogEntry[][]) => headOrEmpty<HashRateLogEntry>(raw),
  })

  const latest = getLatestSample<HashRateLogEntry>(data ?? undefined)
  const mhs = latest ? readHashrateMhs(latest) : undefined

  return {
    valuePhs: mhs === undefined ? undefined : mhs / MHS_PER_PHS,
    valueMhs: mhs,
    isLoading,
  }
}
