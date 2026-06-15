import { ArrowLeftIcon } from '@radix-ui/react-icons'

import { Button, Loader } from '@core'

import type { SiteOverviewDetailsDataOptions } from '../../../components/pool-manager/site-overview-details/use-site-overview-details-data'
import type { Device } from '../../../types'
import type { PoolConfigData } from '../../../components'
import { SiteOverviewDetailsContainer } from '../../../components/pool-manager/site-overview-details/site-overview-details-container'
import './pool-manager-site-overview-details.scss'

export type PoolManagerSiteOverviewDetailsProps = {
  /** The site (container unit) to render details for. */
  unit: Device
  /** Display name shown in the breadcrumb (`Site Overview / <unitName>`). */
  unitName: string
  /** Pool configurations powering the per-pool detail rows. */
  poolConfig: PoolConfigData[]
  /** Optional data-fetch knobs forwarded to `useSiteOverviewDetailsData`. */
  dataOptions?: SiteOverviewDetailsDataOptions
  /** Show a centered loader instead of the detail container. */
  isLoading?: boolean
  /** Called when the operator clicks the "Site Overview" back link. */
  backButtonClick: VoidFunction
}

/**
 * Pool-manager site detail page — drilldown for a single site showing
 * configured pools, recent miner activity, and performance charts. Renders a
 * breadcrumb header (`Site Overview / <unitName>`) and delegates the body to
 * `SiteOverviewDetailsContainer`.
 *
 * @category dashboards
 * @orkCapability pool-performance
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PoolManagerSiteOverviewDetails
 *   unit={site}
 *   unitName={site.name}
 *   poolConfig={poolConfig}
 *   isLoading={isLoading}
 *   backButtonClick={() => router.push('/pool-manager/sites')}
 * />
 * ```
 *
 * @tier agent-ready
 */
export const PoolManagerSiteOverviewDetails = ({
  unit,
  unitName,
  poolConfig,
  dataOptions,
  isLoading,
  backButtonClick,
}: PoolManagerSiteOverviewDetailsProps) => (
  <div className="mdk-pm-sod">
    <div className="mdk-pm-sod__header">
      <div>
        <div className="mdk-pm-sod__title">Site Overview</div>
        <div className="mdk-pm-sod__subtitle">
          <Button
            variant="link"
            icon={<ArrowLeftIcon />}
            className="mdk-pm-sod__back-link"
            onClick={backButtonClick}
          >
            Site Overview
          </Button>
          {unitName && ` / ${unitName}`}
        </div>
      </div>
    </div>

    {isLoading ? (
      <Loader />
    ) : (
      <SiteOverviewDetailsContainer unit={unit} poolConfig={poolConfig} dataOptions={dataOptions} />
    )}
  </div>
)
