import { ArrowLeftIcon } from '@radix-ui/react-icons'

import { Button } from '@core'

import type { ProcessedContainerUnit } from '@tetherto/mdk-react-adapter'

import type { PoolConfigData } from '../../../components/pool-manager/hooks/use-pool-configs'
import { SitesOverviewStatusCardList } from '../../../components/pool-manager/sites-overview/sites-overview-status-card-list'
import './pool-manager-sites-overview.scss'

export type PoolManagerSitesOverviewProps = {
  /** Sites to render (already normalised through `useSitesOverviewData`). */
  units: ProcessedContainerUnit[]
  /** Pool configurations powering each card's pool summary. */
  poolConfig: PoolConfigData[]
  /** Show a skeleton placeholder while site data is fetching. */
  isLoading?: boolean
  /** Surface a "could not load sites" message when defined. */
  error?: unknown
  /** Called when the operator clicks the "Pool Manager" back link. */
  backButtonClick: VoidFunction
  /** Called with the clicked unit id — typically navigates to `/sites/:id`. */
  onCardClick: (unitId: string) => void
}

/**
 * Pool-manager sites overview page — landing screen listing every site as a
 * status card with a snapshot of pools, miners online, hashrate, and any
 * active incidents. Each card navigates to the site detail page.
 *
 * Renders its own loading / empty / error states; safe to render without
 * external guarding.
 *
 * @category dashboards
 * @orkCapability pool-performance
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PoolManagerSitesOverview
 *   units={units}
 *   poolConfig={poolConfig}
 *   isLoading={isLoading}
 *   backButtonClick={() => router.push('/pool-manager')}
 *   onCardClick={(id) => router.push(`/pool-manager/sites/${id}`)}
 * />
 * ```
 *
 * @tier agent-ready
 */
export const PoolManagerSitesOverview = ({
  units,
  poolConfig,
  isLoading,
  error,
  backButtonClick,
  onCardClick,
}: PoolManagerSitesOverviewProps) => (
  <div className="mdk-pm-sites-overview">
    <div className="mdk-pm-sites-overview__header">
      <div>
        <div className="mdk-pm-sites-overview__title">Site Overview</div>
        <div className="mdk-pm-sites-overview__subtitle">
          <Button
            variant="link"
            icon={<ArrowLeftIcon />}
            className="mdk-pm-sites-overview__back-link"
            onClick={backButtonClick}
          >
            Pool Manager
          </Button>
        </div>
      </div>
    </div>

    <SitesOverviewStatusCardList
      units={units}
      poolConfig={poolConfig}
      isLoading={isLoading}
      error={error}
      onCardClick={onCardClick}
    />
  </div>
)
