import { POOL_MANAGER_ROUTES } from '../../../components/pool-manager/dashboard/dashboard-constants'

import type { PoolManagerView } from './pool-manager.types'

/** Maps dashboard nav-link URLs to the view they activate. */
export const NAV_URL_TO_VIEW: Record<string, PoolManagerView> = {
  [POOL_MANAGER_ROUTES.POOL_ENDPOINTS]: 'pools',
  [POOL_MANAGER_ROUTES.SITES_OVERVIEW]: 'sites-overview',
  [POOL_MANAGER_ROUTES.MINER_EXPLORER]: 'miner-explorer',
}

/** No-op callback used as a fallback when an optional handler is not provided. */
export const noop = (): void => {}
