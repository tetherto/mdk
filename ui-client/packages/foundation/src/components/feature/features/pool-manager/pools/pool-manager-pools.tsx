import { useState } from 'react'

import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
  Button,
  CoreAlert,
  Loader,
} from '@tetherto/mdk-core-ui'

import { useContextualModal } from '../../../../../hooks/use-contextual-modal'

import { ArrowLeftIcon } from '@radix-ui/react-icons'
import type { PoolConfigData } from '../../../../domain'
import { ADD_POOL_ENABLED, usePoolConfigs } from '../../../../domain'
import { AddPoolModal } from '../../../../domain/pool-manager/pools/add-pool-modal/add-pool-modal'
import { PoolCollapseItemBody } from '../../../../domain/pool-manager/pools/pool-collapse-item-body/pool-collapse-item-body'
import { PoolCollapseItemHeader } from '../../../../domain/pool-manager/pools/pool-collapse-item-header/pool-collapse-item-header'
import './pool-manager-pools.scss'

type PoolManagerPoolsProps = {
  poolConfig: PoolConfigData[]
  backButtonClick: VoidFunction
}

export const PoolManagerPools = ({ poolConfig, backButtonClick }: PoolManagerPoolsProps) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([])

  const { pools, isLoading, error } = usePoolConfigs({
    data: poolConfig,
  })

  const {
    modalOpen: addPoolModalOpen,
    handleOpen: openAddPoolModal,
    handleClose: closeAddPoolModal,
  } = useContextualModal()

  return (
    <div className="mdk-pm-pools">
      <div className="mdk-pm-pools__header">
        <div>
          <div className="mdk-pm-pools__header-title">Pools</div>
          <Button
            type="button"
            icon={<ArrowLeftIcon />}
            onClick={backButtonClick}
            variant="nav-link"
            className="mdk-pm-pools__back-link"
          >
            Pool Manager
          </Button>
        </div>

        {ADD_POOL_ENABLED && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => openAddPoolModal(undefined)}
          >
            Add Pool
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader />
      ) : error ? (
        <CoreAlert type="error" title="Error loading data" />
      ) : (
        <AccordionRoot
          type="multiple"
          value={activeKeys}
          onValueChange={setActiveKeys}
          className="mdk-pm-pools__accordion"
        >
          {pools.map((pool) => (
            <AccordionItem
              key={pool.name}
              value={pool.name}
              className="mdk-pm-pools__accordion-item"
            >
              <AccordionTrigger
                className="mdk-pm-pools__accordion-trigger"
                showToggleIcon
                customLabel={<PoolCollapseItemHeader pool={pool} />}
                toggleIconPosition="left"
              />
              <AccordionContent className="mdk-pm-pools__accordion-content">
                <PoolCollapseItemBody pool={pool} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </AccordionRoot>
      )}

      {addPoolModalOpen && <AddPoolModal isOpen={addPoolModalOpen} onClose={closeAddPoolModal} />}
    </div>
  )
}
