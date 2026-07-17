import {
  buildHistoricalAlertsParams,
  fetchHistoricalAlertsInChunks,
  type HistoricalAlert,
  historyLogQuery,
  mapHistoryLogToAlerts,
  queryKeys,
} from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

export type UseHistoricalAlertsOptions = {
  /** Lower bound of the look-back window (ms epoch). */
  start: number
  /** Upper bound of the look-back window (ms epoch). */
  end: number
  /**
   * Per-request window size in ms. Defaults to the **whole range in a single
   * request**. Set a smaller value (e.g. `ONE_DAY_MS`) only for very wide
   * ranges where the backend would otherwise cap or slow a single query — that
   * splits the fetch into sequential windows.
   */
  intervalMs?: number
  /** Force-disable the query (defaults to enabled when the range is valid). */
  enabled?: boolean
}

/**
 * The `history-log` endpoint returns the worker-grouped `Array<Array<row>>`
 * envelope (like `list-things`); take the head. Tolerates an already-flat body.
 */
const headIfNested = (response: unknown): HistoricalAlert[] => {
  if (!Array.isArray(response)) return []
  const first = response[0]
  if (Array.isArray(first)) return first as HistoricalAlert[]
  return response as HistoricalAlert[]
}

/**
 * TanStack Query hook for the historical-alerts log. Fetches the `[start, end]`
 * range as successive 24-hour `history-log` windows (see
 * `fetchHistoricalAlertsInChunks`), merges them by `uuid`, and shapes the rows
 * for the devkit `<HistoricalAlerts>` table via `mapHistoryLogToAlerts`. Range
 * changes abort the in-flight chunk loop through the query's `AbortSignal`.
 *
 * Wide ranges fan out into many requests — cap the window upstream (the shell
 * page defaults to 14 days).
 *
 * @category alerts
 */
export const useHistoricalAlerts = ({
  start,
  end,
  intervalMs,
  enabled,
}: UseHistoricalAlertsOptions): UseQueryResult<HistoricalAlert[], Error> => {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: queryKeys.historyLog(buildHistoricalAlertsParams({ start, end })),
    queryFn: ({ signal }) =>
      fetchHistoricalAlertsInChunks<HistoricalAlert>(
        { start, end },
        async (window) => {
          const factory = historyLogQuery(queryClient, buildHistoricalAlertsParams(window))
          return headIfNested(await factory.queryFn())
        },
        // Default to one request for the whole range; callers opt into chunking.
        { intervalMs: intervalMs ?? Math.max(end - start, 1), signal },
      ),
    select: (rows) => mapHistoryLogToAlerts(rows),
    enabled: enabled ?? (Number.isFinite(start) && Number.isFinite(end) && end > start),
  })
}
