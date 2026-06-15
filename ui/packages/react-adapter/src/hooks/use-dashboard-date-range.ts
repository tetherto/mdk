import { useCallback, useState } from 'react'

export type DashboardDateRange = {
  /** Lower bound (ms epoch). */
  start: number
  /** Upper bound (ms epoch). */
  end: number
}

export type UseDashboardDateRangeReturn = DashboardDateRange & {
  setRange: (next: DashboardDateRange) => void
  /** Convenience: reset to the default window (last 24 h ending now). */
  reset: () => void
}

export type UseDashboardDateRangeOptions = {
  /** Initial range. Defaults to the last 24 h. */
  initial?: DashboardDateRange
}

const HOUR_MS = 60 * 60 * 1000
const DEFAULT_WINDOW = 24 * HOUR_MS

const computeDefault = (): DashboardDateRange => {
  const end = Date.now()
  return { start: end - DEFAULT_WINDOW, end }
}

/**
 * Owns the single source of truth for the dashboard's date-range picker.
 * Pass `start` / `end` from the return value into every data hook on the
 * page (`useHashrateChartData`, `useConsumptionChartData`, the export, etc.)
 * so they refetch in lock-step when the user picks a new range.
 *
 * Deliberately not stored in Zustand — the range is scoped to one
 * dashboard page, not the whole session.
 *
 * @category dashboard
 */
export const useDashboardDateRange = (
  options: UseDashboardDateRangeOptions = {},
): UseDashboardDateRangeReturn => {
  const [range, setRangeState] = useState<DashboardDateRange>(
    () => options.initial ?? computeDefault(),
  )

  const setRange = useCallback((next: DashboardDateRange) => {
    setRangeState(next)
  }, [])

  const reset = useCallback(() => {
    setRangeState(computeDefault())
  }, [])

  return { start: range.start, end: range.end, setRange, reset }
}
