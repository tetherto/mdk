# Changelog: mdk-0.5.0

> For a high-level introduction, see the [release notes](./docs/reference/release-notes/0.5.0-release.md).

## v0.5.0

- Completes the control-plane **rename**: **ORK → Kernel** and **App Node → Gateway**, across backend, UI, examples, and docs (breaking)
- **Retires the IPC transport** — HRPC is now the only client transport, with a zero-config Kernel **key-file** bootstrap (breaking)
- Extracts the Worker runtime into a standalone **`@tetherto/mdk-worker`** package and migrates every worker onto the `WorkerRuntime` plugin model, deleting the legacy `base/`/`ThingManager` packages (breaking)
- Renames the UI foundation package **`@tetherto/mdk-ui-core` → `@tetherto/mdk-ui-foundation`** and restructures `@tetherto/mdk-react-devkit` into **`primitives`/`domain`** layers (breaking)
- Renames every worker package to a uniform **`@tetherto/mdk-worker-*`** scheme, and removes the microbt and electricity workers (breaking)
- Adds **paginated, searchable** pools and containers listings
- Ships a **third-party Worker developer guide**, a docs-generation pipeline, a full-site **dashboard + MCP server** example, and a large **test-coverage** push

## Breaking changes

### ORK renamed to Kernel

The orchestration runtime called **ORK** is now the **Kernel** throughout the codebase, matching the docs and protocol terminology.

- `backend/core/ork/` → `backend/core/kernel/`; package `@tetherto/mdk-ork` → **`@tetherto/mdk-kernel`**
- Internal module `lib/ork.manager.js` → `lib/kernel.manager.js`; class `ORKManager` → `KernelManager`
- The UI nomenclature was swept in lockstep (`ork` → `kernel`) across `@tetherto/mdk-ui-foundation`, `@tetherto/mdk-react-adapter`, and `@tetherto/mdk-react-devkit`; the JSDoc capability tag `@orkCapability` / `ork-capabilities` → `@kernelCapability` / `kernel-capabilities`

**Not affected**: the MDK protocol action names are unchanged — only doc comments moved from "ORK"/"App Node" to "Kernel"/"Gateway". Envelope string values (`identity.request`, `command.request`, `worker.list`, …) are identical, so a 0.4.x peer still speaks the same wire protocol.

**Action required**: replace imports of `@tetherto/mdk-ork` with `@tetherto/mdk-kernel` and path references to `backend/core/ork` with `backend/core/kernel`.

### App Node renamed to Gateway

- `backend/core/app-node/` → `backend/core/gateway/`; package `@tetherto/mdk-app-node` → **`@tetherto/mdk-gateway`**
- The bootstrap export **`startAppNode()` → `startGateway()`** (`backend/core/mdk`)
- The client envelope `sender`/`requesterId` value `'app-node'` → `'gateway'`
- `@tetherto/mdk-plugins` is now described as "MDK Gateway Plugins" (was "MDK App Node Plugins")

**Action required**: rename `startAppNode` call sites to `startGateway`, and update the `@tetherto/mdk-app-node` dependency to `@tetherto/mdk-gateway`.

### IPC transport removed — HRPC only

The Unix-socket IPC transport is gone; HRPC (RPC listener) is the sole client transport.

- **Client**: `backend/core/client/lib/ipc-client.js` deleted; `createMdkClient` no longer accepts `opts.ipc`; `_createTransport` now throws `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` when neither `hrpc` nor `transport` is supplied
- **Kernel**: `IPCListener` and its `KernelManager` lifecycle wiring removed, along with the `listeners.ipc` option on `createKernel`
- **Zero-config bootstrap replacement**: `getKernel` now writes the Kernel's HRPC public key (hex) to a **key file** — `DEFAULT_KEY_FILE` = `<tmpdir>/mdk/.kernel-key` — after start, so out-of-process clients connect without any hand-passed key. `startGateway` resolves the key from that file (order documented); `opts.keyFile` (`string | boolean`) overrides, and `keyFile: false` disables it. New error `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

### `@tetherto/mdk-ui-core` renamed to `@tetherto/mdk-ui-foundation`

The core UI data/state package is now published as **`@tetherto/mdk-ui-foundation`** (`ui/packages/ui-core/` → `ui/packages/ui-foundation/`). Update the dependency name and imports; the API surface is unchanged by the rename itself.

### `@tetherto/mdk-react-devkit` layer restructure and export-map changes (`core`/`foundation` → `primitives`/`domain`)

The devkit source layers were renamed — `src/core/` → **`src/primitives/`** (alias `@core` → `@primitives`), `src/foundation/` → **`src/domain/`** (alias `@foundation` → `@domain`), and the inner `components/domain/` → `components/composite/`. This moved **193 component `USAGE.md`** files and their sources; update any deep imports into `@tetherto/mdk-react-devkit/src/...` accordingly.

The package `exports` map changed:

- `"./core"` **removed** → use `"./primitives"`
- `"./foundation"` and `"./feature"` **removed** (unused convenience exports); `"./domain"` retained but now resolves to `./dist/domain/index`
- Stylesheet `"./styles-foundation.css"` **renamed to `"./styles-domain.css"`** (source `styles-foundation.scss` → `styles-domain.scss`). **Action required** for anyone who adopted the 0.4.0 core/foundation CSS split: rename the second import to `@tetherto/mdk-react-devkit/styles-domain.css`.

### Registry & docs-data schema bumped to `2.0.0` (ORK → Kernel field rename)

`REGISTRY_SCHEMA_VERSION` (`1.4.0` → `2.0.0`) and `DOCS_DATA_SCHEMA_VERSION` (`1.3.0` → `2.0.0`) both moved, because the capability fields consumers read were renamed: `orkCapabilities` → `kernelCapabilities`, type `OrkCapability` → `KernelCapability`, the required JSDoc tag `@orkCapability` → `@kernelCapability`, and the index keys `componentsByOrkCapability`/`hooksByOrkCapability`/blueprint `byOrkCapability` → `…ByKernelCapability`. The `find`/`docs`/`blueprints` CLI commands emit the renamed field.

### Worker packages renamed to `@tetherto/mdk-worker-*`

Every worker package moved to a uniform scheme, e.g. `@tetherto/miner-antminer` → **`@tetherto/mdk-worker-antminer`**, `@tetherto/container-bitdeer` → **`@tetherto/mdk-worker-bitdeer`**, and the demo `@tetherto/sample-demo-worker` → **`@tetherto/mdk-worker-demo`** (also across antspace, avalon, whatsminer, f2pool, ocean, abb, satec, schneider, seneca).

### Worker runtime extracted; legacy `base/` packages removed

`WorkerRuntime` now ships in the new `@tetherto/mdk-worker` package (see Added), and every worker was migrated onto the `WorkerRuntime` plugin model (`plugin/` with `boot.js`, `index.js`, `mdk-contract.json`, `src/commands/*`, `src/telemetry/*`). The shared `base/` packages were deleted: `backend/workers/base/` (`ThingManager`, `thing.js`, `mdk-worker-adapter.js`, `lib/services/*`, `facs/*`, contract schema) and the per-family `miners/base`, `containers/base`, `power-meter/base`, `temperature/base`, `minerpools/base`. Consumers no longer import `ThingManager`, the family managers, or the device bases.

## Added

### `@tetherto/mdk-worker` — Worker Runtime package

New package (`backend/core/mdk-worker/`, v0.1.0) — "hosts a Worker Plugin's devices behind one HRPC channel to the Kernel."

| Export / feature | Description |
|---|---|
| `WorkerRuntime` (`lib/worker-runtime.js`) | Hosts N same-type devices behind one HRPC channel; `getPublicKey()`, `getDeviceContext(deviceId)`; handlers invoked as `(ctx, params)` with `ctx = { deviceId, device, config }`, results wrapped in MDK protocol envelopes. Generalizes/replaces the former `MDKWorkerAdapter` (persistent seeds, single HRPC respond loop, DHT topic announce carried over; `ThingManager` delegation replaced by per-device handler dispatch). |
| `loadPlugin` (`lib/plugin-loader.js`) | Plugin loader with eager handler loading. |
| `service-builtins.js` | `telemetryBuiltin`, `commandBuiltin`, `mergeBuiltinCommands` — serves the legacy worker-infra surface (logs/count/config, pool `ext_data` queries, write-action approval) from injected `opts.services`. |
| `mdk-contract.schema.json` | Formal JSON Schema (draft 2020-12) for the device-lib contract, re-homed with the runtime. |
| `opts.allowEmptyDevices` | Opt-in zero-device boot for provisioning-first bootstrap; default still throws `ERR_DEVICES_REQUIRED`. |

Dependencies: `@hyperswarm/rpc` 3.5.0, `hyperdht` 6.32.0, `hyperswarm` 4.17.0, `debug` 4.4.1.

### Gateway — paginated, searchable listings

- **Pools list pagination + search** (`server/handlers/pools.handlers.js`): `getPools` accepts `search`, `offset`, `limit`. `search` matches `name`/`pool`/`account` (case-insensitive); `total` counts the matched set before the page slice; `summary` still covers the full pool set. Response is `{ pools, summary, total }`. Schema adds `search` (string), `offset` (int ≥ 0), `limit` (int 1–100).
- **Containers list server-side filter/sort/pagination** (`server/handlers/devices.handlers.js`): `getContainers` pushes tag + filter + search to `listThings`, takes the global `total` from `getThingsCount`, then merges/sorts/slices (matching the miners handler).

### `@tetherto/mdk` — absorbed worker-infra services

The former `mdk-utils` package was absorbed into `@tetherto/mdk`: new `lib/services/` (actions, alerts, comments, log-history, logs, pool, provisioning, settings, snaps, stats + `pool-utils/`), `lib/things/` device layer (thing, miner, container, powermeter, sensor + constants), `lib/templates/` (alerts, stats), `lib/worker-infra.js`, `lib/utils.js`, with extensive new unit coverage. New deps pulled in: `@bitfinex/bfx-facs-http`, `@bitfinex/bfx-facs-scheduler`, `@bitfinex/lib-js-util-base`, `@bitfinex/lib-js-util-promise`, `async` 3.2.6, `mingo` 6.5.6, `uuid` 14.0.0.

### Per-worker runtime plugins + contract-declared handlers

Each surviving worker gained a `plugin/` package (`boot.js`, `index.js`, `mdk-contract.json`, `src/commands/*`, `src/telemetry/*`) with matching integration + unit test suites — antminer, avalon, whatsminer (miners); antspace, bitdeer (containers); f2pool, ocean (minerpools); abb, satec, schneider (power-meter); seneca (temperature). Example: antminer telemetry (accepted/rejected shares, hashrate-avg, power, power-mode, efficiency, status, temperature, uptime, snap) and commands (reboot, set-led, set-power-mode, setup-pools). A `whatsminer/examples/run-runtime-parity.js` e2e runs the runtime against mock devices.

### Documentation

- **Worker developer guides**: `docs/guides/workers/build-a-worker.md` (build a third-party Worker end-to-end, from your own repo) and `docs/tutorials/quickstart/build-a-dashboard.md` (one Worker + one Gateway route + one static page, no build step).
- **HRPC**: `examples/backend/inspect-over-hrpc.md` (inspect MDK over HRPC with `hp-rpc-cli`); the IPC transport docs were replaced with the HRPC key-file flow across the top-level README and core/worker READMEs.
- **MCP**: `examples/full-site/docs/mcp-server.md` documents a full-site MCP server that connects to the Kernel directly over HRPC (no Gateway) and exposes registry/telemetry/command tools over HTTP.
- **New stack/reference pages**: `docs/concepts/stack/kernel.md` and `stack/gateway.md` (replacing the ORK/app-node pages); `docs/reference/glossary.md` (replacing `docs/concepts/terminology.md`), with an HRPC section.
- **Docs-generation pipeline**: `mdk-ui docs:generate` with package-grouped versioned reference nav (`ui/packages/cli`), documented in `ui/docs/extending-docs-to-backend.md` and a rewritten `ui/docs/docs-sync-how-to.html`.

### Examples

- **full-site dashboard + MCP**: a new `DashboardPage.tsx` and supporting UI (`AppSidebar`, `ContainerGrid`, `Containers`/`Control`/`Monitoring`/`Pools` pages, chart components), plus an MCP server (`backend/proc/mcp-server.js`, `.mcp.json`) and new dep `@modelcontextprotocol/sdk ^1.29.0`.
- **`examples/site-backend/`** (new) — boots every worker family as its own OS process against mock hardware, coordinated by a Kernel and exposed via the Gateway HTTP API; runnable under PM2 or Docker (Dockerfile, docker-compose, PM2 ecosystem).
- **`examples/backend/mdk-plugin-e2e/`** (new) — plugin-authoring e2e: `WorkerRuntime` hosting mock devices + Kernel + Gateway Plugin aggregation.
- **`examples/backend/demo-worker-caller/index.js`** (new) — a single-file "caller" showing how a host constructs `WorkerRuntime` around the shipped demo-worker plugin and runs a telemetry sampler loop.
- **`examples/backend/kernel/`** (new) and per-family example test packages (`@tetherto/mdk-backend-*-examples`) with a shared `examples/backend/utils/test-harness.js` (`runAutoExit`).

### CI / tooling

- A new **`examples` CI pipeline** (`.github/workflows/ci.yml`): `list-examples`, `setup-examples`, and `test-examples` matrix jobs discovering every `examples/**/package.json`, plus an "Examples" row in the summary (no coverage threshold enforced for examples).
- **`.mailmap`** (new) — maps contributor commit emails to non-routable `example.com` placeholders for this public repo (no history rewrite).

## Changed

- **full-site realigned to the "11-family" site**: description now "3 miner families + 2 containers + 3 powermeters + 2 sensors + 2 pools over the RPC listener"; test expectations moved from 12 families/13 workers to the current 11 after the wm-v3 demo family and microbt containers were removed. The seed was made effective under the Worker runtime (unique-id default `pos`, restart-and-wait for registry visibility), taking e2e to 14/14.
- **CI worker dependency install** rewritten to install shared core deps (`backend/core/{kernel,client,mdk,mdk-worker}`, `backend/workers/mock`, `backend/core/mock-control-service`) instead of the deleted `base/` packages.
- **Nomenclature** propagated through examples and CI: `proc/ork.js` → `kernel.js`, `proc/app-node.js` → `gateway.js`; `ui-core` → `ui-foundation` in CI and issue templates.
- **Information-architecture restructure** in docs: `how-to/` collapsed into `guides/` (deployment, gateway, miners); `docs/concepts/stack` files renamed; `terminology.md` → `reference/glossary.md`.
- All release-line `package.json` versions across `backend/core`, `backend/workers`, `ui/packages`, and `examples/` synced to `0.5.0`; independently-versioned newcomers (`@tetherto/mdk-worker`, the demo/sample workers, the mock, and two examples) keep their own `0.1.0`/`0.0.1` versions.

## Removed

- **microbt container workers** — the entire `backend/workers/containers/microbt/` tree, plus its catalogue/manifest/supported-hardware/mock-runner entries and the mdk constants/bootstrap references.
- **electricity power-meter worker** (`backend/workers/power-meter/electricity/`).
- All worker **`base/` packages** (`ThingManager`, device bases, family managers) after the runtime migration.
- Client **`ipc-client.js`**, Kernel **`IPCListener`**, and the Gateway IPC transport.
- The **`mdk-utils`** package (absorbed into `@tetherto/mdk`).
- Deleted docs: `docs/concepts/terminology.md`, `stack/ork.md`, `stack/app-node.md`, `docs/how-to/**` (moved to `guides/`), `backend/core/ork/README.md` + `docs/phase-bootstrap-api.md`, `backend/workers/docs/orchestrator.md`.

## Fixed

- **Containers list truncation / wrong total**: `getContainers` previously fetched only a tag-filtered page and re-filtered in memory (offset:0/limit:0), so user filters saw a truncated set and `total` was the page length; now uses a server-side query + global `getThingsCount`.
- **MQTT mock determinism** (`backend/workers/mock/transports/mqtt.transport.js`): `close()` now force-closes (`client.end(true)`) and runs an idempotent `_runCleanup()` directly rather than waiting on the `'end'` event (which may never fire when the broker is gone), preventing leaked publish intervals that held the event loop open.
- **bitdeer MQTT broker per worker** (`containers/bitdeer/plugin/boot.js`): the shared module-level `svc-facs-mqtt` aedes broker meant the first worker's `stop()` killed every later worker's broker; boot now creates its own `Aedes` broker + `net` server per worker and closes both in `stop()`. `svc-facs-mqtt` dropped; `aedes 1.0.2` and `mqtt 5.15.2` promoted to direct deps. (An earlier lazy-`require` fix so bare requires can exit was superseded by this.)
- **UI** — log the user out and redirect on session expiry (`@tetherto/mdk-ui-foundation`) (#180); abort in-flight requests on unmount; guard the power-adjustment insert against a missing PDU tab; carry device-action targeting fields through the voting payload; restore Op Centre factory exports dropped in a query-barrel refactor.
- **full-site** — seed effective under the Worker runtime; local-discovery watch and example setup corrections.
- **schneider** — corrected a "Terher" typo in the package author field.
- Numerous documentation link repairs (404s flagged by the markdown link checker), including the stale worker-guide anchor fixed in the 0.5.0 changeset.

### Tests

A large coverage push lifted each flagged backend package above the 80% per-package gate. Highlights (before → after, statements/branches/functions/lines):

| Package | Coverage | Added unit tests (selected) |
|---|---|---|
| bitdeer | 74% br → ~97% | D40 command handlers, `optimizeSocketCalls` PDU collapse, boot arg validation, alert templates |
| antminer | 76% → ~99% | device getters/setters (injected fake fetch), error maps, DHCP/static conf, power modes, pools; mock router; plugin handlers |
| whatsminer | 79% br → ~97% | write-action wrappers, AES-ECB token handshake + 135/136 retry paths, firmware header parsing, mock utils |
| f2pool | 77% br → ~95% | mock router validation/error + auth-hook 401s, `fetchStats` fallbacks + cached-month refresh + rate-limit path |
| abb | 52% fns → ~99% | B2X/M1M20/M4M20/REU615 `_readValues`/`_prepSnap` vs fake Modbus, per-channel telemetry incl. `?? 0` fallbacks, `ERR_MODEL_INVALID` |

Plus `@tetherto/mdk-client` typed request-wrapper tests, new Kernel suites (`kernel-manager`, `actions-stress`, key-file integration), and `@tetherto/mdk-react-devkit` branch-coverage additions.

> For previous releases, see the [changelog archive](./docs/reference/changelog-archive/2026-archive.md)
