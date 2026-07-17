import type { UnknownRecord } from '@primitives'
import { Dialog, DialogContent } from '@primitives'

import { MAINTENANCE_CONTAINER } from '../../../../constants/container-constants'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../constants/dialog'
import type { Device } from '../../../../types'
import { getDeviceContainerPosText } from '../../../../utils/container-utils'
import { getMinerShortCode } from '../../../../utils/device-utils'
import { PositionChangeDialogContent } from './position-change-dialog-content'
import './position-change-dialog.scss'
import { useEffect, useState } from 'react'

type PositionChangeDialogProps = {
  open: boolean
  onClose: (currentDialogFlow: string, isDontReset?: boolean) => void
  selectedSocketToReplace?: UnknownRecord
  selectedEditSocket?: UnknownRecord
  onChangePositionClicked?: VoidFunction
  onPositionChangedSuccess?: VoidFunction
  isContainerEmpty?: boolean
  dialogFlow?: string
}

const getDialogTitle = (
  container: string,
  selectedEditSocket: UnknownRecord | undefined,
  shortCode: string,
  currentDialogFlow: string,
) => {
  if (!currentDialogFlow) return null

  if (container === MAINTENANCE_CONTAINER) {
    return `Bring back miner from maintenance mode to socket ${getDeviceContainerPosText(
      selectedEditSocket!,
    )}`
  }

  switch (currentDialogFlow) {
    case POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO:
      return `Change info of miner ${shortCode}`
    case POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE:
      return 'Move miner to maintenance'
    default:
      return 'Change position of miner'
  }
}

/**
 * Modal that moves a miner to a different rack slot, validating the destination first.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const PositionChangeDialog = ({
  open,
  onClose,
  selectedSocketToReplace,
  selectedEditSocket,
  onChangePositionClicked,
  onPositionChangedSuccess,
  isContainerEmpty,
  dialogFlow,
}: PositionChangeDialogProps) => {
  const [currentDialogFlow, setCurrentDialogFlow] = useState<string>(dialogFlow || '')

  const miner = selectedEditSocket?.miner || selectedSocketToReplace?.miner || {}
  const { code, tags } = miner as Device
  const shortCode = getMinerShortCode(code, tags || [])
  const container =
    (selectedSocketToReplace?.containerInfo as UnknownRecord)?.container ||
    (selectedEditSocket?.containerInfo as UnknownRecord)?.container ||
    ''

  useEffect(() => {
    setCurrentDialogFlow(dialogFlow || '')
  }, [dialogFlow])

  useEffect(() => {
    if (selectedSocketToReplace && selectedEditSocket) {
      setCurrentDialogFlow(POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION)
    }
  }, [selectedSocketToReplace, selectedEditSocket])

  const onCancel = (isDontReset?: boolean) => {
    setCurrentDialogFlow('')
    onClose(currentDialogFlow, isDontReset)
  }

  const title = getDialogTitle(
    container as string,
    selectedEditSocket,
    shortCode,
    currentDialogFlow,
  )

  return (
    <>
      {title && (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
          <DialogContent
            title={title}
            onClose={() => onCancel()}
            closable
            className="mdk-position-change-dialog"
          >
            <PositionChangeDialogContent
              setCurrentDialogFlow={setCurrentDialogFlow}
              currentDialogFlow={currentDialogFlow}
              selectedSocketToReplace={selectedSocketToReplace}
              selectedEditSocket={selectedEditSocket}
              onChangePositionClicked={onChangePositionClicked}
              onPositionChangedSuccess={onPositionChangedSuccess}
              onCancel={onCancel}
              isContainerEmpty={isContainerEmpty}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
