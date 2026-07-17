import { Dialog, DialogContent } from '@primitives'
import { MAINTENANCE_CONTAINER } from '../../../../../constants/container-constants'
import type { Device } from '../../../../../types'
import { ContainerSelectionDialogContent } from '../container-selection-dialog-content/container-selection-dialog-content'

type ContainerSelectionDialogProps = {
  miner?: Device
  containers?: Device[]
  isLoading?: boolean
  open: boolean
  onClose: (value?: boolean) => void
}

/**
 * Modal that lists containers and lets the operator pick one or many for a follow-up action.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ContainerSelectionDialog = ({
  onClose,
  open,
  miner,
  containers = [],
  isLoading,
}: ContainerSelectionDialogProps) => {
  const selectedSocketToReplace = {
    miner,
    containerInfo: { container: MAINTENANCE_CONTAINER },
    pos: '',
    socket: '',
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        title="Select Socket for the miner under maintenance"
        onClose={() => onClose()}
        closable
      >
        <ContainerSelectionDialogContent
          isContainersLoading={isLoading}
          containers={containers}
          selectedSocketToReplace={selectedSocketToReplace}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
