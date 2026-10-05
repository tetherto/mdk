import { Dialog, DialogContent } from '@primitives'
import type { Device } from '../../../../../types'
import { RemoveMinerDialogContent } from './remove-miner-dialog-content'

type RemoveMinerDialogProps = {
  /**
   * The miner being removed
   * @default {}
   */
  headDevice?: Device
  /** Controls whether the dialog is open; `false` renders nothing */
  isRemoveMinerFlow: boolean
  /** Called when the action is cancelled */
  onCancel: VoidFunction
}

/**
 * Confirmation modal for removing a miner from a slot. Renders nothing when `isRemoveMinerFlow` is `false`.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const RemoveMinerDialog = ({
  headDevice = {} as Device,
  isRemoveMinerFlow,
  onCancel,
}: RemoveMinerDialogProps) => {
  const selectedEditSocket = {
    containerInfo: headDevice?.info,
    miner: headDevice,
    pos: headDevice?.info?.pos,
  }

  return (
    <Dialog open={isRemoveMinerFlow} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent title="Are you sure to permanently remove miner?" onClose={onCancel} closable>
        <RemoveMinerDialogContent selectedEditSocket={selectedEditSocket} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  )
}
