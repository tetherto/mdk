import type { CSSProperties, JSX } from 'react'
import type React from 'react'

export type DeviceCardColTextProps = {
  /**
   * Extra classes on the cell — use `mdk-device-card-col-text--warning` or
   * `--danger` for a tone rather than setting a colour inline.
   */
  className?: string
  style?: CSSProperties
  children: React.ReactNode
}

export const DeviceCardColText = ({
  className,
  style,
  children,
}: DeviceCardColTextProps): JSX.Element => {
  return (
    <div
      style={style}
      className={`mdk-device-card-col-text${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  )
}
