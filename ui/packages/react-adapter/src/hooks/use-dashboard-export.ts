import {
  buildHashrateTailLogParams,
  buildMinerpoolStatsHistoryExtDataParams,
  buildSiteConsumptionTailLogParams,
  type DashboardQueryRange,
  type ExtDataParams,
  type HashRateLogEntry,
  type IncidentRow,
  type MinerpoolExtDataEntry,
  type MinerpoolStatsHistoryEntry,
  type PoolMinerStats,
  queryKeys,
  type TailLogEntry,
} from '@tetherto/mdk-ui-core'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export type ExportFormat = 'csv' | 'json'

export type DashboardExportPayload = {
  hashrate: HashRateLogEntry[]
  consumption: TailLogEntry[]
  incidents: IncidentRow[]
  /** Current per-pool stats snapshot (worker counts, revenue, hashrate). */
  pools: PoolMinerStats[]
  /** Time-series of per-pool hashrate samples. */
  poolHistory: MinerpoolStatsHistoryEntry[]
}

/* Static params for the live pool-stats snapshot query — mirrors
 * `minerpoolStatsQuery` in ui-core so cache lookup is deterministic. */
const POOL_STATS_PARAMS: ExtDataParams = {
  type: 'minerpool',
  query: JSON.stringify({ key: 'stats' }),
}

export type UseDashboardExportOptions = DashboardQueryRange & {
  /** Optional override for filename prefix (defaults to `mdk-dashboard`). */
  filenamePrefix?: string
}

const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? (first as T[]) : []
}

const csvCell = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

const csvLine = (cells: unknown[]): string => cells.map(csvCell).join(',')

const serializeCsv = (payload: DashboardExportPayload): string => {
  const lines: string[] = []
  lines.push('# Hashrate (raw samples)')
  lines.push(csvLine(['ts', 'hashrate_mhs_1m_sum_aggr', 'hashrate_mhs_5m_sum_aggr']))
  for (const row of payload.hashrate) {
    lines.push(csvLine([row.ts, row.hashrate_mhs_1m_sum_aggr, row.hashrate_mhs_5m_sum_aggr]))
  }
  lines.push('')
  lines.push('# Consumption (raw samples)')
  lines.push(csvLine(['ts', 'power_w_sum_aggr']))
  for (const row of payload.consumption) {
    lines.push(csvLine([row.ts, row.power_w_sum_aggr]))
  }
  lines.push('')
  lines.push('# Active incidents')
  lines.push(csvLine(['id', 'title', 'severity', 'subtitle', 'body']))
  for (const row of payload.incidents) {
    lines.push(csvLine([row.id, row.title, row.severity, row.subtitle, row.body]))
  }
  lines.push('')
  lines.push('# Pools (current snapshot)')
  lines.push(
    csvLine([
      'poolType',
      'username',
      'hashrate_hs',
      'worker_count',
      'active_workers_count',
      'balance',
      'unsettled',
      'revenue_24h',
    ]),
  )
  for (const row of payload.pools) {
    lines.push(
      csvLine([
        row.poolType,
        row.username,
        row.hashrate,
        row.worker_count,
        row.active_workers_count,
        row.balance,
        row.unsettled,
        row.revenue_24h,
      ]),
    )
  }
  lines.push('')
  lines.push('# Pool history (per-pool hashrate over time)')
  lines.push(csvLine(['ts', 'poolType', 'hashrate_hs']))
  for (const entry of payload.poolHistory) {
    const ts = entry.ts
    const stats = Array.isArray(entry.stats) ? entry.stats : []
    for (const pool of stats) {
      lines.push(csvLine([ts, pool.poolType, pool.hashrate]))
    }
  }
  return lines.join('\n')
}

const triggerDownload = (filename: string, content: string, mime: string): void => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export type UseDashboardExportReturn = {
  /** Trigger a CSV file download with the currently-cached dashboard data. */
  exportCsv: () => void
  /** Trigger a JSON file download with the currently-cached dashboard data. */
  exportJson: () => void
  /** Convenience facade for the two above; pass the desired format. */
  export: (format: ExportFormat) => void
}

/**
 * Builds CSV / JSON downloads from the dashboard's already-cached TanStack
 * Query data. Does NOT trigger refetches — the export is exactly what the
 * user is looking at when they click the button.
 *
 * @category dashboard
 */
export const useDashboardExport = (
  options: UseDashboardExportOptions,
): UseDashboardExportReturn => {
  const queryClient = useQueryClient()
  const prefix = options.filenamePrefix ?? 'mdk-dashboard'

  const collect = useCallback((): DashboardExportPayload => {
    const range: DashboardQueryRange = {
      timeline: options.timeline,
      start: options.start,
      end: options.end,
    }
    const hashrateRaw = queryClient.getQueryData<HashRateLogEntry[][]>(
      queryKeys.tailLog(buildHashrateTailLogParams(range)),
    )
    const consumptionRaw = queryClient.getQueryData<TailLogEntry[][]>(
      queryKeys.tailLog(buildSiteConsumptionTailLogParams(range)),
    )
    const incidents = queryClient
      .getQueriesData<IncidentRow[]>({ queryKey: ['auth', 'list-things'] })
      .flatMap(([, data]) => (Array.isArray(data) ? data : []))

    const poolStatsRaw = queryClient.getQueryData<MinerpoolExtDataEntry[][]>(
      queryKeys.extData(POOL_STATS_PARAMS),
    )
    const poolHistoryRaw = queryClient.getQueryData<MinerpoolStatsHistoryEntry[][]>(
      queryKeys.extData(
        buildMinerpoolStatsHistoryExtDataParams({ start: options.start, end: options.end }),
      ),
    )

    const poolEntries = headOrEmpty(poolStatsRaw)
    const pools = Array.isArray(poolEntries[0]?.stats)
      ? (poolEntries[0]!.stats as PoolMinerStats[])
      : []

    return {
      hashrate: headOrEmpty(hashrateRaw),
      consumption: headOrEmpty(consumptionRaw),
      incidents,
      pools,
      poolHistory: headOrEmpty(poolHistoryRaw),
    }
  }, [queryClient, options.timeline, options.start, options.end])

  const exportCsv = useCallback(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    triggerDownload(`${prefix}-${stamp}.csv`, serializeCsv(collect()), 'text/csv')
  }, [collect, prefix])

  const exportJson = useCallback(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    triggerDownload(
      `${prefix}-${stamp}.json`,
      JSON.stringify(collect(), null, 2),
      'application/json',
    )
  }, [collect, prefix])

  const runExport = useCallback(
    (format: ExportFormat) => {
      if (format === 'csv') exportCsv()
      else exportJson()
    },
    [exportCsv, exportJson],
  )

  return { exportCsv, exportJson, export: runExport }
}
