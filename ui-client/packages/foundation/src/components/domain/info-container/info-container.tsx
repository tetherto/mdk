import type { ReactNode } from 'react'
import './info-container.scss'

export type InfoItem = {
  title?: string
  value?: string | string[] | number
}

export const InfoContainer = ({ title, value }: InfoItem): ReactNode => {
  const items: (string | number | undefined)[] = Array.isArray(value) ? value : [value]

  return (
    <div className="mdk-info-container">
      <span className="mdk-info-container__title">{title}</span>
      <div className="mdk-info-container__value">
        {items.map((item, index) => (
          <div key={index}>{item}</div>
        ))}
      </div>
    </div>
  )
}

type DeviceInfoProps = {
  data: InfoItem[]
}

const normalizeValue = (
  value: string | string[] | number | undefined,
): string | string[] | undefined => {
  if (value === undefined || value === null) return
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(String)

  return String(value)
}

export const DeviceInfo = ({ data }: Partial<DeviceInfoProps>): ReactNode => (
  <div className="mdk-device-info">
    {data?.map((item, index) => (
      <InfoContainer
        key={`${item.title}-${index}`}
        title={item.title !== undefined ? String(item.title) : undefined}
        value={normalizeValue(item.value)}
      />
    ))}
  </div>
)
