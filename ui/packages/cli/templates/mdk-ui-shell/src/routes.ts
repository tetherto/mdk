import type { ComponentType } from 'react'

/**
 * Single source of truth for user-added pages. Managed by `mdk-ui add page`
 * and `mdk-ui remove page`. The Dashboard / SignIn / NotFound routes are
 * hardcoded in `src/router.tsx` and not present here.
 *
 * Do not remove the `mdk:routes-end` marker.
 */

export interface AppRoute {
  /** URL path (without the leading `/` is fine — the router normalises it). */
  path: string
  /** Sidebar label. */
  label: string
  /** Dynamic import for the page component. */
  page: () => Promise<{ default: ComponentType }>
}

export const ROUTES: AppRoute[] = [
  // mdk:routes-end
]
