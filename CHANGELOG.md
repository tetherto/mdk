# Changelog: mdk-0.3.0

> For a high-level introduction, see the [v0.3.0 release notes](./docs/reference/release-notes/0.3.0-release.md).

## Overview

MDK v0.3.0 focuses on extensibility, multi-host deployments, and a richer UI data layer. The headline additions are:

- A formal plugin system for App Node routes (`@tetherto/mdk-plugins`)
- A local-discovery mode that bypasses DHT for same-machine setups
- An HRPC client transport for cross-host App Node connections
- A unified lifecycle API (`onShutdown` / `shutdown`)
- A wave of new UI components covering alerts, inventory, repairs, and operational reporting

## Breaking changes

### Node.js minimum version bumped to `>=24`

All packages previously requiring `>=22` now require Node.js 24+. Update your runtime before upgrading.

### App-node HTTP routes moved to the plugin system

`metricsRoutes` and `devicesRoutes` are no longer registered directly in `backend/core/app-node/workers/lib/server/index.js`. Auth and telemetry endpoints are now delivered by the built-in plugins in `backend/core/plugins/`. Code that patched or monkey-patched these route registrations must be migrated to the plugin manifest format.

### `waitForDiscovery()` signature changed

The second argument is now an options object instead of a bare timeout number:

```js
// 0.2.0
await waitForDiscovery(ork, 30000)

// 0.3.0
await waitForDiscovery(ork, { timeoutMs: 30000, minWorkers: 1, requireDevices: true })
```

A bare numeric second argument is still accepted as `timeoutMs` for backward compatibility, but the old positional form is deprecated.

## Added

### Plugin system

(`backend/core/plugins/`)

A new `@tetherto/mdk-plugins` package introduces a declarative, file-based plugin format for App Node routes.

**Plugin manifest** (`mdk-plugin.json`):

Each plugin directory ships a manifest that describes its HTTP surface:

| Field | Description |
|---|---|
| `name`, `version`, `description` | Plugin identity |
| `routes[].id` | Unique route identifier |
| `routes[].handler` | JS file + optional named export (`./controllers/foo.js#namedExport`) |
| `routes[].auth` | Whether the route requires authentication |
| `routes[].cache` | Cache key parts extracted from the request (`query.start`, `params.id`, etc.) |
| `routes[].http` | Method, path (using `{param}` syntax), parameters, and response descriptors |

**Built-in plugins**:

| Plugin | Routes |
|---|---|
| `auth` | `GET /auth/userinfo`, `POST /auth/token`, `GET /auth/permissions`, `GET /auth/ext-data` |
| `telemetry` | `GET /auth/metrics/hashrate`, `consumption`, `efficiency`, `miner-status`, `power-mode`, `power-mode/timeline`, `temperature`, `containers/{id}`, `containers/{id}/history` |
| `site-hashrate` | Site-level hashrate metrics (placeholder, expanded in a later release) |

**Plugin loader** (`backend/core/app-node/workers/lib/plugin-loader.js`):
- `loadPlugin(pluginDir)` — loads manifest + handler files; validates route structure and uniqueness.
- Normalizes path parameters from `{id}` to `:id` (Fastify format).

**Plugin adapter** (`backend/core/app-node/workers/lib/plugin-adapter.js`):
- `buildFastifyRoutes(plugin, ctx)` — converts plugin routes to Fastify handlers, wires `authCheck` / `capCheck` for `auth: true` routes, and applies request-level caching.

**App-node integration**:

`startAppNode()` now accepts an `extraPluginDirs` option — an array of plugin package directory paths to load at boot alongside the built-in plugins.

```js
await startAppNode({ port: 3000, extraPluginDirs: ['/my-site/plugins/custom-metrics'] })
```

### Local Worker discovery

(`backend/core/mdk/lib/local-discovery.js`)

A new same-machine discovery mode lets Workers publish their RPC public key to a shared directory instead of joining the DHT. This eliminates DHT round-trip latency for local deployments.

| Function | Description |
|---|---|
| `publishWorkerKey(dir, workerId, rpcKeyHex)` | Worker side: writes the stable RPC key to `<dir>/<workerId>.key` |
| `discoverWorkerKeys(ork, dir, opts)` | ORK side: watches `dir` for `.key` files, offers each to `ork.dhtListener.discoverWorker(key)`, rescans every 4 s |

Both `getOrk()` and `startWorker()` now accept a `discovery` option:

```js
// DHT (default, works cross-network)
await getOrk({ discovery: { mode: 'dht' } })

// Local file handoff (same machine only, no DHT join)
await getOrk({ discovery: { mode: 'local', dir: '/var/run/mdk/keys' } })
await startWorker(MyMinerClass, { discovery: { mode: 'local', dir: '/var/run/mdk/keys' } })
```

In `'local'` mode no DHT topic file is written and no Hyperswarm DHT join occurs.

### HRPC client transport

(`backend/core/client/`)

The client package now supports two transports: the existing UNIX socket IPC and a new Holepunch RPC (HRPC) gateway transport for connecting to remote App Nodes.

**New dependencies**: `@hyperswarm/rpc ^3.5.0`, `hyperdht ^6.32.0`.

**`HRPCClient`** (`backend/core/client/lib/hrpc-client.js`):
- Connects to the ORK HRPC gateway using the gateway's public key.
- Serializes/deserializes MDK protocol envelopes via `@hyperswarm/rpc`.
- Accepts optional DHT seed/bootstrap overrides for test isolation.

**`createMdkClient()` transport selection**:

```js
// IPC (unchanged default)
const client = createMdkClient({ ipc: '/var/run/mdk.sock' })

// HRPC (new — cross-host app-node)
const client = createMdkClient({ hrpc: { key: '<gateway-public-key-hex>' } })
```

**`createWorkerClient(rpcKey, hrpcOpts)`** — new factory that binds a client directly to a specific Worker's RPC key without going through the ORK gateway.

### Enhanced MDK client methods

`createMdkClient()` returns several new methods for waiting on infrastructure readiness:

| Method | Description |
|---|---|
| `connect({ warmup?, warmupRetries?, warmupDelayMs? })` | Optional post-connect warmup with configurable retries |
| `getStatus({ retries?, retryDelayMs?, timeoutMs? })` | Aggregate `WORKER_LIST` with built-in retries |
| `waitForWorkers({ count?, requireDevices?, timeoutMs?, intervalMs? })` | Poll until `count` Workers (with or without registered devices) are ready |
| `waitForDevice(deviceId, { workerId?, timeoutMs?, intervalMs? })` | Poll until a specific device is registered in the ORK registry |
| `getWorkerKey(workerId)` | Resolve a Worker's RPC public key from the registry |
| `sendWorkerCommand(workerId, deviceId, command, params, { hrpc? })` | Issue a command directly to a Worker, bypassing the App Node HTTP layer |

`pullTelemetry()` now accepts a full query object in addition to a bare type string.

### MDK lifecycle API

(`backend/core/mdk/index.js`)

Two new exports simplify service teardown:

**`onShutdown(cleanupFn, opts?)`**
- Registers a one-shot handler for `SIGINT` / `SIGTERM`.
- Force-exits after `opts.forceMs` (default 3 s) if the cleanup function hangs.
- Idempotent; returns a handle for manual invocation in tests.

**`shutdown(handle)`**
- Unified async teardown for any MDK boot handle (ORK, App Node, or Worker).
- Drains the handle's `_cleanup` array and calls `.stop()` or the manager→adapter chain.
- Idempotent via an internal `__mdkShutdownDone` flag.

### Enhanced `waitForDiscovery()`

| New option | Default | Description |
|---|---|---|
| `minWorkers` | `1` | Minimum number of ready Workers required |
| `requireDevices` | `true` | Whether Workers must have registered devices |
| `timeoutMs` | `30000` | Total wait timeout in ms |
| `intervalMs` | `500` | Poll interval in ms |

Returns the full Worker list (not just the ready subset).

### Extended `startAppNode()` options

| New option | Description |
|---|---|
| `tmpdir` | Explicit corestore directory; defaults to `root` in test environments for hermetic isolation |
| `orkKey` | ORK HRPC gateway public key (hex or Buffer); selects HRPC transport instead of IPC |
| `extraPluginDirs` | External plugin directories to load at boot |

### ORK integration tests & fixtures

New out-of-process test coverage for DHT-based discovery:

- `backend/core/ork/tests/integration/dht-topic-discovery.test.js` — spawns separate ORK and Workers processes, shares only a topic file, asserts the Workers reaches `READY` within 30 s.
- `backend/core/ork/tests/fixtures/repro-ork.js` / `repro-worker.js` — standalone fixture processes for DHT integration testing.

### Whatsminer Workers restart test

`backend/workers/miners/whatsminer/tests/integration/manager-restart.test.js` — new integration test verifying that the `WhatsminerManager` reconnects correctly after a restart cycle.

### MDK core unit tests

New unit tests covering the new lifecycle functions:

- `backend/core/mdk/tests/unit/shutdown.test.js`
- `backend/core/mdk/tests/unit/wait-for-discovery.test.js`
- `backend/core/mdk/tests/integration/local-discovery.test.js`

### UI: alert utilities

(`@tetherto/mdk-ui-core`)

**`ui/packages/ui-core/src/utils/alert-queries.ts`**:

| Export | Description |
|---|---|
| `ONE_DAY_MS` | 24-hour constant |
| `DEFAULT_HISTORICAL_WINDOW_MS` | 14-day default look-back |
| `getDefaultHistoricalAlertsRange(now?)` | Seed range for alert queries |
| `buildCurrentAlertDevicesParams(filterTags?)` | `list-things` query params for current-alert devices (1 000 limit) |
| `buildHistoricalAlertsParams(range)` | `history-log` query params for a given alert window |

**`ui/packages/ui-core/src/utils/historical-log-chunks.ts`**:

| Export | Description |
|---|---|
| `breakTimeIntoIntervals(start, end, intervalMs?)` | Split a time range into 24-hour windows |
| `mergeAlertsByUuid(prev, next)` | Deduplicate alerts by `uuid` (later entry wins) |
| `fetchHistoricalAlertsInChunks(range, fetchWindow, opts?)` | Paginate + merge, honours `AbortSignal` for early exit |

### UI: alert hooks

(`@tetherto/mdk-react-adapter`)

**`useCurrentAlertDevices(options?)`** - queries the current set of devices carrying active alerts via `list-things`. Returns `ListThingsDevice[][]` (table-row format). Refreshes every 20 s by default; accepts `filterTags` and a custom `refetchInterval`.

**`useHistoricalAlerts({ start, end, intervalMs?, enabled? })`** - fetches historical alert logs over a date range, fanning out into 24-hour chunks. Merges results client-side; aborts in-flight requests when the range changes.

### UI: new core chart components

(`@tetherto/mdk-react-devkit`)

| Component | Location | Description |
|---|---|---|
| `AverageDowntimeChart` | `src/core/components/average-downtime-chart/` | Downtime metrics visualization |
| `ThresholdLineChart` | `src/core/components/threshold-line-chart/` | Line chart with configurable threshold bands |
| `OperationsEnergyCostChart` | `src/core/components/operations-energy-cost-chart/` | Energy cost over time |
| `MinMaxAvg` | `src/core/components/min-max-avg/` | Min/max/average display primitive |

### UI: new foundation domain components

(`@tetherto/mdk-react-devkit`)

**Alerts** (`src/foundation/components/alerts/`):
- Alert table with dedicated column styles.
- Powered by the new `useCurrentAlertDevices` and `useHistoricalAlerts` hooks.

**Inventory** (`src/foundation/components/inventory/`):
- Device inventory management table.
- `MovementDetailsModal` tracks device movements between racks and containers.

**Repairs** (`src/foundation/components/repairs/`):
- Device repair and maintenance log tracking.
- `RepairLogChanges` page component.

### UI: reporting tool

(`@tetherto/mdk-react-devkit`)

The reporting tool is the SDK's analytics surface. It presents financial and operational reports over a user-selected timeframe, each report reading from `@tetherto/mdk-ui-core` query helpers and rendering through shared chart primitives. The 0.3.0 release adds a revenue report, a consolidated operational dashboard, deeper hashrate views, and shared charting improvements.

**Financial reports**:
- `reporting-tool/financial/revenue-chart/` - new revenue report across the selected period, joining the existing cost, EBITDA, energy balance, and subsidy fee reports.
- Energy balance now renders downtime through the `AverageDowntimeChart` core primitive in place of its former bespoke chart.

**Operational reports**:
- `reporting-tool/operational/dashboard/` - new composite report backed by the `useOperationsDashboard` hook, summarizing fleet operations in a single view.
- `reporting-tool/operational/hashrate/` - adds a site-view tab alongside the existing mining-unit and miner-type views, with polished charts and shared axis scaling.
- `reporting-tool/operational/efficiency/` - chart legends and MDK tooltips added to the efficiency bars.

**Shared reporting infrastructure**:
- `MinMaxAvg` primitive for min/max/average summaries across reports.
- `headerAction` and `titleExtra` slots on `ChartContainer` and `LineChartCard` for mounting controls and context beside a chart title.
- `use-single-series-bar-legend` hook consolidating single-series bar chart legends.
- Reporting panels render transparent, and doughnut tooltips report values through `UNITS.PERCENT` for consistent formatting.

Timeframe selection runs through the `timeframe-controls` and `report-time-frame-selector` components and the `use-financial-date-range` hook, so every report shares one date-range model.

### UI: catalog demo pages

(`ui/apps/catalog`)

New demo pages added to `mdk-catalog-ui`:

| Page | File |
|---|---|
| Average Downtime Chart | `average-downtime-chart-page.tsx` |
| Threshold Line Chart | `threshold-line-chart-page.tsx` |
| Operations Energy Cost Chart | `operations-energy-cost-chart-page.tsx` |
| Repair Log Changes | `repair-log-changes-page.tsx` |
| Movement Details Modal | `inventory/movement-details-modal/` |
| Operational Dashboard | `reporting-tool/operational-dashboard/` |
| Revenue Chart | `reporting-tool/financial/revenue-chart/` |

### UI: CLI shell template

(`@tetherto/mdk-ui-cli`)

`ui/packages/cli/templates/mdk-ui-shell/src/pages/Alerts.tsx` - `Alerts` page added to the scaffold template generated by `mdk-ui scaffold`.

### Examples

(`examples/`)

All backend examples have been consolidated and expanded under `examples/backend/`:

| Example | Description |
|---|---|
| `examples/backend/site/` | Multi-process deployment (ORK + App Node + Workers); includes `Dockerfile`, `docker-entrypoint.sh`, and client scripts for PM2 and Docker modes |
| `examples/backend/site-single-process/` | Single-process deployment for same-machine demos and development |
| `examples/backend/ork/auth-whitelist.js` | HRPC firewall whitelist setup with key-pair generation and `hp-rpc-cli` usage examples |
| `examples/backend/ork/command-flow.js` | End-to-end command dispatch flow |
| `examples/backend/ork/telemetry-flow.js` | Telemetry pull flow |
| `examples/backend/ork/ork-shell.js` | Interactive ORK REPL |
| `examples/backend/miners/` | Per-miner Worker examples |
| `examples/backend/containers/` | Container Worker examples |
| `examples/backend/minerpools/` | Pool Worker examples |
| `examples/backend/powermeters/` | Power-meter Worker examples |
| `examples/backend/sensors/` | Sensor (temperature) Worker examples |
| `examples/backend/mdk-e2e/` | End-to-end MDK lifecycle example |
| `examples/backend/mdk-site/` | Full-site MDK example |
| `examples/full-site/` | Monorepo-level full site example |

### `.nvmrc`

A `.nvmrc` file has been added to the repository root pinning the Node.js version for `nvm` users.

### CI/CD: docs-only path detection

`.github/workflows/ci.yml` now detects whether a PR touches only documentation (`docs/`, `*.md`, `LICENSE`, `linkinator.config.json`). When the condition is true the domain build and test pipelines are skipped, cutting CI time for documentation-only changes.

## Changed

### Node.js engine requirement

All `backend/` packages have updated their `engines.node` constraint from `>=22` to `>=24`.

### `backend/core/client/` — dual-transport support

The client description updated to "IPC and HRPC (RPC gateway) transports for ORK". Transport is now selected at construction time via `{ ipc }` or `{ hrpc }`.

### App Node server routes

`workers/lib/server/index.js` no longer imports or registers `metricsRoutes` or `devicesRoutes` directly. Route coverage is now provided by the built-in plugin packages. The `auth.routes.js` file has been simplified — handler imports and helper utilities (`createAuthRoute`, `createCachedAuthRoute`) have been removed; auth callbacks now delegate fully to the plugin layer.

### `startAppNode()` test isolation

When `env === 'test'` and no explicit `tmpdir` is provided, the corestore directory defaults to `root`, giving each test run a hermetic, independent store without manual path wiring.

## Removed

- `backend/core/examples/` — moved to `examples/backend/`.
- `backend/core/ork/examples/` — moved to `examples/backend/ork/`.
- `examples/core/` — replaced by `examples/backend/`.
- `ui/packages/react-devkit/src/foundation/components/reporting-tool/financial/energy-balance/components/downtime-chart.tsx` and `downtime-chart.example.tsx` - superseded by the new `AverageDowntimeChart` primitive in `src/core/components/`.
- Direct `metricsRoutes` and `devicesRoutes` registrations from the App Node server (functionality now lives in the plugin system).

## Security

- Pinned `esbuild` to `>=0.28.1` in the UI workspace via a `ui/package.json` override, clearing advisory GHSA-gv7w-rqvm-qjhr.
- Pinned `undici` to `^7.28.0` via a `ui/package.json` override (the vulnerable version was pulled in transitively by `jsdom`), clearing seven advisories including the high-severity TLS certificate validation bypass GHSA-vmh5-mc38-953g.

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)