import { useActions, useDeviceResolution } from '@tetherto/mdk-react-adapter'
import { lazy, Suspense, useRef, useState } from 'react'

import { cn, CoreAlert, FALLBACK, Loader } from '@primitives'

import { ACTION_TYPES } from '../../../constants/actions'
import type { MinerData, SiteOverviewDetailsDataOptions, UnitData } from './use-site-overview-details-data'
import { useSiteOverviewDetailsData } from './use-site-overview-details-data'
import { DEVICE_NOT_FOUND_MESSAGE } from '../../../utils/device-utils'
import { notifyInfo } from '../../../utils/notification-utils'
import type { PoolConfigData } from '../hooks/use-pool-configs'
import { usePoolConfigs } from '../hooks/use-pool-configs'
import { ASSIGN_POOL_POPUP_ENABLED } from '../pool-manager-constants'
import { SetPoolConfiguration } from '../sites-overview/set-pool-configuration/set-pool-configuration'
import { SetPoolConfigurationModal } from '../sites-overview/set-pool-configuration/set-pool-configuration-modal'
import type { PoolSummary } from '../types'
import { GridUnit } from './grid-unit'
import { MinerInfoCard } from './miner-info-card/miner-info-card'
import './site-overview-details-container.scss'
import { SiteOverviewDetailsHeader } from './site-overview-details-header/site-overview-details-header'
import { SiteOverviewDetailsLegend } from './site-overview-details-legend/site-overview-details-legend'
import {
  getMinersPoolName,
  getSelectableName,
  resolveAssignPoolDevices,
} from './site-overview-details-utils'

// react-selecto (~116K) is code-split into a lazy chunk so importing this
// component does not pull the drag-select engine into a consumer's initial
// bundle; it only loads once the selectables container mounts.
const Selecto = lazy(() => import('react-selecto'))

export type SiteOverviewDetailsContainerProps = {
  unit?: UnitData
  poolConfig: PoolConfigData[]
  dataOptions?: SiteOverviewDetailsDataOptions
}

type SelectEndEvent = {
  inputEvent?: { target?: { classList?: { contains: (c: string) => boolean } } }
  added?: Array<{ dataset?: { pduIndex?: string; socketIndex?: string } }>
  removed?: Array<{ dataset?: { pduIndex?: string; socketIndex?: string } }>
}

type SelectStartEvent = {
  inputEvent: {
    target: { classList: { contains: (c: string) => boolean } }
    shiftKey: boolean
  }
}

export const SiteOverviewDetailsContainer = ({
  unit,
  poolConfig,
  dataOptions,
}: SiteOverviewDetailsContainerProps) => {
  const { setAddPendingSubmissionAction } = useActions()
  const { isTablet } = useDeviceResolution()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showSelecto, setShowSelecto] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const selectablesContainerRef = useRef<HTMLDivElement | null>(null)

  const registerSelectablesContainer = (node: HTMLDivElement | null) => {
    selectablesContainerRef.current = node
    setShowSelecto(!!node)
  }

  const {
    poolIdMap,
    isLoading: isPoolConfigsLoading,
    error: poolConfigsError,
  } = usePoolConfigs({ data: poolConfig })

  const {
    actualMinersCount,
    containerHashRate,
    pdus,
    segregatedPduSections,
    minersHashmap,
    connectedMiners,
    containerInfo,
    connectedMinersData,
    isContainerRunning,
    isLoading: isSiteOverviewDetailsLoading,
  } = useSiteOverviewDetailsData(unit, dataOptions)

  const isLoading = isSiteOverviewDetailsLoading || isPoolConfigsLoading
  const hasError = poolConfigsError

  const hasSelection = selectedItems.size > 0
  const poolName = getMinersPoolName(connectedMiners) || FALLBACK

  const handleSelectAll = () => {
    const selections: string[] = []

    for (const pdu of pdus ?? []) {
      const pduIndex = pdu?.pdu

      if (!pduIndex) continue

      for (const socket of pdu?.sockets ?? []) {
        const socketIndex = socket?.socket

        if (socketIndex === undefined) continue

        const key = `${pduIndex}_${socketIndex}`
        const minerData = minersHashmap[key]

        if (minerData?.error !== DEVICE_NOT_FOUND_MESSAGE) {
          selections.push(getSelectableName(pduIndex, String(socketIndex)))
        }
      }
    }
    setSelectedItems(new Set(selections))
  }

  const handleSelectEnd = (e: SelectEndEvent) => {
    if (e?.inputEvent?.target?.classList?.contains('mdk-grid-unit__row-label')) return

    setSelectedItems((prev) => {
      const next = new Set([...prev])

      for (const el of e.added ?? []) {
        const { pduIndex, socketIndex } = el.dataset ?? {}
        if (pduIndex !== undefined && socketIndex !== undefined) {
          next.add(getSelectableName(pduIndex, socketIndex))
        }
      }
      for (const el of e.removed ?? []) {
        const { pduIndex, socketIndex } = el.dataset ?? {}
        if (pduIndex !== undefined && socketIndex !== undefined) {
          next.delete(getSelectableName(pduIndex, socketIndex))
        }
      }

      return next
    })
  }

  const handleSelectStart = ({ inputEvent }: SelectStartEvent) => {
    const isPduLabel = inputEvent.target.classList.contains('mdk-grid-unit__row-label')
    if (!isPduLabel && !inputEvent.shiftKey) {
      setSelectedItems(new Set())
    }
  }

  const handleAssignPoolSubmit = ({ pool }: { pool: PoolSummary }) => {
    const { devices, hasEligibleDevices } = resolveAssignPoolDevices(
      selectedItems,
      minersHashmap,
      connectedMiners,
    )

    if (!hasEligibleDevices) {
      notifyInfo(
        'Not permitted',
        'Assign Pools can only be performed on miners which are in mining or not mining state',
      )
      return
    }

    setAddPendingSubmissionAction({
      query: { id: { $in: devices.map((d) => d.id) } },
      action: ACTION_TYPES.SETUP_POOLS,
      params: [{ poolConfigId: pool.id, configType: 'pool' }],
      overrideQuery: false,
      codesList: devices.map((d) => d.code),
      poolName: pool.name,
    })

    notifyInfo('Action added', 'Assign Pools')
    setSelectedItems(new Set())
  }

  if (isLoading) return <Loader />
  if (hasError) return <CoreAlert type="error" title="Failed to load data" />

  return (
    <div className="mdk-sodc">
      <div
        className={cn(
          'mdk-sodc__racks-col',
          hasSelection && !isTablet && 'mdk-sodc__racks-col--narrow',
        )}
      >
        <SiteOverviewDetailsHeader
          poolName={poolName}
          actualMinersCount={actualMinersCount}
          containerHashRate={containerHashRate}
          isContainerRunning={isContainerRunning}
          hasSelection={hasSelection}
          onDeselectAll={() => setSelectedItems(new Set())}
          onSelectAll={handleSelectAll}
        />

        <div ref={registerSelectablesContainer}>
          {Object.keys(segregatedPduSections).map((sectionKey) => (
            <GridUnit
              key={sectionKey}
              containerInfo={containerInfo}
              connectedMiners={connectedMinersData}
              type={unit?.type}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              sectionKey={sectionKey}
              mobileSelectionEnabled={false}
              segregatedPduSections={segregatedPduSections}
              minersHashmap={minersHashmap as Record<string, MinerData>}
              getSelectableName={getSelectableName}
            />
          ))}
        </div>

        {showSelecto && !!selectablesContainerRef.current && (
          <Suspense fallback={null}>
            <Selecto
              ratio={0}
              hitRate={25}
              selectByClick
              toggleContinueSelect={['shift']}
              selectableTargets={['.socket-container']}
              dragContainer={selectablesContainerRef.current}
              onSelectStart={handleSelectStart}
              onSelectEnd={handleSelectEnd}
            />
          </Suspense>
        )}

        <SiteOverviewDetailsLegend />
      </div>

      {hasSelection && ASSIGN_POOL_POPUP_ENABLED && (
        <div className="mdk-sodc__sticky-col">
          {isTablet ? (
            <>
              <button className="mdk-sodc__tablet-btn" onClick={() => setIsSidebarOpen(true)}>
                <span>
                  {selectedItems.size} {selectedItems.size > 1 ? 'Selected units' : 'Selected unit'}
                </span>
                <span>Selected</span>
              </button>
              <SetPoolConfigurationModal
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onSubmit={handleAssignPoolSubmit}
                poolConfig={poolConfig}
              />
            </>
          ) : (
            <>
              {selectedItems.size === 1 && (
                <MinerInfoCard
                  minersHashmap={minersHashmap}
                  selectedItems={selectedItems}
                  poolIdMap={poolIdMap}
                />
              )}
              <SetPoolConfiguration onSubmit={handleAssignPoolSubmit} poolConfig={poolConfig} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
