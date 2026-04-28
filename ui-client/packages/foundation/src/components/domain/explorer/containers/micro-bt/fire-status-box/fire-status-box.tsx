import { Indicator } from '@tetherto/core'
import type { ReactElement } from 'react'
import './fire-status-box.scss'

type FireStatusBoxProps = {
  /** Device data */
  data?: {
    smokeDetector: string | number
    waterIngressDetector: string | number
    coolingFanStatus: string | number
  }
}

/**
 * Fire Status Box Component
 *x
 * Displays fire safety and environmental monitoring status.
 *
 * @example
 * ```tsx
 * <FireStatusBox data={deviceData} />
 * ```
 */
export const FireStatusBox = ({ data }: FireStatusBoxProps): ReactElement => {
  const smokeDetector = Boolean(data?.smokeDetector)
  const waterIngressDetector = Boolean(data?.waterIngressDetector)
  const coolingFanStatus = Boolean(data?.coolingFanStatus)

  return (
    <div className="mdk-fire-status-box">
      <div className="mdk-fire-status-box__item">
        <span className="mdk-fire-status-box__label">Smoke Detector 1</span>
        <Indicator color={smokeDetector ? 'red' : 'green'} size="sm">
          {smokeDetector ? 'Detected' : 'Normal'}
        </Indicator>
      </div>

      <div className="mdk-fire-status-box__item">
        <span className="mdk-fire-status-box__label">Water Ingress Detector</span>
        <Indicator color={waterIngressDetector ? 'red' : 'green'} size="sm">
          {waterIngressDetector ? 'Detected' : 'Normal'}
        </Indicator>
      </div>

      <div className="mdk-fire-status-box__item">
        <span className="mdk-fire-status-box__label">Fan Status</span>
        <Indicator color={coolingFanStatus ? 'green' : 'gray'} size="sm">
          {coolingFanStatus ? 'Running' : 'Off'}
        </Indicator>
      </div>
    </div>
  )
}
