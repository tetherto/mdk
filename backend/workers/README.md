# backend/workers

Device protocol adapters for MDK. Each worker wraps a specific hardware vendor's API and exposes it through the MDK Protocol, allowing ORK to discover, query, and command it without knowing anything about the underlying hardware protocol.

## Worker Categories

| Directory | Description |
|-----------|-------------|
| [`base/`](./base/README.md) | `@tetherto/tpl-lib-thing` — `ThingManager` base class, 11 services, `MDKWorkerAdapter` |
| [`miners/`](./miners/README.md) | Bitcoin ASIC miners — Whatsminer, Antminer, Avalon |
| [`containers/`](./containers/README.md) | Mining container orchestration — Antspace, MicroBT, Bitdeer |
| [`minerpools/`](./minerpools/README.md) | Pool API integrations — Ocean, F2Pool |
| [`power-meter/`](./power-meter/README.md) | Power metering — ABB, SATEC, Schneider, electricity providers |
| [`temperature/`](./temperature/README.md) | Temperature/humidity sensors — Seneca |

## How Workers Fit into MDK

```
ORK Kernel
  │
  │  Hyperswarm HRPC (MDK Protocol envelopes)
  ▼
MDKWorkerAdapter  ──┐
                    │ wraps
ThingManager  ──────┘
  │
  │  Vendor protocol (TCP, HTTP, Modbus, Serial, …)
  ▼
Physical Hardware
```

Workers never initiate communication to ORK. They join a known Hyperswarm DHT topic and ORK discovers them. All RPC is initiated by ORK downward.

## Worker Architecture

Every worker follows the same pattern:

### 1. Manager Class (extends ThingManager)

The manager owns the business logic for a specific device type. It manages connections to physical hardware, collects telemetry, stores data in Hyperbee, and executes commands.

```
ThingManager (EventEmitter)   ← backend/workers/base/
  └── MinerManager            ← backend/workers/miners/base/
        └── WhatsminerManager ← backend/workers/miners/whatsminer/
              └── WM_M56S     ← specific model class
```

### 2. MDKWorkerAdapter

The adapter bridges the manager to the MDK Protocol. It:
- Starts a Hyperswarm RPC server
- Joins the DHT topic so ORK can discover it
- Routes incoming MDK Protocol actions to the manager's methods
- Persists the DHT/RPC keypair in Hyperbee (stable identity across restarts)

### 3. mdk-contract.json

Each worker package ships an `mdk-contract.json` that declares its full capabilities:
- **metadata** — provider, device family, brand, supported models
- **devices** — list of managed device instances
- **capabilities.telemetry** — metric fields with types, units, and descriptions
- **capabilities.commands** — available commands with parameters, constraints, and AI workflow examples
- **capabilities.health** — supported states, alert types, troubleshooting rules
- **capabilities.errors** — error code → description mapping

ORK fetches this contract once via `capability.request` and caches it. The App Node and AI agents use it to derive available operations dynamically.

### 4. 11 Services

`ThingManager` includes eleven services that every worker inherits:

| Service | Responsibility |
|---------|----------------|
| `ConnectionService` | Hardware TCP/HTTP connections |
| `DataService` | Device registration and state (`registerThing`, `updateThing`) |
| `ListingService` | Device list/filter queries |
| `LogsService` | Hyperbee-backed structured log writes |
| `LogHistoryService` | Historical log queries |
| `StatsService` | Aggregated time-bucketed statistics |
| `SnapsService` | Telemetry snapshots (live metrics collection) |
| `CommentsService` | Device annotation (add, edit, delete comments) |
| `AlertsService` | Threshold-based alert rules |
| `SettingsService` | Worker configuration persistence |
| `ActionsService` | Hardware command execution |

## Starting a Worker

Workers are started through `startWorker()` from `@tetherto/mdk`:

```js
const { startWorker } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')

const { manager, adapter } = await startWorker(WM_M56S, {
  ork,                    // OrkManager from getOrk()
  rack: 'rack-1'
})

// Register devices after start
await manager.registerThing({
  info: { serialNum: 'WM-001' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})
```

## Implementing a New Worker

1. Check `backend/workers/base/` to understand `ThingManager` internals
2. Look at an existing worker of the same family as a template (e.g. `miners/whatsminer/` for a new miner)
3. Author `mdk-contract.json` following the schema in `docs/mdk-contract.schema.json`
4. Implement the hardware translation layer
5. The worker instance boots, connects to devices, and joins the DHT topic — ORK handles the rest

## Testing

Each worker package has its own `mock/server.js` that simulates the hardware API. Run tests from the package root:

```bash
cd backend/workers/miners/whatsminer && npm test
cd backend/workers/miners/antminer && npm test
```
