import { memo, useEffect, useState } from 'react'
import { ChartContainer, Loader } from '@core'
import type { AxisTitleText, TimelineChartData, TimelineChartProps } from './timeline-chart.types'
import { TimelineLegend } from './timeline-legend'
import { TimelineVisualization } from './timeline-visualization'

import './timeline-chart.scss'

const DEFAULT_AXIS_TITLES: AxisTitleText = { x: 'Time', y: '' }

export const emptyTimelineChartData: TimelineChartData = { labels: [], datasets: [] }

/**
 * Discrete-event timeline chart (e.g. miner state over time) with a category
 * legend. Supports streaming updates via `newData`.
 *
 * @category charts
 * @orkCapability device-telemetry
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <TimelineChart
 *   initialData={initialData}
 *   newData={liveTail}
 *   range={{ start, end }}
 *   title="Miner state"
 *   height={240}
 * />
 * ```
 * @tier agent-ready
 */
export const TimelineChart = memo(
  ({
    initialData,
    newData,
    skipUpdates = false,
    range,
    axisTitleText = DEFAULT_AXIS_TITLES,
    isLoading = false,
    title,
    height,
  }: TimelineChartProps) => {
    const [chartData, setChartData] = useState<TimelineChartData>(initialData)

    useEffect(() => {
      setChartData(initialData)
    }, [initialData])

    useEffect(() => {
      if (skipUpdates || !newData) return

      setChartData((prevData) => {
        const mergedLabels = new Set([...prevData.labels, ...newData.labels])
        return {
          labels: Array.from(mergedLabels),
          datasets: [...prevData.datasets, ...newData.datasets],
        }
      })
    }, [newData, skipUpdates])

    const isEmpty = !isLoading && chartData.labels.length === 0

    return (
      <div className="mdk-timeline-chart" style={height ? { height } : undefined}>
        <ChartContainer
          title={title}
          loading={isLoading}
          empty={isEmpty}
          emptyMessage="No timeline data available"
        >
          {isLoading ? (
            <div className="mdk-timeline-chart__loading">
              <Loader />
            </div>
          ) : (
            <>
              <TimelineLegend datasets={chartData.datasets} />
              <TimelineVisualization
                chartData={chartData}
                range={range}
                axisTitleText={axisTitleText}
              />
            </>
          )}
        </ChartContainer>
      </div>
    )
  },
)

TimelineChart.displayName = 'TimelineChart'
