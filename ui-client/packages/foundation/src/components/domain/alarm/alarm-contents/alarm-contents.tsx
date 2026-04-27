import { EmptyState } from '@mdk/core'
import type { ReactNode } from 'react'
import type { TimelineItemData } from '../alarm-row/alarm-row'
import { AlarmRow } from '../alarm-row/alarm-row'
import './alarm-contents.scss'

type AlarmContentsProps = {
  alarmsData: TimelineItemData[] | unknown
  onNavigate: (path: string) => void
}

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
