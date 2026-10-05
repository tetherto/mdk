
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

```text
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

## v0.5.0

> For a high-level introduction, see the [v0.5.0 release notes](../release-notes/0.5.0-release.md).

### Overview

- Completes the control-plane **rename**: **ORK → Kernel** and **App Node → Gateway**, across backend, UI, examples, and docs (breaking)
- **Retires the IPC transport** — HRPC is now the only client transport, with a zero-config Kernel **key-file** bootstrap (breaking)
- Extracts the Worker runtime into a standalone **`@tetherto/mdk-worker`** package and migrates every worker onto the `WorkerRuntime` plugin model, deleting the legacy `base/`/`ThingManager` packages (breaking)
- Renames the UI foundation package **`@tetherto/mdk-ui-core` → `@tetherto/mdk-ui-foundation`** and restructures `@tetherto/mdk-react-devkit` into **`primitives`/`domain`** layers (breaking)
- Renames every worker package to a uniform **`@tetherto/mdk-worker-*`** scheme, and removes the microbt and electricity workers (breaking)
- Adds **paginated, searchable** pools and containers listings
- Ships a **third-party Worker developer guide**, a docs-generation pipeline, a full-site **dashboard + MCP server** example, and a large **test-coverage** push

### Breaking changes

#### ORK renamed to Kernel

The orchestration runtime called **ORK** is now the **Kernel** throughout the codebase, matching the docs and protocol terminology.

- `backend/core/ork/` → `backend/core/kernel/`; package `@tetherto/mdk-ork` → **`@tetherto/mdk-kernel`**
- Internal module `lib/ork.manager.js` → `lib/kernel.manager.js`; class `ORKManager` → `KernelManager`
- The UI nomenclature was swept in lockstep (`ork` → `kernel`) across `@tetherto/mdk-ui-foundation`, `@tetherto/mdk-react-adapter`, and `@tetherto/mdk-react-devkit`; the JSDoc capability tag `@orkCapability` / `ork-capabilities` → `@kernelCapability` / `kernel-capabilities`

**Not affected**: the MDK protocol action names are unchanged — only doc comments moved from "ORK"/"App Node" to "Kernel"/"Gateway". Envelope string values (`identity.request`, `command.request`, `worker.list`, …) are identical, so a 0.4.x peer still speaks the same wire protocol.

**Action required**: replace imports of `@tetherto/mdk-ork` with `@tetherto/mdk-kernel` and path references to `backend/core/ork` with `backend/core/kernel`.

#### App Node renamed to Gateway

- `backend/core/app-node/` → `backend/core/gateway/`; package `@tetherto/mdk-app-node` → **`@tetherto/mdk-gateway`**
- The bootstrap export **`startAppNode()` → `startGateway()`** (`backend/core/mdk`)
- The client envelope `sender`/`requesterId` value `'app-node'` → `'gateway'`
- `@tetherto/mdk-plugins` is now described as "MDK Gateway Plugins" (was "MDK App Node Plugins")

**Action required**: rename `startAppNode` call sites to `startGateway`, and update the `@tetherto/mdk-app-node` dependency to `@tetherto/mdk-gateway`.

#### IPC transport removed — HRPC only

The Unix-socket IPC transport is gone; HRPC (RPC listener) is the sole client transport.

- **Client**: `backend/core/client/lib/ipc-client.js` deleted; `createMdkClient` no longer accepts `opts.ipc`; `_createTransport` now throws `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` when neither `hrpc` nor `transport` is supplied
- **Kernel**: `IPCListener` and its `KernelManager` lifecycle wiring removed, along with the `listeners.ipc` option on `createKernel`
- **Zero-config bootstrap replacement**: `getKernel` now writes the Kernel's HRPC public key (hex) to a **key file** — `DEFAULT_KEY_FILE` = `<tmpdir>/mdk/.kernel-key` — after start, so out-of-process clients connect without any hand-passed key. `startGateway` resolves the key from that file (order documented); `opts.keyFile` (`string | boolean`) overrides, and `keyFile: false` disables it. New error `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

#### `@tetherto/mdk-ui-core` renamed to `@tetherto/mdk-ui-foundation`

The core UI data/state package is now published as **`@tetherto/mdk-ui-foundation`** (`ui/packages/ui-core/` → `ui/packages/ui-foundation/`). Update the dependency name and imports; the API surface is unchanged by the rename itself.

#### `@tetherto/mdk-react-devkit` layer restructure and export-map changes (`core`/`foundation` → `primitives`/`domain`)

The devkit source layers were renamed — `src/core/` → **`src/primitives/`** (alias `@core` → `@primitives`), `src/foundation/` → **`src/domain/`** (alias `@foundation` → `@domain`), and the inner `components/domain/` → `components/composite/`. This moved **193 component `USAGE.md`** files and their sources; update any deep imports into `@tetherto/mdk-react-devkit/src/...` accordingly.

The package `exports` map changed:

- `"./core"` **removed** → use `"./primitives"`
- `"./foundation"` and `"./feature"` **removed** (unused convenience exports); `"./domain"` retained but now resolves to `./dist/domain/index`
- Stylesheet `"./styles-foundation.css"` **renamed to `"./styles-domain.css"`** (source `styles-foundation.scss` → `styles-domain.scss`). **Action required** for anyone who adopted the 0.4.0 core/foundation CSS split: rename the second import to `@tetherto/mdk-react-devkit/styles-domain.css`.

#### Registry & docs-data schema bumped to `2.0.0` (ORK → Kernel field rename)

`REGISTRY_SCHEMA_VERSION` (`1.4.0` → `2.0.0`) and `DOCS_DATA_SCHEMA_VERSION` (`1.3.0` → `2.0.0`) both moved, because the capability fields consumers read were renamed: `orkCapabilities` → `kernelCapabilities`, type `OrkCapability` → `KernelCapability`, the required JSDoc tag `@orkCapability` → `@kernelCapability`, and the index keys `componentsByOrkCapability`/`hooksByOrkCapability`/blueprint `byOrkCapability` → `…ByKernelCapability`. The `find`/`docs`/`blueprints` CLI commands emit the renamed field.

#### Worker packages renamed to `@tetherto/mdk-worker-*`

Every worker package moved to a uniform scheme, e.g. `@tetherto/miner-antminer` → **`@tetherto/mdk-worker-antminer`**, `@tetherto/container-bitdeer` → **`@tetherto/mdk-worker-bitdeer`**, and the demo `@tetherto/sample-demo-worker` → **`@tetherto/mdk-worker-demo`** (also across antspace, avalon, whatsminer, f2pool, ocean, abb, satec, schneider, seneca).

#### Worker runtime extracted; legacy `base/` packages removed

`WorkerRuntime` now ships in the new `@tetherto/mdk-worker` package (see Added), and every worker was migrated onto the `WorkerRuntime` plugin model (`plugin/` with `boot.js`, `index.js`, `mdk-contract.json`, `src/commands/*`, `src/telemetry/*`). The shared `base/` packages were deleted: `backend/workers/base/` (`ThingManager`, `thing.js`, `mdk-worker-adapter.js`, `lib/services/*`, `facs/*`, contract schema) and the per-family `miners/base`, `containers/base`, `power-meter/base`, `temperature/base`, `minerpools/base`. Consumers no longer import `ThingManager`, the family managers, or the device bases.

### Added

#### `@tetherto/mdk-worker` — Worker Runtime package

New package (`backend/core/mdk-worker/`, v0.1.0) — "hosts a Worker Plugin's devices behind one HRPC channel to the Kernel."

| Export / feature | Description |
|---|---|
| `WorkerRuntime` (`lib/worker-runtime.js`) | Hosts N same-type devices behind one HRPC channel; `getPublicKey()`, `getDeviceContext(deviceId)`; handlers invoked as `(ctx, params)` with `ctx = { deviceId, device, config }`, results wrapped in MDK protocol envelopes. Generalizes/replaces the former `MDKWorkerAdapter` (persistent seeds, single HRPC respond loop, DHT topic announce carried over; `ThingManager` delegation replaced by per-device handler dispatch). |
| `loadPlugin` (`lib/plugin-loader.js`) | Plugin loader with eager handler loading. |
| `service-builtins.js` | `telemetryBuiltin`, `commandBuiltin`, `mergeBuiltinCommands` — serves the legacy worker-infra surface (logs/count/config, pool `ext_data` queries, write-action approval) from injected `opts.services`. |
| `mdk-contract.schema.json` | Formal JSON Schema (draft 2020-12) for the device-lib contract, re-homed with the runtime. |
| `opts.allowEmptyDevices` | Opt-in zero-device boot for provisioning-first bootstrap; default still throws `ERR_DEVICES_REQUIRED`. |

Dependencies: `@hyperswarm/rpc` 3.5.0, `hyperdht` 6.32.0, `hyperswarm` 4.17.0, `debug` 4.4.1.

#### Gateway — paginated, searchable listings

- **Pools list pagination + search** (`server/handlers/pools.handlers.js`): `getPools` accepts `search`, `offset`, `limit`. `search` matches `name`/`pool`/`account` (case-insensitive); `total` counts the matched set before the page slice; `summary` still covers the full pool set. Response is `{ pools, summary, total }`. Schema adds `search` (string), `offset` (int ≥ 0), `limit` (int 1–100).
- **Containers list server-side filter/sort/pagination** (`server/handlers/devices.handlers.js`): `getContainers` pushes tag + filter + search to `listThings`, takes the global `total` from `getThingsCount`, then merges/sorts/slices (matching the miners handler).

#### `@tetherto/mdk` — absorbed worker-infra services

The former `mdk-utils` package was absorbed into `@tetherto/mdk`: new `lib/services/` (actions, alerts, comments, log-history, logs, pool, provisioning, settings, snaps, stats + `pool-utils/`), `lib/things/` device layer (thing, miner, container, powermeter, sensor + constants), `lib/templates/` (alerts, stats), `lib/worker-infra.js`, `lib/utils.js`, with extensive new unit coverage. New deps pulled in: `@bitfinex/bfx-facs-http`, `@bitfinex/bfx-facs-scheduler`, `@bitfinex/lib-js-util-base`, `@bitfinex/lib-js-util-promise`, `async` 3.2.6, `mingo` 6.5.6, `uuid` 14.0.0.

#### Per-worker runtime plugins + contract-declared handlers

Each surviving worker gained a `plugin/` package (`boot.js`, `index.js`, `mdk-contract.json`, `src/commands/*`, `src/telemetry/*`) with matching integration + unit test suites — antminer, avalon, whatsminer (miners); antspace, bitdeer (containers); f2pool, ocean (minerpools); abb, satec, schneider (power-meter); seneca (temperature). Example: antminer telemetry (accepted/rejected shares, hashrate-avg, power, power-mode, efficiency, status, temperature, uptime, snap) and commands (reboot, set-led, set-power-mode, setup-pools). A `whatsminer/examples/run-runtime-parity.js` e2e runs the runtime against mock devices.

#### Documentation

- **Worker developer guides**: `docs/guides/workers/build-a-worker.md` (build a third-party Worker end-to-end, from your own repo) and `docs/tutorials/quickstart/build-a-dashboard.md` (one Worker + one Gateway route + one static page, no build step).
- **HRPC**: `examples/backend/inspect-over-hrpc.md` (inspect MDK over HRPC with `hp-rpc-cli`); the IPC transport docs were replaced with the HRPC key-file flow across the top-level README and core/worker READMEs.
- **MCP**: `examples/full-site/docs/mcp-server.md` documents a full-site MCP server that connects to the Kernel directly over HRPC (no Gateway) and exposes registry/telemetry/command tools over HTTP.
- **New stack/reference pages**: `docs/concepts/stack/kernel.md` and `stack/gateway.md` (replacing the ORK/app-node pages); `docs/reference/glossary.md` (replacing `docs/concepts/terminology.md`), with an HRPC section.
- **Docs-generation pipeline**: `mdk-ui docs:generate` with package-grouped versioned reference nav (`ui/packages/cli`), documented in `ui/docs/extending-docs-to-backend.md` and a rewritten `ui/docs/docs-sync-how-to.html`.

#### Examples

- **full-site dashboard + MCP**: a new `DashboardPage.tsx` and supporting UI (`AppSidebar`, `ContainerGrid`, `Containers`/`Control`/`Monitoring`/`Pools` pages, chart components), plus an MCP server (`backend/proc/mcp-server.js`, `.mcp.json`) and new dep `@modelcontextprotocol/sdk ^1.29.0`.
- **`examples/site-backend/`** (new) — boots every worker family as its own OS process against mock hardware, coordinated by a Kernel and exposed via the Gateway HTTP API; runnable under PM2 or Docker (Dockerfile, docker-compose, PM2 ecosystem).
- **`examples/backend/mdk-plugin-e2e/`** (new) — plugin-authoring e2e: `WorkerRuntime` hosting mock devices + Kernel + Gateway Plugin aggregation.
- **`examples/backend/demo-worker-caller/index.js`** (new) — a single-file "caller" showing how a host constructs `WorkerRuntime` around the shipped demo-worker plugin and runs a telemetry sampler loop.
- **`examples/backend/kernel/`** (new) and per-family example test packages (`@tetherto/mdk-backend-*-examples`) with a shared `examples/backend/utils/test-harness.js` (`runAutoExit`).

#### CI / tooling

- A new **`examples` CI pipeline** (`.github/workflows/ci.yml`): `list-examples`, `setup-examples`, and `test-examples` matrix jobs discovering every `examples/**/package.json`, plus an "Examples" row in the summary (no coverage threshold enforced for examples).
- **`.mailmap`** (new) — maps contributor commit emails to non-routable `example.com` placeholders for this public repo (no history rewrite).

### Changed

- **full-site realigned to the "11-family" site**: description now "3 miner families + 2 containers + 3 powermeters + 2 sensors + 2 pools over the RPC listener"; test expectations moved from 12 families/13 workers to the current 11 after the wm-v3 demo family and microbt containers were removed. The seed was made effective under the Worker runtime (unique-id default `pos`, restart-and-wait for registry visibility), taking e2e to 14/14.
- **CI worker dependency install** rewritten to install shared core deps (`backend/core/{kernel,client,mdk,mdk-worker}`, `backend/workers/mock`, `backend/core/mock-control-service`) instead of the deleted `base/` packages.
- **Nomenclature** propagated through examples and CI: `proc/ork.js` → `kernel.js`, `proc/app-node.js` → `gateway.js`; `ui-core` → `ui-foundation` in CI and issue templates.
- **Information-architecture restructure** in docs: `how-to/` collapsed into `guides/` (deployment, gateway, miners); `docs/concepts/stack` files renamed; `terminology.md` → `reference/glossary.md`.
- All release-line `package.json` versions across `backend/core`, `backend/workers`, `ui/packages`, and `examples/` synced to `0.5.0`; independently-versioned newcomers (`@tetherto/mdk-worker`, the demo/sample workers, the mock, and two examples) keep their own `0.1.0`/`0.0.1` versions.

### Removed

- **microbt container workers** — the entire `backend/workers/containers/microbt/` tree, plus its catalogue/manifest/supported-hardware/mock-runner entries and the mdk constants/bootstrap references.
- **electricity power-meter worker** (`backend/workers/power-meter/electricity/`).
- All worker **`base/` packages** (`ThingManager`, device bases, family managers) after the runtime migration.
- Client **`ipc-client.js`**, Kernel **`IPCListener`**, and the Gateway IPC transport.
- The **`mdk-utils`** package (absorbed into `@tetherto/mdk`).
- Deleted docs: `docs/concepts/terminology.md`, `stack/ork.md`, `stack/app-node.md`, `docs/how-to/**` (moved to `guides/`), `backend/core/ork/README.md` + `docs/phase-bootstrap-api.md`, `backend/workers/docs/orchestrator.md`.

### Fixed

- **Containers list truncation / wrong total**: `getContainers` previously fetched only a tag-filtered page and re-filtered in memory (offset:0/limit:0), so user filters saw a truncated set and `total` was the page length; now uses a server-side query + global `getThingsCount`.
- **MQTT mock determinism** (`backend/workers/mock/transports/mqtt.transport.js`): `close()` now force-closes (`client.end(true)`) and runs an idempotent `_runCleanup()` directly rather than waiting on the `'end'` event (which may never fire when the broker is gone), preventing leaked publish intervals that held the event loop open.
- **bitdeer MQTT broker per worker** (`containers/bitdeer/plugin/boot.js`): the shared module-level `svc-facs-mqtt` aedes broker meant the first worker's `stop()` killed every later worker's broker; boot now creates its own `Aedes` broker + `net` server per worker and closes both in `stop()`. `svc-facs-mqtt` dropped; `aedes 1.0.2` and `mqtt 5.15.2` promoted to direct deps. (An earlier lazy-`require` fix so bare requires can exit was superseded by this.)
- **UI** — log the user out and redirect on session expiry (`@tetherto/mdk-ui-foundation`) (#180); abort in-flight requests on unmount; guard the power-adjustment insert against a missing PDU tab; carry device-action targeting fields through the voting payload; restore Op Centre factory exports dropped in a query-barrel refactor.
- **full-site** — seed effective under the Worker runtime; local-discovery watch and example setup corrections.
- **schneider** — corrected a "Terher" typo in the package author field.
- Numerous documentation link repairs (404s flagged by the markdown link checker), including the stale worker-guide anchor fixed in the 0.5.0 changeset.

#### Tests

A large coverage push lifted each flagged backend package above the 80% per-package gate. Highlights (before → after, statements/branches/functions/lines):

| Package | Coverage | Added unit tests (selected) |
|---|---|---|
| bitdeer | 74% br → ~97% | D40 command handlers, `optimizeSocketCalls` PDU collapse, boot arg validation, alert templates |
| antminer | 76% → ~99% | device getters/setters (injected fake fetch), error maps, DHCP/static conf, power modes, pools; mock router; plugin handlers |
| whatsminer | 79% br → ~97% | write-action wrappers, AES-ECB token handshake + 135/136 retry paths, firmware header parsing, mock utils |
| f2pool | 77% br → ~95% | mock router validation/error + auth-hook 401s, `fetchStats` fallbacks + cached-month refresh + rate-limit path |
| abb | 52% fns → ~99% | B2X/M1M20/M4M20/REU615 `_readValues`/`_prepSnap` vs fake Modbus, per-channel telemetry incl. `?? 0` fallbacks, `ERR_MODEL_INVALID` |

Plus `@tetherto/mdk-client` typed request-wrapper tests, new Kernel suites (`kernel-manager`, `actions-stress`, key-file integration), and `@tetherto/mdk-react-devkit` branch-coverage additions.

## v0.6.0

> For a high-level introduction, see the [v0.6.0 release notes](../release-notes/0.6.0-release.md).

### Overview

- Reduces the **Gateway to a thin plugin host**: The entire built-in HTTP API (auth/OAuth2, WebSocket, alerts, users, audit log, and ~20 route/handler/schema modules) is deleted, and routes now come only from plugins (breaking)
- Replaces the mock-control-service package with **`@tetherto/mdk-mcp`**, an MCP server that exposes MDK data to agents as declarative tools (breaking)
- Ships **`@tetherto/mdk-skill`**, an Agent Skills bundle versioned against the MDK release line
- Turns the UI shell template into a **runnable example** and slims `mdk-ui create` to a bare backbone whose feature pages are added on demand (breaking)
- Consolidates the examples around a new **`examples/mvp-site`** single-container site, and makes the repo root an **npm workspaces** monorepo
- Adds **versioned Whatsminer API protocol handlers** (v2/v3) and a `site-monitor` Gateway plugin
- Moves every UI surface from the discontinued `react-router-dom` shim to **`react-router` v8**, clearing a high-severity advisory that no override could resolve (breaking for scaffolded apps)

### Breaking changes

#### Gateway reduced to a plugin host — built-in HTTP API removed

`@tetherto/mdk-gateway` no longer ships an application API of its own. Every route module, handler, schema, and supporting library behind the old `workers/lib/server/` tree is deleted; the worker now boots the httpd facility, registers plugins, and serves whatever those plugins declare. What went away:

| Area | Removed |
|---|---|
| Auth / identity | `lib/auth.js`, `lib/users.js`, `lib/server/lib/authCheck.js`, `capCheck.js`, the `svc-facs-auth` + two `svc-facs-httpd-oauth2` facilities, the `auth` sqlite facility, and the periodic `cleanupTokens` interval |
| Realtime | `@fastify/websocket` registration, `routes/ws.routes.js`, `lib/alerts.js` and the 5-second `broadcastAlerts` loop |
| Data / state | `lib/globalData.js` and the `global-data` hyperbee, `lib/dcs.utils.js`, `lib/metrics.utils.js`, `lib/period.utils.js`, `lib/server/lib/queryUtils.js`, `routeHelpers.js` |
| Audit | `lib/server/lib/auditLogger.js` and the optional `audit.logger.json` config |
| Routes / handlers | `actions`, `alerts`, `auth`, `configs`, `coolingSystem`, `devices`, `energySystem`, `explorer`, `finance`, `global`, `groups`, `logs`, `metrics`, `miners`, `pools`, `settings`, `site`, `site-monitor`, `things`, `users`, `ws` — plus every `schemas/*.js` |

The `_pluginServices` object handed to plugins lost `authLib`; it now exposes only `dataProxy`, `mdkClient`, and `conf`. The example config files `config/facs/auth.config.json.example`, `config/facs/httpd-oauth2.config.json.example`, and `config/audit.logger.json.example` are gone.

Dependencies dropped from the package: `@fastify/websocket`, `@bitfinex/bfx-facs-db-sqlite`, `@bitfinex/bfx-facs-http`, `@bitfinex/bfx-facs-interval`, `@bitfinex/lib-js-util-base`, `@tetherto/hp-svc-facs-store`, `@tetherto/svc-facs-auth`, `@tetherto/svc-facs-httpd-oauth2`, `mingo`, and the `@tetherto/mdk` self-dependency. `@tetherto/svc-facs-httpd` moved **v1.0.0 → v2.0.0**.

**Action required**: anything that called a built-in Gateway endpoint must now supply it as a plugin. The three default plugins the worker registers are `telemetry`, `site-hashrate`, and the new `site-monitor`; register your own with `extraPluginDirs`.

**Note on `@tetherto/mdk-plugin-auth`**: the plugin still ships inside `@tetherto/mdk-plugins`, but the Gateway no longer auto-registers it, and its `permissions`/`token` controllers read `services.authLib` — which the Gateway no longer provides. Treat the bundled auth plugin as unwired in 0.6.0 and bring your own identity layer.

#### `startGateway()` auth options removed

In `@tetherto/mdk`, the Gateway bootstrap no longer knows about authentication:

- `opts.noAuth`, `opts.auth`, and `opts.httpdOauth2` are **removed** (as is the internal no-auth OAuth2 stub used to satisfy facility validation)
- `auth.config.json` and `httpd-oauth2.config.json` are no longer materialised into the run directory — the config mapping is now just `httpd`, `net`, `store`, and `logging`
- `ctx.noauth` is no longer set on the worker context

`startKernel()` is now a thin alias for `getKernel()` rather than a second, divergent bootstrap path.

#### `@tetherto/mdk-mock-control-service` removed

The standalone mock-control-service package is gone. Its `mock-control-agent.js` now lives in `@tetherto/mdk-worker-mock` (`backend/workers/mock/mock-control-agent.js`), and the nine per-worker `mock/mock-control-agent.js` copies (antspace, bitdeer, f2pool, antminer, avalon, whatsminer, abb, satec, schneider, seneca) were deleted in favour of that single shared implementation. The package's `routes.js` and its HTTP agent integration test were dropped with it.

**Action required**: import the mock control agent from `@tetherto/mdk-worker-mock` and drop any dependency on `@tetherto/mdk-mock-control-service`.

#### UI shell template moved out of the CLI and slimmed to a backbone

The `mdk-ui-shell` template is no longer a scaffold-only tree inside `@tetherto/mdk-ui-cli`. It now lives at **`examples/mdk-ui-shell-template/`** as a real Vite app you can `npm run dev` in place, and the CLI's build step copies it into `dist/templates/mdk-ui-shell-template` (filtering local artifacts like `node_modules`, `dist`, `.env`, `package-lock.json`, and renaming `.gitignore` → `_gitignore`, which `create` restores at scaffold time).

`mdk-ui create` now produces a **bare backbone** — Google OAuth sign-in, the token lifecycle, and the app frame (header, user menu, sidebar) around a Home landing page — with no feature pages. The reference pages (Dashboard, Alerts, Pool Manager, Explorer, Site Overview) ship in the template under `_managed/pages/`, which `create` strips; they are restored individually with `mdk-ui add page <Name>`.

Template resolution changed from filesystem discovery to an explicit registry, because templates now span two source roots (the runnable `examples/` app and the bundled `packages/cli/templates/starter` scaffold) that only reunite under `dist/templates/` once published.

**Action required**: expect a scaffolded app to contain no feature pages; add the ones you want with `mdk-ui add page`. Anyone reading templates out of the CLI package tree should read `dist/templates/<id>` instead.

#### Examples restructured

- **`examples/e2e/` removed** — its UI became `examples/mvp-site/ui/`
- **`examples/site-backend/` removed** — its site Gateway plugin became `examples/mvp-site/backend/gateway-plugins/site/` (controllers `command`, `history`, `overview`, plus `utils`)
- **`examples/backend/` de-packaged** — every nested `package.json` under it is gone (containers, minerpools, miners, powermeters, sensors, site, site-single-process, mdk-e2e, mdk-plugin-e2e), taking the tree from 131 to 57 tracked files. The remaining examples are plain scripts run from the parent rather than installable packages, and the per-family device scripts were folded into per-vendor entry points (e.g. `containers/mdk.client.container.js` → `containers/antspace/index.js`, `miners/mdk.client.miner.js` → `miners/whatsminer/index.js`).

### Added

#### `@tetherto/mdk-mcp` — MCP server

New package at `backend/core/mcp/` exposing MDK data to agents over the Model Context Protocol.

| Piece | Description |
|---|---|
| `createMcpServer(root, port, client, pluginDirs)` (`server.js`) | Starts a `StreamableHTTPServerTransport` MCP server on `127.0.0.1:<port>`, answering `POST /mcp` only; validates `root`/`port` with `ERR_INVALID_MCP_ROOT` / `ERR_INVALID_MCP_PORT`, and installs SIGINT/SIGTERM shutdown that closes the MDK client first |
| `loadPlugin` (`lib/plugin-loader.js`) | Loads `mcp-plugin.json` manifests and returns their `tools[]`; each tool declares `id`, `description`, `handler`, and an optional JSON-Schema `schema` that the SDK enforces before dispatch |
| Tool handlers | Invoked as `(args, services)` with `services.mdkClient`, so a tool reaches the fleet through the ordinary MDK protocol client |

A fresh server instance is constructed per request (stateless transport, no session id). Dependencies: `@modelcontextprotocol/sdk` ^1.29.0, `async` 3.2.6, `debug` 4.4.1. `examples/full-site/` gained an `mcp-client.js` driver alongside its updated `docs/mcp-server.md`.

#### `@tetherto/mdk-skill` — MDK Developer Skill Suite

New package at `packages/mdk-skill/` — an Agent Skills (`SKILL.md`) bundle assembled from the monorepo's real artifacts and versioned to track the MDK release line. It is a copy-only assembler: each library owns its artifacts, and this package curates them into `dist/skills/` and installs them flat into `.cursor/skills/` or `.claude/skills/` (`npm run install:skills`; `assemble` also runs on `prepack`).

Five skills ship: `mdk` (with `architecture`, `glossary`, `package-index`, and `protocol` references), `mdk-device-worker` (contract-authoring, device-families, local-testing and worker-base-api references, an `mdk-contract.template.json` asset, plus `validate-contract.mjs` and `worker-smoke.mjs` scripts), `mdk-app-plugin`, `mdk-deployment`, and `mdk-ui-component`. A top-level `mdk-contract.schema.json` and a `sources.map.json` describing the copy graph are included.

#### `site-monitor` Gateway plugin

New built-in plugin (`backend/core/plugins/site-monitor/`) — "site identity, feature configuration, and live per-device hashrate via the MDK protocol client" — registered by default alongside `telemetry` and `site-hashrate`.

| Route | Method + path | Description |
|---|---|---|
| `site.info` | `GET /auth/site` | Site name from the Gateway config (`common.json` `site`) |
| `site.feature-config` | `GET /auth/featureConfig` | The `featureConfig` object from the Gateway config |
| `site.hashrate` | `GET /site-monitor/hashrate` | Live per-device hashrate and power with site totals |

All three are declared `auth: false` and `safety: "read-only"`.

#### Whatsminer versioned API protocol handlers

`@tetherto/mdk-worker-whatsminer` gained a protocol layer at `lib/protocols/` that adapts to the device's API generation instead of assuming one wire format.

- `ApiHandlerFactory` resolves a handler from any version string by **major** version (`'2.2.2'` → the v2 handler), with `normalizeVersion`, `getSupportedVersions`, `getHandlerClass`, `getDefaultPort`, and `isVersionSupported` helpers; an unknown major throws `ERR_UNSUPPORTED_API_VERSION`.
- Two handlers over a shared `wm-api-base`: **v2** (canonical `2.0.5`, port `4028`, auth command `get_token`) and **v3** (canonical `3.0.3`, port `4433`, auth command `get.device.info`), with a `COMMAND_MAP_V3` translating v2 underscore commands to v3 dot notation. v2 remains the default.
- Five new unit suites cover the factory, constants, base handler, and both version handlers

#### UI — container detail, system info, and clickable table rows

- **`ContainerDetail`** (`@tetherto/mdk-react-devkit`, `domain/features/container-detail/`) — the presentational page shell every container tab mounts into: a back link, the container name, and a per-model tab strip. The page owns routing and the active tab and supplies the body as `children`; a `ContainerDetailPlaceholder` covers not-yet-built tabs. Exported from `domain/features`, with `USAGE.md`, an example, and specs. A matching `container-detail-page.tsx` was added to the catalog app.
- **`useSystemInfo`** (`@tetherto/mdk-react-adapter`) — composes `GET /auth/site`, `GET /auth/userinfo`, and `GET /auth/featureConfig` into one page-ready `SystemInfo` payload (`site`, `email`, `roles`, `featureCount`) with a single `refetch`. Exported with its `SystemInfo` and `UseSystemInfoResult` types.
- **`DataTable` row clicks** — new `onRowClick` on the `DataTable` primitive, threaded through `DeviceExplorer` and `DeviceExplorerTable`. Rows become `role="button"`, focusable, and activatable with Enter/Space; clicks originating inside a `button`, `a`, `input`, `label`, `[role="checkbox"]`, or anything marked `data-no-row-click` are ignored, so selection checkboxes and expand toggles keep working.
- **Hashrate helpers** — `getHashrateString` and `getHashrateUnit` are now exported from the devkit `domain` entry point
- **Header stat boxes** — `HeaderHashrateBox` gained `fractionDigits` prop (default `3`) for controlling decimal precision.

#### `examples/mvp-site`

A new minimal single-container site demo: Kernel, Gateway, a Whatsminer worker, an Ocean pool worker, a SATEC powermeter worker, and the MDK React UI, with an MCP server via `@tetherto/mdk-mcp`. Devices are seeded from a gitignored `config/devices.json` (keyed by `miners` / `powermeters`, copied from the checked-in `.example`), each mock device getting its own port. Ships PM2 deployment under `deploy/`, a `setup-config.js` generator, `start.js`, unit tests, and its own UI workspace with pool setup, dynamic hashrate units, and site hashrate history.

#### Documentation

- **Container worker guides** (new): `docs/guides/containers/index.md`, `run-antspace-worker.md`, and `run-bitdeer-worker.md`
- **New reference pages**: `docs/reference/kernel/modules.md` and `docs/reference/protocol/messages.md`
- Refreshed worker/deployment/gateway guides, the get-started and quickstart tutorials, `docs/concepts/security-boundaries.md`, `docs/concepts/stack/workers.md`, and the glossary to match the plugin-host Gateway and the new example layout

#### CI / tooling

- **`.github/scripts/workspace-context.sh`** resolves, per package directory, whether the authoritative install is a single root `npm ci` (workspace member) or an in-place install (standalone package such as `ui`, `backend/core/plugins`, or the example UIs), and prints the install dir, cache slug, and `node_modules` path the cache actions consume. Members share one `workspace-root` cache slug keyed on the root lockfile, which fixes members failing to link dev bins (e.g. `standard`) under a partial single-workspace install.
- **`.github/actions/test-with-coverage`** (new) enforces the ≥80% per-package coverage gate; the `mdk` package is sharded across parallel runners (fast unit vs. the slow actions-flow integration suites) with a `coverage-mdk` job merging shard coverage before gating.
- Changes under `.github/scripts/` are now classified as CI-infra and run every suite

### Changed

- **The repo root is now an npm workspaces monorepo.** Root `package.json` declares 21 workspace members — `backend/core/{client,gateway,kernel,mdk,mdk-worker,mcp,plugins}`, every `backend/workers/*` package, and `examples/mvp-site` — plus a root `overrides` block. `ui/`, `backend/core/plugins`, and the example UI apps stay standalone. Install workspace members with one `npm ci` at the root, not per package.
- **Gateway internal dependencies moved from `file:` links to registry ranges** — `@tetherto/mdk-client` and `@tetherto/mdk-plugins` are now `^0.6.0` rather than `file:../client` / `file:../plugins`. `examples/mvp-site` likewise consumes `@tetherto/mdk-*` at `^0.6.0`.
- **Managed pages gained Dashboard and hidden-page support.** `Dashboard` (hashrate + consumption charts, active incidents, mining pools) is now a managed page restorable with `mdk-ui add page Dashboard`. `navIcon`/`navEntry` became optional so deep-link-only pages can be managed without a sidebar entry, and `add`/`remove page` skip nav patching for them.
- **Mock initial states and utilities reworked** across antspace (default + immersion), bitdeer (D40), f2pool, ocean, whatsminer (M56S), and the shared `base.mock.js`, with new unit suites for `base.mock`, device mocks, miner mocks, and a `cli-mock` fixture set
- **Dependency bumps**: `fastify` 5.8.5 → 5.10.0 and `@fastify/static` 9.1.3 → 10.1.2 (Gateway + root overrides); `@tetherto/svc-facs-httpd` v1.0.0 → v2.0.0; `aedes` 1.0.2 → 1.1.1; `mingo` 6.4.6 → 6.4.15; `svgo` ^3.0.0 → ^3.3.4. The router move is covered under Security — `react-router-dom` is replaced outright, not bumped.
- **Doc generators now extract TypeScript types** via a shared `ui/scripts/ts-morph-utils.mts`, used by the react-adapter hook generator, the devkit registry generator and its `registry-types`, and the ui-foundation store generator
- All package versions across `backend/core`, `backend/workers`, `ui/`, `examples/`, and `packages/mdk-skill` are synced to **`0.6.0`**, including `examples/mdk-ui-shell-template`, which moves off its `0.0.0` scaffold default onto the shared release line

### Removed

- The Gateway's entire built-in HTTP API surface — see Breaking changes for the module-by-module list, plus the `ws` integration test and the ~40 unit suites covering the deleted routes, handlers, and libraries
- **`@tetherto/mdk-mock-control-service`**, and the nine duplicated per-worker `mock/mock-control-agent.js` copies
- **`examples/e2e/`** and **`examples/site-backend/`**, and every nested `package.json` under `examples/backend/`
- The **`mdk-ui-shell` template tree** inside `@tetherto/mdk-ui-cli` (relocated to `examples/mdk-ui-shell-template/`), including the template's `_meta.json` and its `constants/dashboard.ts` / `constants/routes.ts`
- The **`generate:shell`** script from `ui/package.json`, and the `!apps/mdk-ui-shell` workspace exclusion — the shell is no longer generated into `ui/apps/`
- The Gateway's **`test:ws`** npm script

### Security

#### UI — Header stat box prop renames

**`HeaderHashrateBox` and `HeaderMinersBox` props renamed** from MOS terminology to App terminology:

- `HeaderHashrateBox`:
  - `mosPhs` → `appPhs`
  - `mosLabel` → `appLabel` (default changed from `'MOS'` to `'APP'`)
  
- `HeaderMinersBox`:
  - `mosTotal` → `appTotal`  
  - `mosLabel` → `appLabel` (default changed from `'MOS'` to `'APP'`)

**Action required**: Update all `HeaderHashrateBox` and `HeaderMinersBox` usage to use the new prop names. The functionality is identical; only the prop names have changed.

**Migration example**:
```tsx
// Before (0.5.x)
<HeaderHashrateBox mosPhs={1234.5} mosLabel="MOS" />
<HeaderMinersBox mosTotal={50} mosLabel="MOS" />

// After (0.6.0)
<HeaderHashrateBox appPhs={1234.5} appLabel="APP" />
<HeaderMinersBox appTotal={50} appLabel="APP" />
```

#### `react-router-dom` replaced by `react-router` v8 (breaking for scaffolded apps)

`react-router-dom@7` is affected by GHSA-qwww-vcr4-c8h2 (high), and the fix exists only in `react-router@8.3.0` — a release that discontinued the `react-router-dom` package entirely (its last version, `7.18.1`, hard-pins `react-router: 7.18.1`, so no override can resolve it). Every UI surface therefore moved off the shim:

| Package | Before | After |
|---|---|---|
| `ui/apps/catalog` | `react-router-dom@^7.13.0` | `react-router@^8.3.0` |
| `examples/mdk-ui-shell-template` | `react-router-dom@^7.13.0` | `react-router@^8.3.0` |
| `examples/mvp-site/ui` | `react-router-dom@^7.18.1` | `react-router@^8.3.0` |
| `examples/full-site/ui` | `react-router-dom@^7.18.1` | `react-router@^8.3.0` |

26 files changed their import specifier from `react-router-dom` to `react-router`; no router API changed, since v7's `react-router-dom` was already a re-export of `react-router` and every symbol in use (`createBrowserRouter`, `RouterProvider`, `HashRouter`, `Navigate`, `Route`, `Routes`, `Link`, `Outlet`, `useNavigate`, `useParams`, `useSearchParams`, `useLocation`) is exported unchanged by 8.3.0.

**Action required** for anyone with an app scaffolded from an earlier shell template: replace the `react-router-dom` dependency with `react-router@^8.3.0` and rewrite the import specifier. Note `react-router@8` raises its peers to `react`/`react-dom` `>= 19.2.7` and `engines.node` to `>= 22.22.0`.

**Not affected**: `@tetherto/mdk-react-devkit`, `@tetherto/mdk-react-adapter`, and `@tetherto/mdk-ui-foundation` declare no router dependency — `RequireAuth` is router-agnostic by design. The bundled `templates/starter` scaffold stays on `react-router-dom@^6`, which neither advisory affects.

#### Dependency overrides and bumps

- `ajv` `8.17.1` → **`8.20.0`** in `backend/workers` (direct devDependency), clearing GHSA-2g4f-4pwh-qvx6 (ReDoS via the `$data` option; affected `>= 7.0.0-alpha.0, < 8.18.0`).
- `brace-expansion` forced to **`>= 5.0.8`** (GHSA-mh99-v99m-4gvg, DoS via unbounded expansion; the advisory marks every version `<= 5.0.7` vulnerable) via `overrides` in the repo root, `ui/`, `backend/core`, `backend/workers`, `examples/full-site`, and `examples/mdk-ui-shell-template`. This clears it wherever a modern `glob`/`minimatch` is present. It remains reachable through the dev-only `standard` → eslint@8 → minimatch@3 chain, which accepts only `brace-expansion@^1.1.7` and for which upstream published no patched 1.x — documented against the `audit-ci` allowlist entry rather than silently suppressed.
- Removed a dead `@isaacs/brace-expansion` override pinned to `5.0.5`, **a version that was never published** (only 5.0.0 and 5.0.1 exist). It appeared in no lockfile, so it never resolved — but it would have failed any install that needed the package.

The remaining advisory-clearing overrides, in `ui/package.json` and the root `overrides` block:

| Override | Resolution |
|---|---|
| `brace-expansion` (`>=1.0.0 <1.1.13`, `>=2.0.0 <2.0.3`, `>=5.0.0 <5.0.7`) | all pinned to `>=5.0.7` |
| `immutable` (`>=5.0.0 <5.1.8`) | `>=5.1.8` |
| `js-yaml` (`>=4.0.0 <4.3.0`) | `>=4.3.0 <5.0.0` |
| `linkify-it` (`<=5.0.1`) | `>=5.0.2 <6.0.0` |
| `shell-quote` (`<1.9.0`) | `>=1.9.0` |
| `ws` (`>=8.0.0 <=8.20.0`) | `>=8.20.1` |
| `@hono/node-server` | `2.0.12` |
| `svgo` | `^3.3.4` |

One advisory was added to the `audit-ci` allowlist (`.github/scripts/audit-ci.jsonc`): `GHSA-mh99-v99m-4gvg`, with an inline rationale recording why no override or upgrade can reach it and what removing it would take. `GHSA-qwww-vcr4-c8h2` is **not** allowlisted — it is fixed outright by the `react-router` v8 move above.

### Fixed

- **Device actions were rejected with a 400.** `toVotingPayload` posted the staged `tags` and `crossThing` fields, which the `POST /auth/actions/voting` body schema does not recognise, and sent no `query` — so every device-targeted action failed its `required: ['query','action','params']` check. Targeting now reaches the backend solely through `query`, built from the staged tags as `{ tags: { $in: tags } }`; an action can opt out with `overrideQuery: false` to submit an explicit `query` as-is (pool assignment targets by device id, not tags). `PendingSubmissionAction` gained typed `overrideQuery` and `crossThing` fields documenting that both are client-only queue metadata and never posted.
- **One bad pool account no longer breaks the whole Ocean stats cycle.** Unknown or inactive accounts return an error body with no `result`; `fetchStats` now wraps each account's earnings/hashrate/balance reads, raises `ERR_ACCOUNT_DATA_MISSING` when earnings or hashrate are absent, logs `ERR_STATS_FETCH <username>`, and continues to the next account instead of failing the entire fetch.

## v0.7.0

> For a high-level introduction, see the [v0.7.0 release notes](../release-notes/0.7.0-release.md).

### Overview

- Gives every plugin runtime — Gateway, MCP, and Worker — the same **per-plugin context**: plugins run together in one host process, but each imports
  its own config from the host module (`require('@tetherto/mdk-<host>/plugin')`) rather than the host passing it a `services` object — so a plugin
  sees only what the host puts in its context (breaking)
- Ships **`@tetherto/mdk-cli`**, the `mdk` command-line tool: an onboarding wizard, `create worker` / `plugin` / `dashboard` scaffolds, and `run` /
  `status` for the whole stack — `create dashboard` scaffolds a standalone Vite/React app from `examples/mdk-ui-shell-template`, and `run dashboard`
  runs it with `npm run dev`
- Ships **`@tetherto/mdk-agent`**, a conversational operator agent that runs a local model, calls fleet tools over MCP, and gates writes behind human
  approval — deployed behind the Gateway by **`@tetherto/mdk-plugin-agent`**, so enabling the agent brings its SSE (Server-Sent Events) chat API with
  it
- Separates **MDK's backend-agnostic UI core from the mining Gateway's vocabulary**: tags, selectors, query keys and the mining factories move to
  `@tetherto/mdk-ui-foundation/presets/mining`, and what remains on the root barrel is a promise that it works against any API (breaking)
- Replaces the ad-hoc session handling in the UI with a single replaceable **`AuthProvider`** seam, and makes the data source injectable so the same
  adapter hooks can drive a different backend
- Adds **`WorkerRuntimeV2`**: a Worker Plugin is now a package directory (`mdk-contract.json` + handler files) with no module to export and no
  `connect()` to call (breaking)
- Deletes the Gateway's **Kernel data proxy**: the Gateway keeps no Kernel connection of its own; its plugins talk to the Kernel and the Gateway
  aggregates what they return, and telemetry history comes from the Workers that own it (breaking)
- Adds a **performance and scalability benchmark harness** (a first pass) that boots a real multi-process fleet, drives load, runs failure drills and
  fills in the deployment sizing template from measurements

### Breaking changes

#### Gateway plugins get a per-plugin context

`loadPlugin(dir, context)` gives each plugin a private module registry whereby `require('@tetherto/mdk-gateway/plugin')` resolves to that plugin's
own context. All plugins still run in the same Gateway process, but each sees only the context the Gateway hands it:

| Before | After |
|---|---|
| `module.exports = (req, services) => …` | `module.exports = (req) => …` |
| `services.conf` | `config` from `require('@tetherto/mdk-gateway/plugin')` |
| `services.mdkClient` | The plugin builds its own from `config.kernelKey` / `config.kernelBootstrap` |
| `services.dataProxy` | Removed with the data proxy |
| `services.authLib` | Removed in 0.6.0 |

The context is `{ config }`, where `config` is the Gateway conf with `kernelKey` and `kernelBootstrap` folded in, and the plugin's own config block
layered over the top key-by-key. Requiring the stub outside a plugin load throws `ERR_NO_PLUGIN_CONTEXT` with a pointer at `registerPlugin()`, rather
than leaving a handler with `undefined` where its context should be.

`@tetherto/mdk-gateway` now declares an `exports` map — `./plugin`, `./workers/lib/plugin-loader`, `./workers/lib/plugin-gateway`. Deep, relative
reaches into the package tree no longer resolve.

**Action required**: drop the second handler parameter; read `config` from the context module (the Gateway gives each plugin only the config it needs,
not blanket access to everything it holds); build your own MDK client for Kernel access (the bundled `site-monitor`, `site-hashrate`, and `telemetry`
plugins each ship a `lib/client.js` showing the pattern).

#### Gateway Kernel data proxy removed

`workers/lib/data.proxy.js` — the RPC fan-out over `conf.kernels` to the legacy store nodes — is deleted, along with the shared `dataProxy`,
`isRpcMode`, and the in-process Kernel handle. The Gateway is a container that holds plugins; it no longer keeps a Kernel connection of its own. Each
plugin talks to the Kernel through its own MDK client, and the Gateway aggregates what the plugins return.

This backed a `conf.kernels` RPC plane that MDK deployments don't rely on. The telemetry itself lives in the Workers' own stores, and those history
routes are now served from there instead (see **Changed**).

#### MCP plugins get a per-plugin context, and `createMcpServer` changed

`createMcpServer(root, port, config, pluginDirs)` takes `{ kernelKey, kernelBootstrap }` where it previously took a pre-built client. Each plugin
directory loads through a private module context in which `require('@tetherto/mdk-mcp/plugin')` resolves to a frozen `{ config, logger }`, and tool
handlers are plain `(args)` functions that author their own Kernel client. Shutdown no longer closes a client the server does not own.

Manifests may now declare optional `annotations` and `agent` objects per tool: `annotations` lands on the descriptor's own `annotations` field, and
`agent` is carried verbatim into the MCP descriptor's `_meta`. The loader validates their shape only — what the fields must contain belongs to the
consuming agent and is checked at admission, so the two definitions cannot drift.

**Action required**: pass the Kernel key/bootstrap instead of a client, and drop the `services` parameter from tool handlers.

#### `createMdkClient` is now auto-connecting

`createMdkClient(config, opts)` takes the plugin's context config and returns a client whose methods connect on first use —
`await mdkClient.listWorkers()` just works, with no `connect()` / `ready()` step. The connect is memoized; a failure maps to `opts.errorCode` (default
`ERR_MDK_CLIENT_UNAVAILABLE`) and resets so the next request retries, which keeps a Gateway booted without a reachable Kernel serving its routes with
per-request errors rather than failing to boot.

The former function — explicit transport options, caller-owned `connect()` — is renamed **`createRawMdkClient`** and stays exported.

**Action required**: call sites that built a client with explicit transport options and connected it by hand should import `createRawMdkClient`;
everything else can drop its connect step.

#### Worker Plugins are loaded from a package directory (`WorkerRuntimeV2`)

A Worker Plugin no longer exports a module. `mdk-contract.json` declares each handler by path, `src/` holds the handler modules, and the host points
the runtime at the directory:

```js
const runtime = new WorkerRuntimeV2(pkgDir, { workerId, kernelTopic, devices, env, config })
```

Each device gets its own plugin instance, so handlers are plain `(params)` functions that read `{ id, opts, env, config, workerId, logger }` from
their device context module (`require('@tetherto/mdk-worker/device')`) instead of taking a `ctx` argument. One HRPC server and one DHT identity per
process, as before; what fans out per device is the plugin's module registry.

Two behaviour differences from `WorkerRuntime`: there is no boot-time probe, so every declared device reports `online` and an unreachable one surfaces
as an error inside the telemetry payload rather than `ERR_DEVICE_UNAVAILABLE`; and there is no `disconnect`, so whatever a plugin opens at load time
lives until the process exits.

`WorkerRuntime` (v1) is unchanged and still exported — `WorkerRuntimeV2` extends it. New exports from `@tetherto/mdk-worker`: `WorkerRuntimeV2`,
`loadContract`, `createInstance`, `createModuleContext`.

The bundled sample Worker was restructured onto this model: `plugin/index.js`, `plugin/lib/device-client.js` and the `plugin/src/**` tree are gone,
replaced by a top-level `mdk-contract.json` and `src/{client,db,commands,telemetry}`. `@tetherto/mdk-worker-demo` therefore no longer exports `plugin`
or `openDb`, and its host no longer runs a sampler loop or owns a SQLite handle.

**Note**: `docs/guides/workers/build-a-worker.md` still documents the older model and now carries a warning saying so. Read the sample Worker and its
caller for the current shape.

#### UI — the mining dialect, key registry and factories move to a preset

`@tetherto/mdk-ui-foundation` no longer exports one backend's vocabulary from its root or `./query` barrels. Everything specific to the mining Gateway
is reachable at the new **`@tetherto/mdk-ui-foundation/presets/mining`** subpath:

| Moved | Examples |
|---|---|
| Dialect | `t-*` device-tag helpers, `*_aggr` aggregate field names, `*_FIELDS` projections, Mongo selector composers, alert/dashboard mappers, container-tab and container-widget derivations |
| Query keys | `queryKeys`, `QueryKeyMap` |
| Factories | every read/write factory in `factories.ts` and `pool-factories.ts`, including `tailLogQuery`, `authTokenMutation` and the pool voting/approval writes |
| Gateway session flow | `gatewayRedirectAuth` |

What stays in the core is the engine: the client factory, the runtime it carries, the resource builders, the transport and the URL helpers.
`API_ENDPOINTS` deliberately stays too — it is the bundled default map the core falls back to, so a consumer must be able to read it and override it
selectively.

**Action required**: repoint imports of any moved name to `@tetherto/mdk-ui-foundation/presets/mining`. Nothing was renamed and no signature changed,
so the fix is the specifier only.

#### UI — `Alerts` and `CurrentAlerts` take a flat row list

`Alerts.devices`, `CurrentAlerts.devices`, `getAlertsForDevices` and `getCurrentAlerts` take `Device[]` where they took `Device[][]`, and
`useCurrentAlertDevices` resolves a flat `ListThingsDevice[]` instead of the raw per-Kernel envelope.

The prop was the mining Gateway's nested response envelope, so a consumer on another backend had to wrap their rows in an extra array to satisfy a
component that renders a table. Unwrapping now happens once, in the data layer, where the envelope is known about.

**Action required**: pass rows straight through instead of wrapping them; each row carries its alerts at `last.alerts`.

#### UI — header preference keys and `SiteMinerStats` field renamed

The legacy reference-app codename is gone from the public UI surface.

| Type | Before | After |
|---|---|---|
| `HeaderPreferences` (and `DEFAULT_HEADER_PREFERENCES`, `HEADER_ITEMS`) | `mosMiners`, `mosHashrate` | `appMiners`, `appHashrate` |
| `SiteMinerStats` | `mosTotal` | `appTotal` |

Stored preferences are now merged over the defaults, so a persisted object written under the old keys falls back to the default value rather than
leaving the renamed toggles `undefined`.

`WEBAPP_NAME`, `WEBAPP_SHORT_NAME` and `WEBAPP_DISPLAY_NAME` now originate in `@tetherto/mdk-ui-foundation` (`constants/app-constants.ts`) and are
re-exported by `@tetherto/mdk-react-devkit`, so a rebrand changes three values in one place.

#### UI — `VITE_API_BASE_URL` deprecated in favour of `VITE_MDK_API_URL`

The same value had two names that worked in different layers: the shell template read `VITE_API_BASE_URL`, while `resolveApiBaseUrl` only ever looked
at `VITE_MDK_API_URL` — so setting either one worked in one place and silently did nothing in the other.

`VITE_MDK_API_URL` / `MDK_API_URL` is now the canonical pair, exported as `API_BASE_URL_ENV` so nothing has to hardcode the string.
`VITE_API_BASE_URL` / `API_BASE_URL` are still read for one more major and warn once per process, naming their replacement. The `VITE_MDK_` prefix
matters: a host app very often has its own `API_BASE_URL`, and MDK silently reading that is a hard bug to see.

`VITE_OAUTH_BASE_URL` is unchanged — it names a different value and has only ever had one name.

### Added

#### `@tetherto/mdk-cli` — the `mdk` command-line tool

New package at `packages/cli/`, exposing an `mdk` binary. The full command tree is wired up; the lifecycle spine is implemented and the remaining
commands mark themselves `(stub)` in help.

| Group | Commands |
|---|---|
| Onboarding | `mdk onboard` — a guided wizard that detects the environment, asks the setup questions, and writes `mdk.yaml`, the root `package.json`, `.gitignore` and a project `README.md` |
| Scaffold | `mdk create worker <name>`, `mdk create plugin <name>`, `mdk create dashboard [name]` — each self-registering in the spec |
| Run & manage | `mdk run [target] [name]`, `mdk status`; `mdk get` / `describe` / `logs` are stubs |
| Discover | `mdk discover` (stub) |
| Agent enablement | `mdk skill add`; `mdk mcp register` (stub) |
| Meta | `mdk version`; `mdk manifest` (stub) |

A project is one role-grouped layout — `workers/<name>/` for Worker plugins, `plugins/<name>/` for gateway plugins, `apps/dashboard/` for the UI, and
a disposable `.mdk/` holding each component's data root plus the two cross-process handoff artifacts (`kernel.key`, `keys/`). Workers and gateway
plugins are npm workspaces because the runtime resolves them out of the project's `node_modules`; `apps/*` deliberately is not, so the dashboard's
React is never hoisted alongside the `file:`-linked MDK packages.

Notable behaviour:

- **`mdk run`** boots the Kernel, every Worker and the Gateway in one process by default, or one component at a time. It owns Ctrl+C and `SIGTERM`,
  stops components in reverse boot order, and exits regardless of how that goes — a stop that throws is skipped, a stop that wedges is abandoned after
  5s, and a second Ctrl+C exits immediately, so a run always releases its ports. `mdk run dashboard` starts the scaffolded UI's dev server as its own
  child process.
- **Mock ports are resolved at boot.** A configured port is used when free and relocated to the next free one when not, since it is a private contract
  between a simulator and the plugin that dials it. The Gateway port is never relocated — it is a published endpoint, so a conflict there fails fast
  before anything boots. Scaffolded Workers get a stack-unique port and device id, and `mdk run` rejects a spec that repeats a Worker name or device
  id, naming both offenders.
- **Gateway plugins install from a catalog with setup questions.** A plugin manifest's `setup` block drives typed questions (`string` / `secret` /
  `boolean` / `json`) asked up front, and the answers land under that plugin's `spec.gateway.plugins[].config` in `mdk.yaml`.
- **`mdk status`** is a one-shot read-only report covering the environment (Node version, package manager, `mdk.yaml` validity, package resolution)
  and the stack (Kernel, Gateway, each Worker with state, health and device count). Liveness is probed over HRPC and HTTP, never inferred from files,
  since the key files survive a shutdown by design. Exit codes make it scriptable: `0` healthy, `2` usage error, `4` precondition not met, `5` stack
  not fully up.
- **`mdk create dashboard`** scaffolds the UI shell from `examples/mdk-ui-shell-template` — copied locally inside the monorepo with MDK deps rewritten
  to workspace links, or downloaded from GitHub and pinned to a published range when standalone.

Bundled templates for `create worker` and `create plugin` ship in the package. Test suites cover the commands and libraries.

#### `@tetherto/mdk-agent` — conversational operator agent

New package at `backend/core/agent/`: a library plus CLI that answers plain-language questions about a fleet. It runs a **local** model and calls MDK
fleet tools **over MCP** — the model routes and narrates, the tools compute, and nothing leaves the machine. Write actions stop and ask for human
approval.

| Piece | Description |
|---|---|
| `createAgent(config)` | Entry point; takes a provider, an optional MCP connection and an optional session store |
| `docs/CONTRACT.md` | The stable event contract every consumer (CLI, gateway, UI) builds against |
| `docs/TOOLS.md` | The tool-authoring contract an MCP tool must satisfy to be shown to the model |
| `bin/mdk-agent.js` | REPL and eval-battery runner |
| `bin/qvac-cache-reaper.js` | TTL eviction for the model server's KV cache, run beside the server |

**The tool authoring contract.** A tool is reliable for a small model only if the model never has to compute, classify or invent a value.
`validateTool` / `admitTools` make that checkable: a closed `verb_entity` taxonomy, parameters restricted to enums, bounded integers or id references,
routing metadata the model matches operator phrasings against, and a declared capability floor so a tool is withheld from a model too weak to use it.
Validation never throws and admission reports why a tool was skipped, so one non-compliant tool cannot take down the rest. The contract travels in the
MCP descriptor's `_meta`, because the SDK parses `annotations` with a closed schema and a client silently drops unknown keys there.

**Sessions live in a store.** A `SessionStore` interface a Redis or SQL implementation can satisfy, with a documented contract: every method async;
records handed out are copies; an expired session is indistinguishable from one that never existed, from `get` and `delete` alike, while `save`
against an expired id fails with `code: 'SESSION_GONE'`; and expiry is lazy on read, so correctness never depends on `sweep()` having run. Left
unconfigured the agent creates a `MemorySessionStore`. `resumeSession(id, { userId })` requires the caller's user id and has no default — a session id
travels in URLs an operator can see, so an id alone is not authority to read the conversation behind it.

**Measurement is part of the package.** An eval battery scores routing, the answer, the result contract and the approval gate on each question,
reading its expectations from the live fleet at run time so it works against any site. Separate runners cover multi-turn conversations (pronouns,
back-references, an action following a question, drifting out of scope) and per-turn latency; the conversation runner flags device ids an answer names
that the turn's tools never returned — a concrete hallucination check.

#### `@tetherto/mdk-plugin-agent` — the agent behind the Gateway

New plugin at `backend/plugins/agent/` — the deployment path that mounts `@tetherto/mdk-agent` behind the Gateway as a chat API. It isn't a separate
product to adopt: enabling the agent brings these routes with it.

| Route | Method + path | Notes |
|---|---|---|
| `agent.session.create` | `POST /agent/sessions` | |
| `agent.session.message` | `POST /agent/sessions/:id/messages` | `text/event-stream`; events carry `turnId`, `seq`, and `approvalId` on `pending_approval` |
| `agent.approval.decide` | `POST /agent/sessions/:id/approvals/:approvalId` | Fail-safe timeout resolves to reject |
| `agent.session.delete` | `DELETE /agent/sessions/:id` | |

Its manifest `setup` block asks for the model provider and the approval timeout, so the CLI can configure it at onboarding. The plugin runs without
auth: when no auth plugin stamps the request, the Gateway serves a single `local` operator, so a perimeter-trusted deployment gets the full chat and
approval flow. A missing `config.agent` block answers `503 ERR_AGENT_UNAVAILABLE` per request rather than failing to load.

#### Gateway — auto-generated MCP tools, stream routes, per-plugin config

- **Auto-generated MCP tools.** Exposing a plugin's HTTP routes to the agent used to mean hand-building a matching MCP tool per endpoint — duplicated
  effort against a route that already exists. Now an `extraPluginDirs` entry may be `{ dir, autoGenerateMcp: true }` instead of a plain path, which
  exposes that plugin's HTTP routes as MCP tools with no separate manifest. Each route becomes a tool named after its `id` (non-alphanumerics become
  underscores), with description, safety hint and input schema derived from the route's `http` block: path, query and header parameters plus the
  `requestBody`'s top-level properties become input fields, and the same bound handler serves both interfaces. The Gateway starts one in-process MCP
  server (Streamable HTTP, default port `opts.port + 100`) covering every auto-generated tool; configure it with `opts.mcp`.
- **Stream routes.** A route declaring `stream: true` owns the raw `ServerResponse` — the reply is hijacked so Fastify never serializes it. The
  boundary catch maps a pre-header throw to a JSON error carrying `err.statusCode`, while a mid-stream throw ends the socket instead of leaving it
  open.
- **Per-plugin config.** A stack spec can carry a `config` block per plugin (`spec.gateway.plugins[].config`); it is spread over the Gateway conf in
  that plugin's context, so a plugin's settings live with the plugin.
- `onError` now carries the handler's `statusCode` instead of flattening everything to 400.

#### Worker — built-in `health` telemetry channel, Worker-scoped telemetry pulls

- Every device instance under `WorkerRuntimeV2` gets a `health` telemetry channel registered automatically, answering
  `TELEMETRY_PULL { query: { type: 'health' } }` with no contract changes. It routes through the same dispatch as any declared channel, and a contract
  that declares its own `health` channel wins.
- **`pullWorkerTelemetry(workerId, query)`** (`@tetherto/mdk-client`) resolves the Worker key from the registry and pulls telemetry Worker-direct over
  a short-lived client — the path for Worker-infra queries (`logs`, `logs_multi`, `list`, `stats`, `ext_data`) that aggregate over a Worker's own
  store rather than one device. It resolves with the bare payload, like the Kernel-side helpers.

#### UI — the authentication seam

`AuthProvider` gathers into one replaceable object the four places that each reached for the same singleton: the QueryClient's 401 handling, the
transport's token read, the refresh cadence, and the host app's `?authToken=` capture.

| Export | From | Role |
|---|---|---|
| `AuthProvider`, `AuthTokenStore` | root, `./auth` | The seam itself; only `getToken` and `signOut` are required |
| `bearerTokenAuth()` | root, `./auth` | Generic default — bearer token in `authStore`, 401 ends the session |
| `noAuth()` | root, `./auth` | For an open API or a fixture-backed demo |
| `applySession`, `isSessionExpiredError`, `SESSION_EXPIRED_STATUS` | root, `./auth` | Shared session helpers |
| `gatewayRedirectAuth(options)` | `./presets/mining` | The mining Gateway flow: Google redirect, `?authToken=` capture and scrub, 250 s token refresh, role parsing |

`MdkProvider` gains `auth`, `endpoints`, `fetcher` and `onSessionExpired` props, runs `bootstrap()` before children render (so no route guard sees a
tokenless first paint), and publishes the provider through the new **`useMdkAuth()`** hook, which also works outside a provider.

#### UI — declarative resources and an injectable data source

- **`createResourceQuery` / `createResourceMutation`** turn an endpoint plus a few mapping rules into a factory, with URL assembly, param
  serialisation, path encoding, abort-signal threading and transport selection all coming from the client's runtime. Most of the mining mutations (all
  but one) are converted onto it with signatures unchanged.
- **`createMdkQueryClient({ apiBaseUrl, endpoints, fetcher })`** repoints the same mining factories, and the adapter hooks above them, at another API.
  Mining stays the default and produces byte-identical URLs.
- New `query/runtime.ts` holds the domain-agnostic engine — `Fetcher`, `EndpointMap`, `MdkRuntime`, `resolvePath`, `buildUrl`, `appendQuery`,
  `createGetQueryFn`, and the readers that pull the runtime back off the `QueryClient`'s `meta`. Endpoints are `:name` path templates: `resolvePath`
  encodes every value and throws on a missing segment, where the four dynamic paths were previously string-concatenated at their call sites with
  encoding left to each caller.
- **`resourceKey(name, params?, scope?)`** is the generic key convention for resources declared this way; the mining preset keeps its hand-written
  keys, which mirror Gateway URL paths and decide what an invalidation reaches.
- **`AuthProvider`-aware exports** `API_BASE_URL_ENV` and `DEPRECATED_API_BASE_URL_ENV` so nothing hardcodes an env var name.

#### UI — the bring-your-own-backend proof, and two new gates

- **A catalog page driven by a non-mining API.** `DataTable`, `LineChartCard` and `Alerts` are fed over a real HTTP GET from a response with nothing
  in common with the mining Gateway — a `page` envelope, `records[]` instead of a per-node array-of-arrays, nested `health.notices[]` instead of
  `last.alerts[]`, `atMs`/`value` samples, severities on a `level` field — using plain TanStack `useQuery`. The entire integration surface is ~40
  lines of pure mapping in `fleet-adapter.ts`: no `createMdkQueryClient`, no endpoint map, no adapter hook, no preset import.
- **`npm run check:byob`** walks that directory and fails on any import from `@tetherto/mdk-react-adapter` or `@tetherto/mdk-ui-foundation`, and fails
  if the directory disappears, so the "works with any backend" claim can't silently rot.
- **`npm run check:api-surface`** reads the built `.d.ts` for every subpath in `ui-foundation` and `react-adapter`'s `exports` maps and diffs the
  exported names against committed baselines in `ui/api-surface/`. Removals and kind changes are reported as breaking, additions as additive, and both
  fail the gate, so a moving surface stays a deliberate choice; `-- --update` accepts a change and the baseline diff becomes the record of what a
  release breaks.

Both are wired into `npm run fullcheck`.

#### Performance and scalability benchmark harness

New at `backend/tests/benchmark/` — a first-pass performance and scalability harness — filling in the new
`docs/guides/deployment/capacity-metrics-template.md` from measured runs instead of by hand. It boots real Kernel, Gateway, Worker and mock-device
processes — every role its own OS process, as under a real deployment, never blended into one Node process — drives read/action/Gateway-request load,
samples CPU/RSS/open-FDs per process, runs failure drills (Worker restart, Kernel restart, a fleet-wide unreachable-device outage), and writes a
filled profile (JSON + Markdown) per run plus a comparison matrix across a sweep.

A single JSON config declares the fleet; `npm run benchmark` sweeps the Cartesian product of every family's device-count range, lowest total first,
stopping at the first combination that goes red. A fast 5-device correctness check is wired into `npm test`. Generated Markdown mirrors the template's
own headings and table shapes, using the template's `_` placeholder wherever the harness has no measurement.

#### Elsewhere

- **`packages/` is its own npm workspace root** (`@tetherto/mdk-packages`), so the CLI and the skill suite can depend on each other locally and be
  published individually. It includes `backend/core/{client,mdk,mdk-worker}` as workspace members.
- **`@tetherto/mdk-skill` gained a programmatic entry point** — `installSkills()`, `assemble()`, `canAssemble()`, `isAssembled()`, `CLIENT_DIRS` —
  which is how `mdk skill add` resolves and installs the suite without path walking. A new **`mdk-gateway-plugin`** skill ships with
  `plugin-authoring` and `controller-patterns` references, and `mdk-ui-component` gained a `page-recipe` reference and a `ui-registry.json`.
- **Shell template**: `src/constants/permissions.ts` — a worked example of a permission policy, built from `USER_ROLE` / `AUTH_PERMISSIONS` /
  `AUTH_LEVELS`, plugged in through the provider's `getPermissions` seam. Plus `VITE_AUTH_BYPASS` (dev-only: skips the sign-in gate, seeds a stub
  token and disables refresh polling, so the shell runs with no OAuth backend) and `VITE_GATEWAY_URL` (what the Vite dev server proxies to, set by
  `mdk create dashboard` from the stack's Gateway port).
- **Hook contract tests**: a provider-backed `mdk-harness` plus contract suites in `react-adapter` that assert on the transport rather than on
  internals, so a hook may change how it fetches and still satisfy the contract.
- **`useNominalConfig`** and its `NominalConfig` type are exported through the `react-adapter` hooks barrel.

### Changed

- **Built-in Gateway plugins moved onto the per-plugin context.** `telemetry` reads its data access from the plugin module; `site-monitor` and
  `site-hashrate` author their own Kernel client in `lib/client.js` from `config.kernelKey` / `config.kernelBootstrap`, connecting lazily so a missing
  Kernel still degrades to `ERR_KERNEL_CLIENT_NOT_CONNECTED` / `ERR_MDK_CLIENT_UNAVAILABLE` per request. The bundled `auth` plugin is left unmigrated
  — it needs `ctx.authLib`, which no runtime supplies.
- **Telemetry history is sourced from the Workers.** The history routes read from the legacy store nodes over `conf.kernels` RPC, a plane MDK
  deployments don't rely on; the Kernel intentionally stores no telemetry. A plugin-local `site-data` module keeps the controllers' `requestData`
  surface and fans `telemetry.pull` Worker-infra queries across the registry via the plugin's own client. The Workers' `tailLog` speaks the same
  key/tag/range/`groupRange` vocabulary the store did, and store-era `<field>_aggr` names are aliased onto the Workers' base stat fields — one
  aggregation level now, same numbers. Workers without the queried bee answer error payloads and are skipped; an unreachable Kernel degrades to the
  routes' zero shapes.
- **The example site's MCP plugin follows the agent tool contract.** Six tools — `summarize_site`, `count_devices`, `list_devices`, `get_device`,
  `rank_devices`, `act_device` — with closed enums over shared axis vocabularies, device references, bounded limits with defaults, summary-first
  results, and `readOnlyHint` annotations. `act_device` validates the requested mode against the device before dispatch. The earlier hand-rolled tool
  set is replaced, and the example's HTTP plugin can now auto-generate its MCP surface instead.
- **Mock data scales with the seeded fleet.** The example site sizes its power-meter reading off the actual seeded miner count rather than a flat
  number, and the pool and temperature mocks derive their state from the device count instead of fixed values.
- **The skill suite was renamed and re-scoped**: `mdk-device-worker` → **`mdk-worker-plugin`** (references, assets and scripts move with it), and
  `mdk-app-plugin` is replaced by the fuller `mdk-gateway-plugin`.
- **`@tetherto/mdk-agent` joined `install-packages.sh`**, so a core install covers it.
- **Comment and documentation sweep**: residual references to the legacy reference-app codename in comments, SCSS notes, USAGE docs and guides are
  replaced with neutral wording. No runtime behaviour changes.
- **Link checking treats `401` as reachable** (`warn`, alongside `403` and `429`) — the server answered, so the link is not broken; auth-walled pages
  401 the unauthenticated CI crawler. Each status code now carries an inline rationale.
- **Dependency changes**: `@modelcontextprotocol/sdk` `^1.29.0` → `^1.30.0`, plus `zod` `^4` and `@tetherto/mdk-worker` added to `@tetherto/mdk-mcp`;
  `@tetherto/mdk-gateway` drops its direct `@tetherto/mdk-client` dependency and adds `@tetherto/mdk-mcp` and `@tetherto/mdk-worker`.

### Removed

- **The Gateway's Kernel data proxy** — `workers/lib/data.proxy.js`, the shared `dataProxy`, `isRpcMode`, the in-process Kernel handle, and the
  `conf.kernels` fan-out, plus their unit suite
- **The sample Worker's `plugin/` module tree** — `index.js`, `lib/device-client.js` and `src/**` — superseded by the contract-plus-`src/` directory
  layout, along with the caller's sampler loop and SQLite handle
- **The `mdk-app-plugin` skill**, superseded by `mdk-gateway-plugin`
- Four dead placeholder query factories (`authQuery`, `devicesQuery`, `deviceQuery`, `telemetryQuery`) and the bare-`Error` `defaultFetcher` that was
  their only user, plus the duplicate `appendQuery` / `appendCommaQuery` serialisers, collapsed into one
- `Session.warmup` in the agent, which prefilled a prompt prefix no real turn ever sends verbatim — it cost a model call per session and could never
  hit the cache

### Security

- **`brace-expansion` raised to `>= 5.0.9`.** The tree already pinned `>= 5.0.7`, which satisfied the advisory fixed in 5.0.8 — but a second advisory
  bypasses that mitigation and needs `>= 5.0.9`. The three override selectors move to `>= 5.0.9`, and the `<5.0.7` selector widens to `<5.0.9` so the
  5.0.7 and 5.0.8 copies already in the tree are caught. Everything now dedupes to a single 5.0.9.
- **`undici` and `fast-uri` high advisories cleared.** Both resolved from the existing overrides once the lockfile was regenerated; the `fast-uri`
  selectors are now split per major (`>=3.0.0 <3.1.5` → `3.1.5`, `>=4.0.0 <4.1.2` → `4.1.2`) and applied consistently across the root, `ui/`, the
  Gateway and the MCP server.
- **`js-yaml` pinned to `4.3.1`** in the root and `ui/` overrides, replacing the open `>=4.3.1 <5.0.0` range that let a fresh install drift.
- **`@hono/node-server` pinned to `2.0.12`** in the root overrides, matching the MCP server's own pin.
- A dependency-audit sweep regenerated every backend package lockfile against these overrides.

Note that the UI audit job runs on pull requests only, so the default branch is never audited and an advisory published mid-cycle surfaces on every
open PR at once rather than on the branch that introduced it.

### Fixed

- **Dashboard read hooks fetched while signed out.** They passed no `enabled`, unlike the rest, so they fired on mount with no token — and since the
  Gateway answers 401, the QueryClient's session guard read that as "the session ended", cleared the auth store and fired `onSessionExpired`. A
  dashboard mounting before sign-in completed could therefore bounce the user out of the sign-in flow they were halfway through. Gated:
  `useActiveIncidents`, `useConsumptionChartData`, `useHashrateChartData` (both queries), `usePoolRows`, `usePoolStats`, `usePowerModeTimelineData`,
  `useSiteConsumptionChartData`, `useSiteContainerCapacity`, `useSiteHashrate`, `useSiteMinerCounts`, `useSiteMinerStats`, `useSitePowerMeter`, each
  also gaining the `enabled?: boolean` option the others already carried.
- **List hooks returned rows from only the first responding Kernel.** They used `headOrEmpty` where their siblings used `flattenKernelEnvelope`, so a
  rack-sharded deployment silently lost every node after the first. Now flattened: `useActiveIncidents`, `useContainerUnits`, `useMinerDevices`,
  `usePoolManagerDashboard` (two sites), `useSiteMinerCounts`, `useSitePowerMeter`. The same first-node-only truncation inside `getAlertsForDevices`
  is fixed by the flat alerts contract above.
- **`flattenKernelEnvelope` threw on a non-array body.** It did `(envelope ?? []).filter(...)`, so an error envelope or a bare object reached
  `.filter` and threw where `headOrEmpty` returned `[]`. It now checks `Array.isArray` at both levels and returns `[]` for anything it cannot walk.
- **Two hooks passed a non-array payload straight through.** `data ?? []` only covers null and undefined, so an object arrived under a key typed as a
  row array and any component mapping over it threw. `useContainerPoolStats` and `usePoolConfigsData` now guard with `Array.isArray`.
- **`site-hashrate` read `.payload` off MDK client results**, which resolve with the bare payload.
- **The agent re-serialised assistant turns when replaying history**, so the conversation it sent differed from what the model produced and missed the
  model server's KV cache entirely — a verbatim replay costs 44% of a cold call, a re-serialised one 101%. Measured about 22% faster end to end, with
  routing and answers unchanged. The rejected-approval path replayed the same way and is fixed with it.
- **An agent turn was persisted only after the consumer drained the generator**, so a request whose client disconnected mid-stream lost the turn that
  had actually happened. The write moves into a `finally`, and both turn generators settle history in a `finally` of their own.
- **The agent decided a session record was gone by matching the store's error message**, making the wording an undocumented part of the interface — a
  persistent implementation phrasing it differently would retry an unlandable write every turn for the life of the session. `save` now throws
  `code: 'SESSION_GONE'`. Alongside it: `/new` no longer reports "could not reset" on a gone record and then work on the second attempt; `delete` no
  longer answers `true` for an expired record that `get` reports as never having existed, which made it an oracle for ids the null-for-both rule
  withholds; and a mistyped REPL command is rejected against the banner's own command list instead of being sent to the model as a question.
- **`renderTools` rejected an unadmitted tool by failing on a missing field.** `notFor` is optional for the author and filled in by admission, so a
  raw tool reached the renderer and surfaced as a property read on `undefined`; the guard now checks the block is normalised and names the contract.
- **The devkit's `LineChartCard` example built its x-axis in seconds** while `LineChart` divides by 1000 itself, so every point landed in January
  1970. The unit is now documented on the data type.
- **The UI CLI served a stale build after a template edit.** Its inputs live outside the turbo root, so no `inputs` glob could reach them and a cached
  build bundled an old template; `@tetherto/mdk-ui-cli#build` now sets `"cache": false`.
- **The scaffolded Dashboard page was missing its generated marker**, and nested shipped source under `presets/` was emitted with an unrewritten `@/`
  alias that no consumer could resolve — an ESLint override now exempts that tree from the alias rule.

## v0.8.0

> For a high-level introduction, see the [v0.8.0 release notes](../release-notes/0.8.0-release.md).

### Overview

- Ships **`@tetherto/mdk-ui-agent`**, the operator agent as a drop-in `<CoPilot />` for any MDK shell, with a headless
  `./core` subpath so a host can reuse the SSE contract, turn reducer and conversation store without taking the components
- Gives the agent a **versioned charter** — its standing instruction becomes a pinned module whose version travels with every
  eval report, so a battery score still means something a month later
- Adds an **OpenAI-compatible hosted model provider** beside the local one, with request pacing, rate-limit retries and
  API-key redaction; the local provider remains the default and nothing becomes remote by accident
- Hardens the agent against its own failure modes — no arithmetic, no partial list reported as a whole, no tool named to the
  operator, no speculative calls, one device per action — and pins those rules with an eval battery
- **Tunes the benchmark harness** (`backend/tests/benchmark/`) for heavier stress-test load and loosens its leak-detection
  threshold to match
- Removes the in-repo Whatsminer Worker in favor of MicroBT's own externally maintained `whatsminer-mdk-worker`, hosted on `WorkerRuntimeV2` through a small adapter, with a
  bundled `mdk-crypto-lib` shim standing in for the `crypto-js` package it still declares

No UI module export was removed or renamed: the `ui/api-surface/` baselines record only additions. Elsewhere, the in-repo Whatsminer Worker's
`startWhatsminerWorker` export is gone along with the package itself, the sample site's MCP tools renamed result fields, and the `mdk onboard`
picker lost entries: see [Changed](#changed) and [Removed](#removed).

### Added

#### `@tetherto/mdk-ui-agent` — the operator agent as a drop-in

A new UI package rendering the agent Gateway plugin's event contract as a conversation. It is workspace-linked
(`private: true`) and consumed by path, like the other `ui/packages/*` members.

| Entry point | Contents |
| --- | --- |
| `@tetherto/mdk-ui-agent` | `CoPilot`, `ChatUIEntry`, the `use-agent-chat` / `use-agent-config` / `use-conversations` hooks, the `AGENT_NAME` and `OPERATOR_NAME` strings, and the `AGENT_LABELS` object. It also does `export * from './core'`, so the headless surface is reachable from here as well |
| `@tetherto/mdk-ui-agent/core` | The headless half — event and turn types, the SSE transport, the turn reducer, the conversation store, markdown and prose helpers. No React. It does reach for browser globals (`fetch`, `localStorage`, `crypto`), each behind a guard or injectable, and `TextDecoder` directly, since it's available in both a browser and Node — so it runs outside a browser but is not unaware of one |
| `@tetherto/mdk-ui-agent/panel` | `CoPilotPanel` — the panel body, shared by the docked overlay and the full-page route |
| `@tetherto/mdk-ui-agent/chat-page` | The full-page route form |
| `@tetherto/mdk-ui-agent/styles.css` | Compiled styles, themed off the `--mdk-color-*` tokens |

- **`CoPilotPanel` is deliberately absent from the root barrel**: Both entries reach it through a lazy boundary so the
  markdown renderer and syntax highlighter stay out of the host's first paint; a single static re-export from the root would
  collapse that split for every consumer.
- **The store persists conversations with explicit ceilings** — `MAX_CONVERSATIONS`, `MAX_MESSAGES_PER_CONVERSATION` and
  `MAX_PERSISTED_TOOL_TEXT_CHARS` — so a long-lived session cannot grow local storage without bound. `mergeConversations`
  reconciles what was persisted with what the server returns.
- Components cover the states the contract can actually produce, not just the happy path: `approval-card` for a write
  awaiting the operator, `tool-chip` for a call in flight, `no-tools-note` when the Gateway serves no tools, and
  `leaked-tool-call-notice` for a model that emits a call where prose belongs.
- Ships contract tests over the event and turn shapes, plus a style-forwarding check (`scripts/check-style-forwards.mjs`)
  run as part of `build`.

#### The agent charter — a versioned standing instruction

`backend/core/agent/src/charter.js` extracts the system prompt sent on every request into `CHARTER`, alongside a
`CHARTER_VERSION`.

- **The version travels with the report**: A battery score is only comparable to another taken under the same instruction, so
  the charter version is recorded in the run rather than the reader being expected to remember which wording was current.
- **The bytes are load-bearing**: The charter is the stable prefix every request shares and the prompt cache is keyed on it, so
  a reflowed line costs every live session its warm prefix. `backend/core/agent/tests/unit/charter.test.js` pins the text and keeps prior
  versions in a historical table rather than mutating the row for a shipped version.
- Routing knowledge stays out of it: which tool answers which question lives in the tool descriptions, so it evolves with the
  tool set instead of with this text.

#### Model providers — an OpenAI-compatible hosted option

`resolveProvider` now dispatches on `PROVIDER.QVAC` (local, still the default) or
`PROVIDER.OPENAI_COMPATIBLE`, selected with new `mdk-agent` flags: `--provider`, `--base-url`, `--api-key`, `--model`,
`--rpm` and `--capability`.

- The hosted path requires `model`, `baseURL` and `apiKey` explicitly and fails fast without them.
- **The API key is scrubbed from error response bodies**, via a `fetch` wrapper rather than at each call site, so a new
  request path cannot forget to do it. A successful response is passed through untouched.
- **Rate limits are handled rather than surfaced**: `pacedFetch` throttles to a requests-per-minute budget and makes up to
  `RATE_LIMIT_ATTEMPTS` attempts (6, so at most five retries), honoring `Retry-After` when the server sends one and falling
  back to a delay parsed from the response body when it does not. The readiness probe is built with `attempts: 1`, so startup
  surfaces a rate limit rather than pacing through it.
- The local provider's readiness poll now backs off — `QVAC_POLL_MS` doubling to `QVAC_POLL_MAX_MS` rather than retrying on a
  flat interval — and a model name the runtime does not recognize fails immediately instead of being waited out to the
  timeout.
- **New budget flags and a named preset**: `--max-steps` and `--max-output-tokens` override the capability's budget,
  `--capability` selects it, and `--provider openai` is a preset that supplies the base URL and reads `OPENAI_API_KEY` —
  distinct from `--provider openai-compatible`, which takes an explicit `--base-url`. `--mode` applies to the local runtime
  only and is ignored for a hosted endpoint.
- **The SSE contract gained two `tool_result` fields**: `contractViolation`, naming a result that broke the tool's declared
  shape, and `approvalWaitMs`, how long the operator held the turn at the approval prompt. Both are optional additions, so
  `CONTRACT_VERSION` stays `v1`.
- **A failed model call is described rather than surfaced raw**: `describeCallError` maps provider failures onto operator
  sentences — unreachable, refused, busy, model unavailable, context exhausted, service failed — and writes the underlying
  SDK message to stderr instead of the event stream. Arguments the server rejects are told apart from work that failed, and
  the model is given a bounded chance to fix them (`rejectedArguments`, `MAX_ARG_FIXES`).
- **Choosing a hosted endpoint says so at startup**: The CLI prints `prompts and tool results leave the site for <host>` when
  a hosted provider is selected, and states that a local model keeps data on site. The difference should not have to be
  inferred from the flags.

#### `@tetherto/mdk-plugin-demo` — a Gateway plugin over the sample Worker

A new Gateway plugin aggregating the `demo-worker` sample's devices through the MDK protocol client. Its contract — routes,
schemas, examples, constraints and error codes — is declared in `backend/plugins/demo/mdk-plugin.json`, which points each
route at a handler; the behavior lives in `controllers/summary.js`, `controllers/history.js`, `lib/devices.js` and
`lib/client.js`.

| Route | Behavior |
| --- | --- |
| `GET /api/demo/summary` | Fans metrics telemetry out to every registered demo device and returns fleet totals plus a per-device breakdown |
| `GET /api/demo/history` | Reads each Worker's own `history` channel — `limit` defaults to 10 and is capped at 500, optional `deviceId` narrows to one device |

Both are declared `safety: "read-only"` with response schemas, worked examples and constraints. `demo.summary` declares
`ERR_MDK_CLIENT_UNAVAILABLE`; `demo.history` declares that and `ERR_UNKNOWN_DEVICE_ID`. In practice a missing Kernel client
is not surfaced as an error at all — both controllers catch it and answer `{ ok: true, kernelConnected: false }` with an empty
device list, so a caller distinguishes it by that flag rather than by an error code. Aggregation lives in the plugin because a
Worker only ever answers for one device.

#### Generated-page freshness — one command, one workflow

Some files in this repo are written by scripts rather than by people: the supported-hardware page and its `catalogue.json`,
the default-plugin route tables, and the component reference shipped inside the `mdk-ui-component` skill.

- **`npm run regenerate-docs`** rewrites every generated page; **`-- --check`** reports what is stale and changes nothing.
  Exit codes separate the two outcomes a caller cares about — `3` for stale pages, `1` for a broken generator or dirty tree —
  so staleness and breakage are distinguishable without parsing output.
- **`npm run generate:ui-registry`** regenerates the skill's component reference from the devkit registry verbatim. With
  `ui/`'s dependencies absent it exits `2` and leaves the committed copy untouched rather than writing a partial one;
  `regenerate-docs` reclassifies that as a skip for the targets it marks skippable.
- **The `docs-freshness` workflow warns rather than gates — for staleness**: A device contract can legitimately land in one
  pull request and its regenerated page in the next, so a stale page is annotated, not failed; a hard gate would force an
  unrelated docs commit into an engineering change. It still fails outright on a broken generator, a dirty tree or a skipped
  target, since none of those establish whether the pages are current. It is also path-filtered, so it runs only on pull
  requests that touch a generator, a generated file, or one of their sources.

#### Benchmark harness — heavier default load, matched thresholds

The performance and scalability harness at `backend/tests/benchmark/` (shipped in 0.7.0, filling in
`docs/guides/deployment/capacity-metrics-template.md` from measured runs) gets its stress parameters retuned for a
heavier, more realistic load:

- **Default load raised** for a real stress test: `n` (samples per latency row) `200` → `1000`
  (`nMinimumRecommended` `30` → `100`), read-load concurrency `20` → `1000`, action-load rate `100/s` → `1000/s`
- **`rssSlopeFlatMiBPerHour`'s amber ceiling loosens `5` → `2048` MiB/h** — the tighter number was tripping on the
  new load profile's own working-set growth, not a real leak signal
- **Failure-drill timeouts tighten `30s` → `5s`** (`workerRestartTimeoutMs`, `kernelRestartTimeoutMs`), matching how
  fast a real restart against the same on-disk root actually completes
- The fleet-summary plugin's controllers (`device-action.js`, `device-alerts.js`, `device-telemetry.js`,
  `fleet-summary.js`) gain a **test-only `services` seam**: when `services` is `undefined` they fall back to the
  plugin's own ambient client (`lib/client.js`) instead of destructuring it, so a test can call a controller
  directly without loading the plugin
- The generated report drops provenance rows (load generator, config artifact hash, alert-induction method)
  duplicated elsewhere in the profile

#### Elsewhere

- The **UI shell template mounts the agent**: `<CoPilot />` is mounted once in the layout element rather than on a route, so
  it stays available across pages, and the dev server proxies `/agent` to the Gateway — the panel must reach the backend
  same-origin, because the Gateway sends no CORS headers and its stream route hijacks the reply.
- The **component catalog** gained an *Agent Co-pilot* page backed by a scripted demo gateway, so the surface can be exercised
  without a live agent.
- `ui/api-surface/ui-agent.json` joins the export baselines already covered by `check:api-surface`, and the `ui-foundation`
  baseline picks up `WEBAPP_NAME`, `WEBAPP_SHORT_NAME` and `WEBAPP_DISPLAY_NAME` — exported from `constants/app-constants`
  since 0.7.0, recorded in the baseline for the first time here.
- **`npm run lint:md`** adds markdown linting via `markdownlint-cli2`.
- New tests land alongside the code they cover: `provider`, `truncation` and `charter` suites for the agent, contract and
  result-shape suites for the sample site's MCP tools, and a `preflight` suite for the full-site example. The full-site
  `mcp-server` suite gained a case pinning that `act_device` never reads an unsent write as sent.
- `mdk-ui create` scaffolds `@tetherto/mdk-ui-agent`: the package joins `MDK_PACKAGES`, so a generated app has its dependency
  rewritten to the local link or the published range like every other devkit package.
- `README.md` gains a *Run the demo site* quickstart — clone, `npm run setup`, `node start.js --miners 3` — with the boot lines
  to wait for and the ports each surface lands on, a `### Find your lane` heading over the existing backend/UI split, an
  `### Examples` comparison of the runnable sites, and a note that a gitignored `ui/apps/<name>/` scaffold still leaves its
  mark in `ui/package-lock.json`.
- Two maintainer documents: the `bump-mdk` skill, which resyncs every affected lockfile the way CI expects, and a full-site
  UI production-readiness plan.

### Changed

- **An omitted `safety` in a Gateway plugin manifest now means "write"**: A route declaring no `safety` gets
  `readOnlyHint: false`, and `requiresApproval` gates unconditionally on that — where before it fell through to the read-verb
  heuristic in the tool's name, so an unannotated `get_*` or `list_*` route ran without asking. **Any third-party plugin route
  whose manifest omits `safety` now stops at the human-approval gate.** Declare `safety: "read-only"` to keep it ungated.
- **Approval also honors `destructiveHint: true`** when `readOnlyHint` says nothing. A server that stated only that a call is
  destructive has still said it writes, and that now outranks the name; `readOnlyHint` stays authoritative where both appear.
- **A turn now has a declared budget, and the default one grew**: `CAPABILITY_LIMITS` bounds steps and output tokens per
  capability — small 6/2048, mid 8/4096, large 10/8192 — and `DEFAULT_LIMITS` is the small row, up from `maxSteps: 4,
  maxOutputTokens: 512`. A hosted provider defaults to `large`, a local one to `small`. Nothing is inferred from the model
  id: a bigger local model has to say `--capability mid`, and the startup line marks a budget that was not declared.
- **Prose is not streamed until a tool has returned**: The first tokens are buffered rather than sent, and released only once
  a tool has answered or the turn has no tools at all; an answer that states a figure or names a device id the tools did not
  supply is re-prompted rather than shown. This is the invented-device failure mode, closed at the source.
- **A resumed conversation now contains the tool exchange**: `Session.toolTurn` records the call and its result ahead of the
  answer, so the transcript reads asked → called a tool → got a result → answered. A suppressed answer is discarded like an
  error instead of being recorded, which otherwise taught the model that giving up was a valid shape for a turn.
- **The agent's tool loop now polices the model's output rather than forwarding it**: A reply that echoes the question back,
  attempts a tool call the parser cannot read, or states a figure or device id the tools did not supply is retried, each class
  under its own cap (`MAX_ECHO_RETRIES`, `MAX_REPAIR_RETRIES`, `MAX_STALE_RETRIES`). An answer that still names a tool,
  restates the prompt (`json`, `tool call`, `args:`) or comes back empty is not retried: it is replaced with a fixed apology
  and the model's own words go to the log rather than to the operator. Repeated identical calls are caught by fingerprinting
  the tool and its canonical arguments, so a loop cannot spend its budget asking the same question twice.
- **An answer that hits the token ceiling says so**: When the model stops on `length`, its reply carries an explicit note
  telling the operator to ask for fewer items or raise the limit, instead of ending mid-sentence.
- **The final step is told it is final** (`LAST_STEP`), so a turn that has exhausted its tool budget answers in plain text
  rather than emitting one more call that cannot run.
- **Tool results are clamped before they enter history** (`HISTORY_RESULT_CHARS`), and argument-rejection and tool-error text
  are bounded, so one large result cannot crowd the context for the rest of the conversation.
- **Model requests carry a deadline**: `runToolLoop` takes `requestTimeoutMs`, and a hung provider now fails with a described
  error instead of hanging the turn.
- **The eval battery grew from 262 to 273 cases and was substantially rewritten**, with the reporting reworked around the charter version so
  scores stay comparable across runs. It scores a new independent check — `target`, whether the model acted on a device that
  exists or one it invented — alongside routing, answer, contract and approval, and a case can now carry a `steps` array to
  run several turns against one conversation. A number counts as stated whether the answer gives it in digits or spells it
  out.
- **The startup banner and `/info` report what the agent is running**: Both name the charter version and the capability
  budget in steps and tokens, marking one that was not declared, and `/info` adds a `budget` line. A local model large enough
  to want a bigger budget is told to say so, and an endpoint that answers but rate limits is reported as reachable with a
  suggestion to pace with `--rpm`.
- **The `summarize_site` summary was rewritten for how a small model reads it**: Every count in it is glued to the noun it
  counts, zero is spelled as a word (`no devices`, not `0 offline`), and plurals agree with their number (`1 worker`, not
  `1 workers`). The previous phrasing was `2 devices across 1 workers — 2 online, 0 offline`. The other tools' summaries keep
  their existing phrasing, and `count_devices` still reports a bare `0 devices.`
- **`act_device` reports an outcome**: Its result adds an `outcome` field (`rejected` / `failed` / the reported status /
  `sent`), so a caller no longer has to infer success from the absence of an error.
- **The bundled Worker offered by `mdk onboard` is now the `demo-worker` sample** rather than a hardware-specific one, so the
  scaffolding path exercises a device model written for plugin authoring instead of a real firmware.
- **The documented root install model is reversed**: `examples/full-site/README.md` previously said the repo is federated with
  no root workspaces and that a plain `npm install` is not supported. The root *is* an npm workspace — every `backend/core/*`
  and `backend/workers/*` package is a member — so a root `npm install` installs and links them together. Contributor guidance
  that said the opposite is now correct.
- **`check:plugin-reference-fresh` is re-stated as implemented**: `docs/reference/maintainers/ia.md` and `agent-ready-sdk.md`
  described it as a gate that does not exist; it ships warn-only.
- `CONTRIBUTING.md` gained a checklist item for regenerating pages affected by a change, using the command named in each
  file's `DO NOT EDIT` header, and `RELEASING.md` gained the matching `regenerate-docs` step.
- Documentation comments across `ui-foundation` and `react-adapter` drop the last references to the reference application's
  former codename.

#### The sample site's MCP tool results were reshaped

Every tool but `count_devices` renamed result fields, so anything reading a result by key needs updating. All of them now
declare `"contract": "v2"` in `mcp-plugin.json`.

| Tool | v0.7.0 | v0.8.0 |
| --- | --- | --- |
| `act_device` | `deviceId` | `ref` |
| `get_device` | `deviceId`, plus a key named after the aspect read — `capabilities` / `state` / `telemetry`, or a spread `supportedPowerModes` | `ref`, plus `attr` naming which aspect was read and `value` holding it |
| `list_devices` | `devices` | `items`, and a new `total` alongside the existing `count` |
| `rank_devices` | `devices` | `items` |
| `summarize_site` | `workers`, `devices` | `totals.workers`, `totals.devices` |

### Removed

- **Entries dropped from the `mdk onboard` picker**: `WORKER_CATALOG` and `GATEWAY_CATALOG` dropped:
  - `@tetherto/mdk-worker-antminer` — a working bundled entry with a full `deviceOpts` block, runnable against its own simulator
  - `@tetherto/mdk-worker-powermeter` and `@org/mdk-worker-modbus` — unpublished stubs
  - `@tetherto/mdk-plugin-summary` and `@tetherto/mdk-plugin-alerts` — unpublished stubs

  All of them were selectable options in the v0.7.0 picker, so these were reachable user choices rather than dead catalog rows. The picker now offers
  no hardware Worker at all; to keep using the Antminer Worker, point a spec entry at `backend/workers/miners/antminer` by hand.
- **The in-repo Whatsminer Worker package is gone**: `backend/workers/miners/whatsminer/` — its driver, protocol handlers, mocks and config examples
  — is removed entirely.
  Whatsminer support now ships as MicroBT's own [`whatsminer-mdk-worker`](https://github.com/whatsminer/whatsminer-mdk-worker), a bare `mdk-contract.json`
  plus handlers with no boot helper, provisioning store or model validation of its own, which you host yourself on `WorkerRuntimeV2` through a small
  adapter (see the [run guide](../../guides/miners/run-whatsminer-worker.md)). MDK validated it against v1, its own label for commit
  [`a47fa820`](https://github.com/whatsminer/whatsminer-mdk-worker/commit/a47fa82020454f9bfa9963ccaaa319b7948e8aa2) — upstream has not tagged a release.
   Model and firmware support beyond that is documented in the external package's own README, not here. Because it still declares a dependency on the
   deprecated `crypto-js`, MDK adds `backend/lib/mdk-crypto-lib` — a drop-in replacement built on Node's own `node:crypto` — and overrides `crypto-js`
   to resolve to it at install time, so nothing in the dependency tree still ships the old package.

### Security

- **The API key is read from the environment before the flag**: `--provider openai` takes `OPENAI_API_KEY`, every other
  endpoint takes `MDK_AGENT_API_KEY`, and `--api-key` is only the fallback — an argument is visible to every other process on
  the box through `ps` and lands in shell history, so the flag is there for convenience rather than as the recommendation.
- **The `nanoid` override became a range selector**: In `ui/package.json`, `nanoid: 3.3.18` held every copy in that install
  tree at one version, which would force a downgrade on any dependency legitimately wanting `nanoid` 4 or later. It is now
  `nanoid@<3.3.18: ">=3.3.18 <4.0.0"`, which replaces only the vulnerable 3.x copies — the selector form many of its
  neighboring overrides already use.

### Fixed

- **A root `npm install` broke the agent Gateway plugin**: the standalone `@tetherto/*` core packages were not reachable from the
  root `node_modules`, so loading the plugin failed with `ERR_PLUGIN_HANDLER_NOT_FOUND`. `install-packages.sh` now links them
  into place with `link_into_root()`, and the link survives a reinstall.
- **A documented command pointed at a path that does not exist**: the hardware integration guide said `cd packages/workers`,
  now `cd backend/workers`.
- **A device the model invented was indistinguishable from a real, quiet one**: `get_device` answered "reports no readings"
  for both. It now confirms the device against current site status first and says plainly when a reference is not in it.
- **A failed write could read as a success**: The Kernel signals a rejected envelope in an `error` field rather than by
  throwing, and that field can carry an empty message, which `act_device`'s truthiness check read as "no error". The tool now
  decides on presence and reports a rejection with no stated reason as one. The change is in `act_device`; the Kernel itself
  is unchanged.
- **The full-site control page cleared its spinner too early**: The button now stays busy until refreshed site state has
  arrived, and its inputs are disabled while a command is in flight, so the table can no longer show the pre-command power
  mode next to an idle control.

## v0.9.0

> For a high-level introduction, see the [v0.9.0 release notes](../release-notes/0.9.0-release.md).

### Overview

- Collapses the repository into **one root npm workspace** (UI aside): every publishable backend package, the standalone
  `packages/*` tools and three of the examples install and link from a single root `npm install`, retiring the per-domain
  roots and the hand-rolled `install-packages.sh` / `clean-workspaces.sh` scripts that kept them in step
- Gives every Gateway plugin an **ambient logger and an `onReady` hook** on its frozen context, so a plugin's output is
  tagged, levelled and ordered in the same stream as the requests it serves instead of arriving as bare `console` lines
- Adds a **measurement layer for the agent**: a hash-chained run ledger, a reproducibility manifest and a scoring rollup
  with a regression gate, so a battery score is attributable to a specific tree, model and charter rather than to a run
- Ships **`mdk-site-sizing`** in the skill suite: turns a plain description of a site into a Kernel/Worker/Gateway layout
  using the benchmark harness's measured envelopes
- Scaffolds now link bundled packages by **relative `file:` spec** rather than a workspace glob, so a generated project
  installs standalone; a scaffolded plugin is booted against a real Gateway in CI on every change

### Breaking changes

#### The repository is a single npm workspace

`backend/core/`, `backend/workers/` and `packages/` are no longer install roots of their own. Their `package.json`,
`package-lock.json` and the shell scripts that drove them are gone, and the root workspace list is glob-based:

| Removed | Replacement |
| --- | --- |
| `backend/core/package.json`, `backend/workers/package.json`, `packages/package.json` | root `workspaces`: `backend/core/*`, `backend/plugins/*`, `backend/tests/*`, `backend/workers/**`, `packages/cli`, `packages/mdk-skill` |
| `backend/core/install-packages.sh`, `backend/workers/install-packages.sh` | a single root `npm install` |
| `backend/core/clean-workspaces.sh`, `backend/workers/clean-workspaces.sh`, `backend/workers/test-packages.sh` | root `npm run clean` / `npm test --workspaces` |
| `npm run setup:core`, `npm run setup:workers` | `npm run setup` is now `npm run setup:ui && npm install` |
| the per-package `package-lock.json` under `backend/**` and `examples/full-site` | the root `package-lock.json` |

The UI toolkit (`ui/`) stays a separate Turborepo workspace with its own lockfile; root scripts forward to it by prefix.
A checkout that still has the old nested `node_modules` directories should remove them before the first root install.
npm resolves against a stale nested tree in preference to the hoisted one.

#### `@tetherto/mdk-agent` moves to the current AI SDK

The agent's model stack crosses several majors at once. A host that pins these itself has to move with it:

| Dependency | Was | Now |
| --- | --- | --- |
| `ai` | `^6.0.0` | `^7.0.0` |
| `zod` | `^3.23.0` | `^4.0.0` |
| `@ai-sdk/openai-compatible` | `^2.0.0` | `^3.0.0` |
| `@qvac/ai-sdk-provider` | `^0.3.0` | `^0.6.1` |
| `@qvac/cli` (optional peer) | `^0.9.0` | `^0.12.0` |

#### `npm ci` still requires the agent to install the agent Gateway plugin

`@tetherto/mdk-plugin-agent` declares `@tetherto/mdk-agent` as a plain `dependencies` entry, not an optional peer, so an
install that omits the agent still fails to resolve. This is a known limitation carried into 0.9.0, not a new regression;
tracked as open.

#### The Gateway no longer auto-registers default plugins

Earlier versions mounted `telemetry`, `site-hashrate`, and `site-monitor` automatically. A Gateway now loads only the plugins a stack names in `spec.gateway.plugins[]`, so a stack that
never declared those three loses their routes on upgrade. Declare each one you rely on as an `@tetherto/mdk-plugins/<name>` subpath.

### Added

#### Gateway plugins get a logger and an `onReady` hook

`buildPluginContext` freezes two more members onto the context a plugin imports from
`require('@tetherto/mdk-gateway/plugin')`, alongside the existing `config`:

- **`logger`**: a `pino` instance tagged with the plugin's name (from `mdk-plugin.json`, falling back to the directory).
  It carries the full level set plus `child()`, so a plugin can sub-tag its own subsystems. Everything the Gateway prints
  (Fastify's request lines and every plugin's output) goes through one destination.
  ([`workers/lib/logger.js`](../../../backend/core/gateway/workers/lib/logger.js)), which is `pino-pretty` on a TTY and NDJSON when
  stdout is piped, the shape log shippers expect. `debug: 0` in the Gateway's `common.json` remains the default, so debug
  lines stay opt-in.
- **`onReady(cb)`**: registers a callback to run once the Gateway has finished booting. Plugin modules load from the
  worker's `init()`, which is too early for work that needs a live server. A callback that throws is warned through the
  Gateway logger rather than taking the boot down.

#### An evaluation layer for the agent

`@tetherto/mdk-agent` gains three modules and a CLI, so an eval run leaves a record that can be checked later:

| Module | Responsibility |

| --- | --- |
| [`src/ledger.js`](../../../backend/core/agent/src/ledger.js) | Append-only run chain: `canonical`, `entryHash`, `appendRun`, `readChain`, `verifyChain`. Each entry hashes its predecessor, so a rewritten history fails verification |
| [`src/manifest.js`](../../../backend/core/agent/src/manifest.js) | Reproducibility record: `buildManifest`, `sha256`, `hashFile`, `gitCommit`. Pins the tree, model and charter a score belongs to |
| [`src/analyse.js`](../../../backend/core/agent/src/analyse.js) | Scoring: `levelOf`, `byCase`, `rollup`, and `gate`, which compares a run against a baseline within a tolerance |
| [`eval/analyse.mjs`](../../../backend/core/agent/eval/analyse.mjs) | CLI over `ledger.js`, `manifest.js` and `analyse.js`, with difficulty tiers in `eval/difficulty.json` |

The methodology (what a run scores, the three questions one run can answer, and how expectations resolve against the
fleet under test rather than being baked into the battery) is written up in
[`docs/EVALUATION.md`](../../../backend/core/agent/docs/EVALUATION.md).

#### `mdk-site-sizing` joins the skill suite

A new skill in `@tetherto/mdk-skill` turns a plain description of a site (device counts, families, constraints) into a
Kernel/Worker/Gateway layout, reading the benchmark harness's measured envelopes rather than guessing, and ships its own
`references/`, `scripts/` and eval set.

#### A site security blueprint

[`docs/guides/security/index.md`](../../guides/security/index.md) documents how to secure an enterprise MDK site assembled
from UI, Gateway, Kernel and Workers. It opens by stating plainly what MDK does *not* provide (no user identity at any
tier, every plugin route served to any caller) and covers the steps and options for closing that at deployment time.

#### Elsewhere

- **`Loader` gains an `inline` prop**: renders an inline activity indicator instead of a block loading state, for use
  inside a flow of content
- **Scaffolded plugins get a plugin-owned MDK client**: [`templates/plugin/lib/client.js`](../../../packages/cli/templates/plugin/lib/client.js)
  builds it from the ambient Gateway context, so controllers import the module and never take `mdkClient` from a services bag
- **A scaffold smoke test in CI**: `scaffold-checks.yml` scaffolds a plugin with
  the CLI, boots it behind a real Gateway and asserts a 200, backed by [`examples/backend/mdk-scaffold-e2e`](../../../examples/backend/mdk-scaffold-e2e/run.js)
- **`setup-config.sh` for the benchmark harness**, seeding a runnable config from the checked-in example

### Changed

- **Bundled packages are linked by relative `file:` spec, not a workspace glob.** `addFileDependency` writes
  `file:./workers/<name>` relative to the generated project, so a scaffolded project installs on its own instead of
  depending on being inside this repo's workspace. On Windows, where `path.relative()` returns an absolute path across
  drive boundaries, it falls back to the absolute path rather than emitting a `file:./C:/…` spec that npm resolves under
  the project directory and 404s.
- **`fast-uri` is overridden by range selector rather than a blanket pin**: `fast-uri@>=3.0.0 <3.1.5` → `3.1.5` and
  `fast-uri@>=4.0.0 <4.1.4` → `4.1.4`, so a legitimate future major is not forced to downgrade

### Removed

- **`@tetherto/mdk-ui-cli` (`mdk-ui`)**: the UI-side CLI is gone in its entirety (it was a workspace-private package, so
  nothing published depended on it)
- **The shell template's System Info page**: `src/pages/SystemInfo.tsx` and `src/components/SystemInfoPanel.tsx`, with the
  route and navigation entries that pointed at them

### Security

- **`undici` is pinned to `>= 6.24.0`** at the root, closing the advisory across every workspace member in one place now
  that the tree has a single install root

### Fixed

- **A working agent turn could look frozen**: turn with no streamed text yet rendered nothing, so a slow first token was
  indistinguishable from a stall; the assistant message now shows an inline activity indicator until content arrives
- **`bundledPluginDir` checked the manifest before containment**: a name that escaped the bundled-plugin directory reached
  the manifest check first and failed with the wrong error; containment is now verified first
- **`ERR_MDK_CLIENT_UNAVAILABLE` was detected by a fragile check**, and `resolveProjectPackageDir` carried an unused `kind`
  parameter, both tightened
- **The benchmark harness's config defaults and memory-leak gate** were corrected so a default run reports against the
  thresholds it documents
