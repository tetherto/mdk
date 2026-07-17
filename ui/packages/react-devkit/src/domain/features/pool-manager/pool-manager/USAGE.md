# PoolManager

Composite Pool Manager surface. Owns internal, state-based view switching across
the dashboard and the four feature views (Pools, Miner Explorer, Sites Overview,
Site Detail), so the whole experience resolves to a single route. The global
`ActionsSidebar` (mounted in `App.tsx`) handles writes staged from any sub-view
(create/edit pool, assign miners) so they can be submitted to the voting workflow.

All data is supplied via props — the shell page is thin glue that reads the
adapter hooks (`usePoolConfigsData`, `useMinerDevices`, `useSitesOverview`,
`usePoolManagerDashboard`) and passes them down.

```tsx
import { PoolManager } from '@tetherto/mdk-react-devkit'
import {
  useMinerDevices,
  usePoolConfigsData,
  usePoolManagerDashboard,
  useSitesOverview,
} from '@tetherto/mdk-react-adapter'

const PoolManagerPage = () => {
  const { data: poolConfig } = usePoolConfigsData()
  const { data: miners } = useMinerDevices()
  const sites = useSitesOverview()
  const dashboard = usePoolManagerDashboard()

  return (
    <PoolManager
      poolConfig={poolConfig}
      miners={miners}
      units={sites.units}
      isSitesLoading={sites.isLoading}
      sitesError={sites.error}
      stats={dashboard.stats}
      isStatsLoading={dashboard.isLoading}
      alerts={dashboard.alerts}
    />
  )
}
```

Must be rendered inside `<MdkProvider>`.

## Props

| Prop | Type | Notes |
|------|------|-------|
| `poolConfig` | `PoolConfigData[]` | Shared by every sub-view. |
| `stats` | `DashboardStats` | Dashboard stat blocks. |
| `isStatsLoading` | `boolean` | Dashboard stats loading flag. |
| `alerts` | `Alert[]` | Recent-alerts list on the dashboard. |
| `onViewAllAlerts` | `() => void` | Dashboard "View All Alerts". |
| `miners` | `Device[]` | Miner Explorer rows. |
| `units` | `ProcessedContainerUnit[]` | Sites Overview cards. |
| `isSitesLoading` | `boolean` | Sites Overview loading flag. |
| `sitesError` | `unknown` | Sites Overview error. |
| `siteDevices` | `Device[]` | Resolves the selected unit for Site Detail. |
| `siteDetailDataOptions` | `SiteOverviewDetailsDataOptions` | PDU / connected-miner data forwarded to Site Detail. |
| `isSiteDetailLoading` | `boolean` | Site Detail loading flag. |
| `initialView` | `PoolManagerView` | Starting view (uncontrolled). Defaults to `dashboard`. |
| `view` | `PoolManagerView` | Controlled view — syncs internal state whenever it changes. |
| `onViewChange` | `(view) => void` | Lets the page lazy-fetch per view. |
| `onSiteSelect` | `(unitId) => void` | Fired when a site card opens — wire Site Detail data off this. |

## Loading & error states

`isStatsLoading`, `isSitesLoading`, and `isSiteDetailLoading` render the
respective sub-views in a loading state; `sitesError` surfaces a fetch failure on
the Sites Overview grid. Forward the adapter hooks' `isLoading` / `error` fields
straight through.

## Controlled vs. uncontrolled view

- **Uncontrolled** — pass only `initialView` (or nothing) and let `<PoolManager>`
  own navigation internally via its dashboard blocks and back buttons.
- **Controlled** — pass `view` (typically derived from a `?view=` URL query
  param) and handle `onViewChange` to write it back. The component syncs its
  internal state to `view` whenever it changes.

## Wiring Site Detail

Site Detail is a transient view opened by clicking a Sites Overview card. Capture
the selected unit id via `onSiteSelect`, then pass `siteDetailDataOptions`
(e.g. the miners assigned to that container) and `isSiteDetailLoading` so the
view shows live data. See `templates/mdk-ui-shell/src/pages/PoolManager.tsx` for
a complete example.
