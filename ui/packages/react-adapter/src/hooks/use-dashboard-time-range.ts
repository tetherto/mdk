import { getTimelineOptions, type TimelineOption } from '@tetherto/mdk-ui-core'
import { useCallback, useMemo, useState } from 'react'

export type DashboardTimeRange = {
  /** Current selection — e.g. `'1m'`, `'5m'`. */
  timeline: string
  /** Available options, suitable for `<TimelineSelector options={...} />`. */
  options: TimelineOption[]
  /** Setter for the current timeline. */
  setTimeline: (next: string) => void
}

export type UseDashboardTimeRangeOptions = {
  /** Initial timeline — defaults to `'5m'`, the most common stat key. */
  initial?: string
  /** Custom option list — defaults to {@link getTimelineOptions}. */
  options?: TimelineOption[]
}

/**
 * Tiny piece of shared state for the dashboard's timeline selector. Owns the
 * current `timeline` value plus the canonical option list. The chart hooks
 * (`useHashrateChartData`, etc.) consume `timeline` as a prop.
 *
 * Deliberately not stored in Zustand — the time range is scoped to a single
 * dashboard page, not the whole session.
 *
 * @category dashboard
 */
export const useDashboardTimeRange = (
  opts: UseDashboardTimeRangeOptions = {},
): DashboardTimeRange => {
  const [timeline, setTimeline] = useState(opts.initial ?? '5m')
  const options = useMemo<TimelineOption[]>(
    () => opts.options ?? getTimelineOptions(),
    [opts.options],
  )

  const setSelection = useCallback((next: string) => {
    setTimeline(next)
  }, [])

  return { timeline, options, setTimeline: setSelection }
}
