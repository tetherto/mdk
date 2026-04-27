import { memo, useMemo } from 'react'
import type { TimelineChartDataset } from './timeline-chart.types'
import { TimelineBar } from './timeline-bar'

export type TimelineRowProps = {
  rowLabel: string
  datasets: TimelineChartDataset[]
  minTs: number
  maxTs: number
}

export const TimelineRow = memo(({ rowLabel, datasets, minTs, maxTs }: TimelineRowProps) => {
  const bars = useMemo(() => {
    const result: Array<{
      fromTs: number
      toTs: number
      color: string
      label: string
    }> = []

    for (const dataset of datasets) {
      for (let i = 0; i < dataset.data.length; i++) {
        const point = dataset.data[i]
        if (point && point.y === rowLabel) {
          const color =
            dataset.color ||
            dataset.backgroundColor?.[i] ||
            dataset.borderColor?.[i] ||
            'var(--mdk-color-primary)'
          result.push({
            fromTs: point.x[0],
            toTs: point.x[1],
            color,
            label: dataset.label,
          })
        }
      }
    }

    return result.sort((a, b) => a.fromTs - b.fromTs)
  }, [datasets, rowLabel])

  return (
    <div className="mdk-timeline-chart__row">
      <div className="mdk-timeline-chart__row-label" title={rowLabel}>
        {rowLabel}
      </div>
      <div className="mdk-timeline-chart__row-track">
        {bars.map((bar, index) => (
          <TimelineBar
            key={`${bar.fromTs}-${bar.toTs}-${index}`}
            fromTs={bar.fromTs}
            toTs={bar.toTs}
            minTs={minTs}
            maxTs={maxTs}
            color={bar.color}
            label={bar.label}
            rowLabel={rowLabel}
          />
        ))}
      </div>
    </div>
  )
})

TimelineRow.displayName = 'TimelineRow'
