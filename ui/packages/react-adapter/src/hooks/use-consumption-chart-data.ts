import { type TailLogEntry, tailLogQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? (first as T[]) : []
}

export type UseConsumptionChartDataParams = {
  /** Stat key suffix — e.g. '1m', '5m', '3h'. */
  timeline: string
  /** Lower bound of the time window (ms epoch). */
  start?: number
  /** Upper bound of the time window (ms epoch). */
  end?: number
  /** Thing tag — defaults to `t-miner`. Use `t-powermeter` for transformer-level consumption. */
  tag?: string
  /** Aggregate field name — defaults to `power_w_sum_aggr` (miner-level). */
  powerAttribute?: string
  /** Polling interval in ms. Defaults to 60s. */
  refetchInterval?: number
}

/**
 * TanStack Query hook returning raw consumption tail-log samples. Most
 * dashboards should consume the higher-level `useSiteConsumptionChartData`,
 * which wraps this hook with the site powermeter defaults and returns a
 * `<LineChartCard>`-ready `ChartCardData` payload.
 *
 * @category dashboard
 */
export const useConsumptionChartData = (
  params: UseConsumptionChartDataParams,
): UseQueryResult<TailLogEntry[], Error> => {
  const queryClient = useQueryClient()
  const powerAttribute = params.powerAttribute ?? 'power_w_sum_aggr'
  const factory = tailLogQuery(queryClient, {
    key: `stat-${params.timeline}`,
    type: 'miner',
    tag: params.tag ?? 't-miner',
    aggrFields: JSON.stringify({ [powerAttribute]: 1 }),
    start: params.start,
    end: params.end,
  })

  return useQuery({
    ...factory,
    refetchInterval: params.refetchInterval ?? 60_000,
    select: (raw) => headOrEmpty<TailLogEntry>(raw),
  })
}
