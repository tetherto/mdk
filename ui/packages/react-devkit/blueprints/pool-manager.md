---
id: pool-manager
title: Pool Manager
intent: >
  Full-featured mining-pool management page: pool list/config, Miner
  Explorer, Sites Overview, and Site Detail, all backed by live backend
  calls. Includes write operations (create pool, update pool, assign
  miners) through the voting/approval workflow — drafts are staged
  locally, submitted to the backend, and tracked in the ActionsSidebar
  until a second operator approves or cancels them.
domain: mining-operations
kernelCapabilities:
  - pool-config
  - mining-pools
  - miner-assignment
  - voting-workflow
components:
  - PoolManager
  - ActionsSidebar
  - PendingActionsButton
hooks:
  - usePoolConfigs
  - useSiteOverviewDetailsData
demoRoute: /pool-manager
---

## When to use

Pick this blueprint when the user wants the canonical Pool Manager view
from a mining operator UI — the dashboard landing with pool stats,
a collapsible pool list with add/edit flows, a miner assignment
explorer, and a sites-overview grid — all wired to the real
MiningOS backend and supporting multi-operator approval workflows.

The blueprint recreates the behaviour of the `the reference app` Pool Manager
using only MDK components and hooks. The single `<PoolManager>` feature
composes all four sub-views and owns the internal routing; the page only
supplies data, URL state, and navigation callbacks.

Scaffold via the default template (Pool Manager ships out of the box):

```bash
mdk-ui create my-app --template mdk-ui-shell
```

Or add it to an existing shell app:

```bash
mdk-ui add page PoolManager
```

## Page composition

```tsx
import {
  useMinerDevices,
  usePoolConfigsData,
  usePoolManagerDashboard,
  useSitesOverview,
} from "@tetherto/mdk-react-adapter";
import { PoolManager } from "@tetherto/mdk-react-devkit";
import type {
  Alert,
  DashboardStats,
  Device,
  PoolManagerView,
} from "@tetherto/mdk-react-devkit";
import { useNavigate, useSearchParams } from "react-router-dom";

const VALID_VIEWS = new Set<PoolManagerView>([
  "dashboard",
  "pools",
  "sites-overview",
  "miner-explorer",
  "site-detail",
]);

export default function PoolManagerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sidebar sub-items set ?view= — validate and fall back to dashboard.
  const viewParam = searchParams.get("view");
  const currentView: PoolManagerView =
    viewParam && VALID_VIEWS.has(viewParam as PoolManagerView)
      ? (viewParam as PoolManagerView)
      : "dashboard";

  const handleViewChange = (next: PoolManagerView) => {
    if (next === "dashboard") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ view: next }, { replace: true });
    }
  };

  const { data: poolConfig } = usePoolConfigsData();
  const { data: miners } = useMinerDevices();
  const sites = useSitesOverview();
  const dashboard = usePoolManagerDashboard();

  return (
    <PoolManager
      poolConfig={poolConfig ?? []}
      miners={miners as unknown as Device[]}
      units={sites.units}
      siteDevices={sites.rawUnits as unknown as Device[]}
      isSitesLoading={sites.isLoading}
      sitesError={sites.error}
      stats={dashboard.stats as DashboardStats}
      isStatsLoading={dashboard.isLoading}
      alerts={dashboard.alerts as Alert[]}
      onViewAllAlerts={() => navigate("/alerts")}
      view={currentView}
      onViewChange={handleViewChange}
    />
  );
}
```

## State / data flow

- `usePoolConfigsData()` polls `GET /auth/configs/pool` (raw pool configurations).
- `useMinerDevices()` polls `GET /auth/list-things?tag=t-miner` — returns the
  `Device[]` shape the Miner Explorer uses to resolve pool names per device.
- `useSitesOverview()` merges container units, per-container pool stats, and
  tail-log data into display-ready `ProcessedContainerUnit[]` for Sites Overview
  and Site Detail.
- `usePoolManagerDashboard()` derives header stats (hashrate, miners online,
  pool summary) and the recent-alerts feed for the landing dashboard.
- All writes go through the **voting/approval workflow** — modals enqueue a
  draft in `actionsStore` via `setAddPendingSubmissionAction`. The `ActionsSidebar`
  (mounted globally in `App.tsx`) shows the draft, lets the user submit it, and
  polls `GET /auth/actions` every 5 s to track the action through
  `voting → ready → executing → done`.
- `useSubmitSingleAction` / `useSubmitPendingActions` POST to
  `POST /auth/actions/voting`. They inspect HTTP 200 responses for embedded
  permission errors (code `ERR_KERNEL_ACTION_CALLS_EMPTY`) and surface them to the
  user before removing the action from the queue.
- `useVoteOnAction` and `useCancelAction` support multi-operator flows:
  a second operator can approve (`PUT /auth/actions/voting/:id/vote`) or cancel
  (`DELETE /auth/actions/voting/cancel`) a pending action.

## Routing

- The page registers at `/pool-manager` when scaffolded or pre-seeded
  (the `ROUTE_PATHS.POOL_MANAGER` constant in the shell).
- Internal sub-views are selected via the `?view=` URL query parameter:
  `/pool-manager` → Dashboard, `/pool-manager?view=pools` → Pools,
  `/pool-manager?view=sites-overview` → Sites Overview,
  `/pool-manager?view=miner-explorer` → Miner Explorer.
- The `mdk-ui-shell` sidebar emits these URLs as nested items under the Pool
  Manager group.
- Site Detail is a transient view navigated to by clicking a site card; it sets
  `view=site-detail` internally and does not appear as a sidebar link.

## Voting workflow

The write path mirrors the reference app's approval flow:

1. User fills the Add Pool, Edit Pool, or Assign Miners modal.
2. On confirm, the modal calls `setAddPendingSubmissionAction` with the action
   type (`registerPoolConfig`, `updatePoolConfig`, `setupPools`) and params.
3. The draft appears in the `ActionsSidebar` with Discard / Submit buttons.
4. On Submit, `useSubmitSingleAction` POSTs to `/auth/actions/voting`. An
   "Action Submitted" card replaces the draft immediately (optimistic update).
5. `useLiveActions` polls every 5 s; once the server confirms the action, the
   optimistic card is replaced by the live entry.
6. A second operator (or the same operator with sufficient permissions) can
   Approve or Cancel from the "Requested" section of the sidebar.

## Common variations

- **Controlled vs. uncontrolled view** — pass `view` (controlled, synced from the
  `?view=` query param as above) or just `initialView` to let `<PoolManager>` own
  navigation internally. Omit both to start on the dashboard.
- **Wire Site Detail data** — pass `onSiteSelect` to capture the opened unit id,
  then feed `siteDetailDataOptions` (e.g. the miners assigned to that container)
  and `isSiteDetailLoading` so Site Detail shows live data instead of a static
  shell. See `templates/mdk-ui-shell/src/pages/PoolManager.tsx`.
- **Read-only operators** — the `ActionsSidebar` does not gate its buttons on
  client-side permission flags; authorization is enforced by the API. The write
  hooks (`useSubmitPendingActions`, `useVoteOnAction`, `useCancelAction`) still
  expose `canSubmit` / `canVote` / `canCancel` for callers that want to build
  their own gated UI outside the sidebar.
- **Pinned sidebar** — persist `actionsStore.sidebarPinned` to render the
  `ActionsSidebar` as an inline panel beside the content instead of a drawer.
- **Custom poll cadence** — every read hook accepts `refetchInterval`; the
  dashboard additionally accepts `liveRefetchInterval` to tune the live
  site-status snapshot independently of the slower reads.

## Going further

- Pass `onViewAllAlerts` pointing at a custom route to deep-link the alerts bell.
- Subscribe to `actionsStore` in your own components to read `pendingSubmissions`
  and render pending-count badges anywhere in the UI.
- The `<ActionsSidebar>` can be pinned (persistent inline panel) or unpinned
  (slide-in drawer) — the pin state is persisted in `actionsStore.sidebarPinned`.
- To add a new write action type, add a constant to `ACTION_TYPES`, a label to
  `ACTION_NAMES_MAP`, and wire a new modal that calls `setAddPendingSubmissionAction`.
