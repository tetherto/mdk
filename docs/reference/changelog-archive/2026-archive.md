
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
