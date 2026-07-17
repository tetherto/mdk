import { CONTAINER_STATUS, SITE_OVERVIEW_STATUSES } from '@tetherto/mdk-ui-foundation'

export type ContainerUnit = {
  id?: string
  type?: string
  info?: {
    container?: string
    nominalMinerCapacity?: string
    poolConfig?: string
  }
  miners?: {
    total: number
    disconnected: number
    actualMiners: number
  }
  last?: {
    snap?: {
      stats?: {
        status?: string
        [key: string]: unknown
      }
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  stats?: {
    status?: string
  }
  [key: string]: unknown
}

export type ContainerPoolStat = {
  container: string
  overriddenConfig?: number
  [key: string]: unknown
}

export type ProcessedContainerUnit = ContainerUnit & {
  /** Per-container hashrate in MH/s (callers format for display). */
  hashrateMhs: number
  status: typeof SITE_OVERVIEW_STATUSES.MINING | typeof SITE_OVERVIEW_STATUSES.OFFLINE
  poolStats?: ContainerPoolStat
}

/**
 * Minimal shape of a tail-log row consumed by `useSitesOverviewData`.
 * The dashboard fetches the full row via
 * `tailLogQuery({ key: 'stat-rtd', type: 'miner', tag: 't-miner', ... })`
 * — pass `_head(_head(rawResponse))` here.
 */
export type SitesOverviewTailLogItem = {
  hashrate_mhs_1m_group_sum_aggr?: Record<string, number>
  [key: string]: unknown
}

export type UseSitesOverviewDataOptions = {
  units: ContainerUnit[]
  poolStats: ContainerPoolStat[]
  isLoading: boolean
  tailLogItem: SitesOverviewTailLogItem
}

export type UseSitesOverviewDataResult = {
  units: ProcessedContainerUnit[]
  isLoading: boolean
}

/**
 * Projects raw site-overview rows into a `<PoolManagerSitesOverview />`-
 * ready shape: each container gets its per-container hashrate (in MH/s),
 * an attached pool-stats row keyed by container id, and a `mining` /
 * `offline` status derived from the underlying container snapshot.
 *
 * Lives in `react-adapter` because the layering rule keeps tag and
 * aggregate-field knowledge (`hashrate_mhs_1m_group_sum_aggr`,
 * `CONTAINER_STATUS.RUNNING`, `SITE_OVERVIEW_STATUSES.*`) out of the
 * devkit's component layer.
 *
 * @category dashboard
 */
export const useSitesOverviewData = ({
  units: rawUnits,
  poolStats,
  isLoading,
  tailLogItem,
}: UseSitesOverviewDataOptions): UseSitesOverviewDataResult => {
  const containerPoolStatsMap: Record<string, ContainerPoolStat> = {}
  for (const stat of poolStats) {
    if (stat?.container) containerPoolStatsMap[stat.container] = stat
  }

  const units: ProcessedContainerUnit[] = rawUnits.map((unit) => {
    const containerId = unit.info?.container ?? ''
    const hashrateMhs = tailLogItem.hashrate_mhs_1m_group_sum_aggr?.[containerId] ?? 0
    return {
      ...unit,
      hashrateMhs,
      poolStats: containerId ? containerPoolStatsMap[containerId] : undefined,
      status:
        unit.last?.snap?.stats?.status === CONTAINER_STATUS.RUNNING
          ? SITE_OVERVIEW_STATUSES.MINING
          : SITE_OVERVIEW_STATUSES.OFFLINE,
    }
  })

  return { units, isLoading }
}
