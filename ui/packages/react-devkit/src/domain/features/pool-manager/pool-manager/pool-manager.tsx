import { useEffect, useState } from 'react'

import { cn } from '@primitives'

import { PoolManagerDashboard } from '../../../components/pool-manager/dashboard/dashboard'
import { getContainerName } from '../../../utils/container-utils'
import { PoolManagerMinerExplorer } from '../miner-explorer/pool-manager-miner-explorer'
import { PoolManagerPools } from '../pools/pool-manager-pools'
import { PoolManagerSiteOverviewDetails } from '../site-overview-details/pool-manager-site-overview-details'
import { PoolManagerSitesOverview } from '../sites-overview/pool-manager-sites-overview'
import { NAV_URL_TO_VIEW, noop } from './pool-manager.constants'
import type { PoolManagerProps, PoolManagerView } from './pool-manager.types'
import './pool-manager.scss'

/**
 * Composite Pool Manager surface. Owns internal, state-based view switching
 * across the dashboard and the four feature views (Pools, Miner Explorer,
 * Sites Overview, Site Detail) so the whole experience resolves to a single
 * route for `mdk-ui add page`. Receives all data as props — the shell page is
 * thin glue that reads the adapter hooks and passes them down.
 *
 * Actions staged from any sub-view (create/edit pool, assign miners) are
 * reviewed via the global {@link ActionsSidebar} mounted in `App.tsx`, opened
 * by the `PendingActionsButton` in the header toolbar.
 *
 * @category dashboards
 * @kernelCapability pool-performance
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * const { data: poolConfig } = usePoolConfigsData()
 * const { data: miners } = useMiners()
 * return <PoolManager poolConfig={poolConfig} miners={miners} stats={stats} />
 * ```
 *
 * @tier agent-ready
 */
export const PoolManager = ({
  poolConfig,
  stats,
  isStatsLoading,
  alerts,
  onViewAllAlerts,
  miners = [],
  units = [],
  isSitesLoading,
  sitesError,
  siteDevices = [],
  siteDetailDataOptions,
  isSiteDetailLoading,
  initialView = 'dashboard',
  view: viewProp,
  onViewChange,
  onSiteSelect,
  className,
}: PoolManagerProps) => {
  const [view, setView] = useState<PoolManagerView>(viewProp ?? initialView)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  // Sync internal state when the controlled `view` prop changes (e.g. sidebar click → URL update).
  useEffect(() => {
    if (viewProp !== undefined && viewProp !== view) {
      setView(viewProp)
    }
  }, [viewProp])

  const goTo = (next: PoolManagerView) => {
    setView(next)
    onViewChange?.(next)
  }

  const handleNavigationClick = (url: string) => {
    const next = NAV_URL_TO_VIEW[url]
    if (next) goTo(next)
  }

  const handleCardClick = (unitId: string) => {
    setSelectedUnitId(unitId)
    onSiteSelect?.(unitId)
    goTo('site-detail')
  }

  const selectedUnit = selectedUnitId
    ? siteDevices.find((device) => device.id === selectedUnitId)
    : undefined

  const sitesOverviewNode = (
    <PoolManagerSitesOverview
      units={units}
      poolConfig={poolConfig}
      isLoading={isSitesLoading}
      error={sitesError}
      backButtonClick={() => goTo('dashboard')}
      onCardClick={handleCardClick}
    />
  )

  const renderView = () => {
    switch (view) {
      case 'pools':
        return (
          <PoolManagerPools poolConfig={poolConfig} backButtonClick={() => goTo('dashboard')} />
        )
      case 'miner-explorer':
        return (
          <PoolManagerMinerExplorer
            miners={miners}
            poolConfig={poolConfig}
            backButtonClick={() => goTo('dashboard')}
          />
        )
      case 'sites-overview':
        return sitesOverviewNode
      case 'site-detail':
        if (!selectedUnit) return sitesOverviewNode
        return (
          <PoolManagerSiteOverviewDetails
            unit={selectedUnit}
            unitName={getContainerName(selectedUnit.info?.container ?? '', selectedUnit.type)}
            poolConfig={poolConfig}
            dataOptions={siteDetailDataOptions}
            isLoading={isSiteDetailLoading}
            backButtonClick={() => goTo('sites-overview')}
          />
        )
      default:
        return (
          <PoolManagerDashboard
            stats={stats}
            isStatsLoading={isStatsLoading}
            alerts={alerts}
            onNavigationClick={handleNavigationClick}
            onViewAllAlerts={onViewAllAlerts ?? noop}
          />
        )
    }
  }

  return (
    <div className={cn('mdk-pm-wrapper', className)}>
      {renderView()}
    </div>
  )
}
