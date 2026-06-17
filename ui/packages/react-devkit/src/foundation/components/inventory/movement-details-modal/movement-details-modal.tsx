import { Dialog, DialogContent } from '@core'
import { ArrowRightIcon } from '@radix-ui/react-icons'
import { type JSX, useMemo } from 'react'

import { buildMovementDetailsViewModel } from './build-movement-details-view-model'
import { DeviceDetails } from './device-details'
import type { MovementDetailsModalProps } from './movement-details-modal.types'
import { MovementSide } from './movement-side'
import './movement-details-modal.scss'

/**
 * Modal showing the details of a historical device movement — the device summary plus the
 * origin → destination transition of location and status.
 * Receives the selected movement as a prop — no internal data fetching.
 *
 * @category dialogs
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const MovementDetailsModal = ({
  isOpen = false,
  onClose,
  movement,
}: MovementDetailsModalProps): JSX.Element | null => {
  const viewModel = useMemo(() => buildMovementDetailsViewModel(movement), [movement])

  if (!viewModel) return null

  const { device, origin, destination, comments } = viewModel

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        title="Historical Device Update"
        closable
        onClose={onClose}
        className="mdk-movement-details-modal"
      >
        <div className="mdk-movement-details-modal__body">
          {device && <DeviceDetails device={device} />}

          <div className="mdk-movement-details-modal__preview">
            <MovementSide side={origin} />

            <div className="mdk-movement-details-modal__arrow" aria-hidden>
              <ArrowRightIcon width={24} height={24} />
            </div>

            <MovementSide side={destination} />
          </div>

          {comments && (
            <div className="mdk-movement-details-modal__comments">{comments}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

MovementDetailsModal.displayName = 'MovementDetailsModal'
