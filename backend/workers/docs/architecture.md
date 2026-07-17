# Workers architecture

A **Worker** is a device protocol adapter: it talks vendor-native I/O (TCP, HTTP, Modbus, …) on one side and the MDK Protocol on the other. Kernel discovers Workers over Hyperswarm and never talks to hardware directly.

Workers do not initiate RPC to Kernel. They join a DHT topic; Kernel finds them and drives all downward requests.

## Directory layout

```
backend/workers/
├── miners/          # ASIC miners — whatsminer, antminer, avalon
├── containers/      # Enclosure / cooling control — antspace, bitdeer
├── minerpools/      # Pool APIs — ocean, f2pool
├── power-meter/     # Metering — abb, satec, schneider
├── temperature/     # Sensors — seneca
├── samples/         # Reference / demo Workers — demo-worker (third-party plugin-authoring demo)
├── mock/            # Shared mock transport helpers
├── docs/            # This tree — architecture, install, contract guides
└── scripts/         # Cross-package install / mock / catalogue utilities
```

Each family directory holds one package per vendor. Related docs: [supported-hardware.md](./supported-hardware.md), [catalogue.json](./catalogue.json), [workers-manifest.yaml](./workers-manifest.yaml).

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

## Runtime workflow

```
boot.js
  │  createWorkerInfra (store, provisioning, logs/stats/alerts/…)
  ▼
WorkerRuntime(plugin, { workerId, devices, services, … })
  │  connect() each device → device contexts
  │  Hyperswarm RPC server + DHT announce
  ▼
Kernel discovers Worker → capability.request → caches mdk-contract
  │
  │  telemetry / command envelopes (HRPC)
  ▼
handler(ctx) → vendor API → response envelope
```

1. **Boot** — `plugin/boot.js` (or env-driven `worker.js` via `WORKER` / `TYPE` / `RACK`) builds infra and starts the runtime.
2. **Connect** — for each provisioned device, `plugin.connect` returns a vendor client. Failures mark that device offline; siblings keep running.
3. **Announce** — runtime joins the Kernel topic with a stable identity from the store.
4. **Serve** — Kernel requests hit contract handlers or infra built-ins (`registerThing`, logs, comments, …). Device-set changes go through provisioning and typically require a Worker restart.

## How it fits MDK

```
Kernel ──HRPC──► WorkerRuntime ──plugin handlers──► vendor client ──► hardware
                     ▲
                     └── services (store, alerts, stats, provisioning)
```

To add a Worker, mirror an existing package in the same family (or follow [build-a-worker.md](../../../docs/guides/workers/build-a-worker.md) for an out-of-repo plugin). Run notes and mocks: [install-pattern.md](./install-pattern.md), [../README.md](../README.md).
