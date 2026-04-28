import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { Button, DialogFooter, Spinner } from '@tetherto/mdk-core-ui'

import type { Device } from '../../../../../../types'
import { getContainerName } from '../../../../../../utils/container-utils'
import { getMinerShortCode } from '../../../../../../utils/device-utils'
import './container-selection-dialog-content.scss'

type ContainerSelectionDialogContentProps = {
  selectedSocketToReplace?: UnknownRecord
  isContainersLoading?: boolean
  containers?: Device[]
  onCancel: (value?: boolean) => void
}

export const ContainerSelectionDialogContent = ({
  onCancel,
  selectedSocketToReplace,
  containers = [],
  isContainersLoading = false,
}: ContainerSelectionDialogContentProps) => {
  const miner = selectedSocketToReplace?.miner as UnknownRecord | undefined

  return (
    <div className="mdk-container-selection">
      {isContainersLoading && <Spinner />}
      <div className="mdk-container-selection__header-info">
        <div className="mdk-container-selection__meta-item">
          <span className="mdk-container-selection__label">Code:</span>
          {getMinerShortCode((miner?.code as string) ?? '', (miner?.tags as string[]) ?? [])}
        </div>
        <div className="mdk-container-selection__meta-item">
          <span className="mdk-container-selection__label">SN:</span>
          {((miner?.info as UnknownRecord)?.serialNum as string) ?? 'N/A'}
        </div>
        <div className="mdk-container-selection__meta-item">
          <span className="mdk-container-selection__label">MAC:</span>
          {((miner?.info as UnknownRecord)?.macAddress as string)?.toLocaleUpperCase() ?? 'N/A'}
        </div>
      </div>

      {/* Container Selection List */}
      <div className="mdk-container-selection__list">
        {containers.map((container) => {
          const containerName = container?.info?.container

          return (
            <Button
              key={container.id}
              variant="link"
              className="mdk-container-selection__card"
              onClick={() => onCancel(true)}
            >
              <span className="mdk-container-selection__card-text">
                {getContainerName(containerName)}
              </span>
            </Button>
          )
        })}
      </div>

      <DialogFooter className="mdk-container-selection__footer">
        <Button onClick={() => onCancel()}>Cancel</Button>
      </DialogFooter>
    </div>
  )
}
