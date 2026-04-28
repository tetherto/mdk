import { MinerOverviewIcon, PoolsIcon, SiteOverviewIcon } from '@tetherto/mdk-core-ui'
import type { NavigationBlockItem } from './dashboard-types'

export const MAX_ALERTS_DISPLAYED = 5

export const POOL_MANAGER_ROUTES = {
  POOL_ENDPOINTS: '/pool-manager/pools',
  SITES_OVERVIEW: '/pool-manager/sites-overview',
  MINER_EXPLORER: '/pool-manager/miner-explorer',
} as const

export const navigationBlocks: NavigationBlockItem[] = [
  {
    icon: <PoolsIcon />,
    title: 'Pools',
    description: 'Manage pool configurations',
    navText: 'Configure Pools',
    url: POOL_MANAGER_ROUTES.POOL_ENDPOINTS,
  },
  {
    icon: <SiteOverviewIcon />,
    title: 'Site Overview',
    description: 'View site layout and assign pools at site/unit/miner level',
    navText: 'View Layout',
    url: POOL_MANAGER_ROUTES.SITES_OVERVIEW,
  },
  {
    icon: <MinerOverviewIcon />,
    title: 'Miner Explorer',
    description: 'Search and bulk-assign pools to miners',
    navText: 'Explore Miners',
    url: POOL_MANAGER_ROUTES.MINER_EXPLORER,
  },
]

export const alertsNeeded = new Set([
  'pool_connect_failed',
  'all_pools_dead',
  'wrong_miner_pool',
  'wrong_miner_subaccount',
  'wrong_worker_name',
  'ip_worker_name',
])
