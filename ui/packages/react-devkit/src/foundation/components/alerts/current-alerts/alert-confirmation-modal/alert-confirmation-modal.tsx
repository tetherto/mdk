import { Button, Dialog, DialogContent, DialogFooter } from '@core'

import './alert-confirmation-modal.scss'

import type { JSX } from 'react'

export type AlertConfirmationModalProps = {
  isOpen: boolean
  onOk: VoidFunction
}

/**
 * Modal that confirms acknowledging or clearing one or more alerts before applying the change.
 *
 * @category tables
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @tier agent-ready
 */
export const AlertConfirmationModal = ({
  isOpen,
  onOk,
}: AlertConfirmationModalProps): JSX.Element => (
  <Dialog open={isOpen}>
    <DialogContent
      closeOnEscape={false}
      closeOnClickOutside={false}
      className="mdk-alerts-confirmation-modal"
      aria-describedby={undefined}
    >
      <div className="mdk-alerts-confirmation-modal__body">
        <p>
          Sound notifications for Critical alerts are only triggered from the Alerts page. To enable
          them, please keep always a tab with this page open
        </p>
      </div>
      <DialogFooter className="mdk-alerts-confirmation-modal__footer">
        <Button variant="primary" onClick={onOk}>
          Understood
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
