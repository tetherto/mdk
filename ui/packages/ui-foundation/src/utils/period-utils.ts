/**
 * Reporting periods: a range (a rolling preset or custom days) and the buckets
 * a page aggregates it into. Custom dates are whole days in the site's
 * timezone; rolling presets end now, to the minute.
 */

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** Every granularity, finest first. */
export const GRANULARITIES = ['hour', 'day', 'week', 'month'] as const

/** How a period's data is bucketed. */
export type Granularity = (typeof GRANULARITIES)[number]

/** The granularity used when nothing else decides: a preset's own, or one that fits the range. */
export const DEFAULT_GRANULARITY: Granularity = 'day'

/** How each granularity is labelled in a control. */
export const GRANULARITY_LABELS: Record<Granularity, string> = {
  hour: 'Hourly',
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
}

/** The rolling presets, shortest first, each with the granularity it opens with. */
export const PERIOD_PRESETS = [
  { id: '24h', label: 'Last 24 hours', granularity: 'hour' },
  { id: '7d', label: 'Last 7 days', granularity: 'day' },
  { id: '30d', label: 'Last 30 days', granularity: 'day' },
  { id: '90d', label: 'Last 90 days', granularity: 'week' },
  { id: '12m', label: 'Last 12 months', granularity: 'month' },
  { id: 'ytd', label: 'Year to date', granularity: 'month' },
] as const satisfies ReadonlyArray<{ id: string; label: string; granularity: Granularity }>

/** A range of whole days chosen by hand, rather than a rolling preset. */
export const CUSTOM_PERIOD = 'custom'

/** A rolling range ending now. */
export type RollingPresetId = (typeof PERIOD_PRESETS)[number]['id']

/** A rolling preset, or `CUSTOM_PERIOD` days. */
export type PeriodPresetId = RollingPresetId | typeof CUSTOM_PERIOD

export type Period = {
  preset: PeriodPresetId
  /** Custom range only: first and last day, `YYYY-MM-DD`, inclusive. */
  from?: string
  to?: string
  granularity: Granularity
}

/** How far back each rolling preset reaches, in days (`ytd` is to January 1). */
const ROLLING_DAYS: Record<Exclude<RollingPresetId, 'ytd'>, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
}

/** The granularity a rolling preset opens with. */
export const presetGranularity = (preset: RollingPresetId): Granularity =>
  PERIOD_PRESETS.find((p) => p.id === preset)?.granularity ?? DEFAULT_GRANULARITY

/** Offset of `timezone` from UTC at `ts`, in ms. */
const offsetAt = (ts: number, timezone: string): number => {
  const parts: Record<string, number> = {}
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
  for (const p of format.formatToParts(ts))
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  const part = (name: string): number => parts[name] ?? 0
  const local = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  )
  return local - Math.floor(ts / 1000) * 1000
}

const ymd = (day: string): [number, number, number] => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number)
  return [y, m, d]
}

const nextDay = (day: string): string => {
  const [y, m, d] = ymd(day)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/**
 * Midnight at the start of a `YYYY-MM-DD` day in `timezone`, as a UTC instant.
 *
 * @example
 * ```ts
 * zonedDayStart('2026-03-01', 'Europe/Paris') // Date.UTC(2026, 1, 28, 23)
 * ```
 *
 * @category utils
 */
export const zonedDayStart = (day: string, timezone: string): number => {
  const [y, m, d] = ymd(day)
  const guess = Date.UTC(y, m - 1, d)
  return guess - offsetAt(guess - offsetAt(guess, timezone), timezone)
}

/**
 * The `YYYY-MM-DD` day `ts` falls on in `timezone`.
 *
 * @category utils
 */
export const zonedDayOf = (ts: number, timezone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ts)

/**
 * A period's `[start, end)` in ms. Rolling presets end at `now`, rounded up to
 * the minute; a custom range runs from its first day's midnight to the
 * midnight after its last day, in `timezone`. A custom range missing a day
 * defaults to the last 30 days, and one whose days are the wrong way round
 * (`from` after `to`) is read the right way round.
 *
 * @category utils
 */
export const periodRange = (
  period: Period,
  timezone: string,
  now = Date.now(),
): { start: number; end: number } => {
  const end = Math.ceil(now / MINUTE) * MINUTE
  if (period.preset === CUSTOM_PERIOD) {
    const a = period.from ?? zonedDayOf(now - 30 * DAY, timezone)
    const b = period.to ?? zonedDayOf(now, timezone)
    // `YYYY-MM-DD` days compare as strings.
    const [from, to] = a <= b ? [a, b] : [b, a]
    return { start: zonedDayStart(from, timezone), end: zonedDayStart(nextDay(to), timezone) }
  }
  if (period.preset === 'ytd') {
    return { start: zonedDayStart(`${zonedDayOf(now, timezone).slice(0, 4)}-01-01`, timezone), end }
  }
  return { start: end - ROLLING_DAYS[period.preset] * DAY, end }
}

/**
 * The granularities that make sense for a range of `ms`: hourly up to a month,
 * daily up to three years, weekly from two weeks, monthly from two months.
 *
 * @category utils
 */
export const allowedGranularities = (ms: number): Granularity[] => {
  const allowed: Granularity[] = []
  if (ms <= 31 * DAY) allowed.push('hour')
  if (ms <= 3 * 366 * DAY) allowed.push('day')
  if (ms >= 14 * DAY) allowed.push('week')
  if (ms >= 60 * DAY) allowed.push('month')
  return allowed
}
