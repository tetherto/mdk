/**
 * Sequential 24-hour-chunk pagination for the historical-alerts log.
 *
 * Ported from Mining OS's `useFetchHistoricalLogsPaginatedData` /
 * `breakTimeIntoIntervals`, but framework-agnostic: the per-window fetcher is
 * injected, so the React adapter can wrap this in `useQuery` while ui-foundation
 * stays pure TS. The backend `history-log` endpoint is cheaper to query in
 * bounded windows, so a wide range is split into successive 24h requests whose
 * results are concatenated and de-duplicated by `uuid`.
 *
 * @category alerts
 */

import { ONE_DAY_MS } from './alert-queries'

/** A single fetch window (ms epoch bounds). */
export type TimeInterval = {
  start: number
  end: number
}

/**
 * Split `[start, end]` into consecutive windows of `intervalMs`. The final
 * window is clamped to `end`. Returns an empty array when the range is empty
 * or inverted. Mirrors Mining OS's `breakTimeIntoIntervals`.
 *
 * @category alerts
 */
export const breakTimeIntoIntervals = (
  start: number,
  end: number,
  intervalMs: number = ONE_DAY_MS,
): TimeInterval[] => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || intervalMs <= 0) {
    return []
  }
  const totalIntervals = Math.ceil((end - start) / intervalMs)
  return Array.from({ length: totalIntervals }, (_unused, i) => {
    const intervalStart = start + i * intervalMs
    return {
      start: intervalStart,
      end: Math.min(intervalStart + intervalMs, end),
    }
  })
}

/**
 * Concatenate `next` onto `prev`, replacing any row that shares a `uuid`
 * (later windows win) and appending the rest. Rows without a `uuid` are always
 * appended. Mirrors Mining OS's `updateHistoricalData`.
 *
 * @category alerts
 */
export const mergeAlertsByUuid = <T extends { uuid?: string }>(prev: T[], next: T[]): T[] => {
  const merged = [...prev]
  for (const row of next) {
    const existingIndex =
      row.uuid == null ? -1 : merged.findIndex((item) => item.uuid === row.uuid)
    if (existingIndex === -1) {
      merged.push(row)
    } else {
      merged[existingIndex] = row
    }
  }
  return merged
}

export type FetchHistoricalAlertsOptions = {
  /** Window size in ms. Defaults to 24h. */
  intervalMs?: number
  /** Abort signal — checked between windows so range changes stop the loop early. */
  signal?: AbortSignal
}

/**
 * Fetch a historical-alerts range as successive 24h windows, merging the
 * results by `uuid`. `fetchWindow` is called once per window (oldest →
 * newest); individual window failures are swallowed (matches Mining OS) so one bad
 * window doesn't drop the whole range. The loop bails out as soon as `signal`
 * is aborted.
 *
 * @category alerts
 */
export const fetchHistoricalAlertsInChunks = async <T extends { uuid?: string }>(
  range: { start: number; end: number },
  fetchWindow: (window: TimeInterval) => Promise<T[]>,
  options: FetchHistoricalAlertsOptions = {},
): Promise<T[]> => {
  const windows = breakTimeIntoIntervals(range.start, range.end, options.intervalMs)
  let merged: T[] = []
  for (const window of windows) {
    if (options.signal?.aborted) break
    try {
      const rows = await fetchWindow(window)
      merged = mergeAlertsByUuid(merged, rows)
    } catch {
      // Ignore individual window failures — a single bad 24h request should
      // not discard the rest of the range.
    }
  }
  return merged
}
