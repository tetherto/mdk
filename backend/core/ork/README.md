# @tetherto/mdk-ork

## Overview

The **Orchestration Kernel** (ORK). ORK is the trusted coordination daemon at the center of the [MDK stack](../../../docs/concepts/architecture.md).
It discovers [workers](../../../docs/concepts/stack/workers.md) via Hyperswarm DHT, maintains a live registry of devices, dispatches commands, collects
telemetry on a schedule, and monitors worker health.

ORK does **not** extend any worker base class. It is a standalone `EventEmitter`-based lib — the same pattern as
`ThingManager` and `MinerManager` used by [device workers](../../../docs/concepts/stack/workers.md).

> [!TIP]
> New to ORK? Read the [ORK concept page](../../../docs/concepts/stack/ork.md) for the developer model: what ORK owns, the pull-only model, transports, 
> and what it deliberately does not handle.
> For deployment shapes and the active/passive connection model, see [deployment topologies](../../../docs/concepts/deployment-topologies.md).

## Prerequisites

- Node.js >= 24

## Install

```bash
npm install @tetherto/mdk-ork
```

## Quick Start

```js
const { createORK } = require('@tetherto/mdk-ork')

const ork = createORK({
  db: './data/ork-db',
  root: './data',
  gateways: { ipc: { path: '/tmp/ork.sock' } },
  discovery: { topic: '<32-byte hex topic>' }
})

await ork.init()
await ork.start()

// ork.registry, ork.dispatcher, ork.telemetry, etc. are now live

await ork.stop()
```

For a higher-level wrapper that also handles SIGINT and topic file management, use `getOrk()` from `@tetherto/mdk`.

## API

### `createORK(opts)` → `OrkManager`

Factory that returns a configured, unstarted `OrkManager`. Caller controls the lifecycle.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `opts.db` | `string` | `os.tmpdir()/mdk/...` | Hyperbee store directory |
| `opts.root` | `string` | `os.tmpdir()/mdk` | Config root directory |
| `opts.gateways.hrpc` | `object\|false` | enabled | HRPC gateway config; `false` to disable |
| `opts.gateways.ipc` | `object` | — | IPC Unix socket config; `{ path }` |
| `opts.auth.whitelist` | `string[]` | `[]` | HRPC firewall — hex public keys of allowed callers |
| `opts.discovery.topic` | `string` | — | 32-byte hex DHT topic workers join |
| `opts.cadences.telemetryPullMs` | `number` | 10000 | Telemetry poll interval |
| `opts.cadences.healthPingMs` | `number` | 5000 | Health ping interval |
| `opts.cadences.statePullMs` | `number` | 60000 | State pull interval |

### `OrkManager`

Returned by `createORK()` or `new OrkManager(conf, ctx)`.

```js
await ork.init()    // Creates facilities, stores, modules
await ork.start()   // Starts transports, discovery, scheduler, health monitor
await ork.stop()    // Graceful shutdown

ork.getPublicKey()  // Buffer — HRPC public key (share with workers for whitelisting)
```

**Events:**
- `'started'` — emitted after `start()` completes
- `'stopped'` — emitted after `stop()` completes

**Module access:**
```js
ork.registry      // WorkerRegistry
ork.dispatcher    // CommandDispatcher
ork.csm           // CommandStateMachine
ork.telemetry     // TelemetryCollector
ork.health        // HealthMonitor
```

## Architecture

ORK is decomposed into six single-responsibility modules. Modules communicate only through their declared interfaces — no cross-calling.

### WorkerRegistry

Maps `deviceId → workerId → RPC channel`. Source of truth for routability.

**State machine:**
```
Unregistered → Discovered → IdentitySaved → Ready → Terminated
```

Workers progress through this lifecycle automatically as ORK pulls their identity and capabilities over DHT.

### CommandDispatcher

Validates incoming command envelopes, resolves the owning worker from the registry, checks that the command exists in the worker's declared 
capabilities, then enqueues via the state machine.

### CommandStateMachine

Tracks every command's full execution lifecycle. Backed by a Write-Ahead Log (WAL) in Hyperbee — every state transition is written to WAL before it 
takes effect. On restart, `recover()` sweeps non-terminal states and retries or fails them.

**State machine:**
```
QUEUED → DISPATCHED → EXECUTING → SUCCESS
                              └→ FAILED
                              └→ TIMEOUT → QUEUED (retry) or FAILED (max retries)
```

### TelemetryCollector

Stateless proxy. Routes `telemetry.pull` queries to the appropriate worker and passes the response back to the caller. Workers own
all aggregation and storage — ORK is a thin router.

**Supported query types:** `metrics`, `list`, `count`, `logs`, `logs_multi`, `historical_logs`, `settings`, `config`, 
`thing_config`, `stats`, `ext_data`

### Scheduler

System metronome. Runs non-overlapping interval jobs for telemetry pulls, health pings, and state pulls. Jobs are idempotent 
— safe to restart with no state.

### HealthMonitor

Ping-based liveness checker. Sends `health.ping` to every registered worker on a configurable cadence and updates the registry with the result.

**State machine per worker:**
```
UNKNOWN → HEALTHY → SICK → DEAD
                ↑___________|  (reconnect)
```

## Transports

### HRPC (Hyperswarm RPC)

Production transport. Uses encrypted Noise protocol connections over the Hyperswarm DHT. Callers must be whitelisted by hex public key.

```js
createORK({
  auth: { whitelist: ['<app-node-pubkey-hex>'] }
})
```

### IPC (Unix Socket)

Local transport for development and same-host App Node deployments. Implicit trust — any local process that can reach the socket path is trusted.

```js
createORK({
  gateways: { ipc: { path: '/run/mdk/ork.sock' } }
})
```

## MDK Protocol

All messages use the envelope format:

```json
{
  "id":        "uuid-v4",
  "version":   "0.1.0",
  "type":      "request | response | event",
  "action":    "<action constant>",
  "sender":    "app-node",
  "target":    null,
  "deviceId":  "wm-001",
  "timestamp": 1711640000000,
  "payload":   {}
}
```

**Action constants** (from `lib/protocol/actions.js`):

| Constant | Wire value | Direction |
|----------|-----------|-----------|
| `IDENTITY_REQUEST` | `identity.request` | ORK → Worker |
| `CAPABILITY_REQUEST` | `capability.request` | ORK → Worker |
| `TELEMETRY_PULL` | `telemetry.pull` | ORK → Worker (scheduled) |
| `STATE_PULL` | `state.pull` | ORK → Worker (scheduled) |
| `COMMAND_REQUEST` | `command.request` | ORK → Worker |
| `HEALTH_PING` | `health.ping` | ORK → Worker (scheduled) |
| `WORKER_LIST` | `worker.list` | App Node → ORK |
| `DEVICE_CAPABILITIES` | `device.capabilities` | App Node → ORK |
| `WORKER_TERMINATE` | `worker.terminate` | App Node → ORK |

## Storage

All state is persisted in Hyperbee (append-only B-tree over Hypercore):

| Store | Purpose |
|-------|---------|
| `ork-registry` | Worker identities and state |
| `ork-capabilities` | Device → contract mappings |
| `ork-command-wal` | Command WAL for crash recovery |

## Testing

```bash
npm test                                    # lint + unit + integration
npx brittle tests/unit/registry.test.js     # single test file
npx brittle tests/integration/csm.test.js   # integration test
```

Tests use real Corestore + `tmpdir` — no mocks for storage.

## Directory Layout

```
ork/
├── index.js                  # Exports: OrkManager, createORK
├── lib/
│   ├── ork.manager.js        # OrkManager (EventEmitter) — lifecycle orchestration
│   ├── protocol/
│   │   ├── actions.js        # ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION
│   │   └── envelope.js       # build(), buildResponse(), serialize(), deserialize()
│   ├── modules/
│   │   ├── worker-registry/  # WorkerRegistry + states
│   │   ├── command-dispatcher/
│   │   ├── command-state-machine/  # CSM + WAL + recovery
│   │   ├── telemetry-collector/
│   │   ├── scheduler/
│   │   └── health-monitor/
│   ├── transport/
│   │   ├── hrpc-gateway.js   # Hyperswarm RPC server
│   │   └── ipc-gateway.js    # Unix socket server
│   ├── discovery/
│   │   └── dht-listener.js   # Hyperswarm DHT presence detection
│   └── storage/
│       ├── wal.js            # Write-Ahead Log
│       └── registry-store.js # Persisted registry store
└── tests/
    ├── unit/                 # 50+ unit tests
    └── integration/          # 20+ integration tests (real Hyperbee)
```

## Next steps

- [Start ORK and wire it to the App Node](../../../docs/how-to/app-node/run.md)
- Understand ORK's [pull-only model](../../../docs/concepts/stack/ork.md)
- Learn how [Workers discover ORK, register devices, and expose capabilities](../../../docs/concepts/stack/workers.md)
- Choose a [deployment shape](../../../docs/concepts/deployment-topologies.md)
- See the [full MDK layer model](../../../docs/concepts/architecture.md)
