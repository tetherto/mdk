import { type TailLogEntry, tailLogQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/** Realtime stat key for the last-minute aggregate row. */
const STAT_KEY = 'stat-rtd'
const MINER_AGGR_FIELDS = JSON.stringify({
  hashrate_mhs_1m_cnt_aggr: 1,
  online_or_minor_error_miners_amount_aggr: 1,
  offline_or_sleeping_miners_amount_aggr: 1,
  not_mining_miners_amount_aggr: 1,
  alerts_aggr: 1,
})

const headOrUndefined = (value: TailLogEntry[][] | undefined | null): TailLogEntry | undefined => {
  if (!Array.isArray(value)) return undefined
  const first = value[0]
  if (!Array.isArray(first)) return undefined
  return first[0]
}

const num = (value: unknown): number => (typeof value === 'number' ? value : 0)

/** Pre-aggregated alert severity counts from `alerts_aggr` in the tail-log. */
export type AlertsCounts = {
  critical: number
  high: number
  medium: number
}

export type SiteMinerStats = {
  /**
   * Count of miners that reported hashrate in the last minute — the
   * "(216)" in the `MOS (216)` header label.
   */
  mosTotal: number
  /** Miners online or with only minor errors (green column). */
  online: number
  /** Miners with major errors / not mining (amber column). */
  error: number
  /** Miners offline or sleeping (red column). */
  offline: number
  /**
   * Pre-aggregated alert severity counts from `alerts_aggr` in the tail-log.
   * Reflects the true server-side total rather than the device-capped count.
   */
  alertCounts: AlertsCounts
  isLoading: boolean
}

export type UseSiteMinerStatsOptions = {
  /** Polling interval in ms. Defaults to 30s. Pass 0 to disable. */
  refetchInterval?: number
}

/**
 * Live miner-status breakdown for the header `<HeaderMinersBox />` strip.
 * Reads the realtime tail-log (`key=stat-rtd, type=miner, tag=t-miner`) and
 * projects four aggregate counts. Values reflect what is reporting right now,
 * not the full inventory — offline miners are excluded from the last-minute window.
 *
 * @category dashboard
 */
export const useSiteMinerStats = (options: UseSiteMinerStatsOptions = {}): SiteMinerStats => {
  const queryClient = useQueryClient()
  const factory = tailLogQuery(queryClient, {
    key: STAT_KEY,
    type: 'miner',
    tag: 't-miner',
    limit: 1,
    aggrFields: MINER_AGGR_FIELDS,
  })

  const { data, isLoading } = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? 30_000,
  })

  const entry = headOrUndefined(data)
  const alertsAggr = (entry?.alerts_aggr ?? {}) as Record<string, unknown>
  return {
    mosTotal: num(entry?.hashrate_mhs_1m_cnt_aggr),
    online: num(entry?.online_or_minor_error_miners_amount_aggr),
    error: num(entry?.not_mining_miners_amount_aggr),
    offline: num(entry?.offline_or_sleeping_miners_amount_aggr),
    alertCounts: {
      critical: num(alertsAggr.critical),
      high: num(alertsAggr.high),
      medium: num(alertsAggr.medium),
    },
    isLoading,
  }
}
