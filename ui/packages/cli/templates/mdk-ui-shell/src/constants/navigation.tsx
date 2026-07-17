import type { ReactNode } from 'react'
import {
  AlertsNavIcon,
  ContainerWidgetsNavIcon,
  DashboardNavIcon,
  ExplorerNavIcon,
  PoolManagerNavIcon,
  // mdk:nav-icons-end
} from '@tetherto/mdk-react-devkit'

import { ROUTE_PATHS } from './routes'

/**
 * Sidebar nav icon lookup. Built-in paths map to their dedicated icons;
 * user-added routes fall back to a generic explorer icon.
 *
 * The Alerts and Pool Manager entries (and their icon imports above) are
 * managed by `mdk-ui add page` / `mdk-ui remove page`. Keep the
 * `mdk:nav-icons-end` and `mdk:nav-end` markers, and keep each managed entry on
 * a single line, so the tooling can match and patch them. Add your own
 * hand-written entries here too — anything without a custom icon falls back to
 * the default.
 */
const NAV_ICONS: Record<string, ReactNode> = {
  [ROUTE_PATHS.DASHBOARD]: <DashboardNavIcon />,
  [ROUTE_PATHS.ALERTS]: <AlertsNavIcon />,
  [ROUTE_PATHS.POOL_MANAGER]: <PoolManagerNavIcon />,
  [ROUTE_PATHS.SITE_OVERVIEW]: <ContainerWidgetsNavIcon />,
  [ROUTE_PATHS.EXPLORER]: <ExplorerNavIcon />,
  // mdk:nav-end
}

const DEFAULT_NAV_ICON: ReactNode = <ExplorerNavIcon />

export const getNavIcon = (path: string): ReactNode => NAV_ICONS[path] ?? DEFAULT_NAV_ICON
