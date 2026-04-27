import type { Device } from '../../../../types'
import { getContainerSpecificStats } from '../../../../utils/device-utils'
import { ContentBox } from '../content-box/content-box'
import './system-status-control-box.scss'

export const SystemStatusControlBox = ({ data }: { data: Device }) => {
  const containerSpecific = getContainerSpecificStats(data)
  const serverOn = containerSpecific?.server_on as boolean | undefined
  const disconnect = containerSpecific?.disconnect as boolean | undefined

  return (
    <ContentBox title="System Status" className="mdk-system-status-control-box">
      {serverOn && (
        <span className="mdk-system-status-control-box__started-option">Allow Server Start</span>
      )}
      {disconnect ? (
        <span className="mdk-system-status-control-box__current-status">Disconnected</span>
      ) : (
        <span className="mdk-system-status-control-box__started-option">Connected</span>
      )}
    </ContentBox>
  )
}
