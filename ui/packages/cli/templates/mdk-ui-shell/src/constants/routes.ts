export const ROUTE_PATHS = {
  ROOT: '/',
  SIGN_IN: '/signin',
  DASHBOARD: '/dashboard',
  ALERTS: '/alerts',
  POOL_MANAGER: '/pool-manager',
  SITE_OVERVIEW: '/site-overview',
  EXPLORER: '/explorer',
  NOT_FOUND: '*',
} as const

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS]
