import type { Chart as ChartJS } from 'chart.js'
import { cn } from '../../utils'
import {
  colorWithAlpha,
  defaultChartColors,
  defaultChartOptions,
  legendMarginPlugin,
} from '../../utils/chart-options'
import { buildChartTooltip } from '../../utils/chart-tooltip'
import type { ChartTooltipConfig } from '../../utils/chart-tooltip'
import { forwardRef, lazy, Suspense, useMemo } from 'react'

// chart.js + react-chartjs-2 are code-split into a lazy chunk so importing this
// component does not pull the chart engine into a consumer's initial bundle.
const AreaCanvas = lazy(() => import('./area-canvas'))

export type AreaChartProps = {
  /** Chart data - required, provided by parent */
  data: ChartJS<'line'>['data']
  /** Chart.js options - merged with defaults */
  options?: ChartJS<'line'>['options']
  /** Custom HTML tooltip configuration. When provided, replaces the default Chart.js tooltip. */
  tooltip?: ChartTooltipConfig
  /** Chart height in pixels */
  height?: number
  className?: string
}

/**
 * Presentational Chart.js area chart (Line with fill). Data must be
 * provided via props; this component does no fetching of its own.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <AreaChart data={areaData} options={options} height={300} />
 * ```
 */
export const AreaChart = forwardRef<HTMLDivElement, AreaChartProps>(
  ({ data, options, tooltip: tooltipConfig, height = 300, className }, ref) => {
    const mergedOptions = useMemo(() => {
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
      return base
    }, [options, tooltipConfig])

    const chartData = useMemo(() => {
      const datasets = data.datasets?.map((ds, i) => {
        const lineColor = ds.borderColor ?? defaultChartColors[i % defaultChartColors.length]
        return {
          ...ds,
          fill: true,
          tension: 0.3,
          borderColor: lineColor,
          backgroundColor: ds.backgroundColor ?? colorWithAlpha(String(lineColor), 0.2),
        }
      })
      return { ...data, datasets }
    }, [data])

    return (
      <div ref={ref} className={cn('mdk-area-chart', className)} style={{ height }}>
        <Suspense fallback={null}>
          <AreaCanvas data={chartData} options={mergedOptions} plugins={[legendMarginPlugin]} />
        </Suspense>
      </div>
    )
  },
)
AreaChart.displayName = 'AreaChart'
