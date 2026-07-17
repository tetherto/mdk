import {
  buildHashrateTailLogParams,
  buildMinerpoolStatsHistoryExtDataParams,
  type ChartCardData,
  type ChartDataset,
  type DashboardQueryRange,
  extDataQuery,
  type HashRateLogEntry,
  type MinerpoolStatsHistoryEntry,
  readHashrateMhs,
  type TailLogEntry,
  tailLogQuery,
} from '@tetherto/mdk-ui-foundation'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

/* Unit conventions:
 * - Tail-log (miner) emits hashrate in MH/s; 1 PH/s = 1e9 MH/s.
 * - Pool API emits hashrate in raw H/s; 1 PH/s = 1e15 H/s. */
const MH_PER_PHS = 1_000_000_000
const HS_PER_PHS = 1_000_000_000_000_000

/* Colour palette mirrors Mining OS's hashrate chart legend so consumers
 * see the same lines in the same hues across both apps. */
const MINING_OS_COLOR = '#f7931a'
const AGGR_POOL_COLOR = '#22afff'
const POOL_COLORS: Record<string, string> = {
  f2pool: '#8b5cf6',
  ocean: '#ff3b30',
}
const FALLBACK_POOL_COLORS = ['#34c759', '#ffd700', '#ff85a1', '#6ee7b7']

const MINING_OS_LABEL = 'Mining OS Hash Rate'
const AGGR_POOL_LABEL = 'Aggr Pool Hash Rate'
const POOL_LABEL_SUFFIX = ' Hash Rate'

const formatPhs = (value: number): string => `${value.toFixed(2)} PH/s`

const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? (first as T[]) : []
}

const lastY = (points: Array<{ x: number; y: number | null }>): number | null => {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const y = points[i]?.y
    if (typeof y === 'number') return y
  }
  return null
}

const computeMinMaxAvg = (
  points: Array<{ x: number; y: number | null }>,
  format: (v: number) => string,
): { min: string; max: string; avg: string } | undefined => {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  let sum = 0
  let count = 0
  for (const point of points) {
    if (typeof point.y === 'number') {
      if (point.y < min) min = point.y
      if (point.y > max) max = point.y
      sum += point.y
      count += 1
    }
  }
  if (count === 0) return undefined
  return { min: format(min), max: format(max), avg: format(sum / count) }
}

/* lightweight-charts expects `x` in **ms epoch** (it divides by 1000
 * internally to derive UTCTimestamp seconds) and rejects ties. Sort
 * entries by ts, snap each one to its enclosing second (in ms), and
 * collapse consecutive same-bucket samples keeping the latest value. */
const MS_PER_SECOND = 1000
const buildAscDedupedPoints = <T extends { ts?: unknown }>(
  entries: readonly T[],
  toY: (entry: T) => number | null,
): Array<{ x: number; y: number | null }> => {
  const sorted = [...entries].sort((a, b) => Number(a.ts) - Number(b.ts))
  const out: Array<{ x: number; y: number | null }> = []
  for (const entry of sorted) {
    const xMs = Math.floor(Number(entry.ts) / MS_PER_SECOND) * MS_PER_SECOND
    const y = toY(entry)
    const last = out[out.length - 1]
    if (last && last.x === xMs) {
      last.y = y
    } else {
      out.push({ x: xMs, y })
    }
  }
  return out
}

const titleCasePool = (poolType: string): string => {
  if (poolType.length === 0) return poolType
  return poolType.charAt(0).toUpperCase() + poolType.slice(1)
}

const colorForPool = (poolType: string, fallbackIndex: number): string => {
  return POOL_COLORS[poolType] ?? FALLBACK_POOL_COLORS[fallbackIndex % FALLBACK_POOL_COLORS.length]!
}

const buildAggrPoolPoints = (
  entries: readonly MinerpoolStatsHistoryEntry[],
): Array<{ x: number; y: number | null }> =>
  buildAscDedupedPoints(entries, (entry) => {
    const stats = entry.stats
    if (!Array.isArray(stats) || stats.length === 0) return null
    let total = 0
    let any = false
    for (const pool of stats) {
      if (typeof pool.hashrate === 'number') {
        total += pool.hashrate
        any = true
      }
    }
    return any ? total / HS_PER_PHS : null
  })

const buildPerPoolDatasets = (entries: readonly MinerpoolStatsHistoryEntry[]): ChartDataset[] => {
  /* Group entries by poolType. Each group becomes one dataset. */
  const grouped = new Map<string, Array<{ ts: number; hashrate: number }>>()
  for (const entry of entries) {
    const ts = Number(entry.ts)
    if (!Number.isFinite(ts)) continue
    const stats = Array.isArray(entry.stats) ? entry.stats : []
    for (const pool of stats) {
      const poolType = pool.poolType
      const hashrate = pool.hashrate
      if (typeof poolType !== 'string' || poolType.length === 0) continue
      if (typeof hashrate !== 'number') continue
      const bucket = grouped.get(poolType) ?? []
      bucket.push({ ts, hashrate })
      if (!grouped.has(poolType)) grouped.set(poolType, bucket)
    }
  }

  /* Stable, alphabetical order so the legend is deterministic across
   * refetches and fallback colours land on the same pools. */
  const poolTypes = Array.from(grouped.keys()).sort()
  return poolTypes.map((poolType, index) => {
    const samples = grouped.get(poolType)!
    const points = buildAscDedupedPoints(samples, (entry) => entry.hashrate / HS_PER_PHS)
    return {
      label: `${titleCasePool(poolType)}${POOL_LABEL_SUFFIX}`,
      borderColor: colorForPool(poolType, index),
      data: points,
    }
  })
}

export type UseHashrateChartDataParams = DashboardQueryRange & {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
}

export type HashrateChartResult = {
  /** Chart-ready payload — assign directly to `<LineChartCard data={...} />`. */
  data: ChartCardData | undefined
  isLoading: boolean
}

/**
 * Multi-series hashrate chart data — Mining OS (miner tail-log) plus
 * an `Aggr Pool` rollup and one line per individual pool (drawn from
 * the paginated `type=minerpool, key=stats-history` ext-data feed).
 *
 * Both upstream calls share the page's `{ timeline, start, end }`
 * inputs; results are merged into a single `ChartCardData` payload so
 * the dashboard page stays pure presentation. Each pool gets a
 * deterministic colour from the Mining OS-mirrored palette.
 *
 * @category dashboard
 */
export const useHashrateChartData = (params: UseHashrateChartDataParams): HashrateChartResult => {
  const queryClient = useQueryClient()
  const minerFactory = tailLogQuery(queryClient, buildHashrateTailLogParams(params))
  const poolHistoryFactory = extDataQuery<MinerpoolStatsHistoryEntry>(
    queryClient,
    buildMinerpoolStatsHistoryExtDataParams({ start: params.start, end: params.end }),
  )

  const results = useQueries({
    queries: [
      {
        ...minerFactory,
        refetchInterval: params.refetchInterval ?? 60_000,
        select: (raw: HashRateLogEntry[][] | TailLogEntry[][]) =>
          headOrEmpty<HashRateLogEntry>(raw as HashRateLogEntry[][]),
      },
      {
        ...poolHistoryFactory,
        refetchInterval: params.refetchInterval ?? 60_000,
        select: (raw: MinerpoolStatsHistoryEntry[][]) =>
          headOrEmpty<MinerpoolStatsHistoryEntry>(raw),
      },
    ],
  })

  const minerQuery = results[0]
  const poolQuery = results[1]

  const chartData = useMemo<ChartCardData | undefined>(() => {
    const minerEntries = minerQuery.data
    const poolEntries = poolQuery.data
    if (minerEntries === undefined && poolEntries === undefined) return undefined

    const datasets: ChartDataset[] = []

    /* Mining OS — derived from the miner tail-log aggregate. */
    const miningOsPoints = buildAscDedupedPoints(minerEntries ?? [], (entry) => {
      const mhs = readHashrateMhs(entry as HashRateLogEntry)
      return mhs === undefined ? null : mhs / MH_PER_PHS
    })
    datasets.push({
      label: MINING_OS_LABEL,
      borderColor: MINING_OS_COLOR,
      data: miningOsPoints,
    })

    /* Aggr Pool — sum of every pool's hashrate at each timestamp. */
    if (Array.isArray(poolEntries) && poolEntries.length > 0) {
      const aggrPoints = buildAggrPoolPoints(poolEntries)
      datasets.push({
        label: AGGR_POOL_LABEL,
        borderColor: AGGR_POOL_COLOR,
        data: aggrPoints,
      })
      /* Per-pool series, alphabetical for legend stability. */
      datasets.push(...buildPerPoolDatasets(poolEntries))
    }

    /* Mining OS drives the highlighted value + min/max/avg — it's
     * the canonical "site hashrate" figure. */
    const latest = lastY(miningOsPoints)
    return {
      datasets,
      yTicksFormatter: formatPhs,
      priceFormatter: formatPhs,
      highlightedValue: latest == null ? undefined : { value: latest.toFixed(3), unit: 'PH/s' },
      minMaxAvg: computeMinMaxAvg(miningOsPoints, formatPhs),
    }
  }, [minerQuery.data, poolQuery.data])

  return {
    data: chartData,
    isLoading: minerQuery.isLoading || poolQuery.isLoading,
  }
}
