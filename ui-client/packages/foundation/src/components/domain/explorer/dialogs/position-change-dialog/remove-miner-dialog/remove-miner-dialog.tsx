import { Dialog, DialogContent } from '@tetherto/core'
import type { Device } from '../../../../../../types'
import { RemoveMinerDialogContent } from './remove-miner-dialog-content'

type RemoveMinerDialogProps = {
  headDevice?: Device
  isRemoveMinerFlow: boolean
  onCancel: VoidFunction
}

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
