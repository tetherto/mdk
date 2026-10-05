# Container Detail — remaining tab tasks

Follow-on to the container-detail **basement** (shell + routing + back-nav). These
are the tab bodies that mount into the `ContainerDetail` shell, written so a
junior dev can pick one up cold.

## Definition of done — applies to EVERY task below

**Main goal:** the tab works in the **generated shell app** against **real
reference app backend data** — not mocks, not hardcoded values.

**Two required side-effects — the task isn't done without them:**

1. **Catalog demo** — the components are demoable in isolation in [`apps/catalog`](../../../ui/apps/catalog/README.md)
   (seeded **synthetic** data, `DemoPageHeader` + `DemoBlock`). No real
   site/device names or emails — run the `mdk-security-check` skill before any PR.
2. **Clean layered extraction — zero tech debt lands in MDK.** Each piece goes in
   its correct package:
   - **`ui-foundation`** — anything touching the API/raw data: query + param
     builders, tag strings (`t-*`), field lists, types, pure helpers. **No React.**
   - **`react-adapter`** — the hook that fetches **and shapes** data into
     ready-to-render props (units, formatting, latest-sample). All
     `useQuery`/`useMutation` live here.
   - **`react-devkit`** — **presentational** components only: shaped props in,
     markup out. **No `fetch`/`useQuery`, no unit math, no `t-*` strings, no
     model-name `if`s in JSX.**
   - **shell page** — thin glue: call the hook, pass output to the component,
     mount into the `ContainerDetail` tab slot.

**Refactoring rule:** you're porting from the reference app (Ant Design + Redux +
styled-components). **Translate, don't copy:** antd table → TanStack Table, Redux
→ Zustand stores + TanStack hooks, styled-components → SCSS/BEM, Formik/Yup →
React Hook Form + Zod. If you're pasting reference-app logic into a component, stop — it
belongs in a hook or `ui-foundation`. Can't fix a violation in scope? File a
`techdebt` issue instead of shipping it.

**Every task ships:** foundation unit tests + hook tests + component tests;
`typecheck`/`lint`/`test` green; `check:agent-ready` clean for new devkit exports.

**Reuse — the data layer is already built** (verified in-code): `useThingDetail`,
`useContainerSnapshots`, `usePduLayout`, `usePduViewer`, `useDeviceAction`,
`useVoteOnAction`, `useCancelAction`, `useThingComment`, `useDeviceAlarms`, the
tab matrix (`getSupportedContainerTabs`), and building blocks (Settings ×4
models, Charts, Heatmap primitive, socket cell, the `react-selecto` grid in
pool-manager). Most tasks are **assembly + wiring + demo + refactor**, not new
plumbing — check what exists first.

## M1 — home tab

- **Sees:** container summary — status/content box, controls box, stats group card
  (temp/power/hashrate), and a table of connected miners.
- **Port from:** the reference app's container Home tab
  (historically `src/Views/Container/Tabs/HomeTab/HomeTab.tsx`; path may differ upstream —
  the `.../Tabs/…` references below are relative to that tab tree).
- **Reuse:** `useThingDetail` + `useContainerSnapshots`; connected miners via the
  existing list-things-by-container query.
- **Lands:** any missing miners query → foundation; `useContainerHome(id)`
  returning `{statusRows, controls, statsCard, connectedMiners}` → adapter;
  presentational `HomeTab` (from existing content-box/stats-card/table) → devkit.
- **Done:** real Bitdeer Home tab shows live status + real connected miners;
  catalog demo seeded.

## M2 — PDU layout tab *(biggest — split read vs write)*

- **Sees:** socket grid color-coded by state; rubber-band **multi-select**;
  socket + heatmap legends; zoom/pan; add/replace miner + change position via
  **voting**.
- **Port from:** `.../Tabs/PduTab/PduTab.tsx`.
- **Reuse:** `usePduLayout` + `usePduViewer` done; socket cell + `react-selecto`
  grid exist in pool-manager — **extract/generalise, don't rebuild**; writes via
  `useDeviceAction`/`useVoteOnAction`/`useCancelAction`.
- **Lands:** selection state → a slice in the Zustand `devicesStore` (not local
  state other cards must read); grid/legends/dialogs presentational in devkit.
- **Split:** M2a (commit) grid+legends+multi-select+zoom/pan read-only · M2b
  (at-risk) add/replace dialog via voting · M2c (at-risk) position-change via
  voting.
- **Done:** real sockets render + select; each write creates a pending voting
  action you can approve/cancel; catalog demo seeded.

## M3 — power adjustment tab *(from scratch — no building block)*

- **Sees:** power/limit controls for **Whatsminer** containers, applied via voting.
- **Port from:** `.../Tabs/PowerAdjustmentTab/PowerAdjustmentTab.tsx` — **strip the
  banned multi-container grouping branch (MDK is single-site only).**
- **Reuse:** `useDeviceAction`/`useVoteOnAction`; form = React Hook Form + Zod.
- **Lands:** payload builders + types → foundation; `usePowerAdjustment` →
  adapter; presentational form → devkit.
- **Done:** on a real M56, submit creates a pending voting action; tab absent for
  non-Whatsminer models; catalog demo seeded.

## M4 — settings tab

- **Sees:** per-model settings incl. **editable thresholds** saved via voting.
- **Port from:** `.../Tabs/SettingsTab/SettingsTab.tsx`.
- **Reuse:** the 4 per-model settings components exist. **Sneaky bit:** the
  threshold `onSave` is **unwired** — wiring it to voting is the real work.
- **Lands:** threshold payload builder/types → foundation; `useContainerSettings` +
  save mutation → adapter; existing components stay presentational.
- **Done:** editing+saving a threshold on a real container creates a pending
  voting action; catalog demo per model seeded.

## M5 — charts tab

- **Sees:** container time-series (hashrate/power/temp…), with a generic-builder
  fallback for MicroBT/immersion.
- **Port from:** `.../Tabs/ChartsTab/ChartsTab.tsx`.
- **Reuse:** `LineChartCard` primitive + `container-charts-builder`; data from the
  existing `tail-log` query.
- **Lands:** the hook builds the `ChartCardData` payload in **adapter** (never
  build datasets in the component/page — canonical anti-pattern); charts
  presentational.
- **Done:** real container charts render live; fallback covers models without a
  custom set; catalog demo seeded.

## M6 — Heatmap tab *(stretch — slips first)*

- **Sees:** telemetry heatmap (e.g. temp across positions) + legend.
- **Port from:** `.../Tabs/HeatmapTab/HeatmapTab.tsx`.
- **Reuse:** Heatmap **primitive exists**; feed it `tail-log` telemetry.
- **Lands:** `useContainerHeatmap` shapes telemetry into cell payload → adapter;
  primitive presentational.
- **Done:** real heatmap renders with correct legend; catalog demo seeded.

## Alarm tab *(small — hydro/immersion only)*

- **Sees:** active alarms (these models get Alarm instead of Power Adjustment).
- **Port from:** `.../Tabs/AlarmTab/AlarmTab.tsx`.
- **Reuse:** `useDeviceAlarms` done; `alarm-contents` component exists — mount per
  matrix.
- **Lands:** mostly assembly — hook → existing `alarm-contents` → tab slot.
- **Done:** real hydro/immersion container shows live alarms; catalog demo seeded.

## M7 — container-widgets alerts logic *(site overview page, not a tab)*

- **What:** real alarm tooltip + counts (replace raw `JSON.stringify`), wire card
  alarm **badges** (populate `alarms`, not just `flash`), critical-alarm
  beep/modal (consume `hasAnyCriticallyHigh`).
- **Lands:** alarm shaping in the adapter hook; card presentational.
- **Done:** real critical alarms drive badge + beep on Site Overview; catalog demo
  seeded.
