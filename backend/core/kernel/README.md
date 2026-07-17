# @tetherto/mdk-kernel

## Overview

**Kernel** is the orchestrator, the trusted coordination daemon at the center of the [MDK stack](../../../docs/concepts/architecture.md).
It discovers and registers [Workers](../../../docs/concepts/stack/workers.md), maintains a live registry of devices, dispatches commands, collects
telemetry on a schedule, and monitors Worker health. The [Workers discovery model](../../../docs/concepts/stack/workers.md#discovery-model)
covers local, same-process, and DHT modes. 

The Kernel discovers and registers Workers, dispatches commands through a crash-recoverable state machine, and pulls telemetry on a fixed schedule. 
The Kernel is **pull-only and passive** — it never pushes to your app. Callers connect over HRPC using the Kernel's public key 
(published to `<tmpdir>/mdk/.kernel-key` on start). For telemetry, the scheduler fans `telemetry.pull` out to ready Workers; on-demand queries route 
to the owning Worker for a specific device.

Kernel does **not** extend any Worker class. It is a standalone `EventEmitter`-based lib — the same pattern as
`ThingManager` and `MinerManager` used by [device Workers](../../../docs/concepts/stack/workers.md).

> [!TIP]
> New to Kernel? Read the [Kernel concept page](../../../docs/concepts/stack/kernel.md) for the developer model: what Kernel owns, the pull-only 
> model, transports, and what it deliberately does not handle.
> For deployment shapes and the active/passive connection model, see [deployment topologies](../../../docs/concepts/deployment-topologies.md).
> Most apps start Kernel via [`getKernel()`](../mdk/README.md) — the `@tetherto/mdk` bootstrap API — rather than calling `createKernel()` directly.

## Prerequisites

- Node.js >= 24

## Install

```bash
npm install @tetherto/mdk-kernel
```

## Quick start

```js
const { createKernel } = require('@tetherto/mdk-kernel')

const kernel = createKernel({
  db: './data/kernel-db',
  root: './data',
  discovery: { topic: '<32-byte hex topic>' }
})

await kernel.init()
await kernel.start()

// kernel.registry, kernel.dispatcher, kernel.telemetry, etc. are now live
// kernel.getPublicKey() is the HRPC key clients connect with

await kernel.stop()
```

For a higher-level wrapper that also handles SIGINT, topic file management, and publishing the HRPC key to a well-known key file, 
use `getKernel()` from `@tetherto/mdk`.

## API

### `createKernel(opts)` → `KernelManager`

Factory that returns a configured, unstarted `KernelManager`. Caller controls the lifecycle.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `opts.db` | `string` | `os.tmpdir()/mdk/...` | Hyperbee store directory |
| `opts.root` | `string` | `os.tmpdir()/mdk` | Config root directory |
| `opts.listeners.hrpc` | `object\|false` | enabled | HRPC listener config; `false` to disable |
| `opts.auth.whitelist` | `string[]` | `[]` | HRPC firewall — hex public keys of allowed callers |
| `opts.discovery.topic` | `string` | — | 32-byte hex DHT topic Workers join |
| `opts.cadences.telemetryPullMs` | `number` | 10000 | Telemetry poll interval |
| `opts.cadences.healthPingMs` | `number` | 5000 | Health ping interval |
| `opts.cadences.statePullMs` | `number` | 5000 | DHT Worker identity and device-list refresh interval |

### `KernelManager`

Returned by `createKernel()` or `new KernelManager(conf, ctx)`.

```js
await kernel.init()    // Creates facilities, stores, modules
await kernel.start()   // Starts transports, discovery, scheduler, health monitor
await kernel.stop()    // Graceful shutdown

kernel.getPublicKey()  // Buffer — HRPC public key (clients connect with it; share with Workers for allowlisting)
```

Each running Kernel needs its own Hyperbee store directory. Two Kernel instances that use the same `opts.db` path contend for the same files and fail on file locks. The default development root is `os.tmpdir()/mdk`; production deployments should use an explicit, instance-specific path.

`createKernel()` leaves `init()`, `start()`, and `stop()` to the caller. The higher-level `getKernel()` API from `@tetherto/mdk` initializes and starts Kernel, publishes its HRPC key, and registers signal-driven cleanup.

**Events:**
- `'started'` — emitted after `start()` completes
- `'stopped'` — emitted after `stop()` completes

**Module access:**

```js
kernel.registry      // WorkerRegistry
kernel.dispatcher    // CommandDispatcher
kernel.stateMachine       // CommandStateMachine
kernel.telemetryCollector // TelemetryCollector
kernel.scheduler          // Scheduler
kernel.healthMonitor      // HealthMonitor
kernel.actionCaller       // ActionCaller
kernel.actionManager      // ActionManager (write-action approval)
```

## Architecture

Kernel is organized into subsystems. Discovery, transport, storage, and protocol are the plumbing; coordination is the set
of single-responsibility modules that do the work. Modules communicate only through their declared interfaces — no cross-calling.

| Subsystem| Modules / code | What it does |
|---|---|---|
| Discovery | [`discovery/dht-listener.js`](lib/discovery/dht-listener.js); local and same-process modes live in [`@tetherto/mdk`](../mdk/lib/local-discovery.js) | Obtains a Worker's RPC public key, then `WorkerRegistry` drives it to `READY` |
| Transport | [`transport/hrpc-listener.js`](lib/transport/hrpc-listener.js), [`transport/envelope-router.js`](lib/transport/envelope-router.js), [`transport/worker-channel.js`](lib/transport/worker-channel.js) | Inbound HRPC connections; `WorkerChannel` is the outbound path Kernel uses to call Workers |
| Coordination | [`modules/worker-registry/`](lib/modules/worker-registry/index.js): `WorkerRegistry`, `CommandDispatcher`, `CommandStateMachine`, `TelemetryCollector`, `Scheduler`, `HealthMonitor`, `ActionManager`, `ActionCaller`; plus [`permissions/`](lib/permissions/index.js) | The single-responsibility modules detailed in the subsections below |
| Storage | [`storage/stores.js`](lib/storage/stores.js), [`storage/wal.js`](lib/storage/wal.js) | Persists the registry, capabilities, command Write-Ahead Log (WAL), and action-approver state in Hyperbee |
| Protocol | [`protocol/actions.js`](lib/protocol/actions.js), [`protocol/envelope.js`](lib/protocol/envelope.js), [`protocol/schemas.js`](lib/protocol/schemas.js) | The MDK envelope and action set Workers and callers speak; holds `PROTOCOL_VERSION` |

### `WorkerRegistry`

Maps `deviceId → workerId → RPC channel`. Source of truth for routability.

**State machine:**
```
Unregistered → Discovered → IdentitySaved → Ready → Terminated
```

Workers progress through this lifecycle automatically as Kernel pulls their identity and capabilities over DHT.

### `CommandDispatcher`

Validates incoming command envelopes, resolves the owning Worker from the registry, checks that the command exists in the Worker's declared 
capabilities, then enqueues via the state machine.

### `CommandStateMachine`

Tracks every command's full execution lifecycle. Backed by a Write-Ahead Log (WAL) in Hyperbee — every state transition is written to WAL before it 
takes effect. On restart, `recover()` sweeps non-terminal states and retries or fails them.

**State machine:**
```
QUEUED → DISPATCHED → EXECUTING → SUCCESS
                              └→ FAILED
                              └→ TIMEOUT → QUEUED (retry) or FAILED (max retries)
```

### `TelemetryCollector`

Stateless proxy. Routes `telemetry.pull` queries to the appropriate Worker and passes the response back to the caller. Workers own
all aggregation and storage — Kernel is a thin router.

**Supported query types:** `metrics`, `list`, `count`, `logs`, `logs_multi`, `historical_logs`, `settings`, `config`, 
`thing_config`, `stats`, `ext_data`

### `Scheduler`

System metronome. Runs non-overlapping interval jobs for telemetry pulls, health pings, and state pulls. Jobs are idempotent 
— safe to restart with no state.

| Job | Default | Operation |
| --- | --- | --- |
| `telemetry.pull` | 10000 ms | Pulls telemetry from ready Workers over HRPC |
| `health.ping` | 5000 ms | Checks registered Worker liveness over HRPC |
| `state.pull` | 5000 ms | Refreshes Worker identity and device lists when DHT discovery is active |

Configure all three intervals with `createKernel({ cadences: { telemetryPullMs, healthPingMs, statePullMs } })`. The higher-level `getKernel()` API exposes `telemetryPullMs` and `healthPingMs` as flat options. These cadences affect scheduled HRPC calls after discovery; they do not change DHT discovery traffic.

### `HealthMonitor`

Ping-based liveness checker. Sends `health.ping` to every registered Worker on a configurable cadence and updates the registry with the result.

**State machine per Worker:**
```
UNKNOWN → HEALTHY → SICK → DEAD
                ↑___________|  (reconnect)
```

### `ActionManager`

Handles the write-action approval lifecycle at the Kernel layer. Methods are invoked via MDK protocol envelopes (`action.push`,
`action.vote`, `action.cancel-batch`, and related query actions) rather than direct RPC handlers.

- `pushAction()` / `pushActionsBatch()` — stage an action, resolve targets via `ActionCaller`, record votes required
- Vote counting against `ACTION_NEG_VOTES_THRESHOLD`; delegates to Workers once the configured positive vote threshold is met
- Wraps `@tetherto/svc-facs-action-approver` behind MDK protocol envelopes

### `ActionCaller`

Resolves a staged action into per-Worker write calls via `getWriteCalls(query, action, params, authPerms)`. Returns the targets
map, required permission strings, and per-Worker call payloads that `ActionManager` passes to the action approver.

### Permissions

Colon-delimited permission evaluation for write paths:

- `PERMISSION_LEVELS`: `r`, `w`, `rw`
- `hasWritePermission(permissions, baseType)` / `hasPermission()` — used by `ActionCaller` and `ActionManager` before staging
  or executing writes against target device families (for example `miner:w` or `container:w`)

See [approval-gated writes](../../../docs/concepts/control-plane.md#approval-gated-writes) for the cross-layer flow.
Use the [write-actions how-to](../../../docs/guides/gateway/write-actions.md) to submit and approve actions from a Gateway
consumer.

## Transports

### HRPC (Hyperswarm RPC)

Production transport. Uses encrypted Noise protocol connections over the Hyperswarm DHT. Callers must be allowlisted by hex public key.

```js
createKernel({
  auth: { whitelist: ['<gateway-pubkey-hex>'] }
})
```

## MDK Protocol

All messages use the envelope format:

```json
{
  "id":        "uuid-v4",
  "version":   "0.2.0",
  "type":      "request | response | event",
  "action":    "<action constant>",
  "sender":    "gateway",
  "target":    null,
  "deviceId":  "wm-001",
  "timestamp": 1711640000000,
  "payload":   {}
}
```

**Action constants** (from `lib/protocol/actions.js`, `PROTOCOL_VERSION = '0.2.0'`):

| Constant | Wire value | Direction |
|----------|-----------|-----------|
| `IDENTITY_REQUEST` | `identity.request` | Kernel → Worker |
| `CAPABILITY_REQUEST` | `capability.request` | Kernel → Worker |
| `TELEMETRY_PULL` | `telemetry.pull` | Kernel → Worker (scheduled) |
| `COMMAND_REQUEST` | `command.request` | Kernel → Worker |
| `HEALTH_PING` | `health.ping` | Kernel → Worker (scheduled) |
| `WORKER_LIST` | `worker.list` | Gateway → Kernel |
| `DEVICE_CAPABILITIES` | `device.capabilities` | Gateway → Kernel |
| `WORKER_TERMINATE` | `worker.terminate` | Gateway → Kernel |
| `STATE_PULL` | `state.pull` | Kernel → Worker (scheduled) |
| `COMMAND_STATUS` | `command.status` | Gateway → Kernel |
| `COMMAND_STATUS_RESPONSE` | `command.status.response` | Kernel → Gateway |
| `COMMAND_CANCEL` | `command.cancel` | Gateway → Kernel |
| `COMMAND_CANCEL_RESPONSE` | `command.cancel.response` | Kernel → Gateway |
| `ACTION_PUSH` | `action.push` | Gateway → Kernel |
| `ACTION_PUSH_BATCH` | `action.push-batch` | Gateway → Kernel |
| `ACTION_GET` | `action.get` | Gateway → Kernel |
| `ACTION_GET_BATCH` | `action.get-batch` | Gateway → Kernel |
| `ACTION_QUERY` | `action.query` | Gateway → Kernel |
| `ACTION_VOTE` | `action.vote` | Gateway → Kernel |
| `ACTION_CANCEL_BATCH` | `action.cancel-batch` | Gateway → Kernel |
| `WRITE_CALLS_REQUEST` | `write.calls.request` | Kernel → Worker |
| `WRITE_CALLS_RESPONSE` | `write.calls.response` | Worker → Kernel |

### Command control

Beyond the basic dispatch/result cycle, four exported constants extend the CSM with status queries, cancellation, scoped fan-out, and a fan-out cap.

**`COMMAND_STATUS` / `COMMAND_STATUS_RESPONSE`**: query the live state of an in-flight or recently settled command. The Gateway sends `command.status` with a `commandId`; Kernel replies with the current CSM state (`QUEUED`, `DISPATCHED`, `EXECUTING`, `SUCCESS`, `FAILED`, or `TIMEOUT`). Routed by `envelope-router.js` → `dispatcher.getStatus(commandId)`.

**`COMMAND_CANCEL` / `COMMAND_CANCEL_RESPONSE`**: attempt to cancel a command before or during execution. Cancellation succeeds only when the command is in a `QUEUED` or `DISPATCHED` state; commands already in `EXECUTING` or a terminal state return an error response. Routed → `dispatcher.cancel(commandId)`.

**`COMMAND_SCOPES`**: an object (`{ DEVICE: 'device', WORKER: 'worker', RACK: 'rack' }`) that sets the targeting resolution for a command:

| Scope | Resolves to |
|-------|-------------|
| `device` | A single target device |
| `worker` | All devices registered to a Worker |
| `rack` | All devices across all Workers in a rack |

The scope field is validated in `lib/protocol/schemas.js` against `VALID_COMMAND_SCOPES` and resolved to individual target device IDs in `command-dispatcher`. Both `COMMAND_SCOPES` and `VALID_COMMAND_SCOPES` are exported from `lib/protocol/actions.js`.

**`MAX_TARGETS`** (`1024`): hard cap on the number of resolved target devices per command. Enforced in `lib/protocol/schemas.js` before dispatch — exceeding it rejects the envelope immediately, before any CSM state is written. Prevents accidental fleet-wide fan-out from a single command request.

## Storage

All state is persisted in Hyperbee (append-only B-tree over Hypercore):

| Store | Purpose |
|-------|---------|
| `kernel-registry` | Worker identities and state |
| `ork-capabilities` | Device → contract mappings |
| `kernel-command-wal` | Command WAL for crash recovery |

## Testing

```bash
npm test                                    # lint + unit + integration
npx brittle tests/unit/registry.test.js     # single test file
npx brittle tests/integration/csm.test.js   # integration test
```

Tests use real Corestore + `tmpdir` — no mocks for storage.

## Directory layout

```
kernel/
├── index.js                  # Exports: KernelManager, createKernel
├── lib/
│   ├── kernel.manager.js        # KernelManager (EventEmitter) — lifecycle orchestration
│   ├── protocol/
│   │   ├── actions.js        # ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION
│   │   └── envelope.js       # build(), buildResponse(), serialize(), deserialize()
│   ├── modules/
│   │   ├── worker-registry/  # WorkerRegistry + states
│   │   ├── command-dispatcher/
│   │   ├── command-state-machine/  # CSM + WAL + recovery
│   │   ├── action-manager/   # ActionManager + caller-proxy
│   │   ├── action-caller/    # ActionCaller — resolve write calls
│   │   ├── telemetry-collector/
│   │   ├── scheduler/
│   │   └── health-monitor/
│   ├── permissions/          # Permission levels and checks (sibling of modules/)
│   ├── transport/
│   │   ├── hrpc-listener.js  # Hyperswarm RPC server
│   │   ├── envelope-router.js # Routes client envelopes to modules
│   │   └── worker-channel.js # RPC channel to a discovered Worker
│   ├── discovery/
│   │   └── dht-listener.js   # Hyperswarm DHT presence detection
│   └── storage/
│       ├── wal.js            # Write-Ahead Log
│       └── stores.js         # Hyperbee stores (registry, capabilities, WAL, action approver)
└── tests/
    ├── unit/                 # 50+ unit tests
    └── integration/          # 20+ integration tests (real Hyperbee)
```

## Next steps

- [Start Kernel and wire it to the Gateway](../../../docs/guides/gateway/run.md)
- Understand Kernel's [pull-only model](../../../docs/concepts/stack/kernel.md)
- Learn how [Workers discover Kernel, register devices, and expose capabilities](../../../docs/concepts/stack/workers.md)
- See the [write-action approval flow (UI → Gateway → Kernel)](../../../docs/guides/gateway/write-actions.md)
- Choose a [deployment shape](../../../docs/concepts/deployment-topologies.md)
- See the [full MDK architectural model](../../../docs/concepts/architecture.md)
