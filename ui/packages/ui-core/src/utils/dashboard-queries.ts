/**
 * Tail-log query parameter builders for the dashboard. Centralised so the
 * chart hooks and `useDashboardExport` can derive identical params from the
 * same `{ timeline, start, end }` inputs — no risk of drift when the keys
 * or aggregate fields change.
 *
 * @category dashboard
 */

import type { ExtDataParams, TailLogParams } from '../types/api-mining.types'

export type DashboardQueryRange = {
  /** Stat key suffix — e.g. '1m', '5m', '3h'. The query hits `key=stat-${timeline}`. */
  timeline: string
  /** Lower bound of the time window (ms epoch). */
  start?: number
  /** Upper bound of the time window (ms epoch). */
  end?: number
}

/* Request both per-minute and per-5-minute aggregates — the backend
 * emits the one that matches the requested `stat-${timeline}` bucket
 * (e.g. `stat-5m` returns `hashrate_mhs_5m_sum_aggr`); readers fall
 * back between them via {@link readHashrateMhs}. */
const HASHRATE_AGGR_FIELDS = JSON.stringify({ hashrate_mhs_1m_sum_aggr: 1 })
const HASHRATE_FIELDS = JSON.stringify({ hashrate_mhs_1m_sum: 1 })
const CONSUMPTION_AGGR_FIELDS = JSON.stringify({ site_power_w: 1 })
const DEFAULT_LIMIT = 288

/**
 * Reads the hashrate aggregate from a tail-log entry. Moria emits
 * `hashrate_mhs_1m_sum_aggr` across every `stat-*` bucket, so a single
 * field check covers all timelines; the `_5m_` legacy fallback is
 * retained as a defensive secondary in case a future backend swaps
 * field names per timeline.
 *
 * @category dashboard
 */
export const readHashrateMhs = (entry: {
  hashrate_mhs_1m_sum_aggr?: unknown
  hashrate_mhs_5m_sum_aggr?: unknown
}): number | undefined => {
  if (typeof entry.hashrate_mhs_1m_sum_aggr === 'number') {
    return entry.hashrate_mhs_1m_sum_aggr
  }
  if (typeof entry.hashrate_mhs_5m_sum_aggr === 'number') {
    return entry.hashrate_mhs_5m_sum_aggr
  }
  return undefined
}

/**
 * Hashrate tail-log params — per-miner 1-minute aggregate, summed across
 * the `t-miner` tag.
 *
 * @category dashboard
 */
export const buildHashrateTailLogParams = (range: DashboardQueryRange): TailLogParams => ({
  key: `stat-${range.timeline}`,
  type: 'miner',
  tag: 't-miner',
  fields: HASHRATE_FIELDS,
  aggrFields: HASHRATE_AGGR_FIELDS,
  limit: DEFAULT_LIMIT,
  start: range.start,
  end: range.end,
})

/**
 * Site-level consumption tail-log params — reads the dedicated
 * powermeter's `site_power_w` aggregate (Moria's
 * `type=powermeter, tag=t-powermeter, aggrFields={site_power_w:1}`
 * query). Returns the same series the header's `useSitePowerMeter`
 * snapshot reads, so the chart and header always agree.
 *
 * @category dashboard
 */
export const buildSiteConsumptionTailLogParams = (range: DashboardQueryRange): TailLogParams => ({
  key: `stat-${range.timeline}`,
  type: 'powermeter',
  tag: 't-powermeter',
  aggrFields: CONSUMPTION_AGGR_FIELDS,
  limit: DEFAULT_LIMIT,
  start: range.start,
  end: range.end,
})

/**
 * Window-range input for the paginated minerpool stats-history fetch.
 * `start` / `end` are ms-epoch bounds.
 *
 * @category dashboard
 */
export type MinerpoolStatsHistoryRange = {
  start?: number
  end?: number
}

/** Compact `fields` selector — only what the multi-series chart consumes. */
const MINERPOOL_HISTORY_FIELDS = {
  ts: 1,
  'stats.poolType': 1,
  'stats.hashrate': 1,
} as const

/**
 * Ext-data params for `type=minerpool, key=stats-history` — per-pool
 * hashrate snapshots over time. Pair with `extDataQuery` to feed the
 * multi-series Hash Rate chart (Mining OS + Aggr Pool + per-pool
 * lines).
 *
 * @category dashboard
 */
export const buildMinerpoolStatsHistoryExtDataParams = (
  range: MinerpoolStatsHistoryRange = {},
): ExtDataParams => ({
  type: 'minerpool',
  query: JSON.stringify({
    key: 'stats-history',
    ...(typeof range.start === 'number' ? { start: range.start } : {}),
    ...(typeof range.end === 'number' ? { end: range.end } : {}),
    fields: MINERPOOL_HISTORY_FIELDS,
  }),
})
