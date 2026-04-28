import type { UnknownRecord } from '@tetherto/core'
import { Dialog, DialogContent } from '@tetherto/core'
import { AddReplaceMinerDialogContent } from './add-replace-miner-dialog-content'
import { getTitle } from './helper'

type AddReplaceMinerDialogProps = {
  open: boolean
  onClose: VoidFunction
  selectedSocketToReplace?: UnknownRecord
  selectedEditSocket?: UnknownRecord
  currentDialogFlow?: string
  isDirectToMaintenanceMode?: boolean
  minersType?: string
  isContainerEmpty?: boolean
}

export const AddReplaceMinerDialog = ({
  open,
  onClose,
  selectedSocketToReplace,
  selectedEditSocket,
  currentDialogFlow,
  isDirectToMaintenanceMode = false,
  minersType,
}: AddReplaceMinerDialogProps) => {
  const title = getTitle({
    selectedSocketToReplace,
    selectedEditSocket,
    currentDialogFlow,
    isDirectToMaintenanceMode,
  })

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent title={title} onClose={onClose} closable>
        <AddReplaceMinerDialogContent
          onCancel={onClose}
          selectedEditSocket={selectedEditSocket}
          currentDialogFlow={currentDialogFlow}
          isDirectToMaintenanceMode={isDirectToMaintenanceMode}
          minersType={minersType}
        />
      </DialogContent>
    </Dialog>
  )
}
