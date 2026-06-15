import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { useActions, useCheckPerm, useContextualModal } from '@tetherto/mdk-react-adapter'
import { useRef, useState } from 'react'

import { Button, SimpleTooltip } from '@core'

import { AUTH_LEVELS, AUTH_PERMISSIONS } from '@tetherto/mdk-ui-core'

import { ACTION_TYPES } from '../../../constants/actions'
import type { Device } from '../../../types'
import { notifyInfo } from '../../../utils/notification-utils'
import { AssignPoolModal } from '../../../components/pool-manager/assign-pool-modal/assign-pool-modal'
import type { PoolConfigData } from '../../../components/pool-manager/hooks/use-pool-configs'
import type { MinerExplorerRef } from '../../../components/pool-manager/miner-explorer'
import { MinerExplorer } from '../../../components/pool-manager/miner-explorer'
import { ASSIGN_POOL_POPUP_ENABLED } from '../../../components/pool-manager/pool-manager-constants'
import type { PoolSummary } from '../../../components/pool-manager/types'
import './pool-manager-miner-explorer.scss'

const actionsWritePermission = `${AUTH_PERMISSIONS.ACTIONS}:${AUTH_LEVELS.WRITE}`

export type PoolManagerMinerExplorerProps = {
  /** Miners to render in the explorer table. */
  miners: Device[]
  /** Pool configurations powering the "Assign Pool" dropdown. */
  poolConfig: PoolConfigData[]
  /** Called when the operator clicks the "Pool Manager" back link. */
  backButtonClick: VoidFunction
}

/**
 * Pool-manager miner explorer page — searchable / filterable table of miners
 * with multi-select and an "Assign Pool" bulk action. Submits the chosen pool
 * change as a pending action via the adapter actions store, then opens a
 * confirmation modal.
 *
 * Must be rendered inside `<MdkProvider>` — the page uses
 * `useActions`, `useCheckPerm`, and `useContextualModal` from
 * `@tetherto/mdk-react-adapter`.
 *
 * @category tables
 * @orkCapability device-management
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PoolManagerMinerExplorer
 *   miners={miners}
 *   poolConfig={poolConfig}
 *   backButtonClick={() => router.push('/pool-manager')}
 * />
 * ```
 *
 * @tier agent-ready
 */
export const PoolManagerMinerExplorer = ({
  miners,
  poolConfig,
  backButtonClick,
}: PoolManagerMinerExplorerProps) => {
  const { setAddPendingSubmissionAction } = useActions()
  const explorerRef = useRef<MinerExplorerRef>(null)
  const canSubmitActions = useCheckPerm({ perm: actionsWritePermission })
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([])

  const {
    modalOpen: assignPoolModalOpen,
    handleOpen: openAssignPoolModal,
    handleClose: closeAssignPoolModal,
  } = useContextualModal()

  const getAssignPoolsTooltip = (): string | undefined => {
    if (!canSubmitActions) return 'You do not have permission to submit actions'
    if (selectedDevices.length === 0) return 'Please select miners to assign pools'
    return undefined
  }

  const handleAssignPoolSubmit = async ({ pool }: { pool: PoolSummary }): Promise<void> => {
    setAddPendingSubmissionAction({
      query: { id: { $in: selectedDevices.map((d) => d.id) } },
      action: ACTION_TYPES.SETUP_POOLS,
      params: [{ poolConfigId: pool.id, configType: 'pool' }],
      overrideQuery: false,
      codesList: selectedDevices.map((d) => d.code),
      poolName: pool.name,
    })
    notifyInfo('Action added', 'Assign Pools')
    explorerRef.current?.resetSelections()
    closeAssignPoolModal()
  }

  return (
    <div className="mdk-pm-miner-explorer-page">
      <div className="mdk-pm-miner-explorer-page__header">
        <div>
          <div className="mdk-pm-miner-explorer-page__title">Miner Explorer</div>
          <div className="mdk-pm-miner-explorer-page__subtitle">
            <Button
              variant="link"
              icon={<ArrowLeftIcon />}
              className="mdk-pm-miner-explorer-page__back-link"
              onClick={backButtonClick}
            >
              Pool Manager
            </Button>
          </div>
        </div>

        {ASSIGN_POOL_POPUP_ENABLED && (
          <SimpleTooltip content={getAssignPoolsTooltip()}>
            <span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openAssignPoolModal(undefined)}
                disabled={selectedDevices.length === 0}
              >
                Assign Pool
              </Button>
            </span>
          </SimpleTooltip>
        )}
      </div>

      <MinerExplorer
        ref={explorerRef}
        data={miners}
        poolConfig={poolConfig}
        onSelectedDevicesChange={setSelectedDevices}
      />

      {assignPoolModalOpen && (
        <AssignPoolModal
          isOpen={assignPoolModalOpen}
          miners={selectedDevices}
          poolConfig={poolConfig}
          onClose={closeAssignPoolModal}
          onSubmit={handleAssignPoolSubmit}
        />
      )}
    </div>
  )
}
