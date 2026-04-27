import { Button, DialogFooter } from '@mdk/core'
import { useDispatch } from 'react-redux'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../../../constants/actions'
import { actionsSlice } from '../../../../../../state'
import type { Device } from '../../../../../../types'
import { getDeviceContainerPosText } from '../../../../../../utils/container-utils'
import { notifyInfo } from '../../../../../../utils/notification-utils'

import '../maintenance-dialog-content/maintenance-dialog-content.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

type SelectedEditSocket = {
  miner: Device
  containerInfo?: {
    container?: string
  }
  pos: string
  pdu: string
  socket: string
}

type RemoveMinerDialogContentProps = {
  selectedEditSocket?: Partial<SelectedEditSocket>
  onCancel: VoidFunction
}

export const RemoveMinerDialogContent = ({
  selectedEditSocket,
  onCancel,
}: RemoveMinerDialogContentProps) => {
  const dispatch = useDispatch()

  const onRemoveMiner = () => {
    dispatch(
      setAddPendingSubmissionAction({
        type: SUBMIT_ACTION_TYPES.VOTING,
        action: ACTION_TYPES.FORGET_THINGS,
        params: [
          {
            rackId: selectedEditSocket?.miner?.rack,
            query: { id: selectedEditSocket?.miner?.id },
          },
        ],
        container: selectedEditSocket?.containerInfo?.container,
        pos: selectedEditSocket?.pos || `${selectedEditSocket?.pdu}_${selectedEditSocket?.socket}`,
        minerId: selectedEditSocket?.miner?.id,
      }),
    )

    notifyInfo(
      'Action added',
      `Remove miner ${selectedEditSocket?.miner?.id} from ${getDeviceContainerPosText(
        selectedEditSocket!,
      )}`,
    )

    onCancel()
  }

  return (
    <div className="mdk-remove-miner">
      <div className="mdk-remove-miner__warning">
        Are you sure to permanently remove miner
        <span className="mdk-remove-miner__id"> {selectedEditSocket?.miner?.id}</span>?
      </div>

      <DialogFooter className="mdk-remove-miner__footer">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onRemoveMiner}>
          Remove Miner
        </Button>
      </DialogFooter>
    </div>
  )
}
