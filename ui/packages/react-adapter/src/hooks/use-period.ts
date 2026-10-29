import type {
  Granularity,
  Period,
  PeriodPresetId,
  RollingPresetId,
} from '@tetherto/mdk-ui-foundation'
import {
  allowedGranularities,
  CUSTOM_PERIOD,
  DEFAULT_GRANULARITY,
  GRANULARITIES,
  PERIOD_PRESETS,
  periodRange,
  presetGranularity,
} from '@tetherto/mdk-ui-foundation'
import { useCallback, useMemo } from 'react'

/**
 * The page's query string and a way to change it, as react-router's
 * `useSearchParams()` returns them. Any router with the same shape works.
 */
export type SearchParamsState = readonly [
  URLSearchParams,
  (next: (prev: URLSearchParams) => URLSearchParams, options?: { replace?: boolean }) => void,
]

export type UsePeriodDefaults = {
  preset: RollingPresetId
  /** Defaults to the preset's own granularity. */
  granularity?: Granularity
}

export type PeriodState = {
  /** The period the URL describes, else the defaults. */
  period: Period
  /** The range in ms and a granularity that fits it: what to ask the backend for. */
  query: { start: number; end: number; granularity: Granularity }
  /** The granularities that make sense for the range. */
  allowed: Granularity[]
  /** True while the URL sets neither range nor granularity. */
  isDefault: boolean
  setPreset: (preset: RollingPresetId) => void
  /** First and last day, `YYYY-MM-DD`, inclusive, in the site's timezone. */
  setCustom: (from: string, to: string) => void
  setGranularity: (granularity: Granularity) => void
  /** Back to the defaults. */
  reset: () => void
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

const isPreset = (value: string): value is PeriodPresetId =>
  value === CUSTOM_PERIOD || PERIOD_PRESETS.some((p) => p.id === value)
const isGranularity = (value: string): value is Granularity =>
  GRANULARITIES.some((g) => g === value)

/**
 * A reporting period kept in the URL (`?range=`, `from`, `to`, `granularity`),
 * so a report can be linked to and survives a reload. Changes replace the
 * history entry rather than adding one. Rolling presets are recomputed on every
 * render; re-render each minute to keep one rolling. A granularity that does
 * not fit the range is swapped for one that does (daily where it can).
 *
 * @example
 * ```tsx
 * const period = usePeriod(useSearchParams(), timezone, { preset: '30d' })
 * useQuery({ queryKey: ['report', period.query], queryFn: () => fetchReport(period.query) })
 * <PeriodControl state={period} timezone={timezone} />
 * ```
 *
 * @category utility
 */
export const usePeriod = (
  [params, setParams]: SearchParamsState,
  timezone: string,
  defaults: UsePeriodDefaults,
): PeriodState => {
  const period = useMemo<Period>(() => {
    const presetParam = params.get('range') ?? ''
    const granularityParam = params.get('granularity') ?? ''
    const from = params.get('from') ?? ''
    const to = params.get('to') ?? ''
    const next: Period = {
      preset: isPreset(presetParam) ? presetParam : defaults.preset,
      granularity: isGranularity(granularityParam)
        ? granularityParam
        : (defaults.granularity ?? presetGranularity(defaults.preset)),
    }
    if (DAY_RE.test(from)) next.from = from
    if (DAY_RE.test(to)) next.to = to
    // A hand-edited URL can name the days the wrong way round; `YYYY-MM-DD`
    // days compare as strings.
    if (next.from !== undefined && next.to !== undefined && next.from > next.to) {
      ;[next.from, next.to] = [next.to, next.from]
    }
    return next
  }, [params, defaults.preset, defaults.granularity])

  const { start, end } = periodRange(period, timezone)
  const allowed = allowedGranularities(end - start)
  const fallback = allowed.includes(DEFAULT_GRANULARITY)
    ? DEFAULT_GRANULARITY
    : (allowed[0] ?? DEFAULT_GRANULARITY)
  const granularity = allowed.includes(period.granularity) ? period.granularity : fallback

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === null) next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setPreset = useCallback(
    (preset: RollingPresetId) =>
      update({ range: preset, from: null, to: null, granularity: presetGranularity(preset) }),
    [update],
  )
  const setCustom = useCallback(
    (from: string, to: string) =>
      update({ range: CUSTOM_PERIOD, ...(from <= to ? { from, to } : { from: to, to: from }) }),
    [update],
  )
  const setGranularity = useCallback((next: Granularity) => update({ granularity: next }), [update])
  const reset = useCallback(
    () => update({ range: null, from: null, to: null, granularity: null }),
    [update],
  )

  return {
    period,
    query: { start, end, granularity },
    allowed,
    isDefault: !params.has('range') && !params.has('granularity'),
    setPreset,
    setCustom,
    setGranularity,
    reset,
  }
}
