import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import type { TooltipItem } from 'chart.js'
import * as React from 'react'
import { Doughnut } from 'react-chartjs-2'
import { PIE_CHART_COLORS } from '../../constants/colors'
import type { Position } from '../../types'
import { cn } from '../../utils'
import { colorWithAlpha } from '../../utils/chart-options'
import { buildChartTooltip } from '../../utils/chart-tooltip'
import type { ChartTooltipConfig } from '../../utils/chart-tooltip'

ChartJS.register(ArcElement, Tooltip, Legend)

export type DoughnutChartDataset = {
  label: string
  value: number
  color?: string
}

export type DoughnutChartProps = {
  /** Array of labelled slices */
  data: DoughnutChartDataset[]
  /** Unit suffix shown in tooltips */
  unit?: string
  /** Chart.js options – merged with defaults */
  options?: ChartJS<'doughnut'>['options']
  /** Doughnut cutout percentage (default: '75%') */
  cutout?: string
  /** Border width between segments (default: 4) */
  borderWidth?: number
  /** Chart height in pixels */
  height?: number
  /** Where to place the legend relative to the chart (default: 'top') */
  legendPosition?: Position
  /**
   * Custom HTML tooltip configuration. When provided, replaces the default doughnut tooltip
   *  (which shows label, value with unit, and percentage). Use `valueFormatter` to replicate
   *  the percentage display if needed.
   */
  tooltip?: ChartTooltipConfig
  className?: string
}

const formatPct = (value: number, total: number): string => {
  if (total === 0) return '0'
  return ((value / total) * 100).toFixed(2)
}

/**
 * DoughnutChart – Presentational Chart.js doughnut chart
 * with custom HTML legend matching the miningOS design.
 *
 * @example
 * ```tsx
 * <DoughnutChart
 *   data={[
 *     { label: 'Online', value: 120, color: '#34C759' },
 *     { label: 'Offline', value: 30, color: '#FF3B30' },
 *   ]}
 * />
 * ```
 */
export const DoughnutChart = React.forwardRef<HTMLDivElement, DoughnutChartProps>(
  (
    {
      data,
      unit = '',
      options,
      cutout = '75%',
      borderWidth = 4,
      height = 260,
      legendPosition = 'top',
      tooltip: tooltipConfig,
      className,
    },
    ref,
  ) => {
    const chartRef = React.useRef<ChartJS<'doughnut'> | null>(null)
    const [hiddenItems, setHiddenItems] = React.useState<Record<number, boolean>>({})

    const dataKey = React.useMemo(() => data.map((d) => d.label).join('|'), [data])
    React.useEffect(() => {
      setHiddenItems({})
    }, [dataKey])

    const total = React.useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data])

    const colors = React.useMemo(
      () => data.map((d, i) => d.color ?? PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]),
      [data],
    )

    const chartData = React.useMemo(
      () => ({
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: colors,
            hoverBackgroundColor: colors,
            cutout,
            borderWidth,
            borderColor: '#17130F',
          },
        ],
      }),
      [data, colors, cutout, borderWidth],
    )

    const mergedOptions = React.useMemo((): ChartJS<'doughnut'>['options'] => {
      const tooltipPlugin = tooltipConfig
        ? buildChartTooltip(tooltipConfig)
        : {
            backgroundColor: '#17130F',
            titleFont: { size: 10 },
            bodyFont: { size: 12 },
            callbacks: {
              title: () => '',
              label: (ctx: TooltipItem<'doughnut'>) => {
                const v = ctx.parsed ?? 0
                const pct = formatPct(v, total)
                const suffix = unit ? ` ${unit}` : ''
                return [`${ctx.label}`, `${v}${suffix} (${pct}%)`]
              },
            },
          }

      const base: ChartJS<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: tooltipPlugin,
          datalabels: { display: false },
        },
        elements: { arc: { borderWidth: 0 } },
      }

      if (options) {
        return { ...base, ...options }
      }
      return base
    }, [total, unit, options, tooltipConfig])

    const onToggleItem = React.useCallback((index: number) => {
      const chart = chartRef.current
      if (!chart) return
      chart.toggleDataVisibility(index)
      chart.update()
      setHiddenItems((prev) => ({
        ...prev,
        [index]: !chart.getDataVisibility(index),
      }))
    }, [])

    const legendEl = (
      <div className="mdk-doughnut-chart__legend">
        {data.map((item, i) => {
          const isHidden = !!hiddenItems[i]
          const pct = formatPct(item.value, total)
          return (
            <button
              key={`${item.label}-${i}`}
              type="button"
              className={cn(
                'mdk-doughnut-chart__legend-item',
                isHidden && 'mdk-doughnut-chart__legend-item--hidden',
              )}
              onClick={() => onToggleItem(i)}
            >
              <span
                className="mdk-doughnut-chart__legend-color"
                style={{
                  borderColor: colors[i],
                  backgroundColor: colorWithAlpha(colors[i] ?? '#888', 0.2),
                }}
              />
              <span className="mdk-doughnut-chart__legend-label">{item.label}</span>
              <span className="mdk-doughnut-chart__legend-stats">
                <span className="mdk-doughnut-chart__legend-pct">({pct}%)</span>
                <span className="mdk-doughnut-chart__legend-count">
                  {item.value}
                  {unit ? ` ${unit}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )

    const chartEl = (
      <div className="mdk-doughnut-chart__chart" style={{ height, maxWidth: height }}>
        <Doughnut ref={chartRef} data={chartData} options={mergedOptions} />
      </div>
    )

    const legendFirst = legendPosition === 'top' || legendPosition === 'left'

    return (
      <div
        ref={ref}
        className={cn(
          'mdk-doughnut-chart',
          `mdk-doughnut-chart--legend-${legendPosition}`,
          className,
        )}
      >
        {legendFirst ? legendEl : chartEl}
        {legendFirst ? chartEl : legendEl}
      </div>
    )
  },
)
DoughnutChart.displayName = 'DoughnutChart'
