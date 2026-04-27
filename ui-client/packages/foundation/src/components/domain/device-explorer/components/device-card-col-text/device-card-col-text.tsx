import type { CSSProperties } from 'react'
import type React from 'react'

export type DeviceCardColTextProps = {
  style?: CSSProperties
  children: React.ReactNode
}

export const DeviceCardColText = ({ style, children }: DeviceCardColTextProps): JSX.Element => {
  return (
    <div style={style} className="mdk-device-card-col-text">
      {children}
    </div>
  )
}
