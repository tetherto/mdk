---
title: Full-site example UI production readiness
description: What separates the full-site example UI from an application that can serve a real site, and the runtime defects found alongside it.
---

## Overview

The [full-site example](../../../examples/full-site/README.md) UI is a demonstration harness: it proves the MDK stack end to end against mock
hardware, and it is not built to be deployed. This page records the gap between the two, so the work can be scheduled rather than rediscovered.
Every item names the file it lives in, why it blocks a real deployment, and what replaces it. Line references point at
`examples/full-site/ui/src` unless stated otherwise.

> [!NOTE]
> The items are engineering tasks for maintainers, not user documentation. Nothing here is a defect in the MDK packages themselves: the example
> exercises the real Kernel, Workers, and Gateway, and the gaps are in the example's own presentation layer.

## Blockers

The UI cannot serve a real site until each of these is resolved.

### Authentication does not exist

`SitePage.tsx:286` renders `ProfileMenu user="operator@example.com"`, a hardcoded string. There is no sign-in, no session, no token attached to
requests, and no route guard, so every surface including the miner control page is open to anyone who reaches the port. The
[contract-driven UI model](../../guides/gateway/index.md) puts authentication at the handler boundary, so this is the seam that has to land first.

### The production API base URL is missing

`main.tsx:17` mounts `MdkProvider` with `apiBaseUrl=""`, which works only because the Vite dev server proxies `/site` to the Gateway. A production
build has no proxy, so the bundle talks to its own origin and finds nothing. The provider needs a real base URL sourced from build-time or
runtime configuration.

### Query failures render as loading

Fixed in the working tree, recorded because the pattern recurs. `SitePage` gated on `!data` alone, so a Gateway returning errors was
indistinguishable from a Gateway still responding, and the page showed a spinner indefinitely. The remaining queries in
`PowermeterChart.tsx`, `SensorChart.tsx`, and `DashboardPage.tsx` still read only `isLoading` and `data`, and none handles `isError`.
Every query needs an error branch that states what failed and offers a retry.

### No shared request layer

`utils.ts:7` is a bare `fetch` wrapper, and `SitePage.tsx:215` calls `fetch` inline inside the page component. Nothing carries authentication
headers, applies a timeout, retries, or reports failures consistently. A single client module has to own those concerns before any of the
blockers that depend on them can be finished.

## Data correctness

These items make the UI present values that are not true, which matters more in an operations tool than in a demo.

### Hardcoded values render as live readings

Three props are literals dressed as telemetry:

- `SitePage.tsx:301` passes `poolOnline={0}`
- `SitePage.tsx:302` passes `poolMismatch={0}`
- `SitePage.tsx:327` passes `incidentsLoading={false}`

Each needs a real source, or the surface that displays it needs removing until one exists.

### The power consumption chart shows history it does not have

`DashboardPage.tsx:79` builds the power series as a flat line held at the current aggregate value across the whole window, because the example
backend exposes no per-container power tail log. The card still renders a timeline selector, so a reader can switch range and watch a chart that
cannot change. Either the backend grows a power tail log, or the selector goes.

### Alarm rules live in the view

`SitePage.tsx:145` derives incidents client-side from a bare `m.temperature > 70` comparison, and `constants.ts:16` holds
`NOMINAL_MHS_PER_MINER` as a second untyped literal. Thresholds belong in the device contract or the Gateway, so that every consumer applies the
same rule and operators can change it without a UI release. The repository convention of deriving types from `as const` and naming constants
applies here too.

### The alarm bell does nothing

`SitePage.tsx:285` renders `AlarmsBellButton` with counts derived from the incident list, so the badge numbers move, but the control has no
`onClick` and there is no alarms route to open. It reads as working functionality and is not. Either wire it to an alarms view or drop it from
the header until one exists.

## Structure and cleanup

### SitePage carries the whole application

`SitePage.tsx` owns routing, every query, six `useMemo` derivations, the command mutation, and the header composition in one component. The data
layer needs extracting into hooks such as `useSiteOverview` and `useSetPowerMode`, following the canonical layering in
[`ui/CLAUDE.md`'s separation-of-concerns rule](../../../ui/CLAUDE.md#separation-of-concerns-load-bearing-rule): `ui-foundation` holds pure
helpers, `react-adapter` holds the hooks, and `react-devkit` holds presentational components.

### Inline styles replace the styling system

The example carries 44 inline `style={{ ... }}` objects across six files, with `ContainersPage.tsx` and `ControlPage.tsx` the densest. Inline
literals cannot theme, cannot respond to light and dark mode, and duplicate spacing values the devkit already defines. Large repeated blocks
also belong in their own presentational components rather than inline JSX.

### No UI tests exist

All 84 tests in the example cover the backend. Nothing exercises a component, so the missing dispatch spinner and the missing error branch both
reached the working tree unnoticed. Component tests need to land with the hook extraction rather than after it.

### The bundle ships as a single chunk

`npm run build` emits a 683 KB JavaScript chunk and Vite warns on it. There is no route-level lazy loading and no `manualChunks` configuration.

### HashRouter suits a demo, not a deployment

`main.tsx:16` mounts `HashRouter`, so every route is a fragment such as `#/dashboard`. A deployed app wants real paths, which needs the serving
layer to handle history fallback.

## Additions

- A static build and serve path, since the UI currently runs only under `vite dev` supervised by `start.js`, with no Dockerfile and no reverse
  proxy configuration; the `deploy/` directory in the [MVP site example](../../../examples/mvp-site/README.md) is the closest existing model
- Command lifecycle feedback, because `applyAction` dispatches and refetches once, while a real control surface tracks a queued command through
  to completion
- Empty, error, and permission states for each page, and a notification surface in place of the single `actionMsg` string

## Runtime defects found while running the example

These are backend and tooling defects rather than UI work, recorded because they are unfixed and reproducible.

### The UI child process survives its parent

`backend/site.js:341` starts the UI by spawning `npm run dev`, which spawns Vite in turn. The cleanup handler at `start.js:113` calls `ui.kill()`,
which signals the npm wrapper and leaves the Vite grandchild running. A hard kill orphans it outright. Each orphan keeps holding its port, and
Vite silently increments to the next free one, so a later run reports `UI starting on http://localhost:3040` while serving on `3042`. A browser
pointed at the advertised port then reaches an orphan from an earlier run whose proxy target no longer exists, and the Vite dev proxy answers
`500`. The fix is to spawn Vite directly or to kill the whole process group.

### The Gateway does not recover a closed Kernel channel

Once the Gateway's HRPC channel to the Kernel closes, every request answers `400 CHANNEL_CLOSED` after a delay of several seconds, and the
process never reconnects. The Gateway keeps serving HTTP throughout, so health checks that test the port report success while the site is dark.

### Hard termination corrupts the persisted state

`.mdk-data` holds the Kernel key, the per-Worker RPC seeds, and the seeded device records. Terminating the example with `SIGKILL` rather than
letting the cleanup handlers run leaves that state unusable, and a later boot registers zero Workers while reporting a healthy Kernel and
Gateway.

> [!CAUTION]
> Stop the example with `Ctrl-C` so the cleanup handlers run. Recovering from a corrupted state directory means removing `.mdk-data` and
> reseeding, which discards the site and its history.

### Missing port helper crashed the MCP server

Fixed in the working tree. `backend/proc/mcp-server.js` called `listenOnFirstAvailablePort`, a function defined nowhere in the repository, so the
MCP server threw `ReferenceError` on every boot. Because `start.js` spawns it as a child, the crash was silent and the boot log still advertised
the endpoint.

### Dependency check reported installed packages as missing

Fixed in the working tree, with a regression test. The check probed each package with `require.resolve('<name>/package.json')`, which throws
`ERR_PACKAGE_PATH_NOT_EXPORTED` for any package whose `exports` map omits `./package.json`. `@tetherto/mdk-gateway` declares such a map, so a
correctly installed tree failed to boot behind a hint that could not fix it.

## Priority

| Order | Item | Why it comes first |
| --- | --- | --- |
| 1 | Shared request layer | Authentication, error handling, and retries all depend on it |
| 2 | Error states on every query | A dark site currently looks identical to a loading one |
| 3 | Authentication and route guards | Blocks any deployment that is reachable by more than its author |
| 4 | Production API base URL | A production build otherwise talks to nothing |
| 5 | UI child process cleanup | Produces misleading `500` responses that read as application defects |
| 6 | Hook extraction out of `SitePage` | Unblocks component tests and the styling cleanup |
| 7 | Honest data: hardcoded props, power chart, alarm bell | Removes readings and controls that are not real |
| 8 | Styling system, bundle splitting, router | Quality work that no longer blocks a deployment |

## Task list

Each task links to the section that describes it. `Area` is the discipline that owns the work, not the only one involved: the tasks marked
`FE + BE` need a backend change before the frontend one is honest.

### Frontend

| ID | Task | Detail | Status |
| --- | --- | --- | --- |
| FE-1 | Build a shared request client owning auth headers, timeouts, retries, and error shape | [Shared request layer](#no-shared-request-layer) | Open |
| FE-2 | Add an `isError` branch with a retry to every query | [Query failures render as loading](#query-failures-render-as-loading) | Partial, site gate done |
| FE-3 | Add sign-in, session handling, and route guards | [Authentication](#authentication-does-not-exist) | Open |
| FE-4 | Source the API base URL from configuration instead of the dev proxy | [Production API base URL](#the-production-api-base-url-is-missing) | Open |
| FE-5 | Replace `poolOnline`, `poolMismatch`, and `incidentsLoading` literals with real sources | [Hardcoded values](#hardcoded-values-render-as-live-readings) | Open |
| FE-6 | Render real power history, or remove the timeline selector from the card | [Power consumption chart](#the-power-consumption-chart-shows-history-it-does-not-have) | Open, needs BE-1 |
| FE-7 | Consume alarm thresholds from the contract instead of literals in the view | [Alarm rules](#alarm-rules-live-in-the-view) | Open, needs BE-2 |
| FE-8 | Wire the alarm bell to an alarms view, or remove it from the header | [Alarm bell](#the-alarm-bell-does-nothing) | Open |
| FE-9 | Extract the data layer from `SitePage` into `useSiteOverview` and `useSetPowerMode` | [SitePage scope](#sitepage-carries-the-whole-application) | Open |
| FE-10 | Replace the 44 inline style objects with the devkit styling system | [Inline styles](#inline-styles-replace-the-styling-system) | Open |
| FE-11 | Add component tests, landing with the hook extraction | [No UI tests](#no-ui-tests-exist) | Open |
| FE-12 | Split the bundle with route-level lazy loading and `manualChunks` | [Single chunk](#the-bundle-ships-as-a-single-chunk) | Open |
| FE-13 | Move from `HashRouter` to real paths with history fallback | [Router](#hashrouter-suits-a-demo-not-a-deployment) | Open |
| FE-14 | Track a queued command through to completion instead of one refetch | [Additions](#additions) | Partial, spinner done |
| FE-15 | Add empty, error, and permission states per page, and a notification surface | [Additions](#additions) | Open |

### Backend

| ID | Task | Detail | Status |
| --- | --- | --- | --- |
| BE-1 | Expose a per-container power tail log so the power chart has real history | [Power consumption chart](#the-power-consumption-chart-shows-history-it-does-not-have) | Open |
| BE-2 | Move alarm thresholds into the device contract or the Gateway | [Alarm rules](#alarm-rules-live-in-the-view) | Open |
| BE-3 | Provide the authentication seam at the handler boundary | [Authentication](#authentication-does-not-exist) | Open |
| BE-4 | Reconnect the Gateway when its Kernel channel closes, rather than serving `400` indefinitely | [Closed Kernel channel](#the-gateway-does-not-recover-a-closed-kernel-channel) | Open |
| BE-5 | Make `.mdk-data` survive hard termination, or detect and report a corrupt store at boot | [Hard termination](#hard-termination-corrupts-the-persisted-state) | Open |

### Tooling and examples

| ID | Task | Detail | Status |
| --- | --- | --- | --- |
| OPS-1 | Kill the whole UI process group, or spawn Vite directly, so no orphan holds the port | [UI child process](#the-ui-child-process-survives-its-parent) | Open |
| OPS-2 | Report the port the UI actually bound rather than the requested one | [UI child process](#the-ui-child-process-survives-its-parent) | Open |
| OPS-3 | Add a static build and serve path with a container image and proxy configuration | [Additions](#additions) | Open |
| OPS-4 | Implement the missing `listenOnFirstAvailablePort` helper | [MCP server crash](#missing-port-helper-crashed-the-mcp-server) | Done |
| OPS-5 | Replace the dependency probe that misreads a restrictive `exports` map, with a regression test | [Dependency check](#dependency-check-reported-installed-packages-as-missing) | Done |

> [!NOTE]
> `Partial` marks a task where one instance is fixed and the pattern still recurs. FE-2 covers the site gate but leaves the chart and panel
> queries untouched, and FE-14 has the dispatch spinner without the queued-command tracking.

## Next steps

- [Full-site example README](../../../examples/full-site/README.md): how the example boots, and the ports and flags it uses
- [`ui/CLAUDE.md`'s separation-of-concerns rule](../../../ui/CLAUDE.md#separation-of-concerns-load-bearing-rule): the package layering this work follows
- [Gateway guides](../../guides/gateway/index.md): the handler and plugin surfaces the authentication seam builds on
- [Deployment guides](../../guides/deployment/index.md): the site topologies a deployable UI has to serve
