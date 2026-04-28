import { Button, DialogFooter } from '@tetherto/core'
import { useDispatch } from 'react-redux'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../../constants/actions'
import { MAINTENANCE_CONTAINER } from '../../../../../../constants/container-constants'
import { actionsSlice } from '../../../../../../state'
import type { Device } from '../../../../../../types'
import { getDeviceContainerPosText } from '../../../../../../utils/container-utils'
import { getMinerShortCode } from '../../../../../../utils/device-utils'
import { notifyInfo } from '../../../../../../utils/notification-utils'
import { getPosHistory } from '../position-change-dialog-utils'
import './maintenance-dialog-content.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

type SelectedEditSocket = {
  miner: Device
  containerInfo: {
    container?: string
  }
}

type MaintenanceDialogContentProps = {
  selectedEditSocket: Partial<SelectedEditSocket>
  onCancel: VoidFunction
}

export const MaintenanceDialogContent = ({
  selectedEditSocket,
  onCancel,
}: Partial<MaintenanceDialogContentProps>) => {
  const dispatch = useDispatch()

  const onMaintainMiner = () => {
    // Dispatch remains the same as it's the core business logic
    dispatch(
      setAddPendingSubmissionAction({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.UPDATE_THING,
        params: [
          {
            rackId: selectedEditSocket?.miner?.rack,
            id: selectedEditSocket?.miner?.id,
            code: selectedEditSocket?.miner?.code,
            info: {
              ...selectedEditSocket?.miner?.info,
              container: MAINTENANCE_CONTAINER,
              pos: '',
              subnet: '',
              posHistory: getPosHistory(selectedEditSocket!),
            },
          },
        ],
        minerId: selectedEditSocket?.miner?.id,
      }),
    )

    notifyInfo(
      'Action added',
      `Add miner to maintenance ${getDeviceContainerPosText(selectedEditSocket!)}`,
    )

    onCancel?.()
  }

  const shortCode = getMinerShortCode(
    selectedEditSocket?.miner?.code as string | undefined,
    (selectedEditSocket?.miner?.tags as string[] | undefined) ?? [],
  )

  const nameAndPosition = getDeviceContainerPosText({
    containerInfo: selectedEditSocket?.containerInfo,
    pos: selectedEditSocket?.miner?.info?.pos,
  })

  return (
    <div className="mdk-maintenance-confirm">
      <div className="mdk-maintenance-confirm__warning">
        Are you sure to send miner{' '}
        <span className="mdk-maintenance-confirm__highlight">{shortCode}</span> from{' '}
        {nameAndPosition} to maintenance?
      </div>

      <DialogFooter className="mdk-maintenance-confirm__footer">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onMaintainMiner}>
          Add to Maintenance
        </Button>
      </DialogFooter>
    </div>
  )
}
