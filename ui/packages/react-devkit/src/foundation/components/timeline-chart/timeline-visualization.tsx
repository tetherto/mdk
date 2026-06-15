import { memo, useMemo } from 'react'
import { format } from 'date-fns/format'
import { subWeeks } from 'date-fns/subWeeks'
import type { AxisTitleText, ChartRange, TimelineChartData } from './timeline-chart.types'
import { TimelineRow } from './timeline-row'

export type TimelineVisualizationProps = {
  chartData: TimelineChartData
  range?: ChartRange
  axisTitleText: AxisTitleText
}

export const TimelineVisualization = memo(
  ({ chartData, range, axisTitleText }: TimelineVisualizationProps) => {
    const { minTs, maxTs, timeLabels } = useMemo(() => {
      let min: number
      let max: number

      if (range) {
        min = typeof range.min === 'number' ? range.min : range.min.getTime()
        max = typeof range.max === 'number' ? range.max : range.max.getTime()
      } else {
        min = Infinity
        max = -Infinity

        for (const dataset of chartData.datasets) {
          for (const point of dataset.data) {
            if (point.x[0] < min) min = point.x[0]
            if (point.x[1] > max) max = point.x[1]
          }
        }

        if (!Number.isFinite(min)) {
          const now = new Date()
          min = subWeeks(now, 1).getTime()
          max = now.getTime() + 60 * 1000
        }
      }

      const labels: string[] = []
      if (max > min) {
        const steps = 6
        const stepSize = (max - min) / steps
        for (let i = 0; i <= steps; i++) {
          const ts = min + stepSize * i
          labels.push(format(new Date(ts), 'dd-MM HH:mm'))
        }
      }

      return { minTs: min, maxTs: max, timeLabels: labels }
    }, [chartData, range])

    if (chartData.labels.length === 0) {
      return null
    }

    return (
      <div className="mdk-timeline-chart__visualization">
        {axisTitleText.y && (
          <div className="mdk-timeline-chart__y-axis-title">{axisTitleText.y}</div>
        )}
        <div className="mdk-timeline-chart__content">
          <div className="mdk-timeline-chart__rows">
            {chartData.labels.map((label) => (
              <TimelineRow
                key={label}
                rowLabel={label}
                datasets={chartData.datasets}
                minTs={minTs}
                maxTs={maxTs}
              />
            ))}
          </div>
          <div className="mdk-timeline-chart__time-axis">
            <div className="mdk-timeline-chart__time-axis-labels">
              {timeLabels.map((label, index) => (
                <span key={index} className="mdk-timeline-chart__time-label">
                  {label}
                </span>
              ))}
            </div>
            {axisTitleText.x && (
              <div className="mdk-timeline-chart__x-axis-title">{axisTitleText.x}</div>
            )}
          </div>
        </div>
      </div>
    )
  },
)

TimelineVisualization.displayName = 'TimelineVisualization'
