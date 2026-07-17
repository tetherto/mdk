import { useActions, useDeviceResolution } from '@tetherto/mdk-react-adapter'
import { appendContainerToTag } from '@tetherto/mdk-ui-foundation'
import _compact from 'lodash/compact'
import _concat from 'lodash/concat'
import _filter from 'lodash/filter'
import _get from 'lodash/get'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import _size from 'lodash/size'
import _without from 'lodash/without'
import { useState } from 'react'

import { CoreAlert, FALLBACK, formatHashrate, Loader } from '@primitives'

import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../constants/actions'
import { getContainerName } from '../../../utils/container-utils'
import { notifyInfo } from '../../../utils/notification-utils'
import type { PoolConfigData } from '../hooks/use-pool-configs'
import { usePoolConfigs } from '../hooks/use-pool-configs'
import type { ProcessedContainerUnit } from '@tetherto/mdk-react-adapter'
import type { PoolSummary } from '../types'
import { SetPoolConfiguration } from './set-pool-configuration/set-pool-configuration'
import { SetPoolConfigurationModal } from './set-pool-configuration/set-pool-configuration-modal'
import { SitesOverviewStatusCard } from './sites-overview-status-card'
import './sites-overview-status-card-list.scss'

export type SitesOverviewStatusCardListProps = {
  units: ProcessedContainerUnit[]
  isLoading?: boolean
  error?: unknown
  poolConfig: PoolConfigData[]
  onCardClick: (unitId: string) => void
}

export const SitesOverviewStatusCardList = ({
  units,
  isLoading: isUnitsLoading,
  error: unitsError,
  poolConfig,
  onCardClick,
}: SitesOverviewStatusCardListProps) => {
  const { setAddPendingSubmissionAction } = useActions()
  const [selected, setSelected] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { isTablet } = useDeviceResolution()

  const {
    poolIdMap,
    isLoading: isPoolConfigsLoading,
    error: poolConfigsError,
  } = usePoolConfigs({ data: poolConfig })

  const isLoading = isUnitsLoading || isPoolConfigsLoading
  const hasError = !_isNil(unitsError) || !_isNil(poolConfigsError)
  const hasSelection = _size(selected) > 0
  const selectedCount = selected.length

  const handleSelect = (id: string) => {
    setSelected((prev) => (_includes(prev, id) ? _without(prev, id) : _concat(prev, id)))
  }

  const getPoolConfigName = (poolConfigId?: string): string | undefined => {
    if (_isNil(poolConfigId)) return undefined
    return _get(poolIdMap, [poolConfigId, 'name'])
  }

  const handleSetPoolConfigurationSubmit = async ({ pool }: { pool: PoolSummary }) => {
    const selectedSet = new Set(selected)

    const containerTags = _compact(
      _map(
        _filter(units, (unit) => !_isNil(unit.id) && selectedSet.has(unit.id)),
        (unit) => {
          if (_isNil(unit.info?.container)) return null
          return appendContainerToTag(unit.info.container)
        },
      ),
    )

    const containersList = _map(
      _filter(units, (unit) => !_isNil(unit.id) && selectedSet.has(unit.id)),
      (unit) => getContainerName(unit.info?.container ?? '', unit.type),
    )

    setAddPendingSubmissionAction({
      query: {
        tags: {
          $in: containerTags,
        },
      },
      action: ACTION_TYPES.SETUP_POOLS,
      params: [
        {
          poolConfigId: pool.id,
          configType: SUBMIT_ACTION_TYPES.POOL,
        },
      ],
      overrideQuery: false,
      containersList,
      poolName: pool.name,
    })

    notifyInfo('Action added', 'Assign Pools')
    setSelected([])
  }

  if (isLoading) return <Loader />

  if (hasError) return <CoreAlert type="error" title="Failed to load data" />

  return (
    <div className="mdk-pm-sites-list">
      <div className="mdk-pm-sites-list__row">
        <div className="mdk-pm-sites-list__unit-col">
          <div className="mdk-pm-sites-list__unit-grid">
            {_map(units, (unit: ProcessedContainerUnit) => (
              <SitesOverviewStatusCard
                key={unit.id}
                id={unit.id ? Number(unit.id) : 0}
                unit={getContainerName(unit.info?.container ?? '', unit.type)}
                pool={getPoolConfigName(unit.info?.poolConfig) ?? FALLBACK}
                hashrate={formatHashrate(unit.hashrateMhs)}
                miners={unit.miners?.actualMiners ?? 0}
                overrides={unit.poolStats?.overriddenConfig ?? 0}
                onClick={() => onCardClick(unit.id ?? '')}
                checked={_includes(selected, unit.id)}
                onSelect={(checked) => {
                  if (checked !== undefined) handleSelect(unit.id ?? '')
                }}
                status={unit.status}
              />
            ))}
          </div>
        </div>

        {hasSelection &&
          (isTablet ? (
            <>
              <button
                type="button"
                className="mdk-pm-sites-list__fab"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span>
                  {selectedCount} Selected unit{selectedCount > 1 ? 's' : ''}
                </span>
                <span>Selected</span>
              </button>
              <SetPoolConfigurationModal
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onSubmit={handleSetPoolConfigurationSubmit}
                poolConfig={poolConfig}
              />
            </>
          ) : (
            <div className="mdk-pm-sites-list__sticky-col">
              <SetPoolConfiguration
                onSubmit={handleSetPoolConfigurationSubmit}
                poolConfig={poolConfig}
              />
            </div>
          ))}
      </div>
    </div>
  )
}
