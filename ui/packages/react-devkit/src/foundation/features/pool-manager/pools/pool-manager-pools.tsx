import { useState } from 'react'

import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
  Button,
  CoreAlert,
  Loader,
} from '@core'

import { useContextualModal } from '@tetherto/mdk-react-adapter'

import { ArrowLeftIcon } from '@radix-ui/react-icons'
import type { PoolConfigData } from '../../../components'
import { ADD_POOL_ENABLED, usePoolConfigs } from '../../../components'
import { AddPoolModal } from '../../../components/pool-manager/pools/add-pool-modal/add-pool-modal'
import { PoolCollapseItemBody } from '../../../components/pool-manager/pools/pool-collapse-item-body/pool-collapse-item-body'
import { PoolCollapseItemHeader } from '../../../components/pool-manager/pools/pool-collapse-item-header/pool-collapse-item-header'
import './pool-manager-pools.scss'

export type PoolManagerPoolsProps = {
  /** Array of pool configurations to render. */
  poolConfig: PoolConfigData[]
  /** Called when the operator clicks the "Pool Manager" back link. */
  backButtonClick: VoidFunction
}

/**
 * Pool-manager pools page — accordion list of every configured pool with
 * header summary (name, status, priority) and an expandable body
 * (per-pool stats, edit, delete). Optional "Add Pool" CTA is gated by the
 * `ADD_POOL_ENABLED` feature flag.
 *
 * Must be rendered inside `<MdkProvider>` — the embedded "Add Pool" modal
 * uses the contextual-modal adapter hook.
 *
 * @category tables
 * @orkCapability pool-performance
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PoolManagerPools
 *   poolConfig={poolConfig}
 *   backButtonClick={() => router.push('/pool-manager')}
 * />
 * ```
 *
 * @tier agent-ready
 */
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
