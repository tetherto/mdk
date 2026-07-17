import {
  useActions,
  useDashboardTimeRange,
  usePoolStats,
  useSiteContainerCapacity,
  useSiteEfficiency,
  useSiteHashrate,
  useSiteMinerStats,
  useSitePowerMeter,
  useTokenPolling,
} from '@tetherto/mdk-react-adapter'
import {
  ActionsSidebar,
  AlarmsBellButton,
  AppHeader,
  ContainerWidgetsNavIcon,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
  MdkWordmark,
  OperationsNavIcon,
  PendingActionsButton,
  Sidebar,
} from '@tetherto/mdk-react-devkit'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { UserMenu } from './components/UserMenu'
import { getNavIcon } from './constants/navigation'
import { ROUTE_PATHS } from './constants/routes'
import { ROUTES } from './routes'

import './App.scss'

// Derived once from the ROUTES constant — the single source of truth managed
// by `mdk-ui add/remove page`. When a page is removed, its header icon and
// any associated sidebar component disappear automatically without any further
// changes to this file.
//
// Alerts is loaded lazily from the managed ROUTES registry, so the first
// `/alerts` visit shows a brief Suspense fallback (a deliberate trade-off for
// add/remove-ability). The header bell count comes from `minerStats.alertCounts`
// (the `alerts_aggr` server-side aggregate, matching Mining OS) rather than the
// list-things-derived `useActiveIncidents`, so it reflects the true total.
const HAS_ALERTS = ROUTES.some((r) => r.path === ROUTE_PATHS.ALERTS)
const HAS_POOL_MANAGER = ROUTES.some((r) => r.path === ROUTE_PATHS.POOL_MANAGER)

// The actions draft/review flow (PendingActionsButton + ActionsSidebar) is
// shared by every page that queues device writes — Pool Manager and the
// Operational Centre pages (Site Overview, Explorer). Mount it whenever any of
// them is present so the drawer is available across those pages.
const HAS_ACTIONS =
  HAS_POOL_MANAGER ||
  ROUTES.some((r) => r.path === ROUTE_PATHS.EXPLORER || r.path === ROUTE_PATHS.SITE_OVERVIEW)

export const App = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Keeps the session token fresh; clears it on a 401 / 500 and bounces back
  // to /signin via `onSessionEnded`.
  useTokenPolling({
    onSessionEnded: () => {
      void navigate(ROUTE_PATHS.SIGN_IN, { replace: true })
    },
  })

  // Header stats reflect "live now" — they share TanStack Query caches with
  // the Dashboard chart hooks (`stat-1m`) so this triggers no extra fetch
  // when /dashboard is mounted. The dashboard's own date-range picker scopes
  // the chart cards, not these snapshot stats.
  const { timeline } = useDashboardTimeRange()
  const hashrate = useSiteHashrate({ timeline })
  const sitePower = useSitePowerMeter()
  const efficiency = useSiteEfficiency({ timeline, powerW: sitePower.valueW })
  const minerStats = useSiteMinerStats()
  const containerCapacity = useSiteContainerCapacity()
  const poolStats = usePoolStats()
  // `alertCounts` comes from `alerts_aggr` in the realtime tail-log — the
  // same server-side aggregate Mining OS uses, which reflects the true total of
  // all individual alert instances (not capped by list-things device limit).
  const incidentCounts = minerStats.alertCounts
  const { sidebarPinned } = useActions()

  // Dashboard is hardcoded in the router; everything else (Alerts, Pool
  // Manager, user-added pages) is pre-seeded/managed in `./routes`.
  const sidebarItems = useMemo(() => {
    // Operational Centre pages nest under an "Operations Centre > Mining" group
    // (matching Mining OS). They are still managed as flat routes by `mdk-ui
    // add/remove page`; this only groups them for display. If one is removed the
    // group shrinks; if both are removed it disappears.
    const opCentrePaths: string[] = [ROUTE_PATHS.SITE_OVERVIEW, ROUTE_PATHS.EXPLORER]
    const isOpCentre = (path: string): boolean => opCentrePaths.includes(path)

    const topLevelItems = ROUTES.filter((route) => !isOpCentre(route.path)).map((route) => {
      if (route.path === ROUTE_PATHS.POOL_MANAGER) {
        return {
          id: route.path,
          label: route.label,
          icon: getNavIcon(route.path),
          items: [
            { id: ROUTE_PATHS.POOL_MANAGER, label: 'Dashboard' },
            { id: `${ROUTE_PATHS.POOL_MANAGER}?view=pools`, label: 'Pools' },
            { id: `${ROUTE_PATHS.POOL_MANAGER}?view=sites-overview`, label: 'Sites Overview' },
            { id: `${ROUTE_PATHS.POOL_MANAGER}?view=miner-explorer`, label: 'Miner Explorer' },
          ],
        }
      }
      return { id: route.path, label: route.label, icon: getNavIcon(route.path) }
    })

    const miningItems = ROUTES.filter((route) => isOpCentre(route.path)).map((route) => ({
      id: route.path,
      label: route.label,
      icon: getNavIcon(route.path),
    }))

    const operationsCentre = miningItems.length
      ? [
          {
            id: 'operations-centre',
            label: 'Operations Centre',
            icon: <OperationsNavIcon />,
            items: [
              {
                id: 'operations-centre/mining',
                label: 'Mining',
                icon: <ContainerWidgetsNavIcon />,
                items: miningItems,
              },
            ],
          },
        ]
      : []

    return [
      { id: ROUTE_PATHS.DASHBOARD, label: 'Main Dashboard', icon: getNavIcon(ROUTE_PATHS.DASHBOARD) },
      ...operationsCentre,
      ...topLevelItems,
    ]
  }, [])

  return (
    <div className="mdk-ui-shell-root">
      <AppHeader
        logo={<MdkWordmark size="md" />}
        actions={
          <>
            {HAS_ACTIONS && <PendingActionsButton />}
            {HAS_ALERTS && (
              <AlarmsBellButton
                counts={incidentCounts}
                onClick={() => {
                  void navigate(ROUTE_PATHS.ALERTS)
                }}
                onSeverityClick={(severity: string) => {
                  void navigate(`${ROUTE_PATHS.ALERTS}?severity=${severity}`)
                }}
              />
            )}
            <UserMenu
              onSignOut={() => {
                void navigate(ROUTE_PATHS.SIGN_IN, { replace: true })
              }}
            />
          </>
        }
      >
        <HeaderStatsBar>
          <HeaderMinersBox
            mosTotal={minerStats.mosTotal}
            online={minerStats.online}
            error={minerStats.error}
            offline={minerStats.offline}
            total={containerCapacity.value}
            poolTotal={poolStats.total}
            poolOnline={poolStats.online}
            poolMismatch={poolStats.mismatch}
          />
          <HeaderHashrateBox mosPhs={hashrate.valuePhs} poolPhs={poolStats.hashratePhs} />
          <HeaderConsumptionBox valueMw={sitePower.valueMw} />
          <HeaderEfficiencyBox valueWthS={efficiency.valueWthS} />
        </HeaderStatsBar>
      </AppHeader>

      <div className="mdk-ui-shell-content">
        <Sidebar
          items={sidebarItems}
          activeId={location.pathname + location.search}
          onItemClick={(item) => {
            void navigate(item.id)
          }}
          defaultExpanded
        />

        <div className={`mdk-ui-shell-outlet${HAS_ACTIONS && sidebarPinned ? ' mdk-ui-shell-outlet--sidebar-pinned' : ''}`}>
          <main className="mdk-ui-shell-main">
            <Outlet />
          </main>

          {HAS_ACTIONS && <ActionsSidebar />}
        </div>
      </div>
    </div>
  )
}

export default App
