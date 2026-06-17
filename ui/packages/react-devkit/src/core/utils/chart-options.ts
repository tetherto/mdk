/**
 * Default chart options using theme colors
 */

import type { Chart, ChartEvent, Plugin } from 'chart.js'
import { defaultChartColors } from '../constants/charts'
import { CHART_COLORS, COLOR } from '../constants/colors'
import { hexToOpacity } from './chart'
import { buildChartTooltip } from './chart-tooltip'
import type { ChartTooltipConfig } from './chart-tooltip'

export { defaultChartColors }

/** Compute min, max, avg from a flat array of numbers */
export const computeStats = (values: number[]): { min: number; max: number; avg: number } => {
  if (values.length === 0) return { min: 0, max: 0, avg: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return { min, max, avg }
}

export type MinMaxAvgFormatted = Partial<{
  min: string
  max: string
  avg: string
}>

/** Turn numeric stats into pre-formatted strings for {@link MinMaxAvg} / ChartContainer. */
export const formatMinMaxAvg = (
  stats: { min: number; max: number; avg: number },
  format: (value: number, key: 'min' | 'max' | 'avg') => string,
): MinMaxAvgFormatted => ({
  min: format(stats.min, 'min'),
  max: format(stats.max, 'max'),
  avg: format(stats.avg, 'avg'),
})

/** Get all numeric values from chart datasets */
export const getDatasetValues = (datasets: Array<{ data: (number | null)[] }>): number[] =>
  datasets.flatMap((ds) => ds.data.filter((v): v is number => typeof v === 'number'))

const parseRgbChannels = (color: string): [number, number, number] | null => {
  const comma = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*[\d.]+\s*)?\)$/i,
  )
  if (comma) return [Number(comma[1]), Number(comma[2]), Number(comma[3])]
  const space = color.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i)
  if (space) return [Number(space[1]), Number(space[2]), Number(space[3])]
  return null
}

type HslChannels = { h: number; s: string; l: string }

const formatHslChannel = (value: string): string => (value.includes('%') ? value : `${value}%`)

const parseHslChannels = (color: string): HslChannels | null => {
  const comma = color.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)/i)
  if (comma?.[1] && comma[2] && comma[3]) {
    return {
      h: Number(comma[1]),
      s: formatHslChannel(comma[2]),
      l: formatHslChannel(comma[3]),
    }
  }
  const space = color.match(/^hsla?\(\s*([\d.]+)\s+([\d.]+%?)\s+([\d.]+%?)/i)
  if (space?.[1] && space[2] && space[3]) {
    return {
      h: Number(space[1]),
      s: formatHslChannel(space[2]),
      l: formatHslChannel(space[3]),
    }
  }
  return null
}

/** Common CSS named colors (fallback when DOM color resolution is unavailable). */
const NAMED_COLOR_HEX: Readonly<Record<string, string>> = {
  black: '#000000',
  blue: '#0000ff',
  green: '#008000',
  lightblue: '#add8e6',
  lightgreen: '#90ee90',
  orange: '#ffa500',
  red: '#ff0000',
  white: '#ffffff',
  yellow: '#ffff00',
}

/** Resolve hex / rgb / hsl / named CSS colors to a form {@link colorWithAlpha} understands. */
export const resolveCssColor = (color: string): string => {
  const trimmed = color.trim()
  if (!trimmed) return trimmed
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb') ||
    trimmed.startsWith('hsl')
  ) {
    return trimmed
  }
  const fromMap = NAMED_COLOR_HEX[trimmed.toLowerCase()]
  if (fromMap) return fromMap
  if (typeof document !== 'undefined') {
    try {
      const el = document.createElement('div')
      el.style.color = trimmed
      if (el.style.color) return el.style.color
    } catch {
      // ignore
    }
  }
  return trimmed
}

/** Add opacity to a CSS color string (supports hex, hsl, rgb, named colors) */
export const colorWithAlpha = (color: string, alpha: number): string => {
  if (typeof color !== 'string') return color
  const normalized = resolveCssColor(color)
  if (normalized.startsWith('#')) {
    const hex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
    const base = normalized.length === 9 ? normalized.slice(0, 7) : normalized
    return `${base}${hex}`
  }
  const rgb = parseRgbChannels(normalized)
  if (rgb) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
  const hsl = parseHslChannels(normalized)
  if (hsl) return `hsla(${hsl.h}, ${hsl.s}, ${hsl.l}, ${alpha})`
  return normalized
}

/** Legend swatch fill alpha (Moria `hexToOpacity` default) */
const CHART_LEGEND_FILL_ALPHA = 0.2
const CHART_LEGEND_DISABLED_OPACITY = 0.3
const CHART_LEGEND_LABEL_COLOR = 'rgba(255, 255, 255, 0.7)'

/** Fill / dimmed stroke using Moria-style `rgba` for hex, {@link colorWithAlpha} for rgb/hsl */
const legendColorWithAlpha = (color: string, alpha: number): string => {
  const normalized = resolveCssColor(color)
  if (normalized.startsWith('#')) {
    return hexToOpacity(normalized, alpha)
  }
  return colorWithAlpha(normalized, alpha)
}

/** Swatch + label colors aligned with `buildLegendLabels` (BarChart legend) */
export const getChartLegendItemStyles = (
  color: string,
  hidden = false,
): { fill: string; stroke: string; labelColor: string } => {
  const strokeStyle = resolveCssColor(color)
  const fill = hidden
    ? legendColorWithAlpha(strokeStyle, CHART_LEGEND_FILL_ALPHA * CHART_LEGEND_DISABLED_OPACITY)
    : legendColorWithAlpha(strokeStyle, CHART_LEGEND_FILL_ALPHA)
  const stroke = hidden
    ? legendColorWithAlpha(strokeStyle, CHART_LEGEND_DISABLED_OPACITY)
    : strokeStyle
  const labelColor = hidden
    ? `rgba(255, 255, 255, ${0.7 * CHART_LEGEND_DISABLED_OPACITY})`
    : CHART_LEGEND_LABEL_COLOR
  return { fill, stroke, labelColor }
}

/**
 * Line color for lightweight-charts series — uses the same resolved stroke as
 * {@link getChartLegendItemStyles} (including hsl → rgb when the runtime can compute it).
 */
export const resolveLineSeriesColor = (color: string | undefined): string | undefined => {
  if (!color?.trim()) return undefined
  const strokeStyle = resolveCssColor(color.trim())
  if (strokeStyle.startsWith('hsl') && typeof document !== 'undefined') {
    try {
      const el = document.createElement('div')
      el.style.color = strokeStyle
      document.documentElement.appendChild(el)
      const rgb = getComputedStyle(el).color
      el.remove()
      if (rgb?.startsWith('rgb')) return rgb
    } catch {
      // ignore
    }
  }
  return strokeStyle
}

/** Visible legend stroke — use for line series color so swatch and line always match. */
export const resolveChartLegendStrokeColor = (color: string): string =>
  getChartLegendItemStyles(color, false).stroke

type LegendLabelItem = {
  text: string
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  lineDash: number[]
  lineDashOffset: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  hidden: boolean
  datasetIndex: number
  fontColor: string
}

/** Build legend items from chart datasets (avoids Chart.defaults which may be uninitialized at module load) */
const buildLegendLabels = (chart: Chart): LegendLabelItem[] => {
  const datasets = chart.data.datasets ?? []
  return datasets.map((dataset, i) => {
    const meta = chart.getDatasetMeta(i)
    const isHidden = meta.hidden === true

    const strokeStyleRaw = dataset.borderColor ?? dataset.backgroundColor ?? '#888'
    const strokeStyle = typeof strokeStyleRaw === 'string' ? strokeStyleRaw : '#888'

    const { fill: fillStyle, stroke: dimmedStrokeStyle, labelColor: fontColor } =
      getChartLegendItemStyles(strokeStyle, isHidden)

    const ds = dataset as unknown as Record<string, unknown>
    return {
      text: (dataset.label as string) ?? '',
      fillStyle,
      strokeStyle: dimmedStrokeStyle,
      lineWidth: (dataset.borderWidth as number) ?? 1,
      lineDash: (ds.borderDash as number[] | undefined) ?? [],
      lineDashOffset: (ds.borderDashOffset as number | undefined) ?? 0,
      lineCap: (ds.borderCapStyle as CanvasLineCap | undefined) ?? 'butt',
      lineJoin: (ds.borderJoinStyle as CanvasLineJoin | undefined) ?? 'miter',
      hidden: false,
      datasetIndex: i,
      fontColor,
    }
  })
}

/** Chart.js plugin that adds bottom margin below the legend */
export const legendMarginPlugin: Plugin<any> = {
  id: 'legendMargin',
  /* v8 ignore next 9 -- Chart.js lifecycle hook, not invokable in unit tests */
  beforeInit(chart: Chart) {
    const legend = chart.legend
    if (!legend) return

    const originalFit = legend.fit.bind(legend)

    legend.fit = () => {
      originalFit()
      legend.height += 12
    }
  },
}

// ---------------------------------------------------------------------------
// Bar chart data builder types & utilities
// ---------------------------------------------------------------------------

export type BarChartSeries = {
  label: string
  values: number[] | Record<string, number>
  color?: string
  /** Assign a stack group id to stack multiple series together */
  stack?: string
  /** Gradient opacity stops (default { top: 0.3, bottom: 0.1 }) */
  gradient?: {
    top: number
    bottom: number
  }
  categoryPercentage?: number
  barPercentage?: number
}

export type BarChartLine = {
  label: string
  values: number[] | Record<string, number>
  color?: string
  yAxisID?: string
  tension?: number
  pointRadius?: number
  pointHoverRadius?: number
}

export type BarChartConstant = {
  label: string
  value: number
  color?: string
  borderDash?: number[]
  yAxisID?: string
}

export type BarChartInput = {
  labels?: string[]
  series: BarChartSeries[]
  lines?: BarChartLine[]
  constants?: BarChartConstant[]
}

const BAR_PALETTE: string[] = [CHART_COLORS.blue, CHART_COLORS.VIOLET, CHART_COLORS.orange]
const LINE_PALETTE: string[] = [CHART_COLORS.red, CHART_COLORS.yellow, CHART_COLORS.purple]

const pickColor = (explicit: string | undefined, i: number, palette: string[]): string =>
  explicit || palette[i % palette.length] || '#888'

const toColorWithAlpha = (base: string, a = 1): string => {
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(base)) {
    const m = base.slice(1)
    const hex =
      m.length === 3
        ? m
            .split('')
            .map((c) => c + c)
            .join('')
        : m
    const n = Number.parseInt(hex, 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  const rgbMatch = base.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbMatch) return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${a})`
  if (base.startsWith('hsl')) {
    return base.replace(/\)$/, ` / ${a})`)
  }
  return base
}

export const makeBarGradient = (
  ctx: { chart: Chart },
  base: string,
  { top = 0.3, bottom = 0.1 } = {},
): CanvasGradient | string => {
  const { chartArea, ctx: c } = ctx.chart
  if (!chartArea) return base
  const vertical = (ctx.chart.config.options as Record<string, unknown>)?.indexAxis !== 'y'
  const g = vertical
    ? c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    : c.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
  g.addColorStop(0, toColorWithAlpha(base, top))
  g.addColorStop(1, toColorWithAlpha(base, bottom))
  return g
}

const toArray = (values: number[] | Record<string, number>, labels: string[]): (number | null)[] =>
  Array.isArray(values) ? values : labels.map((l) => values[l] ?? null)

const deriveLabels = (input: BarChartInput): string[] => {
  if (input.labels?.length) return input.labels

  const set = new Set<string>()
  const collect = (v: number[] | Record<string, number>): void => {
    if (!Array.isArray(v)) Object.keys(v).forEach((k) => set.add(k))
  }
  input.series.forEach((s) => collect(s.values))
  input.lines?.forEach((l) => collect(l.values))

  if (set.size) return Array.from(set)
  const firstValues = input.series[0]?.values
  if (Array.isArray(firstValues)) {
    return firstValues.map((_, i) => String(i + 1))
  }
  return []
}

const DEFAULT_CATEGORY_PCT = 0.9
const DEFAULT_BAR_PCT = 0.94
const DEFAULT_BAR_WIDTH = 28

/**
 * Transform a declarative series/lines/constants structure into Chart.js
 * compatible `{ labels, datasets }` with gradient bar styling.
 */
export const buildBarChartData = (
  input: BarChartInput & {
    barWidth?: number
    categoryPercentage?: number
    barPercentage?: number
    defaultLineAxis?: string
  },
): {
  labels: string[]
  datasets: Record<string, unknown>[]
} => {
  const {
    series = [],
    lines = [],
    constants = [],
    barWidth = DEFAULT_BAR_WIDTH,
    defaultLineAxis = 'y',
    categoryPercentage = DEFAULT_CATEGORY_PCT,
    barPercentage = DEFAULT_BAR_PCT,
  } = input

  const labels = deriveLabels(input)

  const barDatasets = series.map((s, i) => {
    const solid = pickColor(s.color, i, BAR_PALETTE)
    const gradientStops = s.gradient || { top: 0.3, bottom: 0.1 }
    return {
      type: 'bar' as const,
      label: s.label,
      data: toArray(s.values, labels),
      backgroundColor: (ctx: { chart: Chart }) => makeBarGradient(ctx, solid, gradientStops),
      borderColor: solid,
      borderWidth: { top: 1.5, right: 0, bottom: 0, left: 0 },
      borderSkipped: false,
      borderRadius: 0,
      maxBarThickness: barWidth,
      categoryPercentage: s.categoryPercentage ?? categoryPercentage,
      barPercentage: s.barPercentage ?? barPercentage,
      stack: s.stack,
      order: 1,
      _legendColor: solid,
    }
  })

  const lineDatasets = lines.map((l, i) => {
    const color = pickColor(l.color, i, LINE_PALETTE)
    return {
      type: 'line' as const,
      label: l.label,
      data: toArray(l.values, labels),
      borderColor: color,
      backgroundColor: color,
      yAxisID: l.yAxisID || defaultLineAxis,
      tension: l.tension ?? 0.35,
      pointRadius: l.pointRadius ?? 3,
      pointHoverRadius: l.pointHoverRadius ?? 4,
      fill: false,
      spanGaps: true,
      order: 3,
      _legendColor: color,
    }
  })

  const constantDatasets = constants.map((c) => {
    const color = c.color || CHART_COLORS.red
    return {
      type: 'line' as const,
      label: c.label,
      data: Array.from({ length: labels.length }, () => c.value),
      borderColor: color,
      backgroundColor: color,
      borderDash: c.borderDash || [6, 6],
      pointRadius: 0,
      tension: 0,
      yAxisID: c.yAxisID || 'y',
      fill: false,
      order: 2,
      _legendColor: color,
    }
  })

  return { labels, datasets: [...barDatasets, ...lineDatasets, ...constantDatasets] }
}

export type BuildBarChartOptionsInput = {
  isHorizontal?: boolean
  isStacked?: boolean
  yTicksFormatter?: (value: number) => string
  yRightTicksFormatter?: ((value: number) => string) | null
  displayColors?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  legendAlign?: 'start' | 'center' | 'end'
  showLegend?: boolean
  /**
   * Custom HTML tooltip configuration. When provided, replaces the default Chart.js tooltip.
   *  Only used when calling `buildBarChartOptions` directly — the `BarChart` component
   *  applies its own `tooltip` prop separately via `buildChartTooltip`.
   */
  tooltip?: ChartTooltipConfig
}

/**
 * Build Chart.js options pre-configured for bar charts with optional
 * stacking, horizontal orientation, and dual Y-axes.
 */
export const buildBarChartOptions = ({
  isHorizontal = false,
  isStacked = false,
  yTicksFormatter = (v: number) => String(v),
  yRightTicksFormatter = null,
  displayColors = true,
  legendPosition = 'top',
  legendAlign = 'end',
  showLegend = true,
  tooltip: tooltipConfig,
}: BuildBarChartOptionsInput = {}): Record<string, unknown> => {
  const axisTicks = { color: CHART_COLORS.axisTicks }
  const gridColor = CHART_COLORS.gridLine

  const scales: Record<string, Record<string, unknown>> = isHorizontal
    ? {
        x: {
          beginAtZero: true,
          stacked: isStacked,
          ticks: { callback: (v: number) => yTicksFormatter(v), ...axisTicks },
          grid: { color: gridColor, offset: false },
        },
        y: { stacked: isStacked, ticks: axisTicks },
      }
    : {
        y: {
          beginAtZero: true,
          stacked: isStacked,
          ticks: { callback: (v: number) => yTicksFormatter(v), ...axisTicks },
          grid: { color: gridColor },
        },
        x: {
          stacked: isStacked,
          ticks: axisTicks,
        },
      }

  if (yRightTicksFormatter) {
    scales.y1 = {
      position: 'right',
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      ticks: { callback: (v: number) => yRightTicksFormatter(v), ...axisTicks },
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isHorizontal ? 'y' : 'x',
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
        align: legendAlign,
        labels: {
          usePointStyle: false,
          boxWidth: 12,
          color: CHART_COLORS.legendLabel,
        },
      },
      tooltip: tooltipConfig
        ? buildChartTooltip(tooltipConfig)
        : {
            displayColors,
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx: {
                dataset: {
                  label?: string
                  yAxisID?: string
                }
                parsed: {
                  y: number
                  x: number
                }
              }) => {
                const label = ctx.dataset.label || ''
                const value = ctx.parsed.y ?? ctx.parsed.x
                if (value == null) return `${label}: `
                if (ctx.dataset.yAxisID === 'y1' && yRightTicksFormatter) {
                  return `${label}: ${yRightTicksFormatter(value)}`
                }
                return `${label}: ${yTicksFormatter(value)}`
              },
            },
          },
    },
    elements: { bar: { borderWidth: 1 } },
    scales,
  }
}

export const standardBarChartScalesXY = {
  x: {
    display: true,
    beginAtZero: true,
    border: { display: false },
    grid: { display: false, color: COLOR.GRAY },
    ticks: { color: COLOR.WHITE_ALPHA_07, maxRotation: 0 },
  },
  y: {
    display: true,
    beginAtZero: true,
    border: { display: false },
    grid: { display: true, color: CHART_COLORS.gridLine },
    ticks: { color: COLOR.WHITE_ALPHA_07, padding: 8 },
  },
} as const

export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 0,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'start' as const,
      /* v8 ignore next 3 -- Chart.js mouse event handler, not invokable in unit tests */
      onHover: (_event: ChartEvent) => {
        const canvas = _event.native?.target as HTMLCanvasElement | null
        if (canvas) canvas.style.cursor = 'pointer'
      },
      /* v8 ignore next 3 -- Chart.js mouse event handler, not invokable in unit tests */
      onLeave: (_event: ChartEvent) => {
        const canvas = _event.native?.target as HTMLCanvasElement | null
        if (canvas) canvas.style.cursor = 'default'
      },
      labels: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: { size: 12 },
        boxWidth: 10,
        boxHeight: 10,
        generateLabels: buildLegendLabels,
      },
    },
  },
  scales: {
    x: {
      display: true,
      beginAtZero: true,
      border: { display: false },
      grid: { display: false, color: '#4a4a4a' },
      ticks: { color: 'rgba(255, 255, 255, 0.7)', maxRotation: 0 },
    },
    y: {
      display: true,
      beginAtZero: true,
      border: { display: false },
      grid: { display: true, color: '#4a4a4a' },
      ticks: { color: 'rgba(255, 255, 255, 0.7)', padding: 8 },
    },
  },
  elements: {
    point: {
      radius: 0,
      hoverRadius: 4,
    },
  },
}
