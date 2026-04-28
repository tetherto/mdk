import { Indicator } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import { DEVICE_STATUS } from '../../../../../../../../constants/devices'
import './pump-box.scss'

export type PumpItem = {
  enabled?: boolean
  index: number
}

type PumpsProps = {
  pumpTitle: string
  pumpItem?: PumpItem
}

export const PumpBox = ({ pumpItem, pumpTitle }: PumpsProps): ReactElement | null => {
  if (!pumpItem || typeof pumpItem.enabled !== 'boolean') {
    return null
  }

  const isRunning = pumpItem.enabled
  const pumpNumber = pumpItem.index + 1

  return (
    <div className="mdk-pump-box">
      <div className="mdk-pump-box__status">
        <span className="mdk-pump-box__title">
          {pumpTitle} Pump {pumpNumber}
        </span>
        <Indicator color={isRunning ? 'green' : 'gray'} size="md">
          {isRunning ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
        </Indicator>
      </div>
    </div>
  )
}
