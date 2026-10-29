# Workers architecture

A **Worker** is a device protocol adapter: it talks vendor-native I/O (TCP, HTTP, Modbus, …) on one side and the MDK Protocol on the other. Kernel discovers Workers over Hyperswarm and never talks to hardware directly.

Workers do not initiate RPC to Kernel. Kernel obtains each Worker's RPC public key through one of three [discovery modes](#discovery-model), then drives all downward requests.

## Directory layout

```
backend/workers/
├── miners/          # ASIC miners — avalon
├── containers/      # Enclosure / cooling control — antspace, bitdeer
├── minerpools/      # Pool APIs — f2pool
├── power-meter/     # Metering — abb, satec, schneider
├── temperature/     # Sensors — seneca
├── mock/            # Shared mock transport helpers
├── docs/            # This tree — architecture, install, contract guides
└── scripts/         # Cross-package install / mock / catalogue utilities
```

Each family directory holds one package per vendor. Related docs: [supported-workers.md](./supported-workers.md), [catalogue.json](./catalogue.json), [workers-manifest.yaml](./workers-manifest.yaml).

## Package shape

Every Worker package follows the same layout:

```
<family>/<provider>/
├── index.js                 # exports { plugin, start*Worker, device client }
├── lib/                     # vendor protocol client + templates
├── plugin/
│   ├── index.js             # { contract, dir, connect, disconnect? }
│   ├── boot.js              # createWorkerInfra → WorkerRuntime
│   ├── mdk-contract.json    # telemetry, commands, health, errors
│   └── src/
│       ├── telemetry/*.js   # one handler per metric field
│       └── commands/*.js    # one handler per write action
├── mock/                    # fake device API for local / CI testing
└── tests/
```

The plugin is data + functions — never subclassed. `WorkerRuntime` (`@tetherto/mdk-worker`) loads it, connects each device via `connect(config)`, and routes Kernel actions to the matching handler with `{ deviceId, device, config, services }`.

> [!CAUTION]
> `createWorkerInfra` in `boot.js`, the injected `services` and their built-ins (`registerThing`, logs, comments, …) are the deprecated
> [store services surface](../../core/mdk-worker/README.md#store-services). The in-repo Workers keep running on it. A new Worker is a
> [directory-loaded package on `WorkerRuntimeV2`](../../../docs/guides/workers/build-a-worker.md) instead.

## Runtime workflow

```
boot.js
  │  createWorkerInfra (store, provisioning, logs/stats/alerts/…)
  ▼
WorkerRuntime(plugin, { workerId, devices, services, … })
  │  connect() each device → device contexts
  │  Hyperswarm RPC server + discovery announce
  ▼
Kernel discovers Worker → capability.request → caches mdk-contract
  │
  │  telemetry / command envelopes (HRPC)
  ▼
handler(ctx) → vendor API → response envelope
```

1. **Boot** — `plugin/boot.js` (or env-driven [`worker.js`](../../core/mdk/worker.js) via `WORKER` / `TYPE` / `RACK`) builds infra and starts the runtime.
2. **Connect** — for each provisioned device, `plugin.connect` returns a vendor client. Failures mark that device offline; siblings keep running.
3. **Announce** — the runtime makes its RPC key reachable with a stable identity from the store: joining the Kernel topic in DHT mode, or handing the key over directly in the other two [discovery modes](#discovery-model).
4. **Serve** — Kernel requests hit contract handlers or infra built-ins (`registerThing`, logs, comments, …). Device-set changes go through provisioning and typically require a Worker restart.

## Discovery model

How the Kernel obtains a Worker's RPC public key is determined by the [deployment topology](../../../docs/concepts/deployment-topologies.md). Once a Worker is connected, each runs the same identity → capability → Ready sequence, then carries the same MDK Protocol envelopes (`command.request`, `telemetry.pull`, …) over the same Hyperswarm RPC transport. Only **how** Kernel first learns the key differs, the transport itself never changes: HRPC runs its own HyperDHT node in every mode, and that node needs outbound UDP to its bootstrap nodes (public by default vs. pass a private DHT network to every component, as in the [local and air-gapped profile](../../../docs/guides/deployment/private-dht.md)).

Each Worker package ships its own boot function that constructs the runtime internally — there is no generic `startWorker(WorkerClass, opts)` entry point, and a v2 package loaded from a directory has no boot function at all. [`deployment-topologies.md`](../../../docs/concepts/deployment-topologies.md) has the diagrams and trade-offs; [`test-a-worker.md`](../../../docs/guides/workers/test-a-worker.md) has a runnable host script for each mode.

### Single-process mode

Kernel and the Worker share a process, so the host registers the runtime's public key directly against the live Kernel instance with `kernel.registerWorker()`. No discovery listener is involved and the Worker reaches `READY` synchronously — `waitForDiscovery()` is not required. `getKernel()` still defaults to `mode: 'dht'` and auto-generates a topic when given none, so pass `discovery: { mode: 'local' }` if Kernel should also skip joining a Hyperswarm topic in the background.

Registering does not couple the Worker's shutdown to Kernel's. The host process that constructed the runtime owns its lifecycle in every mode; push the Worker's `stop()` onto Kernel's `_cleanup` queue if Kernel shutdown should cascade to it.

### Local mode

Kernel and Workers coordinate through a shared directory on one machine — default `<root>/.worker-keys`, resolved the same way on both sides so the two processes agree with no config. No Hyperswarm topic is joined.

Each Worker writes its RPC key there with `publishWorkerKey()`; Kernel watches the directory with `fs.watch` and rescans it every four seconds ([`local-discovery.js`](../../core/mdk/lib/local-discovery.js)). Every key found is offered to the normal discovery listener, which dedupes peers it already knows and drops a key when the connect fails — so the rescan doubles as the retry for a Worker whose RPC server was not yet listening, and as re-discovery after a Kernel restart. Keys persist and are re-read on startup, so Kernel and Workers can start in any order.

A published key is only stable across restarts when the runtime was given a `storeDir` (or `store`) to persist its seeds in. Without one it generates a fresh keypair on every start, and each restart looks like a brand new peer to Kernel.

Every process has to resolve the same filesystem path, which confines this mode to one machine. Workers on separate hosts need microservices mode.

### Microservices mode

Also called DHT mode, and the only mode that spans hosts or networks: Kernel and Worker join the same Hyperswarm topic. Generate a random 32-byte hex topic in whichever process starts first, persist it where the other can read it, and pass the same value to both sides.

Either process may start first. A Worker re-announces on the topic every 30 seconds ([`worker-runtime.js`](../../core/mdk-worker/lib/worker-runtime.js)), so a Kernel that joins later — or after an earlier announce expired — still finds it, though not necessarily straight away. A topic is a rendezvous address, not an authentication secret or a command-authorization token. Kernel registers only the Worker RPC keys it was given (`discovery.workerKeys`, or `kernel.allowWorkerKey()` at runtime); an empty list admits nobody unless `discovery.allowAnyWorker: true` is set for local development.

## How it fits MDK

```
Kernel ──HRPC──► WorkerRuntime ──plugin handlers──► vendor client ──► hardware
                     ▲
                     └── services (store, alerts, stats, provisioning)
```

To add a Worker, mirror an existing package in the same family (or follow [build-a-worker.md](../../../docs/guides/workers/build-a-worker.md) for an out-of-repo plugin). Run notes and mocks: [install-pattern.md](./install-pattern.md), [../README.md](../README.md).
