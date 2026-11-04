---
title: Workers
description: Device protocol adapters that wrap APIs and expose them through the MDK Protocol
docs@tether_slug: reference/worker
todo: Ported to user docs as reference, breaks Diátaxis
---

# Workers

Workers are device protocol adapters for MDK. Each Worker wraps a specific API, such as a hardware vendor's API, and exposes it through the
MDK Protocol, allowing Kernel to discover, query, and command it without knowing anything about the underlying hardware or business
logic.

## Worker categories

Workers are organized by categories, for example:

| Directory                          | Description                                        |
|------------------------------------|----------------------------------------------------|
| [`miners/`][miners-readme]         | Bitcoin ASIC miners — Avalon                       |
| [`containers/`][containers-readme] | Mining container orchestration — Antspace, Bitdeer |
| [`minerpools/`][minerpools-readme] | Pool API integrations — F2Pool                     |
| [`power-meter/`][power-meter-readme] | Power metering — ABB, SATEC, Schneider           |
| [`temperature/`][temperature-readme] | Temperature/humidity sensors — Seneca            |

## How Workers fit into MDK

```text
Kernel
  │
  │  Hyperswarm HRPC (MDK Protocol envelopes)
  ▼
`WorkerRuntime`  ──┐
                 │ hosts
Worker Plugin  ────┘
  │
  │  Vendor protocol (TCP, HTTP, Modbus, Serial, …)
  ▼
Physical Hardware
```

Workers never initiate communication to Kernel. Kernel obtains each Worker's RPC public key through [DHT, local-directory,
or same-process discovery][discovery-model], then initiates all MDK Protocol calls to the Worker over HRPC.

## Worker architecture

Each Worker has:

- **A [Worker Plugin](#1-worker-plugin)**, e.g. [`avalon/plugin/index.js`][avalon-plugin-index]. A plain object
`{ contract, dir, connect, disconnect? }` — no base class, no subclassing
- **A [`WorkerRuntime`](#2-workerruntime)**, the shared runtime that hosts the plugin's devices and exposes them through the MDK Protocol over HRPC
- **A [`mdk-contract.json`](#3-mdk-contractjson)**, e.g. the [Avalon contract][avalon-contract], the engineering
source of truth. Declares every telemetry field
(name, unit, type) and every command (name, params)
- **A [mock server][mdk-e2e-server]**, a local HTTP server with canned responses for hardware-free development

### 1. Worker plugin

The plugin is the object `WorkerRuntime` is constructed with — the contract, the plugin's own directory, and a
`connect` function that turns one device's config into the `device` object every handler sees. There is no
base class and no subclassing; a plugin package can be built and tested with zero dependency on `WorkerRuntime`.
Every telemetry/command handler is invoked as `(ctx, params)`, where `ctx = { deviceId, device, config, services }`.

```text
miners/avalon/
  plugin/
    index.js               # the Worker Plugin: { contract, dir, connect, disconnect }
    mdk-contract.json
    boot.js                # startAvalonWorker(opts) — constructs WorkerRuntime
  lib/avalon.miner.js       # the device driver plugin.connect() returns
```

### 2. `WorkerRuntime`

[`WorkerRuntime`][mdk-worker-runtime] hosts every device behind one HRPC channel to Kernel. It:
- Starts a Hyperswarm RPC server and responds to every MDK Protocol action
- Provides the RPC public key (`getPublicKey()`) that the host process registers or publishes according to the selected discovery mode
- Dispatches incoming MDK Protocol actions to the plugin's per-device handlers, wrapping results into the protocol envelope itself
- Persists the DHT/RPC keypair in a process-owned store when one is supplied (stable identity across restarts)

### 3. mdk-contract.json

Each Worker package ships an [`mdk-contract.json`][contract-schema] that declares its full capabilities:
- **metadata** — provider, device family, brand, supported models
- **capabilities.telemetry** — metric fields with types, units, and descriptions
- **capabilities.commands** — available commands with parameters, constraints, and AI workflow examples
- **capabilities.health** — supported states, alert types, troubleshooting rules
- **capabilities.errors** — error code → description mapping

The contract is the source of truth for a Worker's programmatic capabilities **and** its AI context. MDK deliberately merges formal validation
and semantic guidance into one file rather than splitting them across a schema and a prose document that drift apart. Three fields carry that
double load:

- `description` is both the human-readable UI label and the rule an AI agent reasons about, so it states edge cases rather than just naming the
field — *"Outlet temperature > 85C requires intervention"*, not *"Outlet temperature"*
- `constraints` governs orchestration limits, publishing the bounds a caller is expected to respect
- `troubleshooting` pairs if/then recovery behaviours with the payload they evaluate

Kernel fetches this contract once via `capability.request` and caches it, and validates commands against it. A plugin can query the same
capabilities to derive available operations dynamically. (Agent MCP tools are not derived from the contract — they come from a plugin's
`mcp-plugin.json` or an app's `mdk-plugin.json`.)

## Start a Worker

Each Worker package ships its own boot function that constructs `WorkerRuntime` internally — there is no single
generic `startWorker()` entry point:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()

const worker = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './store/avalon-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { serialNum: 'AV-001' },
    opts: { address: '192.168.1.10', port: 4028, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

`allowedKeys` lists the RPC callers the Worker accepts. The Worker refuses to start without it
(`ERR_WORKER_ALLOWED_KEYS_REQUIRED`), so pass the Kernel's client key.

`seedDevices` only seeds a fresh, empty `storeDir`; add a device to an already-running Worker with the
`registerThing` command instead (see each package's own `USAGE.md`, e.g. [`miners/avalon/USAGE.md`][avalon-usage]).

> [!CAUTION]
> `registerThing`, `ctx.services` and the `createWorkerInfra` wiring in each in-repo `boot.js` are the deprecated
> [store services surface][worker-runtime-store]. They keep working for the in-repo Workers; a new Worker on
> [`WorkerRuntimeV2`][worker-runtime-v2] doesn't use them.

The `registerWorker()` call above is the same-process shape. Separate processes on one machine, or Workers on other
hosts, publish the key to a shared directory or join a DHT topic instead: the [discovery model][discovery-model]
compares the three, and [Test a new Worker][test-a-worker] has a runnable host script for each.

## Implement a new Worker

1. Read the [full build walkthrough][build-a-worker] — it covers the current model: a package directory of
   [`mdk-contract.json`][contract-schema] + handler files hosted by [`WorkerRuntimeV2`][worker-runtime-v2].
2. Scaffold the package directory with `mdk create worker`.
3. Author `mdk-contract.json` following [`mdk-contract.schema.json`][contract-schema].
4. The Worker instance boots, connects to devices, and publishes or registers its RPC public key through the selected discovery mode — Kernel handles the rest.

> [!WARNING]
> The miner Workers in [Worker architecture](#worker-architecture) (Avalon) are v1 examples, not
> recommended templates for a new plugin; they still construct `WorkerRuntime` v1 directly via the
> `{ contract, dir, connect, disconnect? }` shape, which remains supported. `WorkerRuntimeV2` is the model for new hardware.

## Testing

> [!NOTE]
> Needs npm 11 [(< 12)][npm-version]; `npm install` from the repo root installs every package.

Each Worker package has its own `mock/server.js` that simulates the hardware API. Run tests from the package root:

```bash
cd backend/workers/miners/avalon && npm test
```

## Run mock devices

Boot one or more device mocks locally — no hardware — with the Workers-level runner. Entries are
**comma-delimited**; the first token of each entry is the device **type** (case-insensitive) — or,
for a type-less device such as `f2pool`, its name. Flags are **dash-free** so npm forwards
them with no `--`: a bare number is the port, and `key=value` sets any other flag:

```bash
npm run mock a1346, f2pool
npm run mock b23 4009 host=127.0.0.1 mockControlPort=5009, pm180 4008
```

Run `npm run mock` with no arguments to list every device and its types. A single Worker package can
also run just its own mock on its default port, e.g. `cd miners/avalon && npm run mock a1346`.

## Next steps

- Build a [minimal dashboard on top of a Worker][minimal-dashboard]
- Understand the [install pattern any Worker follows][install-pattern]
- Build a full [Worker for new hardware][build-a-worker]

## Links

[miners-readme]: ./miners/README.md
<!-- docs@tether.io: miners-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/README.md -->

[containers-readme]: ./containers/README.md
<!-- docs@tether.io: containers-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/containers/README.md -->

[minerpools-readme]: ./minerpools/README.md
<!-- docs@tether.io: minerpools-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/minerpools/README.md -->

[power-meter-readme]: ./power-meter/README.md
<!-- docs@tether.io: power-meter-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/power-meter/README.md -->

[temperature-readme]: ./temperature/README.md
<!-- docs@tether.io: temperature-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/temperature/README.md -->

[minimal-dashboard]: ../../docs/tutorials/build-a-dashboard.md
<!-- docs@tether.io: minimal-dashboard → tutorials/build-a-dashboard -->

[install-pattern]: docs/install-pattern.md
<!-- docs@tether.io: install-pattern → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[build-a-worker]: ../../docs/guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[test-a-worker]: ../../docs/guides/workers/test-a-worker.md
<!-- docs@tether.io: test-a-worker → guides/workers/test-a-worker -->

[avalon-plugin-index]: ./miners/avalon/plugin/index.js
<!-- docs@tether.io: avalon-plugin-index → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/plugin/index.js -->

[avalon-contract]: ./miners/avalon/plugin/mdk-contract.json
<!-- docs@tether.io: avalon-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/plugin/mdk-contract.json -->

[mdk-e2e-server]: ./miners/avalon/mock/server.js
<!-- docs@tether.io: mdk-e2e-server → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/mock/server.js -->

[worker-runtime-v2]: ../core/mdk-worker/lib/worker-runtime-v2.js
<!-- docs@tether.io: worker-runtime-v2 → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime-v2.js -->


[worker-runtime-store]: ../core/mdk-worker/README.md#store-services
<!-- docs@tether.io: worker-runtime-store → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#store-services -->

[mdk-worker-runtime]: ../core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: mdk-worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[contract-schema]: ../core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[discovery-model]: docs/architecture.md#discovery-model
<!-- docs@tether.io: discovery-model → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[avalon-usage]: ./miners/avalon/USAGE.md
<!-- docs@tether.io: avalon-usage → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/avalon/USAGE.md -->

[npm-version]: ../../docs/reference/environment.md#why-npm-stays-below-12
<!-- docs@tether.io: npm-version → reference/environment -->