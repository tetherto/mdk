import { Button } from '@tetherto/mdk-react-devkit/core'
import { type MovementData, MovementDetailsModal } from '@tetherto/mdk-react-devkit/foundation'
import { useState } from 'react'

import { DemoBlock } from '../../../components/demo-block'
import { DemoPageHeader } from '../../../components/demo-page-header'
import './movement-details-modal-demo.scss'

const DEMO_MOVEMENT: MovementData = {
  origin: 'site.warehouse',
  destination: 'workshop.lab',
  previousStatus: 'ok_brand_new',
  newStatus: 'faulty',
  device: {
    code: 'M-1042',
    tags: ['code-M-1042'],
    type: 'antminer',
    info: {
      site: 'Paraguay',
      container: 'C-12',
      serialNum: 'SN-9981',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    },
  },
  comments: 'Moved to workshop lab for diagnostics after a failed health check.',
}

export const MovementDetailsModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="demo-section mdk-demo-movement-details-modal">
      <DemoPageHeader title="Movement Details Modal" />

      <DemoBlock
        title="Default"
        description="Shows a single historical device movement: the device summary plus the origin → destination transition of location and status."
      >
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Movement Details
        </Button>
      </DemoBlock>

      <MovementDetailsModal
        isOpen={isOpen}
        movement={DEMO_MOVEMENT}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}
