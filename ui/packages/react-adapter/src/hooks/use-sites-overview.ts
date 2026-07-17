import { type TailLogEntry, tailLogQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { headHead } from './list-things-utils'
import { POOL_MANAGER_POLL_INTERVAL_MS } from './poll-intervals'
import { useAuthToken } from './use-auth-token'
import { useContainerPoolStats } from './use-container-pool-stats'
import { useContainerUnits } from './use-container-units'
import {
  type ContainerUnit,
  type ProcessedContainerUnit,
  type SitesOverviewTailLogItem,
  useSitesOverviewData,
} from './use-sites-overview-data'

/** Realtime stat key (`stat-rtd`) — the latest row carries per-container hashrate and miner counts. */
const STAT_REALTIME = 'stat-rtd'

/**
 * Per-container miner-count keys on the realtime tail-log row (each is a
 * `{ [container]: count }`). Every reporting miner falls into exactly one
 * bucket, so their sum is the reporting count for a container.
 */
const MINER_COUNT_KEYS = [
  'offline_cnt',
  'not_mining_cnt',
  'power_mode_normal_include_error_cnt',
  'power_mode_low_cnt',
  'power_mode_normal_cnt',
  'power_mode_high_cnt',
] as const

type ContainerMinerCounts = { total: number; disconnected: number; actualMiners: number }

/**
 * Derives a container's present/disconnected miner split from the tail-log.
 * `total` is the nominal capacity; "present" is the sum of the per-status buckets;
 * "disconnected" is the capacity not currently reporting.
 */
const containerMinerCounts = (
  container: string,
  tailLogItem: Record<string, unknown>,
  total: number,
): ContainerMinerCounts => {
  let present = 0
  for (const key of MINER_COUNT_KEYS) {
    const map = tailLogItem[key] as Record<string, number> | undefined
    present += map?.[container] ?? 0
  }
  const disconnected = Math.max(0, total - present)
  return { total, disconnected, actualMiners: total - disconnected }
}

export type UseSitesOverviewOptions = {
  /** Polling interval in ms forwarded to the underlying queries. */
  refetchInterval?: number
  /** Disable all queries (e.g. before auth). Defaults to running only when an auth token is present. */
  enabled?: boolean
}

export type UseSitesOverviewResult = {
  /** Merged, display-ready container units for `<PoolManager units={...} />`. */
  units: ProcessedContainerUnit[]
  /** Raw container rows — pass as `siteDevices` so Site Detail can resolve a unit by id. */
  rawUnits: ContainerUnit[]
  isLoading: boolean
  error: unknown
}

/**
 * Composes the Sites Overview dataset from three sources:
 *
 * 1. container inventory (`useContainerUnits` → `list-things t-container`)
 * 2. realtime tail-log (`stat-rtd`) for per-container hashrate and miner counts
 * 3. per-container override counts (`useContainerPoolStats`)
 *
 * Miner counts come from the tail-log aggregates, not from listing individual
 * miners. Returns both the projected `units` and `rawUnits` for Site Detail.
 *
 * @category dashboard
 */
export const useSitesOverview = (options: UseSitesOverviewOptions = {}): UseSitesOverviewResult => {
  const { refetchInterval, enabled } = options
  const queryClient = useQueryClient()
  const token = useAuthToken()
  const effectiveEnabled = enabled ?? !!token

  const containers = useContainerUnits({ refetchInterval, enabled: effectiveEnabled })
  const poolStats = useContainerPoolStats({ refetchInterval, enabled: effectiveEnabled })

  // Full realtime row (no field filter) to get both hashrate and miner count maps.
  const tailLogFactory = tailLogQuery(queryClient, {
    key: STAT_REALTIME,
    type: 'miner',
    tag: 't-miner',
    limit: 1,
  })
  const tailLog = useQuery({
    ...tailLogFactory,
    refetchInterval: refetchInterval ?? POOL_MANAGER_POLL_INTERVAL_MS,
    enabled: effectiveEnabled,
  })

  const tailLogItem = (headHead<TailLogEntry>(tailLog.data) ?? {}) as SitesOverviewTailLogItem

  const rawUnits: ContainerUnit[] = containers.data.map((unit) => {
    const container = unit.info?.container ?? ''
    const total = Number(unit.info?.nominalMinerCapacity) || 0
    return { ...unit, miners: containerMinerCounts(container, tailLogItem, total) }
  })

  const isLoading = containers.isLoading || poolStats.isLoading || tailLog.isLoading

  const { units } = useSitesOverviewData({
    units: rawUnits,
    poolStats: poolStats.data,
    isLoading,
    tailLogItem,
  })

  return {
    units,
    rawUnits,
    isLoading,
    error: containers.error ?? poolStats.error ?? tailLog.error,
  }
}
