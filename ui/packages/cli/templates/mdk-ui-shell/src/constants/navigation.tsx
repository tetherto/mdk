import type { ReactNode } from 'react'
import { DashboardNavIcon, ExplorerNavIcon } from '@tetherto/mdk-react-devkit'

import { ROUTE_PATHS } from './routes'

/**
 * Sidebar nav icon lookup. Built-in paths map to their dedicated icons;
 * user-added routes fall back to a generic explorer icon.
 *
 * Add entries here whenever you scaffold a new page that should appear
 * in the sidebar with a custom icon. The MDK CLI doesn't manage this
 * file.
 */
const NAV_ICONS: Record<string, ReactNode> = {
  [ROUTE_PATHS.DASHBOARD]: <DashboardNavIcon />,
}

const DEFAULT_NAV_ICON: ReactNode = <ExplorerNavIcon />

export const getNavIcon = (path: string): ReactNode => NAV_ICONS[path] ?? DEFAULT_NAV_ICON
