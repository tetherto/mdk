/**
 * Runnable example for MovementDetailsModal.
 */
import { type MovementData, MovementDetailsModal } from '@tetherto/mdk-react-devkit'

const exampleMovement: MovementData = {
  origin: 'site.warehouse',
  destination: 'workshop.lab',
  previousStatus: 'ok_brand_new',
  newStatus: 'faulty',
  device: {
    code: 'M-1042',
    tags: ['code-M-1042'],
    type: 'antminer',
    info: {
      site: 'Site A',
      container: 'C-12',
      serialNum: 'SN-9981',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    },
  },
  comments: 'Moved to workshop lab for diagnostics.',
}

export const MovementDetailsModalExample = () => (
  <div className="mdk-example-row">
    <MovementDetailsModal
      isOpen
      movement={exampleMovement}
      onClose={() => {
        console.warn('modal closed')
      }}
    />
  </div>
)
