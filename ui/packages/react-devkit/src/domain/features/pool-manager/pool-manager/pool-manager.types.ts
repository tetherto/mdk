import type { ContainerUnit, ProcessedContainerUnit } from '@tetherto/mdk-react-adapter'
import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'

import type { Alert } from '../../../components/device-explorer'
import type { DashboardStats } from '../../../components/pool-manager/dashboard/dashboard-types'
import type { PoolConfigData } from '../../../components/pool-manager/hooks/use-pool-configs'
import type { SiteOverviewDetailsDataOptions } from '../../../components/pool-manager/site-overview-details/use-site-overview-details-data'

/** Internal surfaces the wrapper switches between on a single route. */
export type PoolManagerView =
  | 'dashboard'
  | 'pools'
  | 'sites-overview'
  | 'miner-explorer'
  | 'site-detail'

export type PoolManagerProps = {
  /** Pool configurations shared by every sub-view (Pools, Miner Explorer, Sites). */
  poolConfig: PoolConfigData[]
  /** Dashboard site-level stat blocks. */
  stats?: DashboardStats
  /** Dashboard stats loading flag. */
  isStatsLoading?: boolean
  /** Recent alerts for the dashboard list. */
  alerts?: Alert[]
  /** Dashboard "View All Alerts" handler (e.g. navigate to `/alerts`). */
  onViewAllAlerts?: VoidFunction
  /** Miners for the Miner Explorer view. */
  miners?: ListThingsDevice[]
  /** Normalised site units for the Sites Overview view. */
  units?: ProcessedContainerUnit[]
  /** Sites Overview loading flag. */
  isSitesLoading?: boolean
  /** Sites Overview error. */
  sitesError?: unknown
  /** Raw container devices used to resolve the selected unit for Site Detail. */
  siteDevices?: ContainerUnit[]
  /** Extra data-fetch knobs forwarded to the Site Detail container. */
  siteDetailDataOptions?: SiteOverviewDetailsDataOptions
  /** Site Detail loading flag. */
  isSiteDetailLoading?: boolean
  /** Initial view (defaults to `dashboard`). */
  initialView?: PoolManagerView
  /**
   * Controlled view — when provided the component syncs its internal state to
   * this value whenever it changes (e.g. driven by a URL query param). Leave
   * undefined to rely solely on `initialView` / internal navigation.
   */
  view?: PoolManagerView
  /** Notified whenever the active view changes (lets the page lazy-fetch). */
  onViewChange?: (view: PoolManagerView) => void
  /** Notified with the selected unit id when a site card is opened. */
  onSiteSelect?: (unitId: string) => void
  className?: string
}
