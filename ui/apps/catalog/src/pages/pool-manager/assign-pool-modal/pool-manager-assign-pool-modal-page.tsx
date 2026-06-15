import { useState } from 'react'

import { Button } from '@tetherto/mdk-react-devkit/core'
import type { PoolSummary } from '@tetherto/mdk-react-devkit/foundation'
import { AssignPoolModal } from '@tetherto/mdk-react-devkit/foundation'

import { DEMO_MINERS, DEMO_POOL_CONFIG } from '../../../constants/demo-pool-manager-data'
import { DemoBlock } from '../../../components/demo-block'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { useDemoToast } from '../../../utils/use-demo-toast'
import './pool-manager-assign-pool-modal-page.scss'

export const PoolManagerAssignPoolModalPage = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { showToast, ToasterSlot } = useDemoToast()

  const handleSubmit = async ({ pool }: { pool: PoolSummary }) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsOpen(false)
    showToast(`Assigned ${DEMO_MINERS.length} miners to "${pool.name}"`)
  }

  return (
    <div className="demo-section mdk-demo-assign-pool-modal">
      <DemoPageHeader title="Assign Pool Modal" />
      <DemoBlock
        title="Default"
        description="Bulk-assign selected miners to a pool. Shows the miner list, a pool selector with metadata, endpoint preview, and credential template preview."
      >
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Assign Pool Modal ({DEMO_MINERS.length} miners selected)
        </Button>
      </DemoBlock>

      <AssignPoolModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        miners={DEMO_MINERS}
        poolConfig={DEMO_POOL_CONFIG}
      />

      <ToasterSlot />
    </div>
  )
}
