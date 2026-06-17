import {
  useActiveIncidents,
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
  AlarmsBellButton,
  AppHeader,
  HeaderConsumptionBox,
  HeaderEfficiencyBox,
  HeaderHashrateBox,
  HeaderMinersBox,
  HeaderStatsBar,
  MdkWordmark,
  Sidebar,
} from '@tetherto/mdk-react-devkit'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { UserMenu } from './components/UserMenu'
import { getNavIcon } from './constants/navigation'
import { ROUTE_PATHS } from './constants/routes'
import { ROUTES } from './routes'

import './App.scss'

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
  const incidents = useActiveIncidents()

  const incidentCounts = useMemo(() => {
    const items = incidents.data ?? []
    let critical = 0
    let high = 0
    let medium = 0
    for (const row of items) {
      const sev = row.severity?.toLowerCase()
      if (sev === 'critical') critical += 1
      else if (sev === 'high') high += 1
      else if (sev === 'medium') medium += 1
    }
    return { critical, high, medium }
  }, [incidents.data])

  const sidebarItems = useMemo(
    () => [
      { id: ROUTE_PATHS.DASHBOARD, label: 'Dashboard', icon: getNavIcon(ROUTE_PATHS.DASHBOARD) },
      { id: ROUTE_PATHS.ALERTS, label: 'Alerts', icon: getNavIcon(ROUTE_PATHS.ALERTS) },
      ...ROUTES.map((route) => ({
        id: route.path,
        label: route.label,
        icon: getNavIcon(route.path),
      })),
    ],
    [],
  )

  return (
    <div className="mdk-ui-shell-root">
      <AppHeader
        logo={<MdkWordmark size="md" />}
        actions={
          <>
            <AlarmsBellButton
              counts={incidentCounts}
              onClick={() => {
                void navigate(ROUTE_PATHS.ALERTS)
              }}
              onSeverityClick={(severity) => {
                void navigate(`${ROUTE_PATHS.ALERTS}?severity=${severity}`)
              }}
            />
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
          activeId={location.pathname}
          onItemClick={(item) => {
            void navigate(item.id)
          }}
          defaultExpanded
        />
        <main className="mdk-ui-shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App
