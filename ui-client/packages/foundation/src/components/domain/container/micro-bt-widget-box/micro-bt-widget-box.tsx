import { Indicator } from '@mdk/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../../types/device'
import { DEVICE_STATUS } from '../../../../constants/devices'
import { getContainerSpecificStats } from '../../../../utils/device-utils'
import { CONTAINER_STATUS } from '../../../../utils/status-utils'
import './micro-bt-widget-box.scss'

export type MicroBTWidgetBoxProps = {
  data?: Device
}

type MicroBTCdu = {
  circulation_pump_running_status?: string
  cooling_fan_control?: boolean
}

export const MicroBTWidgetBox = ({ data }: MicroBTWidgetBoxProps): ReactElement | null => {
  if (!data) {
    return null
  }

  const { cdu } = getContainerSpecificStats(data) as { cdu?: MicroBTCdu }

  const cyclePumpRunning = cdu?.circulation_pump_running_status === CONTAINER_STATUS.RUNNING
  const coolingFanRunning = Boolean(cdu?.cooling_fan_control)

  return (
    <div className="mdk-micro-bt-widget-box">
      <div className="mdk-micro-bt-widget-box__item">
        <span className="mdk-micro-bt-widget-box__title">Cicle Pump</span>
        <Indicator color={cyclePumpRunning ? 'green' : 'gray'} size="md">
          {cyclePumpRunning ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
        </Indicator>
      </div>
      <div className="mdk-micro-bt-widget-box__item">
        <span className="mdk-micro-bt-widget-box__title">Cooling Fan</span>
        <Indicator color={coolingFanRunning ? 'green' : 'red'} size="md">
          {coolingFanRunning ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.ERROR}
        </Indicator>
      </div>
    </div>
  )
}
