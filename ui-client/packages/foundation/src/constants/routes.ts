export const ROUTE = {
  HOME: '/',
  ALERTS: '/alerts',
  SIGN_IN: '/signin',
  SIGN_OUT: '/signout',
  DASHBOARD: '/dashboard',
  EXPLORER: '/operations/mining/explorer',
  CONTAINERS_PAGE: '/operations/mining/explorer/containers',

  // Pool Manager
  POOL_MANAGER: '/pool-manager',
  POOL_MANAGER_SITES: '/pool-manager/sites',
  POOL_MANAGER_DASHBOARD: '/pool-manager/dashboard',
  POOL_MANAGER_POOL_ENDPOINTS: '/pool-manager/pool-endpoints',
  POOL_MANAGER_SITES_OVERVIEW: '/pool-manager/sites-overview',
  POOL_MANAGER_MINER_EXPLORER: '/pool-manager/miner-explorer',

  // O&M Section Routes
  OPERATIONS: '/operations',
  OPERATIONS_ENERGY: '/operations/energy',
  OPERATIONS_MINING: '/operations/mining',
  OPERATIONS_MINING_EXPLORER: '/operations/mining/explorer',
  OPERATIONS_MINING_SITE_OVERVIEW: '/operations/mining/site-overview',
  OPERATIONS_MINING_CONTAINER_CHARTS: '/operations/mining/container-charts',

  // Reports Section Routes
  REPORTS: '/reports',
  REPORTS_FINANCIAL: '/reports/financial',
  REPORTS_OPERATIONS: '/reports/operations',
  REPORTS_FINANCIAL_EBITDA: '/reports/financial/ebitda',
  REPORTS_OPERATIONS_ENERGY: '/reports/operations/energy',
  REPORTS_OPERATIONS_MINERS: '/reports/operations/miners',
  REPORTS_OPERATIONS_WORKERS: '/reports/operations/workers',
  REPORTS_OPERATIONS_HASHRATE: '/reports/operations/hashrate',
  REPORTS_FINANCIAL_COST_INPUT: '/reports/financial/cost-input',
  REPORTS_OPERATIONS_DASHBOARD: '/reports/operations/dashboard',
  REPORTS_OPERATIONS_EFFICIENCY: '/reports/operations/efficiency',
  REPORTS_FINANCIAL_SUBSIDY_FEE: '/reports/financial/subsidy-fee',
  REPORTS_FINANCIAL_COST_SUMMARY: '/reports/financial/cost-summary',
  REPORTS_FINANCIAL_HASH_BALANCE: '/reports/financial/hash-balance',
  REPORTS_FINANCIAL_ENERGY_BALANCE: '/reports/financial/energy-balance',
  REPORTS_FINANCIAL_REVENUE_SUMMARY: '/reports/financial/revenue-summary',
  REPORTS_FINANCIAL_ENERGY_REVENUE_COST: '/reports/financial/energy-revenue-cost',

  // Comments
  COMMENTS: '/comments',

  // Inventory Section Routes
  INVENTORY: '/inventory',
  INVENTORY_MINERS: '/inventory/miners',
  INVENTORY_REPAIRS: '/inventory/repairs',
  INVENTORY_MOVEMENTS: '/inventory/movements',
  INVENTORY_DASHBOARD: '/inventory/dashboard',
  INVENTORY_SPARE_PARTS: '/inventory/spare-parts',

  // Settings Section Routes
  SETTINGS: '/settings',
  SETTINGS_USERS: '/settings/users',
  SETTINGS_DASHBOARD: '/settings/dashboard',

  // Multi-Site Routes - All Sites
  MULTI_SITE_DASHBOARD: '/dashboard',
  MULTI_SITE_REPORTS: '/site-reports',
  MULTI_SITE_COST: '/revenue-and-cost/cost',
  MULTI_SITE_OPERATIONS: '/site-operations',
  MULTI_SITE_REVENUE: '/revenue-and-cost/revenue',
  MULTI_SITE_COST_INPUT: '/revenue-and-cost/cost-input',
  MULTI_SITE_REVENUE_AND_COST: '/revenue-and-cost/revenue',
  MULTI_SITE_OPERATIONS_MINERS: '/site-operations/miners',
  MULTI_SITE_OPERATIONS_HASHRATE: '/site-operations/hashrate',
  MULTI_SITE_OPERATIONS_EFFICIENCY: '/site-operations/efficiency',
  MULTI_SITE_OPERATIONS_POWER_CONSUMPTION: '/site-operations/power-consumption',
}

export const ROUTE_TITLES_MAP = {
  [ROUTE.ALERTS]: 'Alerts',
  [ROUTE.SIGN_IN]: 'Sign In',
  [ROUTE.REPORTS]: 'Reports',
  [ROUTE.SIGN_OUT]: 'Sign Out',
  [ROUTE.COMMENTS]: 'Comments',
  [ROUTE.SETTINGS]: 'Settings',
  [ROUTE.INVENTORY]: 'Inventory',
  [ROUTE.DASHBOARD]: 'Dashboard',
  [ROUTE.INVENTORY_MINERS]: 'Miners',
  [ROUTE.OPERATIONS_ENERGY]: 'Energy',
  [ROUTE.OPERATIONS_MINING]: 'Mining',
  [ROUTE.CONTAINERS_PAGE]: 'Containers',
  [ROUTE.POOL_MANAGER]: 'Pool Manager',
  [ROUTE.SETTINGS_DASHBOARD]: 'Dashboard',
  [ROUTE.OPERATIONS]: 'Operations Centre',
  [ROUTE.INVENTORY_DASHBOARD]: 'Dashboard',
  [ROUTE.SETTINGS_USERS]: 'User Management',
  [ROUTE.REPORTS_FINANCIAL_EBITDA]: 'EBITDA',
  [ROUTE.REPORTS_OPERATIONS_MINERS]: 'Miners',
  [ROUTE.INVENTORY_REPAIRS]: 'Repair History',
  [ROUTE.POOL_MANAGER_DASHBOARD]: 'Dashboard',
  [ROUTE.REPORTS_OPERATIONS_ENERGY]: 'Energy',
  [ROUTE.INVENTORY_SPARE_PARTS]: 'Spare Parts',
  [ROUTE.REPORTS_OPERATIONS_WORKERS]: 'Workers',
  [ROUTE.OPERATIONS_MINING_EXPLORER]: 'Explorer',
  [ROUTE.REPORTS_FINANCIAL]: 'Financial Reports',
  [ROUTE.REPORTS_OPERATIONS_HASHRATE]: 'Hashrate',
  [ROUTE.REPORTS_OPERATIONS]: 'Operations Reports',
  [ROUTE.REPORTS_OPERATIONS_DASHBOARD]: 'Dashboard',
  [ROUTE.INVENTORY_MOVEMENTS]: 'Historical Movements',
  [ROUTE.REPORTS_OPERATIONS_EFFICIENCY]: 'Efficiency',
  [ROUTE.REPORTS_FINANCIAL_COST_SUMMARY]: 'Cost Summary',
  [ROUTE.REPORTS_FINANCIAL_SUBSIDY_FEE]: 'Subsidy / Fee',
  [ROUTE.OPERATIONS_MINING_SITE_OVERVIEW]: 'Site Overview',
  [ROUTE.REPORTS_FINANCIAL_ENERGY_BALANCE]: 'Energy Balance',
  [ROUTE.REPORTS_FINANCIAL_REVENUE_SUMMARY]: 'Revenue Summary',
  [ROUTE.REPORTS_FINANCIAL_HASH_BALANCE]: 'Hash Revenue / Cost',
  [ROUTE.REPORTS_FINANCIAL_ENERGY_REVENUE_COST]: 'Energy Revenue / Cost',
}

// Type exports
export type RouteKey = keyof typeof ROUTE
export type RouteValue = (typeof ROUTE)[RouteKey]
export type RouteTitleKey = keyof typeof ROUTE_TITLES_MAP
export type RouteTitleValue = (typeof ROUTE_TITLES_MAP)[RouteTitleKey]
