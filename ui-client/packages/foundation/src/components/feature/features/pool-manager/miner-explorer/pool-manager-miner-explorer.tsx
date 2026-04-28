import { useRef, useState } from 'react'
import { useDispatch } from 'react-redux'

import { Button, SimpleTooltip } from '@tetherto/core'

import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { ACTION_TYPES } from '../../../../../constants/actions'
import { AUTH_LEVELS, AUTH_PERMISSIONS } from '../../../../../constants/permissions.constants'
import { useCheckPerm } from '../../../../../hooks'
import { useContextualModal } from '../../../../../hooks/use-contextual-modal'
import { actionsSlice } from '../../../../../state'
import type { Device } from '../../../../../types'
import { notifyInfo } from '../../../../../utils/notification-utils'
import { AssignPoolModal } from '../../../../domain/pool-manager/assign-pool-modal/assign-pool-modal'
import type { PoolConfigData } from '../../../../domain/pool-manager/hooks/use-pool-configs'
import type { MinerExplorerRef } from '../../../../domain/pool-manager/miner-explorer'
import { MinerExplorer } from '../../../../domain/pool-manager/miner-explorer'
import { ASSIGN_POOL_POPUP_ENABLED } from '../../../../domain/pool-manager/pool-manager-constants'
import type { PoolSummary } from '../../../../domain/pool-manager/types'
import './pool-manager-miner-explorer.scss'

const { setAddPendingSubmissionAction } = actionsSlice.actions

const actionsWritePermission = `${AUTH_PERMISSIONS.ACTIONS}:${AUTH_LEVELS.WRITE}`

type PoolManagerMinerExplorerProps = {
  miners: Device[]
  poolConfig: PoolConfigData[]
  backButtonClick: VoidFunction
}

export const PoolManagerMinerExplorer = ({
  miners,
  poolConfig,
  backButtonClick,
}: PoolManagerMinerExplorerProps) => {
  const dispatch = useDispatch()
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
    dispatch(
      setAddPendingSubmissionAction({
        query: { id: { $in: selectedDevices.map((d) => d.id) } },
        action: ACTION_TYPES.SETUP_POOLS,
        params: [{ poolConfigId: pool.id, configType: 'pool' }],
        overrideQuery: false,
        codesList: selectedDevices.map((d) => d.code),
        poolName: pool.name,
      }),
    )
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
