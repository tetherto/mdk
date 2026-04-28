import { Indicator } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import type { ContainerSnap, Device } from '../../../../../../types/device'
import { getDeviceData } from '../../../../../../utils/device-utils'
import './bitmain-immersion-system-status.scss'

type BitMainImmersionSystemStatusProps = {
  /** Device data */
  data?: Device
}

/**
 * BitMain Immersion System Status Component
 *
 * Displays system status information including:
 * - Server start permission
 * - Connection status
 *
 * @example
 * ```tsx
 * <BitMainImmersionSystemStatus data={deviceData} />
 * ```
 */
export const BitMainImmersionSystemStatus = ({
  data,
}: BitMainImmersionSystemStatusProps): ReactElement => {
  const [, deviceData] = getDeviceData(data)
  const snap = deviceData?.snap as ContainerSnap
  const containerSpecific = snap?.stats?.container_specific

  const serverOn = Boolean(containerSpecific?.server_on)
  const disconnect = Boolean(containerSpecific?.disconnect)

  return (
    <div className="mdk-bitmain-immersion-system-status">
      <div className="mdk-bitmain-immersion-system-status__header">
        <h3 className="mdk-bitmain-immersion-system-status__title">System Status</h3>
      </div>

      <div className="mdk-bitmain-immersion-system-status__content">
        {serverOn && (
          <div className="mdk-bitmain-immersion-system-status__item">
            <span className="mdk-bitmain-immersion-system-status__label">Server Start</span>
            <Indicator color="green" size="sm">
              Allowed
            </Indicator>
          </div>
        )}

        <div className="mdk-bitmain-immersion-system-status__item">
          <span className="mdk-bitmain-immersion-system-status__label">Connection</span>
          <Indicator color={disconnect ? 'red' : 'green'} size="sm">
            {disconnect ? 'Disconnected' : 'Connected'}
          </Indicator>
        </div>
      </div>
    </div>
  )
}
