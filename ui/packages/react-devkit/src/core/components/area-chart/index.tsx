import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line } from 'react-chartjs-2'
import { cn } from '../../utils'
import {
  colorWithAlpha,
  defaultChartColors,
  defaultChartOptions,
  legendMarginPlugin,
} from '../../utils/chart-options'
import { buildChartTooltip } from '../../utils/chart-tooltip'
import type { ChartTooltipConfig } from '../../utils/chart-tooltip'
import { forwardRef, useMemo } from 'react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
)

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
        <Line data={chartData} options={mergedOptions} plugins={[legendMarginPlugin]} />
      </div>
    )
  },
)
AreaChart.displayName = 'AreaChart'
