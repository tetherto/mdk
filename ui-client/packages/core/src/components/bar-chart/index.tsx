import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import 'chartjs-adapter-date-fns'
import * as React from 'react'
import { Bar } from 'react-chartjs-2'
import type { FlexAlign, Position } from '../../types'
import { cn } from '../../utils'
import {
  defaultChartColors,
  defaultChartOptions,
  legendMarginPlugin,
  makeBarGradient,
} from '../../utils/chart-options'
import { buildChartTooltip } from '../../utils/chart-tooltip'
import type { ChartTooltipConfig } from '../../utils/chart-tooltip'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
)

type BarDataset = {
  type?: string
  stack?: string
  data?: unknown[]
}

type DataLabelContext = {
  chart: ChartJS
  dataset: BarDataset
  datasetIndex: number
  dataIndex: number
}

type BarGradientContext = {
  chart: ChartJS
  dataIndex: number
}

export type BarChartProps = {
  /** Chart data - required, provided by parent. Use `as any` for mixed bar+line datasets. */

  data: any
  /** Chart.js options - merged with defaults */
  options?: ChartJS<'bar'>['options']
  /** Stack bars on top of each other */
  isStacked?: boolean
  /** Render bars horizontally (indexAxis: 'y') */
  isHorizontal?: boolean
  /** Format Y-axis tick labels */
  formatYLabel?: (value: number) => string
  /** Show built-in Chart.js legend (default: true) */
  showLegend?: boolean
  /** Position of the legend (default: 'top') */
  legendPosition?: Position
  /** Alignment of the legend labels within their position (default: 'start') */
  legendAlign?: FlexAlign
  /** Show values above each bar */
  showDataLabels?: boolean
  /** Format data label values (default: round to nearest integer) */
  formatDataLabel?: (value: number) => string
  /** Custom HTML tooltip configuration. When provided, replaces the default Chart.js tooltip. */
  tooltip?: ChartTooltipConfig
  /** Chart height in pixels */
  height?: number
  className?: string
}

export const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      data,
      options,
      isStacked = false,
      isHorizontal = false,
      formatYLabel,
      showLegend = true,
      legendPosition = 'top',
      legendAlign = 'start',
      tooltip: tooltipConfig,
      showDataLabels = false,
      formatDataLabel,
      height = 300,
      className,
    },
    ref,
  ) => {
    const mergedOptions = React.useMemo(() => {
      const base = {
        ...defaultChartOptions,
        ...options,
      }

      if (tooltipConfig) {
        base.plugins = {
          ...base.plugins,
          tooltip: buildChartTooltip(tooltipConfig),
        }
      }

      if (isHorizontal) {
        ;(base as Record<string, unknown>).indexAxis = 'y'
      }

      base.plugins = {
        ...base.plugins,
        legend: {
          ...base.plugins?.legend,
          display: showLegend,
          position: legendPosition,
          align: legendAlign,
        },
        datalabels: showDataLabels
          ? {
              display: (ctx: DataLabelContext): boolean => {
                const { chart, dataset, datasetIndex, dataIndex } = ctx
                if (dataset.type === 'line') return false
                if (!isStacked) return true
                const stackKey = dataset.stack || '__default__'
                const dsets = chart.data.datasets ?? []
                for (let i = dsets.length - 1; i >= 0; i--) {
                  const ds = dsets[i] as BarDataset | undefined
                  if (!ds || ds.type === 'line') continue
                  if ((ds.stack || '__default__') !== stackKey) continue
                  if (!chart.isDatasetVisible(i)) continue
                  const v = Array.isArray(ds.data) ? ds.data[dataIndex] : null
                  if (v == null || v === 0) continue
                  return i === datasetIndex
                }
                return true
              },
              anchor: 'end' as const,
              align: 'end' as const,
              offset: 2,
              clamp: true,
              clip: false,
              color: 'rgba(255, 255, 255, 0.85)',
              font: { size: 11, weight: 'normal' as const },
              formatter: (v: number | null) => {
                if (v == null) return ''
                return formatDataLabel ? formatDataLabel(v) : Math.round(v)
              },
            }
          : { display: false },
      }

      if (showDataLabels) {
        const baseAny = base as Record<string, unknown>
        const existingLayout =
          typeof baseAny.layout === 'object' && baseAny.layout ? baseAny.layout : {}
        baseAny.layout = { ...(existingLayout as Record<string, unknown>), padding: { top: 20 } }
      }

      const scales = { ...base.scales } as Record<string, Record<string, unknown>>

      if (isStacked) {
        scales.x = { ...scales.x, stacked: true }
        scales.y = { ...scales.y, stacked: true }
      }

      if (formatYLabel) {
        const valueAxis = isHorizontal ? 'x' : 'y'
        const existing = scales[valueAxis] ?? {}
        const existingTicks =
          typeof existing === 'object' && 'ticks' in existing ? existing.ticks : {}
        scales[valueAxis] = {
          ...(existing as Record<string, unknown>),
          ticks: {
            ...(typeof existingTicks === 'object' ? existingTicks : {}),
            callback: (_value: unknown, index: number, values: { value: number }[]) =>
              formatYLabel(values[index]?.value ?? 0),
          },
        }
      }

      return { ...base, scales }
    }, [
      options,
      isStacked,
      isHorizontal,
      formatYLabel,
      showLegend,
      legendPosition,
      legendAlign,
      showDataLabels,
      formatDataLabel,
      tooltipConfig,
    ])

    const chartData = React.useMemo(() => {
      const datasets = data.datasets?.map((ds: any, i: number) => {
        const dsType = ds.type as string | undefined
        const isLine = dsType === 'line'

        const solidColor = String(
          ds.borderColor ?? ds.backgroundColor ?? defaultChartColors[i % defaultChartColors.length],
        )

        if (isLine) {
          return {
            ...ds,
            borderColor: ds.borderColor ?? solidColor,
            backgroundColor: ds.backgroundColor ?? solidColor,
          }
        }

        const bgIsFunction = typeof ds.backgroundColor === 'function'
        const bgIsArray = Array.isArray(ds.backgroundColor)

        let backgroundColor: unknown
        if (bgIsFunction) {
          backgroundColor = ds.backgroundColor
        } else if (bgIsArray) {
          backgroundColor = ((ctx: BarGradientContext) =>
            makeBarGradient(
              ctx,
              ds.backgroundColor[ctx.dataIndex] ?? solidColor,
            )) as unknown as string
        } else {
          backgroundColor = ((ctx: { chart: ChartJS }) =>
            makeBarGradient(ctx, solidColor)) as unknown as string
        }

        return {
          ...ds,
          backgroundColor,
          borderColor: ds.borderColor ?? solidColor,
          borderWidth:
            ds.borderWidth ??
            (isHorizontal
              ? { top: 0, right: 1.5, bottom: 0, left: 0 }
              : { top: 1.5, right: 0, bottom: 0, left: 0 }),
          borderSkipped: ds.borderSkipped ?? (false as const),
          borderRadius: ds.borderRadius ?? 0,
        }
      })
      return { ...data, datasets }
    }, [data, isHorizontal])

    const plugins = React.useMemo(
      () => (showDataLabels ? [legendMarginPlugin, ChartDataLabels] : [legendMarginPlugin]),
      [showDataLabels],
    )

    return (
      <div ref={ref} className={cn('mdk-bar-chart', className)} style={{ height }}>
        <Bar data={chartData} options={mergedOptions} plugins={plugins} />
      </div>
    )
  },
)
BarChart.displayName = 'BarChart'
