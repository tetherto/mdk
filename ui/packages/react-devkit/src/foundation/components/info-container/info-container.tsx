import type { ReactNode } from 'react'
import './info-container.scss'

/** A single labeled info row for {@link InfoContainer} or {@link DeviceInfo}. */
export type InfoItem = {
  /** Row label. */
  title?: string
  /** Row value, may be an array for multi-line values. */
  value?: string | string[] | number
}

/**
 * Labeled key/value container. Renders a title and one or more values stacked
 * below it. Use {@link DeviceInfo} to render a list of these.
 *
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <InfoContainer title="Worker" value="rig01" />
 * ```
 */
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

/**
 * Renders a list of {@link InfoContainer} rows from a single `data` array.
 *
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
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
