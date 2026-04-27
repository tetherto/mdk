import { memo, useMemo } from 'react'
import type { TimelineChartDataset } from './timeline-chart.types'

export type TimelineLegendProps = {
  datasets: TimelineChartDataset[]
}

export const TimelineLegend = memo(({ datasets }: TimelineLegendProps) => {
  const uniqueLabels = useMemo(() => {
    const labelsMap = new Map<string, string>()
    for (const dataset of datasets) {
      if (!labelsMap.has(dataset.label)) {
        const color =
          dataset.color ||
          dataset.backgroundColor?.[0] ||
          dataset.borderColor?.[0] ||
          'var(--mdk-color-primary)'
        labelsMap.set(dataset.label, color)
      }
    }
    return Array.from(labelsMap.entries())
  }, [datasets])

  if (uniqueLabels.length === 0) return null

  return (
    <div className="mdk-timeline-chart__legend">
      {uniqueLabels.map(([label, color]) => (
        <div key={label} className="mdk-timeline-chart__legend-item">
          <span className="mdk-timeline-chart__legend-color" style={{ backgroundColor: color }} />
          <span className="mdk-timeline-chart__legend-label">{label}</span>
        </div>
      ))}
    </div>
  )
})

TimelineLegend.displayName = 'TimelineLegend'
