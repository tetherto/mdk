import type { UnknownRecord } from '@primitives'
import { Dialog, DialogContent } from '@primitives'
import { AddReplaceMinerDialogContent } from './add-replace-miner-dialog-content'
import { getTitle } from './helper'

type AddReplaceMinerDialogProps = {
  /** Controls dialog visibility */
  open: boolean
  /** Called when the dialog should close */
  onClose: VoidFunction
  /** Socket being replaced */
  selectedSocketToReplace?: UnknownRecord
  /** Socket being edited */
  selectedEditSocket?: UnknownRecord
  /** Active flow identifier */
  currentDialogFlow?: string
  /**
   * Skip add/replace and go directly to maintenance
   * @default false
   */
  isDirectToMaintenanceMode?: boolean
  /** Miner hardware type filter */
  minersType?: string
}

/**
 * Modal for adding a new miner to a slot or swapping the existing one with a replacement unit.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
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
