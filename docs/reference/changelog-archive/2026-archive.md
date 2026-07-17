
# v0.0.1

The first release labels used a pre-SemVer `V-0.0.x-beta` scheme. These were realigned to SemVer 
(0.0.2 -> v0.2.0, 0.0.3 -> v0.3.0); see CHANGELOG.md for the current entries. 
v0.0.1 remains as [originally released](../release-notes/0.0.1-release.md).

# v0.2.0

> Also, see the [v0.2.0 release notes](../release-notes/0.2.0-release.md).

MDK v0.2.0 is a major architectural overhaul release. The monorepo has been restructured into three fully federated domains (`backend/core`, `backend/workers`, `ui`), the Worker layer has been promoted to a first-class package with a formal protocol contract, the UI state layer has been rewritten around Zustand and React 19, and a new agent-first CLI and MCP endpoint land as net-new additions.

## Breaking changes

### Node.js minimum version bumped to `>=24`

All packages now require Node.js 24+. The previous minimum was Node.js 20.

### Monorepo directory layout restructured

| 0.0.1 path | 0.2.0 path |
|---|---|
| `core/` | `backend/core/` |
| `ui-client/` | `ui/` |
| `core/packages/miners/` | `backend/workers/miners/` |
| `core/packages/containers/` | `backend/workers/containers/` |
| `core/packages/powermeters/` | `backend/workers/power-meter/` |
| `core/packages/sensors/` | `backend/workers/temperature/` |
| `core/packages/minerpools/` | `backend/workers/minerpools/` |
| `core/packages/mdk/ork/` | `backend/core/ork/` |
| `core/packages/mdk/app-node/` | `backend/core/app-node/` |

Workers are no longer nested inside `core/packages/`. They live in a standalone `backend/workers/` domain 
with their own install and test lifecycle.

### `LIB_TYPES` path constants updated

Worker type identifiers changed:

| 0.0.1 | 0.2.0 |
|---|---|
| `'mdk/ork'` | `'core/ork'` |
| `'mdk/app-node'` | `'core/app-node'` |

Worker-specific paths follow the new `'workers/<category>/<provider>'` pattern (e.g. `'workers/miners/antminer'`, `'workers/containers/bitdeer'`).

### UI package manager switched from pnpm to npm

`pnpm-lock.yaml` has been replaced by `package-lock.json`. All `catalog:` dependency references have been removed and replaced with explicit version ranges. The workspace root package name changed from `@tetherto/mdk-core-ui` to `mdk-ui`.

### UI package structure replaced

The `packages/core` and `packages/foundation` packages have been removed and replaced by four new packages:

| Removed (0.0.1) | Replacement (0.2.0) |
|---|---|
| `packages/core` (monolithic component lib) | `@tetherto/mdk-react-devkit` |
| `packages/foundation` (domain components) | `@tetherto/mdk-react-devkit` (foundation/) |
| — | `@tetherto/mdk-ui-core` (framework-agnostic state) |
| — | `@tetherto/mdk-react-adapter` (React bindings) |
| — | `@tetherto/mdk-ui-cli` (`mdk-ui` CLI) |

### State management migrated from Redux Toolkit to Zustand

Redux slices (`auth`, `notification`, `actions`, `devices`, `timezone`) have been removed and replaced by Zustand vanilla stores in `@tetherto/mdk-ui-core`.

### React upgraded from 18 to 19

All UI packages now target React 19.

### Core MDK API replaced

`core/lib/mdk.js` (exporting `initType`, `startApi`, `initialize`) is replaced by `backend/core/mdk/index.js` with an explicit async API:

```js
// 0.0.1
const { initType, startApi } = require('@tetherto/mdk-core')
await startApi(port)
await initType(MyMinerClass, rack)

// 0.2.0
const { getOrk, startWorker, startAppNode, waitForDiscovery } = require('@tetherto/mdk-core/mdk')
const ork = await getOrk()
await startWorker(MyMinerClass, { ork, rack })
await startAppNode({ ork, port: 3000 })
await waitForDiscovery(ork)
```

## Added

### Federated root orchestrator

A new root `package.json` wires all three domains with unified scripts that fan out to each domain:

```bash
npm run setup       # install all domains
npm run build       # build all domains
npm run test        # test all domains
npm run lint        # lint all domains
npm run typecheck   # typecheck all domains
npm run ci          # CI-mode (lockfile-faithful) install
npm run clean       # tear down artifacts and node_modules
npm run link-check  # validate all markdown links
```

Per-domain variants available as `:ui`, `:core`, `:workers` suffixes.

### Backend: Orchestration Kernel (`backend/core/ork/`)

Full rewrite of the ORK as a structured `OrkManager` class with discrete internal modules:

| Module | Responsibility |
|---|---|
| `discovery/dht-listener` | Joins Hyperswarm DHT; finds Workers by topic key |
| `transport/hrpc-gateway` | Opens HRPC channels to each discovered Worker |
| `transport/ipc-gateway` | UNIX socket gateway for app-node consumers |
| `transport/worker-channel` | Per-Worker channel management |
| `modules/worker-registry` | Strict device-to-Worker ownership mapping |
| `modules/telemetry-collector` | Pull-only telemetry collection |
| `modules/command-dispatcher` | Routes commands by `deviceId` to the correct Worker |
| `modules/health-monitor` | Tracks Worker and device health states |
| `modules/scheduler` | Coordinates pull intervals to prevent overload |
| `protocol/envelope` | Binary envelope codec (`serialize` / `deserialize`) |
| `protocol/actions` | Canonical action catalogue |
| `protocol/schemas` | Hyperschema-based envelope validation |
| `storage/stores` | Persistent registry between restarts |
| `storage/wal` | Write-ahead log for command state |

### Backend: new MDK API (`backend/core/mdk/index.js`)

| Export | Description |
|---|---|
| `getOrk(opts)` | Initialize and return an `OrkManager`; reads DHT topic from `DEFAULT_TOPIC_FILE` by default |
| `startOrk(opts)` | Explicit ORKstartup (backward-compatible form) |
| `startWorker(ManagerClass, opts)` | Start a Worker; auto-generates and persists DHT topic; loads `mdk-contract.json` |
| `startAppNode(opts)` | Start the app-node HTTP server programmatically with config-file bootstrapping |
| `waitForDiscovery(ork, timeout)` | Poll until at least one Worker reaches `READY` state |
| `startServices(config)` | Orchestrate multiple services via PM2 or Docker |
| `DEFAULT_TOPIC_FILE` | Well-known path for the persisted DHT topic |
| `DEFAULT_IPC_SOCK` | Well-known UNIX socket path for ORK ↔ app-node IPC |

### Backend: services module (`backend/core/mdk/services.js`)

`startServices(config)` supports two runtimes:

- **PM2** — generates `ecosystem.config.js` with optional auto-start
- **Docker** — generates `docker-compose.generated.yml` (Compose v3.8) with volume mounts and environment injection

Config shape:
```js
{
  runtime: 'pm2' | 'docker',
  env: 'development' | 'production',
  services: [
    { kind: 'app-node', name, port },
    { kind: 'worker', name, worker, type, rack }
  ],
  shouldAutoStart: boolean,
  image?: string   // docker only
}
```

### Backend: MDK Worker adapter (`backend/workers/base/lib/mdk-worker-adapter.js`)

New `MDKWorkerAdapter` class manages every Worker's Hyperswarm RPC server and DHT peer discovery:

- Listens on the `'mdk'` protocol channel
- Routes telemetry pull and command requests via `handleRequest(envelope)`
- Manages persistent DHT/RPC keypairs in Hyperbee (`_getOrCreateSeed()`)
- `start()` / `stop()` / `getPublicKey()` / `_joinDiscoveryTopic()`

### Backend: Worker contract system (`mdk-contract.json`)

Every Worker now ships a machine-readable `mdk-contract.json` declaring its full surface:

| Section | What it declares |
|---|---|
| `metadata` | Provider, deviceFamily, brand, modelsSupported, overview |
| `devices` | Device instance descriptors |
| `capabilities.telemetry` | Named metrics with units (hashrate_rt/avg, power, temperature, fan speeds, uptime, shares, efficiency, power_mode) |
| `capabilities.commands` | Named commands with input constraints (reboot, setPowerMode, setLED, setupPools, setPowerPct, registerThing, updateThing, forgetThings) |
| `capabilities.config` | Configuration schema |
| `capabilities.health` | States, alerts, and troubleshooting entries |
| `capabilities.errors` | Error catalogue |

A JSON Schema for validating contracts ships at `backend/workers/base/mdk-contract.schema.json`.

### Backend: new Worker packages

Workers promoted to `backend/workers/` with `base` templates for each category:

| Category | Workers |
|---|---|
| `miners/` | antminer (S19XP, S19XPH, S21, S21PRO), avalon, whatsminer (M56S) |
| `containers/` | antspace, bitdeer, microbt |
| `minerpools/` | ocean, f2pool |
| `power-meter/` | abb, satec, schneider, **electricity** (new) |
| `temperature/` | seneca |

Each Worker ships: `mdk-contract.json`, `README.md`, `USAGE.md` (where applicable), `examples/`, and a mock server.

New `base` templates added per category: `miners/base`, `containers/base`, `minerpools/base`, `power-meter/base`, `temperature/base`, and the universal `base/`.

### Backend: `electricity` power meter (new)

New `power-meter/electricity` Worker for electricity utility data sources.

### Backend: App-Node improvements

- Fleet aggregation: computes site-level hashrate, average temperature, and cross-rack efficiency
- **MCP (Model Context Protocol) server endpoint** — AI agents can query fleet state and issue commands
- `setup-config.sh` — one-shot config file bootstrapping for first-run deployments
- Comprehensive test suite: unit tests for all handlers, routes, and lib utilities; integration tests for HTTP API and WebSocket

### Backend: config bootstrapping

- `ensureConfigFromExamples(packageDir)` — auto-copies `.example` config files to runtime locations on first start
- `findRepoRoot()` — resolves monorepo root from any nested package path

### UI: `@tetherto/mdk-ui-core` (new package)

Framework-agnostic, pure TypeScript state layer:

- **Zustand vanilla stores**: `authStore`, `devicesStore`, `notificationStore`, `timezoneStore`, `actionsStore`
- `TanStack QueryClient` factory with environment-aware base URL resolution
- Entry points: `.` (main), `./store`, `./query`, `./types`, `./stores.json` (machine-readable registry)

### UI: `@tetherto/mdk-react-adapter` (new package)

React bindings for `mdk-ui-core`:

- `<MdkProvider>` — top-level React context wrapper
- Hooks: `useAuth()`, `useDevices()`, `useNotifications()`, `useTimezone()`, `useActions()`
- Re-exports `useQuery` and `useMutation` from TanStack Query v5
- Entry points: `.`, `./hooks`, `./provider`, `./hooks.json`

### UI: `@tetherto/mdk-react-devkit` (new package)

Full React component library replacing `packages/core` and `packages/foundation`:

**Core UI primitives** (`src/core/`): accordion, alert, avatar, button, checkbox, dialog, input, label, multi-level-select, separator, skeleton, slider, spinner, switch, tabs, Toast, and more.

**Domain components** (`src/foundation/`): active-incidents-card, alarm, alerts, chart-wrapper, container, dashboard, device-explorer; financial report widgets (hash-balance, cost, EBITDA, energy-balance, subsidy-fee, efficiency); explorer views for Bitdeer, Bitmain, Bitmain Immersion, MicroBT; line-chart-card, pool-details, pool-manager, reporting-tool, settings, stats-export, timeline-chart, widget-top-row.

**New interactive visualization dependencies**:
- `react-selecto@1.26.3` — drag-to-select across chart elements
- `react-zoom-pan-pinch@4.0.3` — zoom/pan/pinch for dashboards and charts

Entry points: `.`, `./core`, `./foundation`, `./domain`, `./feature`, `./registry.json`, `./blueprints.json`, `./styles.css`, `./tokens.scss`.

### UI: `@tetherto/mdk-ui-cli` (`mdk-ui`) (new package)

Agent-first CLI for the UI toolkit:

- Binary: `mdk-ui`
- Built with `commander@12.1.0`
- Commands: registry discovery, doc/example fetching, page scaffolding, typecheck helpers
- Ships `dist/cli-manifest.json` for tooling discovery

### UI: new scripts

| Script | What it does |
|---|---|
| `build:registry` | Generates `registry.json` (component metadata for agent consumption) |
| `check:agent-ready` | Validates workspace compliance with the agent-ready contract |
| `api:surface` | Generates the public API surface documentation |
| `lint:scss` | Dedicated SCSS linting via Stylelint |

### UI: new dev dependencies

- `stylelint@^17.11.1` — CSS/SCSS linting
- `typedoc@^0.28.19` — API documentation generation
- `zod@^3.24.0` — runtime schema validation
- `@tetherto/mdk-ui-cli@*` — MDK UI CLI tooling
- `vite@^7.3.2`

### UI: agent-first docs

- `ui/AGENTS.md` — contract overview and quick recipe for LLM consumers
- `ui/docs/AGENT_FIRST.md` — manifests, blueprints, registry, and `mdk-ui-shell` end-to-end recipe

### Documentation (`docs/`)

New root-level `docs/` directory with role-based navigation:

| Section | Contents |
|---|---|
| `docs/concepts/` | `about.md`, `architecture.md`, `terminology.md`, `deployment-topologies.md` |
| `docs/tutorials/` | `get-started/` — three-rung onboarding (observe → interact → build) |
| `docs/reference/` | `release-notes/`, `maintainers/` |
| `backend/workers/docs/` | `architecture.md`, `install-pattern.md`, `agent-ready.md`, `supported-hardware.md`, `catalogue.json`, `workers-manifest.yaml`, `orchestrator.md` |

### CI/CD

- Replaced separate `ui.yaml` + `core.yaml` workflows with a unified `ci.yml`
- Added `link-check.yml` workflow
- Added composite actions: `node-setup-cache` and `node-restore-cache` for faster CI installs
- Moved `audit-ci.jsonc` to `.github/scripts/`

### Repo-level additions

- Root `.gitignore`
- `CHANGELOG.md` in project root
- `linkinator.config.json` for markdown link validation (`npm run link-check`)
- `.claude/settings.local.json`: Claude Code project settings

## Changed

### Backend

- `initialize()` path resolution updated for new monorepo nesting depth
- Root `core/package.json` simplified — external runtime dependencies moved to individual sub-package 
manifests; only `standard@17.1.0` remains as a root dev dependency
- Test and install lifecycle managed via `install-packages.sh` and `test-packages.sh` workspace shell scripts

### UI

- Package manager: pnpm → npm (engine constraint: `npm >=11.0.0`)
- Node.js engine constraint: `node >=20.0.0` → `node >=24.0.0`
- Demo app renamed from `mdk-demo-ui` to `mdk-catalog-ui` (scripts updated: `build:demo` → `build:catalog`, `dev:demo` → `dev:catalog`, `preview:demo` → `preview:catalog`)
- `turbo` upgraded from catalog pin to `^2.9.14`
- `eslint` upgraded to `^9.39.2`; `@antfu/eslint-config` to `^6.7.3`

## Removed

- `core/` top-level directory (replaced by `backend/core/`)
- `ui-client/` top-level directory (replaced by `ui/`)
- `core/packages/` Worker packages (promoted to `backend/workers/`)
- `core/packages/mdk/ork/` and `core/packages/mdk/app-node/` (promoted to `backend/core/ork/` and `backend/core/app-node/`)
- `core/packages/mdk/mock-control-service/` (functionality absorbed into `backend/core/examples/`)
- `RELEASE_NOTES/` root directory (release notes moved to `docs/reference/release-notes/`)
- `scripts/` root directory (CI scripts moved to `.github/scripts/`)
- `.github/actions/setup-runtime/` (replaced by `node-setup-cache` + `node-restore-cache`)
- `ui-client/docs/COVERAGE.md`, `BUILD_SYSTEM.md`, `BUILD_SCRIPTS.md`, `WATCH_MODE_GUIDE.md`, `SCSS_SETUP.md` (consolidated into `ui/docs/BUILD.md` and `ui/docs/STYLING.md`)
- `ui-client/pnpm-lock.yaml` and `pnpm-workspace.yaml` (pnpm removed)
- `ui-client/packages/core` and `packages/foundation` (replaced by new package split)

## v0.3.0

> For a high-level introduction, see the [v0.3.0 release notes](../release-notes/0.3.0-release.md).

### Overview

MDK v0.3.0 focuses on extensibility, multi-host deployments, and a richer UI data layer. The headline additions are:

- A formal plugin system for App Node routes (`@tetherto/mdk-plugins`)
- A local-discovery mode that bypasses DHT for same-machine setups
- An HRPC client transport for cross-host App Node connections
- A unified lifecycle API (`onShutdown` / `shutdown`)
- A wave of new UI components covering alerts, inventory, repairs, and operational reporting

### Breaking changes

#### Node.js minimum version bumped to `>=24`

All packages previously requiring `>=22` now require Node.js 24+. Update your runtime before upgrading.

#### App-node HTTP routes moved to the plugin system

`metricsRoutes` and `devicesRoutes` are no longer registered directly in `backend/core/app-node/workers/lib/server/index.js`. Auth and telemetry endpoints are now delivered by the built-in plugins in `backend/core/plugins/`. Code that patched or monkey-patched these route registrations must be migrated to the plugin manifest format.

#### `waitForDiscovery()` signature changed

The second argument is now an options object instead of a bare timeout number:

```js
// 0.2.0
await waitForDiscovery(ork, 30000)

// 0.3.0
await waitForDiscovery(ork, { timeoutMs: 30000, minWorkers: 1, requireDevices: true })
```

A bare numeric second argument is still accepted as `timeoutMs` for backward compatibility, but the old positional form is deprecated.

### Added

#### Plugin system

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

#### Local Worker discovery

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

#### HRPC client transport

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

#### Enhanced Client methods

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

#### MDK lifecycle API

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

#### Enhanced `waitForDiscovery()`

| New option | Default | Description |
|---|---|---|
| `minWorkers` | `1` | Minimum number of ready Workers required |
| `requireDevices` | `true` | Whether Workers must have registered devices |
| `timeoutMs` | `30000` | Total wait timeout in ms |
| `intervalMs` | `500` | Poll interval in ms |

Returns the full Worker list (not just the ready subset).

#### Extended `startAppNode()` options

| New option | Description |
|---|---|
| `tmpdir` | Explicit corestore directory; defaults to `root` in test environments for hermetic isolation |
| `orkKey` | ORK HRPC gateway public key (hex or Buffer); selects HRPC transport instead of IPC |
| `extraPluginDirs` | External plugin directories to load at boot |

#### ORK integration tests & fixtures

New out-of-process test coverage for DHT-based discovery:

- `backend/core/ork/tests/integration/dht-topic-discovery.test.js` — spawns separate ORK and Workers processes, shares only a topic file, asserts the Workers reaches `READY` within 30 s.
- `backend/core/ork/tests/fixtures/repro-ork.js` / `repro-worker.js` — standalone fixture processes for DHT integration testing.

#### Whatsminer Workers restart test

`backend/workers/miners/whatsminer/tests/integration/manager-restart.test.js` — new integration test verifying that the `WhatsminerManager` reconnects correctly after a restart cycle.

#### MDK core unit tests

New unit tests covering the new lifecycle functions:

- `backend/core/mdk/tests/unit/shutdown.test.js`
- `backend/core/mdk/tests/unit/wait-for-discovery.test.js`
- `backend/core/mdk/tests/integration/local-discovery.test.js`

#### UI: alert utilities

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

#### UI: alert hooks

(`@tetherto/mdk-react-adapter`)

**`useCurrentAlertDevices(options?)`** - queries the current set of devices carrying active alerts via `list-things`. Returns `ListThingsDevice[][]` (table-row format). Refreshes every 20 s by default; accepts `filterTags` and a custom `refetchInterval`.

**`useHistoricalAlerts({ start, end, intervalMs?, enabled? })`** - fetches historical alert logs over a date range, fanning out into 24-hour chunks. Merges results client-side; aborts in-flight requests when the range changes.

#### UI: new core chart components

(`@tetherto/mdk-react-devkit`)

| Component | Location | Description |
|---|---|---|
| `AverageDowntimeChart` | `src/core/components/average-downtime-chart/` | Downtime metrics visualization |
| `ThresholdLineChart` | `src/core/components/threshold-line-chart/` | Line chart with configurable threshold bands |
| `OperationsEnergyCostChart` | `src/core/components/operations-energy-cost-chart/` | Energy cost over time |
| `MinMaxAvg` | `src/core/components/min-max-avg/` | Min/max/average display primitive |

#### UI: new foundation domain components

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

#### UI: reporting tool

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

#### UI: catalog demo pages

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

#### UI: CLI shell template

(`@tetherto/mdk-ui-cli`)

`ui/packages/cli/templates/mdk-ui-shell/src/pages/Alerts.tsx` - `Alerts` page added to the scaffold template generated by `mdk-ui scaffold`.

#### Examples

(`examples/`)

All backend examples have been consolidated and expanded under `examples/backend/`:

| Example | Description |
|---|---|
| `examples/backend/site/` | Multi-process deployment (ORK + App Node + Workers); includes `Dockerfile`, `docker-entrypoint.sh`, and client scripts for PM2 and Docker modes |
| `examples/backend/site-single-process/` | Single-process deployment for same-machine demos and development |
| `examples/backend/ork/auth-whitelist.js` | HRPC firewall allowlist setup with key pair generation and `hp-rpc-cli` usage examples |
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

#### `.nvmrc`

A `.nvmrc` file has been added to the repository root pinning the Node.js version for `nvm` users.

#### CI/CD: docs-only path detection

`.github/workflows/ci.yml` now detects whether a PR touches only documentation (`docs/`, `*.md`, `LICENSE`, `linkinator.config.json`). When the condition is true the domain build and test pipelines are skipped, cutting CI time for documentation-only changes.

### Changed

#### Node.js engine requirement

All `backend/` packages have updated their `engines.node` constraint from `>=22` to `>=24`.

#### `backend/core/client/` — dual-transport support

The client description updated to "IPC and HRPC (RPC gateway) transports for ORK". Transport is now selected at construction time via `{ ipc }` or `{ hrpc }`.

#### App Node server routes

`workers/lib/server/index.js` no longer imports or registers `metricsRoutes` or `devicesRoutes` directly. Route coverage is now provided by the built-in plugin packages. The `auth.routes.js` file has been simplified — handler imports and helper utilities (`createAuthRoute`, `createCachedAuthRoute`) have been removed; auth callbacks now delegate fully to the plugin layer.

#### `startAppNode()` test isolation

When `env === 'test'` and no explicit `tmpdir` is provided, the corestore directory defaults to `root`, giving each test run a hermetic, independent store without manual path wiring.

### Removed

- `backend/core/examples/` — moved to `examples/backend/`.
- `backend/core/ork/examples/` — moved to `examples/backend/ork/`.
- `examples/core/` — replaced by `examples/backend/`.
- `ui/packages/react-devkit/src/foundation/components/reporting-tool/financial/energy-balance/components/downtime-chart.tsx` and `downtime-chart.example.tsx` - superseded by the new `AverageDowntimeChart` primitive in `src/core/components/`.
- Direct `metricsRoutes` and `devicesRoutes` registrations from the App Node server (functionality now lives in the plugin system).

### Security

- Pinned `esbuild` to `>=0.28.1` in the UI workspace via a `ui/package.json` override, clearing advisory GHSA-gv7w-rqvm-qjhr.
- Pinned `undici` to `^7.28.0` via a `ui/package.json` override (the vulnerable version was pulled in transitively by `jsdom`), clearing seven advisories including the high-severity TLS certificate validation bypass GHSA-vmh5-mc38-953g.

## v0.4.0

> For a high-level introduction, see the [v0.4.0 release notes](../release-notes/0.4.0-release.md).

### Overview

- Delivers the write path to complement 0.3.0's read-heavy plugin/discovery work
- Adds a full **Pool Manager** UI feature, **inventory & spare-parts management**, four new chart primitives
- Implements a **CSS split** of `@tetherto/mdk-react-devkit` into core and foundation stylesheets (breaking)
- Adds a much richer local dev story — a shared worker **mock framework** and an expanded `examples/full-site` fleet

### Breaking changes

#### `@tetherto/mdk-react-devkit` CSS split into core + foundation stylesheets

`@tetherto/mdk-react-devkit/styles.css` no longer contains mining-domain (foundation) component styles — it now ships only design tokens + core primitives (Button, Card, Input, charts, …), ~18 KB gzipped. Foundation component styles (explorer, containers, pool-manager, reporting-tool, settings, …) moved to a new `@tetherto/mdk-react-devkit/styles-foundation.css`, ~70 KB gzipped.

**Action required** if you use any foundation (mining-domain) components — add a second import after `styles.css`:

```ts
import "@tetherto/mdk-react-devkit/styles.css"
import "@tetherto/mdk-react-devkit/styles-foundation.css" // only if using foundation components
```

`styles.css` must be imported **first** — it defines the `--mdk-*` design tokens the foundation styles reference. Apps using only core primitives need no change and ship ~70 KB less CSS. No JS API changed; failure is silent (foundation components render unstyled), which is why this is called out as a required upgrade step rather than a runtime error. See `ui/docs/STYLING.md#core-and-foundation-stylesheets`.

The package's `exports` map gained `"./styles-foundation.css"` and a `"./package.json"` self-export; `files` now explicitly lists `src/**/*.scss` and `src/**/*.webp` to support the split.

### Added

#### Write-action flow (end-to-end)

A full approve/reject/cancel lifecycle for write commands, from the kernel down to the UI:
- End-to-end **write-action approval flow** (kernel `action-manager`/`action-caller` + permissions + a batch of React write hooks)
- A durable **command state machine with a write-ahead log** for crash-recoverable command dispatch

**Kernel** (`backend/core/kernel/lib/modules/`):

| Module | Responsibility |
|---|---|
| `action-manager/index.js` (`ActionManager`) | Handles the action approval lifecycle — `pushAction()`, batch push, vote counting against `ACTION_NEG_VOTES_THRESHOLD`, and delegating writes to workers once quorum is reached. Wraps the legacy `@tetherto/svc-facs-action-approver` (pinned git dependency `#v1.0.0`) behind MDK protocol envelopes instead of legacy worker RPC handlers. |
| `action-manager/caller-proxy.js` | Adapts `ActionCaller` into the shape `svc-facs-action-approver` expects. |
| `action-caller/index.js` | Resolves an action into per-worker write calls (`getWriteCalls()`) and required permissions. |
| `permissions/index.js` | `PERMISSION_LEVELS` (`r`/`w`/`rw`) and `hasWritePermission(permissions, baseType)` / `hasPermission()` — colon-delimited device-family permission strings (e.g. `miner:w`, `container:w`). |

New protocol actions (`backend/core/kernel/lib/protocol/actions.js`, protocol version bumped `0.1.0` → `0.2.0`):

```
action.push, action.push-batch, action.get, action.get-batch,
action.query, action.vote, action.cancel-batch,
write.calls.request, write.calls.response
```

New dependencies: `async ^3.2.6`, `mingo ^6.4.15` (MongoDB-style query matching, used for action/permission filtering), `@bitfinex/lib-js-util-base`.

**`@tetherto/mdk-react-adapter`** — new write hooks (`ui/packages/react-adapter/src/hooks/`), all gated on the `actions:w` permission via `useCheckPerm`:

| Hook | Description |
|---|---|
| `useSubmitSingleAction()` | Submits one staged action from the local `actionsStore` queue by id; inspects the 200 response body for embedded errors before treating the call as successful. |
| `useSubmitPendingActions()` | Drains the entire staged queue, `POST`s each action, clears the queue, invalidates pool/miner/actions caches. |
| `useVoteOnAction()` | Casts an approve/reject vote via `PUT /auth/actions/voting/:id/vote`. |
| `useCancelAction()` | Cancels one or more pending voting actions via `DELETE /auth/actions/voting/cancel?ids=…`. |
| `usePendingActions({ params?, refetchInterval?, enabled? })` | Fetches the server-side voting/approval queue via `GET /auth/actions` (distinct from the local staging buffer). |
| `useLiveActions()` | Queries live actions and partitions them into `[mine, others]` by comparing the submitter's email against the current user; polls every `LIVE_ACTIONS_POLL_INTERVAL_MS`. |

`action-write-utils.ts` centralizes `ACTIONS_WRITE_PERM`, `invalidateAfterActionWrite()`, `extractSubmitError()`, and `toVotingPayload()` shared by the hooks above.

**`@tetherto/mdk-ui-foundation`** — new query/mutation factories in `pool-factories.ts`: `actionsQuery`, `liveActionsQuery`, `submitActionMutation`, `submitBatchActionMutation`, `voteActionMutation`, `cancelActionsMutation`.

New integration coverage: `backend/core/kernel/tests/integration/actions.test.js` and `actions-stress.test.js` (a stress-test harness exercising the push/vote/cancel flow under load).

#### Command state machine and write-ahead log

A durable state machine now backs every dispatched command, replacing fire-and-forget dispatch with a recoverable lifecycle.

**`backend/core/kernel/lib/modules/command-state-machine/`**:
- States: `QUEUED → DISPATCHED → EXECUTING → SUCCESS | FAILED | TIMEOUT` (`TIMEOUT` is semi-terminal — re-queued if retry budget remains). `isValidTransition(from, to)` enforces the transition table
- `CommandStateMachine` is wired into `KernelManager._initModules()` with `wal`, `workerChannel`, `registry`, `maxRetries` (default 3, `kernel.commandMaxRetries`), and `timeoutMs` (default 30000, `kernel.commandTimeoutMs`)

**`backend/core/kernel/lib/storage/wal.js`** — append-only Write-Ahead Log for command state transitions. Every transition is persisted before it takes effect; on restart the state machine sweeps the WAL: `DISPATCHED`/`EXECUTING` are forced to `TIMEOUT`, `TIMEOUT` is re-queued if retries remain, `QUEUED` is left alone, and terminal entries (`SUCCESS`/`FAILED`) are eligible for compaction.

**New gateway actions** (`gateway-handler.js`): `COMMAND_STATUS` → `dispatcher.getStatus(commandId)`, `COMMAND_CANCEL` → `dispatcher.cancel(commandId)`.

**Command scopes** (`COMMAND_SCOPES`: `device` | `worker` | `rack`) let a single command target a device, an entire worker, or a rack, resolved in `command-dispatcher`. `MAX_TARGETS` (1024) caps fan-out per command.

#### Pool Manager (UI feature)

New `pool-manager` foundation feature (`ui/packages/react-devkit/src/domain/features/pool-manager/` and `.../components/pool-manager/`) covering pool configuration, a sites overview, a miner explorer, site-overview-details, an actions sidebar (review tray for pending write-actions), and an assign-pool modal. Ships with a CLI shell-template page and a `PoolManager.tsx` scaffold entry, each sub-feature documented with a `USAGE.md` and `.example.tsx`.

**Pool data layer** (`@tetherto/mdk-ui-foundation`, `ui/packages/ui-foundation/src/`):
- `types/pool.types.ts` — pool/miner/site type definitions
- `query/pool-factories.ts` — `poolConfigsQuery`, `poolConfigForDeviceQuery`, `poolsQuery`, `poolBalanceHistoryQuery`, `minersQuery`, `siteStatusLiveQuery`, `containerPoolStatsQuery`, `userInfoQuery`

**`@tetherto/mdk-react-adapter`** — new consuming hooks: `usePools`, `usePoolConfigs`, `usePoolConfigsData`, `usePoolStats`, `usePoolRows`, `usePoolBalanceHistory`, `useContainerPoolStats`, `useSitesOverview`, `useSitesOverviewData`, `useSiteStatusLive`, `useSiteMinerCounts`, `useSiteMinerStats`, `useSiteDetailMiners`, `useSiteEfficiency`, `useSiteHashrate`, `useSiteConsumption`, `useSiteConsumptionChartData`, `useSiteContainerCapacity`, `useSitePowerMeter`, `useMiners`, `useMinerDevices`, `useMinerDuplicateValidation`, `useStaticMinerIpAssignment`, `usePoolManagerDashboard`

#### Inventory & Spare-Parts Management (UI)

`MovementDetailsModal` (`inventory/movement-details-modal/`) tracks device movements between racks and containers.

`ui/packages/react-devkit/src/domain/components/inventory/spare-parts/` — a full spare-parts CRUD surface: `AddSparePartModal`, `BulkAddSparePartsModal` (CSV upload via `use-bulk-csv-upload.ts`), `BatchMoveSparePartsModal`, `MoveSparePartModal`, `ConfirmDeleteSparePartModal`, and `SparePartSubTypesModal`. Each ships a `USAGE.md`, SCSS module, and example.

#### New Core Chart Primitives (`@tetherto/mdk-react-devkit`)

| Component | Location |
|---|---|
| `AreaChart` | `src/primitives/components/area-chart/` |
| `BarChart` | `src/primitives/components/bar-chart/` |
| `DoughnutChart` | `src/primitives/components/doughnut-chart/` |
| `GaugeChart` | `src/primitives/components/gauge-chart/` |
| `LineChart` | `src/primitives/components/line-chart/` |
| `MultiSelect` | `src/primitives/components/multi-select/` |
| `ChartContainer` / `ChartStatsFooter` | `src/primitives/components/chart-container/`, `chart-stats-footer/` — shared chart chrome |

#### Worker mock framework and mock control service

A shared framework for running fake devices locally, replacing ad-hoc per-worker mocks.

- **`backend/workers/mock/`** — `base.mock.js` (`BaseMock` + transport contract) plus per-device-type mocks (`miner.mock.js`, `container.mock.js`, `minerpool.mock.js`, `powermeter.mock.js`, `sensor.mock.js`) and a `transports/` directory (`http`, `modbus`, `mqtt`, `tcp`, plus a shared `base` transport)
- **`backend/workers/scripts/run-mocks.js`** — parallel mock-device runner behind `npm run mock` (root script: `"mock": "npm --prefix backend/workers run mock"`); accepts a comma-delimited device list and per-mock flags, and prints the available device/type list when run with no arguments
- **`backend/core/mock-control-service/`** — new `@tetherto/mdk-mock-control-service` package (`routes.js`, `mock-control-agent.js`) for controlling mock device behavior at runtime (e.g. simulating faults) rather than only static fixtures
- Every miner/container/sensor worker package (`antminer`, `avalon`, `whatsminer`, `f2pool`, `ocean`, `abb`, `satec`, `schneider`, `seneca`) was reworked to plug into the shared mock/transport framework, with `mock/server.js` rewritten and a short `README.md`/`USAGE.md` added per package

#### Documentation

- **`docs/concepts/stack/`** (new) — `app-node.md`, `app-toolkit.md`, `kernel.md`, `workers.md`: a structured per-layer breakdown of the stack, replacing the older `docs/concepts/worker-discovery.md`
- **`docs/how-to/gateway/`** (new) — `index.md`, `plugins.md` (plugin authoring), `run.md`, `teardown.md` (lifecycle/shutdown guidance for the 0.3.0 `onShutdown`/`shutdown` API)
- **`docs/scripts/generate-plugin-reference.js`** — regenerates the route tables in `backend/core/plugins/README.md` from each plugin's `mdk-plugin.json`, run via `npm run generate:plugin-reference`, so published plugin docs can't drift from the manifests
- `docs/concepts/architecture.md`, `about.md`, `deployment-topologies.md`, and `terminology.md` received substantial rewrites consistent with the stack-doc restructuring
- **`RELEASING.md`** — release-process guide, plus a GitHub pull-request template
- **`docs/reference/release-notes/0.4.0-release.md`** — new release-notes stub for this version

#### Tooling

- **`check-registry-completeness`** (`ui/packages/react-devkit/scripts/check-registry-completeness.mts`, with `registry-completeness-exceptions.json`) — verifies every exported component is registered in the component catalog/registry
- **`treeshake-check`** (`ui/scripts/treeshake-check.mjs`) — verifies package exports remain tree-shakeable

### Changed

#### `@tetherto/mdk-react-devkit` bundle footprint

Dependency and bundle-size reductions accompany the core/foundation stylesheet split (see Breaking Changes), so core-only consumers ship roughly the design-tokens-plus-primitives subset instead of the full stylesheet.

#### Test file naming convention

Unit test files under `backend/workers/base/tests/` and `backend/workers/miners/base/tests/` were renamed to the `*.test.js` suffix (e.g. `thing.js` → `thing.test.js`, `miner.manager.js` → `miner.manager.test.js`), matching the `NODE_ENV=test brittle 'tests/**/*.test.js'` glob now standardized across backend packages' `test`/`test:coverage`/`test:integration` scripts.

#### Dependency bumps

- `@vitejs/plugin-react` `^5.1.4` → `^6.0.2` across UI packages.
- All `backend/core`, `backend/workers`, and `ui/packages` package versions synced to `0.3.0`

### Removed

- The JetBrains Mono **Thin** font weight (`ui/packages/fonts/src/fonts/JetBrainsMono-Thin.woff2`) from `@tetherto/mdk-fonts`
- Legacy `backend/workers/base` and miner scaffolding files (cleanup)

### Fixed

- Console errors in the catalog / full-site UI (#132)
- Full-site miners local-discovery watch (#129) and example setup (#99)
- Documentation port/link fixes (#117)
