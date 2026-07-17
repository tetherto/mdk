import type { ComponentType } from 'react'

/**
 * Single source of truth for sidebar pages. Managed by `mdk-ui add page` and
 * `mdk-ui remove page`. The Dashboard / SignIn / NotFound routes are hardcoded
 * in `src/router.tsx` and not present here.
 *
 * Alerts and Pool Manager ship pre-seeded here (rather than hardcoded) so the
 * default app stays identical while remaining removable like any other page.
 *
 * Keep entries on a single line — the CLI's add/remove tooling matches whole
 * lines. Do not remove the `mdk:routes-end` marker.
 */

export interface AppRoute {
  /** Sidebar/nav path (without the leading `/` is fine — the router normalises it). */
  path: string
  /**
   * Router path when it differs from the nav path — e.g. a deep-link segment
   * like `/alerts/:uuid?`. The sidebar still keys off `path`. Defaults to `path`.
   */
  routePath?: string
  /** Sidebar label. */
  label: string
  /** Dynamic import for the page component. */
  page: () => Promise<{ default: ComponentType }>
}

export const ROUTES: AppRoute[] = [
  { path: '/alerts', routePath: '/alerts/:uuid?', label: 'Alerts', page: () => import('./pages/Alerts') },
  { path: '/pool-manager', label: 'Pool Manager', page: () => import('./pages/PoolManager') },
  { path: '/site-overview', label: 'Site Overview', page: () => import('./pages/SiteOverview') },
  { path: '/explorer', label: 'Explorer', page: () => import('./pages/Explorer') },
  // mdk:routes-end
]
