export const ROUTE_PATHS = {
  ROOT: '/',
  SIGN_IN: '/signin',
  DASHBOARD: '/dashboard',
  NOT_FOUND: '*',
} as const

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS]
