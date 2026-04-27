import type { UnknownRecord } from '@mdk/core'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../../../../../constants/dialog'
import { AddReplaceMinerDialogContent } from '../add-replace-miner-dialog/add-replace-miner-dialog-content'
import { ConfirmChangePositionDialogContent } from './confirm-change-position-dialog/confirm-change-position-dialog-content'
import { ContainerSelectionDialogContent } from './container-selection-dialog-content/container-selection-dialog-content'
import { DefaultPositionChangeDialogContent } from './default-position-change-dialog-content/default-position-change-dialog-content'
import { MaintenanceDialogContent } from './maintenance-dialog-content/maintenance-dialog-content'
import { RemoveMinerDialogContent } from './remove-miner-dialog/remove-miner-dialog-content'

type PositionChangeDialogContentProps = {
  currentDialogFlow: string
  setCurrentDialogFlow: (flow: string) => void
  selectedSocketToReplace: UnknownRecord
  selectedEditSocket: UnknownRecord
  onChangePositionClicked: VoidFunction
  onPositionChangedSuccess: VoidFunction
  onCancel: VoidFunction
  isContainerEmpty: boolean
}

export const PositionChangeDialogContent = ({
  currentDialogFlow,
  setCurrentDialogFlow,
  selectedSocketToReplace,
  selectedEditSocket,
  onChangePositionClicked,
  onCancel,
  isContainerEmpty = false,
  onPositionChangedSuccess,
}: Partial<PositionChangeDialogContentProps>) => {
  const handleCancel = () => onCancel?.()

  switch (currentDialogFlow) {
    case POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION:
      return (
        <ConfirmChangePositionDialogContent
          selectedSocketToReplace={selectedSocketToReplace}
          selectedEditSocket={selectedEditSocket}
          onCancel={handleCancel}
          isContainerEmpty={isContainerEmpty}
          onSave={() => onPositionChangedSuccess?.()}
        />
      )

    case POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION:
      return (
        <ContainerSelectionDialogContent
          selectedSocketToReplace={selectedSocketToReplace}
          onCancel={onCancel!}
        />
      )

    case POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER:
    case POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO:
      return (
        <AddReplaceMinerDialogContent
          selectedEditSocket={selectedEditSocket}
          onCancel={handleCancel}
          currentDialogFlow={currentDialogFlow}
        />
      )

    case POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_REMOVE:
      return (
        <RemoveMinerDialogContent selectedEditSocket={selectedEditSocket} onCancel={handleCancel} />
      )

    case POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE:
      return (
        <MaintenanceDialogContent selectedEditSocket={selectedEditSocket} onCancel={handleCancel} />
      )

    default:
      return (
        <DefaultPositionChangeDialogContent
          onChangePositionClicked={onChangePositionClicked}
          setCurrentDialogFlow={(flow) => setCurrentDialogFlow?.(flow)}
        />
      )
  }
}
