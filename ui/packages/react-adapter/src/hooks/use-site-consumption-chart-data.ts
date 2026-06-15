import {
  buildSiteConsumptionTailLogParams,
  type ChartCardData,
  type DashboardQueryRange,
  type TailLogEntry,
  tailLogQuery,
} from '@tetherto/mdk-ui-core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

const W_PER_MW = 1_000_000
const MS_PER_SECOND = 1000
/* lightweight-charts parses concrete CSS colours only — `var(...)`
 * is rejected by its `colorStringToRgba`. Mirror the value of
 * `--mdk-color-primary` from `_colors.scss`. */
const PRIMARY_LINE_COLOR = '#f7931a'
const DATASET_LABEL = 'Total Consumption'

const formatMw = (value: number): string => `${value.toFixed(2)} MW`

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

/* `LineChartCard` / lightweight-charts expects `x` in **milliseconds**
 * (the chart wrapper divides by 1000 to derive UTCTimestamp seconds)
 * and rejects ties. Sort raw entries by ts, snap to the enclosing
 * second, dedupe consecutive same-bucket samples. */
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

export type UseSiteConsumptionChartDataParams = DashboardQueryRange & {
  /** Polling interval in ms. Defaults to 60s. Pass 0 to disable. */
  refetchInterval?: number
}

export type SiteConsumptionChartResult = {
  /** Chart-ready payload — assign directly to `<LineChartCard data={...} />`. */
  data: ChartCardData | undefined
  isLoading: boolean
}

/**
 * Site-level power consumption time-series, shaped for
 * `<LineChartCard />`. Reads `site_power_w` from the
 * `t-powermeter`-tagged tail-log (same source the header's
 * `useSitePowerMeter` snapshot uses), converts W → MW, and emits
 * `highlightedValue` + `minMaxAvg`. Mirrors Moria's `Power Consumption`
 * card query verbatim: `type=powermeter, tag=t-powermeter,
 * aggrFields={site_power_w:1}`.
 *
 * @category dashboard
 */
export const useSiteConsumptionChartData = (
  params: UseSiteConsumptionChartDataParams,
): SiteConsumptionChartResult => {
  const queryClient = useQueryClient()
  const factory = tailLogQuery(queryClient, buildSiteConsumptionTailLogParams(params))

  const { data, isLoading } = useQuery({
    ...factory,
    refetchInterval: params.refetchInterval ?? 60_000,
    select: (raw: TailLogEntry[][]) => headOrEmpty<TailLogEntry>(raw),
  })

  const chartData = useMemo<ChartCardData | undefined>(() => {
    if (data === undefined) return undefined
    const points = buildAscDedupedPoints(data, (entry) => {
      const watts = entry.site_power_w
      return typeof watts === 'number' ? watts / W_PER_MW : null
    })
    const latest = lastY(points)
    return {
      datasets: [{ label: DATASET_LABEL, borderColor: PRIMARY_LINE_COLOR, data: points }],
      yTicksFormatter: formatMw,
      priceFormatter: formatMw,
      highlightedValue: latest == null ? undefined : { value: latest.toFixed(2), unit: 'MW' },
      minMaxAvg: computeMinMaxAvg(points, formatMw),
    }
  }, [data])

  return { data: chartData, isLoading }
}
