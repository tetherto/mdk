/**
 * Pure, framework-agnostic helpers powering the MDK UI Shell dashboard
 * composition. Lifted from Mining OS's `getTimelineDropdownData.ts` and the
 * ad-hoc severity coercions scattered across the codebase, with the deep
 * coupling to deviceUtils / SEVERITY_LEVELS constants dropped.
 */

import type { AlertSeverity } from '../types/api-mining.types'

/**
 * Single entry in a timeline dropdown / radio group. Matches the shape
 * consumed by `core/Select` and the new `TimelineSelector` foundation
 * component.
 *
 * @category dashboard
 */
export type TimelineOption = {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Canonical short-form intervals exposed by MDK UI Shell. The keys map onto the
 * `key=stat-<value>` query parameter expected by `GET /auth/tail-log`.
 *
 * @category dashboard
 */
export const DEFAULT_TIMELINE_OPTIONS: readonly TimelineOption[] = [
  { value: '1m', label: '1 Min' },
  { value: '5m', label: '5 Min' },
  { value: '30m', label: '30 Min' },
  { value: '3h', label: '3 H' },
  { value: '1D', label: '1 D' },
] as const

/**
 * Default options for the dashboard timeline selector. Mirrors Mining OS's
 * `timelineRadioButtons` (5m / 30m / 3h / 1D) — the production dashboard
 * doesn't expose `stat-1m` because the backend typically only emits 5-minute
 * and longer aggregates for the dashboard's date range. Pass
 * `{ includeOneMinute: true }` on sites that ship the 1-minute bucket.
 *
 * @category dashboard
 */
export const getTimelineOptions = (opts: { includeOneMinute?: boolean } = {}): TimelineOption[] => {
  const includeOneMinute = opts.includeOneMinute ?? false
  return includeOneMinute
    ? [...DEFAULT_TIMELINE_OPTIONS]
    : DEFAULT_TIMELINE_OPTIONS.filter((o) => o.value !== '1m').map((o) => ({ ...o }))
}

/**
 * Severity level → numeric weight. Higher is more urgent. Used for sorting
 * the active-incidents list (most-severe first).
 *
 * @category dashboard
 */
export const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
}

/**
 * Narrow an arbitrary backend severity string to the `AlertSeverity` literal
 * union expected by the `ActiveIncidentsCard` row component. Unknown values
 * fall back to `'medium'` so the row still renders rather than crashing on
 * an unexpected payload.
 *
 * @category dashboard
 */
export const normalizeAlertSeverity = (raw: string | null | undefined): AlertSeverity => {
  if (!raw) return 'medium'
  const lowered = raw.toLowerCase()
  if (lowered === 'critical') return 'critical'
  if (lowered === 'high') return 'high'
  if (lowered === 'medium' || lowered === 'warning' || lowered === 'warn') return 'medium'
  return 'medium'
}
