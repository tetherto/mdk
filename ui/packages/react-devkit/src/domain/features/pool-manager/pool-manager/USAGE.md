# `PoolManager`

Composite Pool Manager surface. Owns internal, state-based view switching across
the dashboard and the four feature views (Pools, Miner Explorer, Sites Overview,
Site Detail), so the whole experience resolves to a single route. The global
`ActionsSidebar` (mounted in [`App.tsx`](../../../../../../../../examples/mdk-ui-shell-template/src/App.tsx)) handles writes staged from any sub-view
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

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `poolConfig` | Required | `PoolConfigEntry[]` | - | Pool configurations shared by every sub-view (Pools, Miner Explorer, Sites) |
| `alerts` | Optional | `Alert[]` | - | Recent alerts for the dashboard list |
| `className` | Optional | `string` | - | Additional class names |
| `initialView` | Optional | `"dashboard" \| "pools" \| "sites-overview" \| "miner-explorer" \| "site-detail"` | `"dashboard"` | Initial view (defaults to `dashboard`) |
| `isSiteDetailLoading` | Optional | `boolean` | - | Site Detail loading flag |
| `isSitesLoading` | Optional | `boolean` | - | Sites Overview loading flag |
| `isStatsLoading` | Optional | `boolean` | - | Dashboard stats loading flag |
| `miners` | Optional | `ListThingsDevice[]` | `[]` | Miners for the Miner Explorer view |
| `onSiteSelect` | Optional | `((unitId: string) => void)` | - | Notified with the selected unit id when a site card is opened |
| `onViewAllAlerts` | Optional | `VoidFunction` | - | Dashboard "View All Alerts" handler (e.g. navigate to `/alerts`) |
| `onViewChange` | Optional | `((view: PoolManagerView) => void)` | - | Notified whenever the active view changes (lets the page lazy-fetch) |
| `siteDetailDataOptions` | Optional | `SiteOverviewDetailsDataOptions` | - | Extra data-fetch knobs forwarded to the Site Detail container |
| `siteDevices` | Optional | `ContainerUnit[]` | `[]` | Raw container devices used to resolve the selected unit for Site Detail |
| `sitesError` | Optional | `unknown` | - | Sites Overview error |
| `stats` | Optional | `DashboardStats` | - | Dashboard site-level stat blocks |
| `units` | Optional | `ProcessedContainerUnit[]` | `[]` | Normalised site units for the Sites Overview view |
| `view` | Optional | `"dashboard" \| "pools" \| "sites-overview" \| "miner-explorer" \| "site-detail"` | - | Controlled view — when provided the component syncs its internal state to this value whenever it changes (e.g. driven by a URL query param). Leave undefined to rely solely on `initialView` / internal navigation |
<!-- END GENERATED: props -->

## Loading & error states

`isStatsLoading`, `isSitesLoading`, and `isSiteDetailLoading` render the
respective sub-views in a loading state; `sitesError` surfaces a fetch failure on
the Sites Overview grid. Forward the adapter hooks' `isLoading` / `error` fields
straight through.

## Controlled vs. uncontrolled view

- **Uncontrolled** — pass only `initialView` (or nothing) and let `<PoolManager>`
  own navigation internally via its dashboard blocks and back buttons
- **Controlled** — pass `view` (typically derived from a `?view=` URL query
  param) and handle `onViewChange` to write it back. The component syncs its
  internal state to `view` whenever it changes.

## Wiring site detail

Site Detail is a transient view opened by clicking a Sites Overview card. Capture
the selected unit id via `onSiteSelect`, then pass `siteDetailDataOptions`
(e.g. the miners assigned to that container) and `isSiteDetailLoading` so the
view shows live data. See [`examples/mdk-ui-shell-template/_managed/pages/PoolManager.tsx`](../../../../../../../../examples/mdk-ui-shell-template/_managed/pages/PoolManager.tsx) for
a complete example.
