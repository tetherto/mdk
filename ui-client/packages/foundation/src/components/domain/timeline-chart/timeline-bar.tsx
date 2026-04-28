import { memo } from 'react'
import { format } from 'date-fns/format'
import { SimpleTooltip } from '@tetherto/core'

export type TimelineBarProps = {
  fromTs: number
  toTs: number
  minTs: number
  maxTs: number
  color: string
  label: string
  rowLabel: string
}

export const TimelineBar = memo(
  ({ fromTs, toTs, minTs, maxTs, color, label, rowLabel }: TimelineBarProps) => {
    const range = maxTs - minTs
    if (range <= 0) return null

    const leftPercent = ((fromTs - minTs) / range) * 100
    const widthPercent = Math.max(((toTs - fromTs) / range) * 100, 0.5)

    const formatTime = (ts: number) => format(new Date(ts), 'dd-MM HH:mm')

    const tooltipContent = (
      <div className="mdk-timeline-chart__tooltip">
        <div className="mdk-timeline-chart__tooltip-title">{label}</div>
        <div className="mdk-timeline-chart__tooltip-row">
          <span className="mdk-timeline-chart__tooltip-label">Row:</span>
          <span className="mdk-timeline-chart__tooltip-value">{rowLabel}</span>
        </div>
        <div className="mdk-timeline-chart__tooltip-row">
          <span className="mdk-timeline-chart__tooltip-label">From:</span>
          <span className="mdk-timeline-chart__tooltip-value">{formatTime(fromTs)}</span>
        </div>
        <div className="mdk-timeline-chart__tooltip-row">
          <span className="mdk-timeline-chart__tooltip-label">To:</span>
          <span className="mdk-timeline-chart__tooltip-value">{formatTime(toTs)}</span>
        </div>
      </div>
    )

    return (
      <SimpleTooltip content={tooltipContent} side="top">
        <div
          className="mdk-timeline-chart__bar"
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            backgroundColor: color,
          }}
        />
      </SimpleTooltip>
    )
  },
)

TimelineBar.displayName = 'TimelineBar'
