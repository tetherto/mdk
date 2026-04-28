import type { ReactNode } from 'react'
import { Button, Dialog, DialogContent, DialogFooter } from '@tetherto/mdk-core-ui'

export type ChangeConfirmationModalProps = {
  open: boolean
  title: string
  onConfirm: VoidFunction
  onClose: VoidFunction
  children: ReactNode
  confirmText?: string
  destructive?: boolean
}

export const ChangeConfirmationModal = ({
  open,
  title,
  onConfirm,
  onClose,
  children,
  confirmText = 'Confirm',
  destructive = false,
}: ChangeConfirmationModalProps) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent title={title} closable onClose={onClose} closeOnClickOutside={false}>
      <div className="mdk-settings-confirmation-modal__body">{children}</div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
