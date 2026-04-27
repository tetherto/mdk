import { useSelector } from 'react-redux'
import { selectSelectedContainers } from '../../../../../state'
import type { Device } from '../../../../../types'
import { getDeviceModel } from '../../../../../utils/power-mode-utils'
import type { TimelineItemData } from '../../../alarm/alarm-row/alarm-row'
import { ContainerControlsBox } from '../../../container'
import { ContentBox } from '../../../container/content-box/content-box'
import './batch-container-controls-card.scss'

type BatchContainerControlsCardProps = {
  isBatch: boolean
  isCompact: boolean
  connectedMiners: unknown
  alarmsDataItems: TimelineItemData[]
  onNavigate: (path: string) => void
}

export const BatchContainerControlsCard = ({
  isBatch = true,
  isCompact,
  connectedMiners,
  alarmsDataItems,
  onNavigate,
}: Partial<BatchContainerControlsCardProps>) => {
  const selectedContainers = useSelector(selectSelectedContainers)
  const selectedDevices = Object.values(selectedContainers) as Device[]

  const areAllSameModels = (): boolean => {
    if (selectedDevices.length <= 1) return true
    const firstDeviceModel = getDeviceModel(selectedDevices[0])
    return selectedDevices
      .slice(1)
      .every((device: Device) => getDeviceModel(device) === firstDeviceModel)
  }

  const type = areAllSameModels() ? selectedDevices[0]?.type : undefined

  let controlsBoxData: Record<string, unknown> = { type }

  if (selectedDevices.length === 1) {
    controlsBoxData = {
      ...controlsBoxData,
      ...selectedDevices[0],
      connectedMiners,
    }
  }

  return (
    <div className="mdk-batch-container-controls-card">
      <ContentBox title={isBatch ? 'Batch Container Controls' : 'Container Controls'}>
        <div className="mdk-batch-container-controls-card__controls">
          <ContainerControlsBox
            data={controlsBoxData as Device}
            isBatch={isBatch}
            isCompact={isCompact}
            alarmsDataItems={alarmsDataItems}
            onNavigate={onNavigate || (() => {})}
          />
        </div>
      </ContentBox>
    </div>
  )
}
