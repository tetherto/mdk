import { ChartContainer } from '../chart-container'
import { LineChart } from '../line-chart'
import { useMemo, useState } from 'react'

import type { ThresholdLineChartProps } from './types'
import { hasNonZeroData, toThresholdLineChartData } from './utils'
import { DEFAULT_HEIGHT, FILL_HEIGHT } from './constants'

export type {
  ThresholdLineChartData,
  ThresholdLineChartPoint,
  ThresholdLineChartProps,
  ThresholdLineChartSeries,
  ThresholdLineChartThreshold,
} from './types'

export { hasNonZeroData, toThresholdLineChartData } from './utils'

/**
 * Line chart with optional horizontal threshold lines.
 * Wraps `ChartContainer` and `LineChart`; pass `series` and optional `thresholds` via `data`.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <ThresholdLineChart
 *   title="Power Consumption"
 *   unit="MW"
 *   data={{
 *     series: [{ label: "Power", color: "#f59e0b", points: [{ timestamp: "2025-01-01", value: 32 }] }],
 *     thresholds: [{ label: "Availability", value: 38, color: "#22c55e" }],
 *   }}
 * />
 * ```
 */
export const ThresholdLineChart = ({
  data,
  unit,
  title,
  height,
  className,
  emptyMessage,
  isTall = false,
  yTicksFormatter,
  isLegendVisible = true,
}: ThresholdLineChartProps) => {
  const [visibility, setVisibility] = useState<boolean[]>([])
  const empty = !hasNonZeroData(data)
  const chartHeight = height ?? (isTall ? FILL_HEIGHT : DEFAULT_HEIGHT)

  const lineData = useMemo(() => (data ? toThresholdLineChartData(data) : { datasets: [] }), [data])

  const dataWithVisibility = useMemo(
    () => ({
      datasets: lineData.datasets.map((dataset, index) => ({
        ...dataset,
        visible: visibility[index] ?? true,
      })),
    }),
    [lineData.datasets, visibility],
  )

  const legendData = lineData.datasets.map((dataset, index) => ({
    label: dataset.label as string,
    color: dataset.borderColor as string,
    hidden: !(visibility[index] ?? true),
  }))

  const handleToggle = (index: number): void => {
    setVisibility((prev) => {
      const next = lineData.datasets.map((_, i) => prev[i] ?? true)
      next[index] = !next[index]
      return next
    })
  }

  const titleWithUnit = title && unit ? `${title} (${unit})` : title

  const axisFormatter =
    yTicksFormatter ?? ((value: number) => (unit ? `${value} ${unit}` : String(value)))

  return (
    <ChartContainer
      empty={empty}
      title={titleWithUnit}
      className={className}
      emptyMessage={emptyMessage}
      legendData={isLegendVisible ? legendData : undefined}
      onToggleDataset={isLegendVisible ? handleToggle : undefined}
    >
      {!empty && (
        <LineChart
          beginAtZero
          unit={unit ?? ''}
          height={chartHeight}
          data={dataWithVisibility}
          yTicksFormatter={axisFormatter}
        />
      )}
    </ChartContainer>
  )
}
