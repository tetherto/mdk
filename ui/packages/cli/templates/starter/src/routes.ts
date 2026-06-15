import type { ComponentType } from 'react'

/**
 * Single source of truth for the app's page routes.
 * Managed by `mdk-ui add page` and `mdk-ui remove page`.
 * Do not remove the mdk:routes-end marker inside ROUTES.
 */

export type AppRoute = {
  /** URL path. Use "/" for the index route. */
  path: string
  /** Sidebar label. */
  label: string
  /** Dynamic import for the page component. */
  page: () => Promise<{ default: ComponentType }>
}

export const ROUTES: AppRoute[] = [
  { path: '/', label: 'Home', page: () => import('./pages/Home') },
  // mdk:routes-end
]
