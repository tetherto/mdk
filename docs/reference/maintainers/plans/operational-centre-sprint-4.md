# Sprint #4 — Operational Centre: foundation slice

**Duration:** 2 weeks (10 working days)
**Team:** up to 4 devs (effective parallelism ~2 on critical path + peel-off)
**Parent plan:** [`operational-centre-pages.md`](./operational-centre-pages.md)
**Sprint goal:** Lock the BE contracts, land the **entire data/hook layer**, add the
missing **visualization primitives**, and ship a **thin read-only end-to-end slice**
of Container Widgets + Explorer against the real MiningOS BE.

> This is the de-risking sprint. It does **not** attempt the full Explorer tab matrix,
> vendor boxes, or UI-wired writes — those depend on this foundation and are scheduled
> for sprints #5+.

---

## In scope (Asana tasks #1–#6, #9, #14)

- [ ] **#1 — Spike: BE contracts & tab matrix** *(blocks everyone; days 1–3)*
  - [ ] Verify against the running BE (`node worker.js --wtype wrk-node-http --env production --port 3000`) the response shapes for: `/list-things` (per tag), `/tail-log` + `/tail-log/multi`, `/list-racks`, `/pdu-layout`, `/site`, `/global/data?type=containerSettings`, `/thing-config`, `/global-config`, `/feature-config`.
  - [ ] Confirm the per-model container-tab matrix (Bitdeer / AntspaceHydro / AntspaceImmersion / MicroBT / Gamma).
  - [ ] Confirm exact voting payloads per device action (reboot, set_power_mode, set_led, position_change, add/replace miner).
  - [ ] Resolve the API-divergence question (the reference app's surface vs. existing `/auth/*` factories) and the gauge/heatmap-primitives decision.

- [ ] **#2 — ui-foundation read data layer**
  - [ ] Read query factories + param builders + types (list-things by tag, tail-log/multi, racks, pdu-layout, site, container settings, thing/global/feature config).
  - [ ] Per-model container-tab matrix as a pure data module.
  - [ ] Unit tests (param builders, query keys, tab-matrix resolution).

- [ ] **#3 — Device-action / voting mutation factory (ui-foundation)**
  - [ ] Single + batch action, vote, cancel, thing-comment factories + payload types + action-type→endpoint mapping.
  - [ ] Tests for payload construction.
  - [ ] *(Factories only this sprint — UI wiring is sprint #5+.)*

- [ ] **#4 — Read hooks (react-adapter)**
  - [ ] useContainerWidgets, useContainerActivity, useCoolingSystem/useDcsData, useContainerCharts, useExplorerList(tab), useThingDetail, usePduLayout, useContainerSettings, useRackLayout, useCabinetGroups, useFeatureFlags.
  - [ ] Reuse useSitesOverview / useMinerDevices where applicable. Polling consistent with existing site hooks.
  - [ ] Hook tests.

- [ ] **#5 — Voting hooks (react-adapter)**
  - [ ] useDeviceAction, useVoteOnAction, useCancelAction, useThingComment — approval state model, invalidation, permission gating.
  - [ ] Tests. *(Hooks land this sprint; UI wiring is sprint #5+.)*

- [ ] **#14 — Gauge & heatmap primitives**
  - [ ] Add gauge + heatmap primitives to `react-devkit/primitives` (or document the approved approximation).
  - [ ] Tests + catalog demo.
  - [ ] *(Independent of the data layer — start day 1.)*

- [ ] **#6 (start) — Container Widgets grid + generic cards**
  - [ ] Widget-card grid + ContainerWidgetCard (device status, top row, miners-summary, activity chart) — generic/model-agnostic, read-only.
  - [ ] Wired to live reads as #4 lands; leaf components pure. Component tests.

- [ ] **#9 (start) — Explorer list + detail panel**
  - [ ] ExplorerLayout + split view + per-tab tables for `container` + `miner` (TanStack Table) + read-only DetailsView panel.
  - [ ] Wired to live reads as #4 lands. Component tests.

---

## Suggested ownership

| Dev | Focus | Tasks |
|---|---|---|
| **Lead** | Spike, then unblock + review | #1 (days 1–3), then floats to review/critical path |
| **Dev A** | Data layer (ui-foundation) | #2 → #3 |
| **Dev B** | Adapter hooks | #4 → #5 |
| **Dev C** | Primitives + widgets | #14 → #6 (start) |
| **Dev D** | Explorer scaffold | #9 (start), scaffolding against hooks as they land |

> Devs C/D scaffold against the hook signatures (or light mocks) during days 1–4 while
> #2/#4 stabilize, then rewire to live reads. Keep the mock surface thin to minimize rework.

---

## Exit criteria (definition of done for Sprint #4)

- [ ] Phase 0 spike complete; contracts + tab matrix + voting payloads documented.
- [ ] #2–#5 complete and unit-tested (data + hook layer, reads **and** voting hooks).
- [ ] #14 complete (gauge + heatmap primitives, with catalog demo).
- [ ] #6 and #9 scaffolded and wired to **live reads** for at least the `container` + `miner`
      tabs — read-only, generic cards.
- [ ] A demoable **read-only** Container-Widgets + Explorer slice runs against the real BE.

---

## Explicitly NOT in Sprint #4 (sprint #5+)

- Full Explorer Thing-detail tab matrix — Home/Charts (#10), PDU (#11), Heatmap/Power-Adjustment (#12), Parameters/Alarm/Controls/Settings (#13).
- Widget vendor boxes + DCS (#7), Container Charts sub-view (#8).
- **Writes wired into the UI** (hooks ship in #5; wiring is Phase 4).
- Shell pages (#15, #16), default-app wiring (#17), CLI add/remove (#18), registry/blueprints (#19), catalog beyond the primitives demo (#20), full QA (#21).
