import { type PowerModeTimelineEntry, tailLogQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

const POWER_MODE_AGGR_FIELDS = JSON.stringify({
  power_mode_group_aggr: 1,
  status_group_aggr: 1,
})

const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? (first as T[]) : []
}

export type UsePowerModeTimelineDataParams = {
  timeline: string
  start?: number
  end?: number
  tag?: string
  refetchInterval?: number
}

/**
 * TanStack Query hook returning power-mode/status samples shaped for
 * `<PowerModeTimelineChart data={...} />`.
 *
 * @category dashboard
 */
export const usePowerModeTimelineData = (
  params: UsePowerModeTimelineDataParams,
): UseQueryResult<PowerModeTimelineEntry[], Error> => {
  const queryClient = useQueryClient()
  const factory = tailLogQuery(queryClient, {
    key: `stat-${params.timeline}`,
    type: 'miner',
    tag: params.tag ?? 't-miner',
    aggrFields: POWER_MODE_AGGR_FIELDS,
    start: params.start,
    end: params.end,
  })

  return useQuery({
    ...factory,
    refetchInterval: params.refetchInterval ?? 60_000,
    select: (raw) => headOrEmpty<PowerModeTimelineEntry>(raw),
  })
}
