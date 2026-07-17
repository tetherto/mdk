# Plan: Pool Management Page in the MDK

**Status:** Draft / planning only — no implementation yet
**Author:** Arif Dewi
**Date:** 2026-06-11
**Related sprint:** Pool Manager page (2-week sprint from 2026-06-10)

---

## 1. Goal

Add a fully working **Pool Management** page to the MDK so that a generated `mdk-shell-ui`
app ships with Pool Management (alongside Dashboard and Alerts), backed by **real
MiningOS backend calls**, including **write operations through the voting/approval
workflow**. Also make **Alerts an add-able / remove-able page** like any other.

Scope (confirmed with stakeholder):

- **Full feature parity** with the reference app's Pool Manager: Pools list/config, Miner
  Explorer, Sites Overview, Site Detail, plus add/edit pool and assign-miner flows.
- **Writes included** — wherever the reference app can write via the voting flow, the MDK
  must too.
- **Both CLI paths** — Pool Management ships in the default template *and* is
  add-able/removable via the CLI; Alerts becomes the same.

---

## 2. Current state (what already exists — verified)

This is **not greenfield**. The component extraction is largely done; the gaps are
data-wiring, mutations, page assembly, and CLI/template integration.

### Already in the MDK (`ui/packages/react-devkit`)

- **`foundation/components/pool-manager/`** — full presentational component tree, with tests:
  - `dashboard/` — Pool Manager landing (stats blocks, nav, alerts list)
  - `pools/` — collapse list, `add-pool-modal`, `add-pool-endpoint-modal`, item header/body
  - `miner-explorer/` — table, columns, toolbar, utils
  - `sites-overview/` — status cards + `set-pool-configuration`
  - `site-overview-details/` — container, grid-unit, miner-info-card, header, legend
  - `assign-pool-modal/`
  - `hooks/` — `use-pool-configs`, `use-sites-overview-data`, `use-site-overview-details-data`
- **`foundation/features/pool-manager/`** — feature-level assemblies already scaffolded
  (`pools`, `sites-overview`, `miner-explorer`, `site-overview-details`) — mirrors the
  `features/alerts` pattern.
- **`mining-pools-panel/`** — pool stats table used on the Dashboard.

### Already in `react-adapter`

- `use-pool-rows`, `use-pool-stats`, `use-site-miner-stats`, `use-site-miner-counts`,
  `use-miner-duplicate-validation`, `use-static-miner-ip-assignment`.

### Already in the CLI (`ui/packages/cli`)

- `add-page.ts` **and** `remove-page.ts` commands already exist, driven by the
  `// mdk:routes-end` marker in `templates/mdk-ui-shell/src/routes.ts`.

### The gaps (what this plan actually delivers)

1. **No real data wiring.** `use-pool-configs` is *props-driven* — it takes `data` as
   input and only transforms it; it does not call the backend. The same pattern holds
   across the pool hooks. There is no `configs/pool` / `pools/*` query factory in
   `ui-foundation`. (Today only `tail-log`, `ext-data`, `list-things`, `history-log`, `token`
   are wired.)
2. **No write/voting hooks.** Nothing in `react-adapter` or `ui-foundation` posts to
   `/auth/actions/voting`. The reference app's create-pool / update-pool / assign-miner all
   go through this approval workflow and must be re-modeled in MDK hooks.
3. **No Pool Manager page** in the shell template (`templates/mdk-ui-shell/src/pages/`
   has only `Dashboard`, `Alerts`, `NotFound`, `SignIn`).
4. **Alerts is hardcoded**, not an add/remove-able page (it's pinned in `router.tsx` and
   `constants/routes.ts`, not in the `ROUTES` registry).
5. **No blueprint / registry entries** for the Pool Manager page-level composition.

---

## 3. Backend contract (MiningOS, port 3000)

All endpoints are authed: `Authorization: Bearer <token>`.

### Reads

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/pools` | List pools w/ hashrate, workers, balance, revenue, summary |
| GET | `/auth/pools/:pool/balance-history?start&end&range=1D\|1W\|1M` | Per-pool revenue/hashrate history (chart) |
| GET | `/auth/pools/config/:id` | Pool config for a device/miner + override count |
| GET | `/auth/pools/stats/containers` | Per-container override counts |
| GET | `/auth/configs/pool` | Raw pool configurations (the shape `use-pool-configs` consumes) |
| GET | `/auth/miners` | Miners w/ `poolConfig` (Miner Explorer rows) |
| GET | `/auth/list-things` / `/auth/list-racks` / `/auth/settings` | Devices/containers/site detail |

Reads use server-side LRU caching; `?overwriteCache=true` bypasses it.

### Writes — all via the voting/approval workflow

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/actions/voting` | Submit a single action (e.g. `registerPoolConfig`, `updatePoolConfig`, assign-pool) |
| POST | `/auth/actions/voting/batch` | Batch actions |
| PUT | `/auth/actions/voting/:id/vote` | Vote on a pending action |
| DELETE | `/auth/actions/voting/cancel` | Cancel pending actions |

Body shape: `{ query, action, params[], type?, rackType? }`. Requires write permission
(`pool_config:w`). Reads of pool config require `pool_config:r`.

---

## 4. Stack translation note (important)

The reference app's Pool Manager is **Ant Design + styled-components + Redux Toolkit (RTK
Query) + Formik/Yup**. The MDK is **Radix + SCSS/BEM + Zustand + TanStack Query + React
Hook Form + Zod**. Because the components were already extracted, most of this
translation is *done* — but the **data + mutation layer** must be authored natively on
TanStack Query (not ported from RTK Query) and forms validated with Zod (not Yup). The
voting submission flow (the reference app's `setAddPendingSubmissionAction` → Redux) must be
re-expressed as TanStack mutation hooks that POST to `/auth/actions/voting`.

---

## 5. Architecture / layering (follow the MDK's 4-layer rule)

1. **`ui-foundation` (headless data layer)** — query + mutation factories and types:
   - Query factories: `poolsQuery`, `poolBalanceHistoryQuery`, `poolConfigsQuery`,
     `poolConfigForDeviceQuery`, `containerPoolStatsQuery`, `minersQuery`.
   - Mutation factories: `votingActionMutation` (+ batch/vote/cancel) for the approval flow.
   - Param builders + domain types (`Pool`, `PoolSummary`, `PoolEndpoint`,
     `MinerRecord`, `VotingActionPayload`, …).
2. **`react-adapter` (React bindings)** — hooks that own fetching/polling/shaping and
   expose mutations:
   - `usePools`, `usePoolBalanceHistory`, `usePoolConfigsData` (feeds the existing
     `use-pool-configs` transform), `useContainerPoolStats`, `useMinerExplorerRows`,
     `useSitesOverviewData`, `useSiteOverviewDetailsData`.
   - Write: `useRegisterPoolConfig`, `useUpdatePoolConfig`, `useAssignPool`,
     `useVoteOnAction`, `useCancelAction` — all wrapping `votingActionMutation`,
     handling optimistic state + invalidation + error surfacing.
3. **`react-devkit` (components/features)** — wire the existing presentational
   components to the new hooks at the **feature** level (`features/pool-manager/*`),
   keeping the leaf components props-driven. Replace any remaining
   `onSubmit`-as-Redux-dispatch seams with the mutation hooks.
4. **Shell pages** — thin glue: a `PoolManager` page that mounts the feature(s) and
   handles intra-feature routing (Pools / Miner Explorer / Sites Overview / Site Detail).

---

## 6. Workstreams

### WS-A — Data layer in `ui-foundation`
- Add pool read query factories + param builders + types.
- Add voting mutation factory (single/batch/vote/cancel).
- Unit tests for param builders and payload shapes.

### WS-B — Adapter hooks (reads)
- `usePools`, `usePoolBalanceHistory`, `usePoolConfigsData`, `useContainerPoolStats`,
  `useMinerExplorerRows`, `useSitesOverviewData`, `useSiteOverviewDetailsData`.
- Poll intervals consistent with Dashboard hooks (e.g. 60s); `select`-based shaping.
- Tests mirroring existing `use-pool-rows.test`.

### WS-C — Adapter hooks (writes / voting)
- `useRegisterPoolConfig`, `useUpdatePoolConfig`, `useAssignPool`, `useVoteOnAction`,
  `useCancelAction`.
- Define the submission/approval state model (pending → voted → applied/cancelled),
  cache invalidation, and permission gating (`pool_config:w`).
- Tests for payload construction + invalidation.

### WS-D — Wire feature components to hooks
- Connect `features/pool-manager/{pools,miner-explorer,sites-overview,site-overview-details}`
  and `assign-pool-modal` / `add-pool-modal` / `set-pool-configuration` to the new hooks.
- Replace placeholder/props-injected data with live hooks; keep leaf components pure.
- Update/expand existing component tests for the wired behavior.

### WS-E — Shell page assembly
- New `PoolManager` page in `templates/mdk-ui-shell/src/pages/` composing the features,
  with internal routing for the four sub-views and the modals.
- Header stats / breadcrumbs consistent with Dashboard.

### WS-F — Template + default wiring
- Ship `PoolManager` in the default generated app: sidebar entry, route, nav icon.
- Mirror the change in the live `apps/mdk-ui-shell` app for dev/QA.

### WS-G — CLI: make Pool Manager and Alerts add/remove-able
- Ensure `mdk-ui add page PoolManager` / `remove page` scaffold/unscaffold correctly
  (component resolution, routes marker, nav icon).
- **Refactor Alerts** out of hardcoded `router.tsx`/`constants/routes.ts` into the
  `ROUTES` registry so it's add/remove-able too — without breaking the default app.
- Update `add-page`/`remove-page` tests.

### WS-H — Registry / blueprints / docs
- `registry.json` entries (tier/category/domain/Kernel capability) for the pool feature
  surface + page composition.
- A `mdk-ui-shell-pool-manager` blueprint (intent, components, hooks, demoRoute,
  variations) like the dashboard blueprint.
- USAGE.md updates; regenerate `registry.json` / `blueprints.json` / `hooks.json` /
  `stores.json` via the generate scripts.

### WS-I — Real-BE verification & QA
- Run against the local MiningOS BE (`node worker.js --wtype wrk-node-http --env
  production --port 3000`) with a real token.
- Smoke each view + each write path (create pool, edit pool, assign miners → confirm a
  pending voting action is created), error/permission states, polling.

---

## 7. Sequencing

1. WS-A (data layer) →
2. WS-B + WS-C (read & write hooks, parallel) →
3. WS-D (wire components) →
4. WS-E (page) + WS-F (template) →
5. WS-G (CLI add/remove + Alerts refactor) →
6. WS-H (registry/blueprint/docs) →
7. WS-I (real-BE QA).

Critical path is A → B/C → D → E.

---

## 8. Risks & open questions

- **Voting model fidelity:** The reference app's approval flow has nuance (pending submission, vote,
  cancel, batch). Need to confirm exactly which pool actions are single vs batch and the
  expected UX after submit (toast? pending badge? redirect?).
- **Permissions:** UI must gracefully degrade when the token lacks `pool_config:w`
  (hide/disable write actions).
- **Site Detail multi-select:** The reference app used `react-selecto`; the MDK equivalent grid-unit
  selection needs confirming for parity vs. simplification.
- **Endpoint shape drift:** `/auth/configs/pool` (raw) vs `/auth/pools` (aggregated) —
  confirm which feeds which view to avoid double-fetching.
- **Alerts refactor regression:** moving Alerts into the route registry must keep the
  default app identical; needs a regression check.

---

## 9. Asana tasks (human-readable)

> Suggested project/section: **MDK — Pool Management page**

1. **Pool data layer in ui-foundation** — Add pool read query factories (pools, balance-history, pool-configs, device pool-config, container stats, miners), param builders, and domain types, with unit tests.
2. **Voting/action mutation factory in ui-foundation** — Add voting action factories (single, batch, vote, cancel) and payload types for the approval workflow, with tests.
3. **Pool read hooks in react-adapter** — usePools, usePoolBalanceHistory, usePoolConfigsData, useContainerPoolStats, useMinerExplorerRows, useSitesOverviewData, useSiteOverviewDetailsData, with polling + tests.
4. **Pool write/voting hooks in react-adapter** — useRegisterPoolConfig, useUpdatePoolConfig, useAssignPool, useVoteOnAction, useCancelAction, incl. submission/approval state model, cache invalidation, permission gating, and tests.
5. **Wire Pool Manager feature components to live hooks** — Connect features/pool-manager (pools, miner-explorer, sites-overview, site-overview-details) and the add-pool / assign-pool / set-pool-configuration modals to the new read/write hooks; keep leaf components props-driven; update tests.
6. **Pool Manager shell page** — Build the PoolManager page composing all four sub-views + modals with internal routing and header stats, in both the template and apps/mdk-ui-shell.
7. **Add Pool Manager to default generated app** — Sidebar entry, route, and nav icon in the mdk-ui-shell template so generated apps ship Pool Management out of the box.
8. **Make Pool Manager add-able/removable via CLI** — Ensure `mdk-ui add page PoolManager` / `remove page` scaffold correctly (component resolution, routes marker, nav icon); add CLI tests.
9. **Make Alerts an add/remove-able page** — Refactor Alerts out of hardcoded router/constants into the ROUTES registry so it can be added/removed via the CLI like any other page, without changing the default app; update tests.
10. **Registry + blueprint + docs for Pool Manager** — Add registry.json entries and a mdk-ui-shell-pool-manager blueprint; update USAGE docs; regenerate registry/blueprints/hooks/stores manifests.
11. **Real-BE integration & QA pass** — Verify all views and write paths against the local MiningOS backend with a real token; check polling, error/permission states, and that writes create pending voting actions.
12. **Spec & UX confirmation for voting flow** *(spike, do first)* — Confirm exact pool actions (single vs batch), post-submit UX, permission degradation, and which endpoint feeds which view; resolve the open questions in §8.
