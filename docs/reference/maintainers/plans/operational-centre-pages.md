# Plan: Operational Centre Pages in the MDK (Site Overview + Explorer)

**Status:** Draft / planning only — no implementation yet
**Author:** Arif Dewi
**Date:** 2026-06-29
**Companion plan:** [`pool-management-page.md`](./pool-management-page.md) (same shape, prior page)

---

## 1. Goal

Add two fully working **Operational Centre** pages to the MDK so that a generated
`mdk-shell-ui` app can ship them (alongside Dashboard, Alerts, Pool Manager),
backed by **real MiningOS backend calls**, including **write/control operations
through the voting/approval workflow**. Make both pages **add-able / removable via
the CLI** like any other page.

The two pages (as seen in the running operator app at `localhost:3030`):

1. **Site Overview → Container Widgets** — `/operations/mining/site-overview/container-widgets`
   (+ sibling `container-charts`).
2. **Explorer** — `/operations/mining/explorer?tab=container` and **all sub-pages**
   (tabs `container` / `miner` / `cabinet`, plus the deep per-container **Thing detail**
   view with its full tab matrix).

### Scope (confirmed with stakeholder, 2026-06-29)

- **Full parity, Explorer detail tabs.** All 9 detail tabs (Home, PDU, Parameters,
  Alarm, Controls, Settings, Charts, Heatmap, Power Adjustment) across all 6 container
  models (Bitdeer, AntspaceHydro, AntspaceImmersion, MicroBT, Gamma),
  including the PDU multi-select grid and the heatmap.
- **Writes included now.** Device control actions (reboot, set power mode, set LED,
  position change, add/replace miner) and comments go through the voting/approval
  workflow — reusing the Pool Manager's existing voting infrastructure
  (`ActionsSidebar`, voting hooks) where possible.
- **Full vendor parity, Container Widgets.** All vendor boxes (supply-liquid, tanks,
  Bitmain immersion, MicroBT) and DCS cooling/energy wiring, matching the reference app.
- **API surface: match the reference app exactly.** Target the reference app's proven calls
  (`/list-things`, `/tail-log`, `/tail-log/multi`, `/list-racks`, `/pdu-layout`,
  `/site`, `/global/data`, `/thing-config`, `/global-config`, `/feature-config`,
  `/actions/*`, `/thing/comment`) rather than the newer aggregated `/auth/*` endpoints.
  See §3 and the API-divergence risk in §9.
- **Both CLI paths.** Both pages ship as add-able/removable managed pages.

> ⚠️ **This is a large, multi-sprint effort** — materially bigger than the Pool
> Manager page. The Explorer detail-tab matrix alone (9 tabs × 6 models, PDU grid,
> heatmap, power adjustment) is the dominant cost. The plan is phased in §7 so a
> usable slice can land early even though the committed scope is full parity.

---

## 2. Current state (what already exists — verified)

This is **not greenfield**, but the reusable surface is thinner than it was for Pool
Manager. The gaps are: vendor widget boxes, the entire Explorer detail-tab matrix,
DCS/PDU/heatmap data wiring, container-control writes, and page/CLI assembly.

### Already in the MDK (`ui/packages/react-devkit`)

- **`foundation/components/pool-manager/`** — `sites-overview` (status-card grid),
  `site-overview-details` (drilldown w/ grid-unit + miner-info-card), `miner-explorer`
  (toolbar + table). **Pool-specific** today — reusable as *templates* for the generic
  site-overview / explorer, but carry pool summaries / assign-pool seams to generalize.
- **`foundation/components/device-explorer/`** — presentational miner/device table,
  unwired. Closest existing analog to the Explorer **list** view.
- **`foundation/components/container/`** — `container-charts`, `container-controls-box`.
- **`foundation/components/widget-top-row/`**, **`info-container/`** — header stat
  blocks / info cards usable in the widget grid.
- **`foundation/features/pool-manager/`** — feature-level assemblies + internal routing
  (the `PoolManager` composite) — the pattern to mirror for an `Explorer` composite.

### Already in `react-adapter`

- Site/container: `useSitesOverview`, `useContainerUnits`, `useContainerPoolStats`,
  `useSiteDetailMiners`, `useSiteMinerCounts`, `useSiteMinerStats`, `useSiteHashrate`,
  `useSiteStatusLive`.
- Miner/device: `useMinerDevices`, `useMiners`, `useGetAvailableDevices`.
- Charts/reporting: `useHashrateChartData`, `useSiteConsumptionChartData`,
  `useActiveIncidents`, `useHistoricalAlerts`, `useDashboardTimeRange`.

### Already in `ui-foundation`

- Query factories/keys for `listThings`, `miners`, `siteStatusLive`,
  `containerPoolStats`, pool reads. Voting mutation infra from the Pool Manager work.

### Already in the CLI (`ui/packages/cli`)

- `add-page.ts` / `remove-page.ts` (driven by `// mdk:routes-end`, `// mdk:nav-*`
  markers), and `managed-pages.ts` (pre-wired pages: `PoolManager`, `Alerts`).
- Template `templates/mdk-ui-shell/src/pages/` has `Dashboard`, `Alerts`,
  `PoolManager`, `SignIn`, `NotFound`. `PoolManager.tsx` is the canonical
  pre-wired-page example (~60 lines: hooks in, composite feature out).

### Already in registry / blueprints

- Blueprints: `device-management` (uses `DeviceExplorer`),
  `mining-operations-dashboard`, `pool-manager`, `alerts`, `reporting`. Mirror these
  for two new blueprints.

### The gaps (what this plan actually delivers)

1. **Container Widgets page** — no widget-card grid; no vendor boxes (supply-liquid,
   tanks, Bitmain immersion, MicroBT); no per-container miners-summary + activity-chart
   composite; no `container-charts` sub-view assembly.
2. **Explorer list+detail split** — no `ExplorerLayout` / split-view shell; the
   `DeviceExplorer` table is unwired and lacks the cabinet/container table variants and
   the sticky detail panel.
3. **Explorer Thing-detail tab matrix** — almost entirely missing: PDU grid
   (`react-selecto` multi-select, socket legend, heatmap-in-PDU), Heatmap tab, Power
   Adjustment tab, Parameters, Alarm, Controls, Settings, Charts (per-model). Plus the
   per-model **tab support matrix** logic.
4. **DCS / PDU / racks data wiring** — `/pdu-layout`, `/list-racks`, `/global/data`
   (container settings/thresholds), `/thing-config`, `/feature-config`,
   `/tail-log/multi` are not (or only partially) wired as factories/hooks.
5. **Container-control writes** — reboot, set_power_mode, set_led, position change,
   add/replace miner, and device comments — none modeled as MDK mutation hooks.
6. **No shell pages** for Site Overview or Explorer; **no managed-page entries**;
   **no blueprints/registry** entries for either.

---

## 3. Backend contract (MiningOS, port 3000 — the reference app's surface)

Per the scope decision, the MDK targets **the reference app's existing API calls**. All authed via
`Authorization: Bearer <token>`. Reads use server-side LRU caching; `?overwriteCache=true`
bypasses it.

### Reads

| Method | Path | Feeds | Notes |
|---|---|---|---|
| GET | `/list-things` | Container Widgets grid, Explorer list, Thing detail | `query` (tag filter e.g. `t-container` / `t-miner` / `t-powermeter` / `t-sensor`), `status`, `limit`, `sort`, `fields` |
| GET | `/tail-log` | Real-time stats (hashrate, temp, power, pressure, oil level) | `key=STAT_REALTIME`, `type`, tag, `limit`, aggregated `fields` |
| GET | `/tail-log/multi` | Multi-device stat queries | batched |
| GET | `/list-racks` | Explorer rack layout | rack structure |
| GET | `/pdu-layout` | PDU tab socket grid + miner positions | container type + info |
| GET | `/site` | Site name / filter options | |
| GET | `/global/data?type=containerSettings` | Container thresholds / alarm settings | optional `model`, `overwriteCache` |
| GET | `/thing-config` | Thing-specific config (Settings tab) | |
| GET | `/global-config` | Global system config | |
| GET | `/feature-config` | Feature flags (poolStats, containerCharts, …) | gates optional tabs/sub-routes |

### Writes — all via the voting/approval workflow

| Method | Path | Purpose |
|---|---|---|
| POST | `/actions/{type}` | Create action (reboot, set_power_mode, set_led, position_change, add_miner, replace_miner) → enters voting |
| POST | `/actions/{type}/batch` | Batch action creation |
| PUT | `/actions/voting/{id}/vote` | Approve/reject a pending action — body `{ approve: boolean }` |
| DELETE | `/actions/{type}/cancel` | Cancel pending actions — `?ids=1,2,3` |
| POST | `/thing/comment` | Add device comment |
| PUT | `/thing/comment` | Edit device comment |
| DELETE | `/thing/comment` | Delete device comment |

**Voting flow (from the reference app):** dispatch → queue pending submission (action type, tags,
params) → submit (`POST /actions/{type}`) → backend creates voting record → users vote
(`PUT …/vote`, approve true/false) → on approval the action executes. Re-express the reference app's
Redux `setAddPendingSubmissionAction` flow as TanStack mutation hooks + the MDK's Zustand
`actionsStore`, reusing the Pool Manager voting plumbing.

---

## 4. Stack translation note (important)

The reference app is **Ant Design + styled-components + Redux Toolkit (RTK Query) + Formik/Yup**.
The MDK is **Radix + SCSS/BEM + Zustand + TanStack Query + React Hook Form + Zod**.
Translation work per surface:

- **Tables** — antd `Table` → TanStack React Table (already the MDK convention; see
  `DeviceExplorer` / `miner-explorer`).
- **Charts** — chart.js / react-chartjs-2 / lightweight-charts / react-gauge-chart →
  the MDK's `LineChartCard` + chart primitives. Gauge/heatmap visuals need MDK
  equivalents (no gauge primitive exists yet — see §9).
- **PDU multi-select** — `react-selecto` grid → confirm whether to port `react-selecto`
  or build a Radix/native selection grid (parity vs. simplification — see §9).
- **Forms** — Formik/Yup → React Hook Form + Zod.
- **Data + mutations** — RTK Query slices → TanStack Query factories (`ui-foundation`) + adapter
  hooks; the voting submission flow → mutation hooks (not Redux dispatch).
- **Selection state** — the reference app's `devicesSlice` (`selectedDevices`, `selectedContainers`,
  `selectedSockets`, `filterTags`) and `actionsSlice` (`pendingSubmissions`) → MDK Zustand
  stores (extend `actionsStore`; add a selection store/slice as needed).

---

## 5. Architecture / layering (follow the MDK's 4-layer rule)

1. **`ui-foundation` (headless data layer)** — query + mutation factories + types:
   - Read factories: `listThingsQuery` (parametrized by tag), `tailLogQuery`,
     `tailLogMultiQuery`, `listRacksQuery`, `pduLayoutQuery`, `siteQuery`,
     `containerSettingsQuery` (`/global/data`), `thingConfigQuery`, `globalConfigQuery`,
     `featureConfigQuery`. Reuse existing `listThings`/`miners` where they fit.
   - Mutation factories: `deviceActionMutation` (single/batch), `voteOnActionMutation`,
     `cancelActionMutation`, `thingCommentMutation` (add/edit/delete).
   - Param builders + domain types: `ContainerUnit`, `ContainerModel`, `MinerRecord`,
     `Rack`, `PduLayout`, `Socket`, `CabinetGroup`, `ContainerThresholds`,
     `DeviceActionPayload`, `ContainerTab` (the per-model tab matrix as data).
   - The **per-model tab support matrix** (the reference app's `containerTabsHelper`) lives here as a
     pure data/util module, consumed by the feature — no model strings leak into pages.
2. **`react-adapter` (React bindings)** — hooks owning fetch/poll/shape + mutations:
   - Reads: `useContainerWidgets`, `useContainerActivity`, `useCoolingSystem` /
     `useDcsData`, `useContainerCharts`, `useExplorerList(tab)`, `useThingDetail(id)`,
     `usePduLayout`, `useContainerSettings`, `useRackLayout`, `useCabinetGroups`,
     `useFeatureFlags`. Reuse `useSitesOverview` / `useMinerDevices` where applicable.
   - Writes: `useDeviceAction` (reboot/power-mode/led/position/add-replace),
     `useVoteOnAction`, `useCancelAction`, `useThingComment` — submission/approval state,
     invalidation, permission gating.
3. **`react-devkit` (components/features)** — presentational widget boxes + Explorer
   list/detail + the tab components, wired at the **feature** level; leaf components stay
   props-driven. New components: vendor widget boxes, PDU grid, heatmap, power-adjustment,
   per-model tab shells, cabinet detail view.
4. **Shell pages** — thin glue: a `SiteOverview` page (widgets + charts sub-views) and an
   `Explorer` page (list+detail split + Thing-detail internal routing across tabs/models).

---

## 6. Workstreams

### WS-A — Data layer in `ui-foundation` (reads)
- Add read query factories + param builders + types listed in §5.1 (list-things by tag,
  tail-log / multi, racks, pdu-layout, site, container settings, thing/global/feature
  config). Reuse existing factories where shapes match.
- Encode the **per-model container-tab matrix** as a pure data module.
- Unit tests for param builders, query keys, tab-matrix resolution.

### WS-B — Data layer in `ui-foundation` (writes / voting)
- `deviceActionMutation` (single + batch), `voteOnActionMutation`, `cancelActionMutation`,
  `thingCommentMutation`; payload types for each action (reboot, power-mode, led, position
  change, add/replace miner). Reuse Pool Manager voting plumbing.
- Tests for payload construction + the action-type → endpoint mapping.

### WS-C — Adapter hooks (reads)
- The read hooks in §5.2: widgets, activity, DCS/cooling, container charts, explorer list
  per tab, thing detail, pdu layout, container settings, rack layout, cabinet groups,
  feature flags. Consistent polling with existing site hooks; `select`-based shaping.
- Tests mirroring existing `use-*` hook tests.

### WS-D — Adapter hooks (writes / voting)
- `useDeviceAction`, `useVoteOnAction`, `useCancelAction`, `useThingComment` — approval
  state model (pending → voted → applied/cancelled), cache invalidation, permission gating.
- Tests for payload + invalidation.

### WS-E — Container Widgets page components (full vendor parity)
- Widget-card grid + `ContainerWidgetCard` (device status, top row, miners-summary box,
  miners-activity chart). Reuse `WidgetTopRow` / `InfoContainer` / `ContainerCharts`.
- Vendor boxes: `SupplyLiquidBox`, `TanksBox` (+ `TankRow`), `BitmainImmersionSummaryBox`,
  `MicroBTWidgetBox` / `MicroBtSummaryBox`. Confirmation modal.
- `container-charts` sub-view (multi line-chart cards + container/metric selectors).
- Wire to WS-C hooks; keep leaf components pure. Component tests.

### WS-F — Explorer list + detail-panel components
- `ExplorerLayout` (permission-gated) + split view (`ExplorerViewRow` / cols + sticky
  detail col). List view with header (filter/search) + per-tab tables (container / miner /
  cabinet) on TanStack Table. Detail panels: `DetailsView` (miner stats/charts/controls),
  `LvCabinetDetailsView`. Comments popover.
- Wire to WS-C/WS-D hooks. Component tests.

### WS-G — Explorer Thing-detail tab matrix (the big one)
- Per-model tab shell driven by the WS-A tab matrix. Tabs:
  **Home** (content box, controls box, stats group card, connected-miners table),
  **PDU** (grid + `react-selecto`-equivalent multi-select, socket legend, heatmap legend,
  add/replace-miner + position-change dialogs), **Parameters**, **Alarm**, **Controls**
  (immersion), **Settings**, **Charts** (per-model + group charts), **Heatmap**,
  **Power Adjustment** (Whatsminer).
- Wire control actions through WS-D voting hooks. Component tests per tab.
- *Sequenced internally by phase — see §7.*

### WS-H — Shell page assembly
- `SiteOverview` page (container-widgets + container-charts sub-views, internal routing).
- `Explorer` page (list+detail split + Thing-detail internal routing across tab/model/id).
- Header stats / breadcrumbs consistent with Dashboard / Pool Manager.

### WS-I — Template + default wiring
- Add both pages to `templates/mdk-ui-shell/src/pages/`; mirror in the live
  `apps/mdk-ui-shell` for dev/QA. Sidebar entries, routes, nav icons.

### WS-J — CLI: make both pages add/remove-able
- Add `managed-pages.ts` entries (`SiteOverview`, `Explorer`) with route/nav/templatePage
  metadata. Ensure `mdk-ui add page SiteOverview` / `Explorer` + `remove page` scaffold
  correctly (component resolution, routes/nav markers). CLI tests.

### WS-K — Registry / blueprints / docs
- `registry.json` entries for the new component surface; two blueprints
  (`mdk-ui-shell-site-overview`, `mdk-ui-shell-explorer`) mirroring the dashboard /
  pool-manager blueprints (intent, components, hooks, demoRoute, kernelCapabilities,
  variations). USAGE docs; regenerate registry/blueprints/hooks/stores manifests.

### WS-L — Catalog demos
- Catalog routes/pages for the new components & features (per `apps/catalog` conventions:
  `DemoPageHeader`, `DemoBlock`, store seeding), so each surface is demoable in isolation.

### WS-M — Real-BE verification & QA
- Run against the local MiningOS BE (`node worker.js --wtype wrk-node-http --env
  production --port 3000`) with a real token. Smoke every view, every tab × model, and
  every write path (each control action creates a pending voting action; vote/cancel
  works). Error/permission/empty/polling states.

---

## 7. Sequencing (phased — usable slice early, full parity committed)

**Critical path:** A → C → (E, F) → H → I.

1. **Phase 0 — Spike & contracts.** Confirm endpoint shapes against the live BE
   (response fields per §3), the per-model tab matrix, the PDU/heatmap data shapes, and
   the exact voting payloads per action. Resolve §9 open questions. *(do first)*
2. **Phase 1 — Data layer.** WS-A (reads) → WS-B (writes), with WS-C/WS-D hooks following.
3. **Phase 2 — Pages, read-first slice.** WS-E (Container Widgets, generic cards first)
   + WS-F (Explorer list + detail panel) + WS-G **Home + Charts tabs** → WS-H pages →
   WS-I template. *This is the first demoable end-to-end slice.*
4. **Phase 3 — Vendor parity + remaining tabs.** WS-E vendor boxes + DCS; WS-G PDU,
   Heatmap, Power Adjustment, Parameters, Alarm, Controls, Settings across all 6 models.
5. **Phase 4 — Writes everywhere.** WS-D control actions wired into PDU/Controls/
   Power-Adjustment via voting.
6. **Phase 5 — CLI + registry + catalog.** WS-J → WS-K → WS-L.
7. **Phase 6 — QA.** WS-M full pass.

---

## 8. Risks & open questions

- **Scale.** Full parity on the Explorer tab matrix (9 tabs × 6 models + PDU grid +
  heatmap + power adjustment) is the dominant cost and the main schedule risk — phasing
  (§7) is what keeps it shippable. The per-model matrix multiplies test surface.
- **API divergence (load-bearing).** The reference app's surface (`/list-things`, `/tail-log`,
  `/pdu-layout`, `/global/data`) differs from the newer aggregated `/auth/*` endpoints
  the MDK already partly targets, and from the Pool Manager plan's `/auth/*` contract.
  Targeting the reference app's surface means the new factories may **not** share keys/paths with the
  existing `/auth/site/status/live` / `/auth/miners` factories — confirm whether to add a
  parallel set or reconcile. Verify every path against the running BE in Phase 0.
- **No gauge / heatmap primitives.** The reference app uses `react-gauge-chart` and a custom heatmap;
  the MDK has neither. Decide: add primitives to `react-devkit/primitives` vs. approximate with
  existing charts.
- **PDU multi-select.** Port `react-selecto` or build a native/Radix selection grid
  (parity vs. simplification + dependency-policy check).
- **Voting model fidelity.** Confirm which actions are single vs. batch, post-submit UX
  (toast / pending badge / redirect), and permission degradation when the token lacks
  write scope — reuse Pool Manager's resolved model where it matches.
- **Container-model coverage.** All 6 models must be exercised against real devices in
  QA; missing a model in the live BE blocks parity verification for that model.
- **Selection-state model.** The reference app leans on Redux `devicesSlice`/`actionsSlice`; mapping
  socket/device/filter selection onto Zustand needs a clean store design to avoid leaking
  selection logic into components.
- **Feature flags.** `/feature-config` gates some tabs/sub-routes (containerCharts, etc.);
  the MDK must respect these or document the divergence.
- **Pool-manager reuse boundary.** The existing `sites-overview` / `miner-explorer` carry
  pool seams; generalizing vs. forking new components needs an explicit call to avoid
  regressing Pool Manager.

---

## 9. Asana tasks (human-readable)

> Suggested project/section: **MDK — Operational Centre pages (Site Overview + Explorer)**

1. **Spike: Operational Centre BE contracts & tab matrix** *(do first)* — Verify, against the running MiningOS BE, the response shapes for list-things (per tag), tail-log/multi, list-racks, pdu-layout, site, global/data (container settings), thing/global/feature-config; confirm the per-model container-tab matrix and the exact voting payloads per device action; resolve the API-divergence and primitives open questions in §8.
2. **Operational Centre read data layer in ui-foundation** — Add read query factories + param builders + types (list-things by tag, tail-log + multi, racks, pdu-layout, site, container settings, thing/global/feature config) and the per-model container-tab matrix module, with unit tests.
3. **Device-action / voting mutation factory in ui-foundation** — Add device-action mutations (single + batch), vote, cancel, and thing-comment factories with payload types and action-type→endpoint mapping, with tests.
4. **Operational Centre read hooks in react-adapter** — useContainerWidgets, useContainerActivity, useCoolingSystem/useDcsData, useContainerCharts, useExplorerList(tab), useThingDetail, usePduLayout, useContainerSettings, useRackLayout, useCabinetGroups, useFeatureFlags, with polling + tests (reuse useSitesOverview/useMinerDevices where applicable).
5. **Device-action / voting hooks in react-adapter** — useDeviceAction (reboot/power-mode/led/position/add-replace), useVoteOnAction, useCancelAction, useThingComment, incl. approval state model, cache invalidation, permission gating, and tests.
6. **Container Widgets grid + generic cards** — Build the widget-card grid and ContainerWidgetCard (device status, top row, miners-summary box, miners-activity chart) wired to live hooks; keep leaf components pure; component tests.
7. **Container Widgets vendor boxes + DCS** — Build SupplyLiquidBox, TanksBox (+TankRow), BitmainImmersionSummaryBox, MicroBTWidgetBox/SummaryBox, the confirmation modal, and wire DCS cooling/energy data for full vendor parity; tests.
8. **Container Charts sub-view** — Build the container-charts view (multi LineChartCard + container/metric selectors) wired to tail-log hooks; tests.
9. **Explorer list + detail panel** — Build ExplorerLayout (permission-gated) + split view + per-tab tables (container/miner/cabinet) on TanStack Table + sticky DetailsView / LvCabinetDetailsView + comments popover, wired to hooks; tests.
10. **Explorer Thing-detail: Home + Charts tabs** — Per-model tab shell (driven by the tab matrix) with the Home tab (content/controls box, stats group card, connected-miners table) and Charts tab (per-model + group charts); tests.
11. **Explorer Thing-detail: PDU tab** — PDU grid with multi-select (react-selecto port or native grid), socket + heatmap legends, and add/replace-miner + position-change dialogs wired through voting; tests.
12. **Explorer Thing-detail: Heatmap + Power Adjustment tabs** — Heatmap visualization (+ full legend) and Power Adjustment tab (Whatsminer) wired to control actions; tests.
13. **Explorer Thing-detail: Parameters / Alarm / Controls / Settings tabs** — Remaining per-model tabs incl. immersion Controls and Settings (thing-config), respecting the per-model tab matrix; tests.
14. **Gauge & heatmap primitives** — Add the missing visualization primitives to react-devkit/primitives (gauge chart, heatmap) or document the approved approximation, with tests/catalog demos.
15. **Site Overview shell page** — Compose the container-widgets + container-charts sub-views with internal routing and header stats, in both the template and apps/mdk-ui-shell.
16. **Explorer shell page** — Compose the list+detail split + Thing-detail internal routing (tab/model/id) with breadcrumbs/header, in both the template and apps/mdk-ui-shell.
17. **Add Site Overview & Explorer to default generated app** — Sidebar entries, routes, and nav icons in the mdk-ui-shell template so generated apps ship both pages.
18. **Make Site Overview & Explorer add-able/removable via CLI** — Add managed-pages entries and ensure `mdk-ui add page SiteOverview` / `Explorer` + `remove page` scaffold correctly (component resolution, routes/nav markers); CLI tests.
19. **Registry + blueprints + docs for Operational Centre** — Add registry.json entries and two blueprints (mdk-ui-shell-site-overview, mdk-ui-shell-explorer); update USAGE docs; regenerate registry/blueprints/hooks/stores manifests.
20. **Catalog demos for Operational Centre components** — Add catalog routes/pages (DemoPageHeader/DemoBlock, store seeding) for the new widget, explorer, and tab components.
21. **Real-BE integration & QA pass** — Verify every view and tab × container model and every write path against the local MiningOS backend with a real token; confirm writes create pending voting actions, vote/cancel work, and error/permission/empty/polling states behave.

---

## 10. Estimates & 2-week sprint feasibility

Estimates are in **ideal engineer-days** (one focused dev, no context-switching),
sized at full-parity scope. They are planning-grade (±40%), not commitments —
Phase 0 (#1) exists to tighten them.

| # | Task | Est. (dev-days) | Phase |
|---|---|---|---|
| 1 | Spike: BE contracts & tab matrix | 2–3 | 0 |
| 2 | ui-foundation read data layer | 3–4 | 1 |
| 3 | Device-action / voting factory (ui-foundation) | 2–3 | 1 |
| 4 | Read hooks (react-adapter) | 3–4 | 1 |
| 5 | Voting hooks (react-adapter) | 2–3 | 1 |
| 6 | Container Widgets grid + generic cards | 3–4 | 2 |
| 7 | Widget vendor boxes + DCS | 4–6 | 3 |
| 8 | Container Charts sub-view | 2–3 | 2/3 |
| 9 | Explorer list + detail panel | 4–5 | 2 |
| 10 | Thing-detail: Home + Charts tabs | 4–5 | 2 |
| 11 | Thing-detail: PDU tab | 5–7 | 3 |
| 12 | Thing-detail: Heatmap + Power Adjustment | 4–5 | 3/4 |
| 13 | Thing-detail: Parameters/Alarm/Controls/Settings | 4–6 | 3 |
| 14 | Gauge & heatmap primitives | 2–3 | 2 (blocks 7/12) |
| 15 | Site Overview shell page | 1–2 | 2 |
| 16 | Explorer shell page | 2–3 | 2 |
| 17 | Add both pages to default app | 1 | 5 |
| 18 | CLI add/remove for both pages | 2–3 | 5 |
| 19 | Registry + blueprints + docs | 2–3 | 5 |
| 20 | Catalog demos | 2–3 | 5 |
| 21 | Real-BE integration & QA | 3–5 | 6 |
| | **Total** | **~57–84 dev-days** | |

At ~57–84 ideal dev-days, full parity is realistically a **~6–9 week program**
for this team once coordination overhead and the no-clean-split reality (below)
are factored in — **not** a single sprint.

### Why it doesn't split cleanly across 4 devs

The bottleneck is a **shared dependency chain**, not raw volume:

- **Data layer is a sequential gate.** Almost every page task depends on #2–#5.
  Until the factories/hooks land, page devs are writing against mocks they'll
  rewire. Parallelizing 4 devs onto pages before the data layer is stable creates
  churn, not throughput.
- **Explorer detail (#10–#13) is one tightly-coupled surface.** All tabs share the
  per-model tab shell, the selection store, and the same `Thing` detail container.
  Splitting tabs across devs means constant merge contention on the same files and
  the shared matrix/selection model — coordination cost rises faster than parallel
  gain. It's the kind of work two devs pairing/closely-coordinating do better than
  four working independently.
- **Vendor boxes (#7) and primitives (#14)** are the cleanest things to peel off
  to a 2nd/3rd dev once contracts are known — they're additive and low-contention.

So practical parallelism here is ~**2 devs effective** on the critical path, with
1–2 more on peel-off work (primitives, vendor boxes, catalog/docs) — past that,
added devs mostly add coordination cost.

### What's feasible for the first 2-week sprint (10 working days)

**Goal: lock contracts + land the full data layer + a thin read-only slice end-to-end.**
This is the highest-value, most-parallelizable starting point and de-risks everything
after it.

Recommended sprint backlog (Phase 0 + Phase 1 + the start of Phase 2):

| # | Task | Owner suggestion |
|---|---|---|
| 1 | Spike: BE contracts & tab matrix | Lead — **days 1–3, blocks everyone** |
| 2 | ui-foundation read data layer | Dev A (data) |
| 3 | Device-action / voting factory | Dev A (data) |
| 4 | Read hooks | Dev B (adapter) |
| 5 | Voting hooks | Dev B (adapter) |
| 14 | Gauge & heatmap primitives | Dev C (independent, no data dep) |
| 9 (start) | Explorer list + detail panel (scaffold against hooks as they land) | Dev D |
| 6 (start) | Container Widgets grid + generic cards (scaffold) | Dev D / Dev C |

**Realistic 2-week exit criteria:** Phase 0 done; #2–#5 complete and unit-tested;
#14 done; #6 and #9 scaffolded and wired to live reads for at least the
`container` + `miner` tabs (read-only, generic cards). That is a demoable
read-only slice against the real BE — and it unblocks the parallel work that
makes Phases 2–4 go faster.

**Explicitly NOT in sprint 1:** the full Explorer tab matrix (#11–#13), vendor
boxes (#7), all writes wired into the UI (#5 ships the hooks; wiring lands in
Phase 4), CLI/registry/catalog (#17–#20). These depend on the sprint-1
foundation and would only churn if started early.

> **One-line answer:** In 2 weeks with this team you can confidently land the
> spike + the entire data/hook layer + the missing primitives + a thin read-only
> Container-Widgets/Explorer slice against the real BE — roughly tasks #1–#6, #9,
> #14. Full parity (the Explorer tab matrix especially) is a multi-sprint program
> and resists being split much beyond ~2 devs on the critical path.
