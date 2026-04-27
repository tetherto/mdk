import type { CSSProperties, ReactNode } from 'react'
import { onLogClicked } from '../../../../utils/alerts-utils'
import { ALERT_COLOR_MAP, ALERT_ICON_MAP } from './alarm-row-constants'
import './alarm-row.scss'

export type AlarmItemData = {
  title: string
  subtitle: string
  body: string
  uuid?: string
  status: string
  [key: string]: unknown
}

export type TimelineItemData = {
  item: AlarmItemData
  dot: ReactNode
  children: ReactNode
}

type AlarmRowProps = {
  data: TimelineItemData
  onNavigate: (path: string) => void
}

export const AlarmRow = ({ data, onNavigate }: AlarmRowProps) => {
  const { title, subtitle, body, uuid, status } = data.item

  const color = ALERT_COLOR_MAP[status]

  const handleClick = () => {
    onLogClicked(onNavigate, uuid)
  }

  return (
    <div className="mdk-alarm-row" style={{ '--mdk-alarm-color': color } as CSSProperties}>
      <div className="mdk-alarm-row__container" onClick={handleClick}>
        <div className="mdk-alarm-row__title-row">
          {ALERT_ICON_MAP[status]}
          <div className="mdk-alarm-row__title">{title}</div>
        </div>
        <div className="mdk-alarm-row__subtitle">{subtitle}</div>
        <div className="mdk-alarm-row__body">
          {body.split('|').map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
