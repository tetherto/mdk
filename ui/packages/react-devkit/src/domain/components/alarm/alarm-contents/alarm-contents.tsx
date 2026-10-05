import { EmptyState } from '@primitives'
import type { ReactNode } from 'react'
import type { TimelineItemData } from '../alarm-row/alarm-row'
import { AlarmRow } from '../alarm-row/alarm-row'
import './alarm-contents.scss'

type AlarmContentsProps = {
  /** Alert entries to render. Falls back to `EmptyState` when empty or falsy. */
  alarmsData: TimelineItemData[] | unknown
  /** Navigation callback forwarded to each `AlarmRow` for click-through routing */
  onNavigate: (path: string) => void
}

/**
 * Body region of an alarm card listing the alert details and recommended next actions.
 *
 * @category feedback
 * @domain mining-operations
 * @kernelCapability incident-alerts
 * @tier agent-ready
 */
export const AlarmContents = ({ alarmsData, onNavigate }: AlarmContentsProps) => {
  if (!alarmsData || (Array.isArray(alarmsData) && alarmsData.length === 0)) {
    return <EmptyState description="No active alarm or event" size="sm" />
  }

  if (Array.isArray(alarmsData)) {
    return (
      <div className="mdk-alarm-contents">
        <div className="mdk-alarm-contents__list">
          {(alarmsData as TimelineItemData[]).map((alarm, idx) => (
            <AlarmRow key={idx} data={alarm} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    )
  }

  return <div className="mdk-alarm-contents__fallback">{alarmsData as ReactNode}</div>
}
