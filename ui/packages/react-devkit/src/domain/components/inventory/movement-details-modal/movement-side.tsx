import type { JSX } from 'react'

import type { MovementSideView } from './build-movement-details-view-model'

type MovementSideProps = {
  side: MovementSideView
}

export const MovementSide = ({ side }: MovementSideProps): JSX.Element => (
  <div className="mdk-movement-details-modal__side">
    <div className="mdk-movement-details-modal__field">
      <span className="mdk-movement-details-modal__field-name">Location: </span>
      <span className="mdk-movement-details-modal__badge" style={side.locationColors}>
        {side.locationLabel}
      </span>
    </div>
    <div className="mdk-movement-details-modal__field">
      <span className="mdk-movement-details-modal__field-name">Status: </span>
      <span className="mdk-movement-details-modal__badge" style={side.statusColors}>
        {side.statusLabel}
      </span>
    </div>
  </div>
)

MovementSide.displayName = 'MovementSide'
