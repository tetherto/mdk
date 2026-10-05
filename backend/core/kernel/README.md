# @tetherto/mdk-kernel

## Overview

**Kernel** is the orchestrator, the trusted coordination daemon at the center of the [MDK stack](../../../docs/concepts/architecture.md).
It discovers and registers [Workers](../../workers/README.md), maintains a live registry of devices, dispatches commands, collects
telemetry on a schedule, and monitors Worker health. The [Workers discovery model](../../workers/docs/architecture.md#discovery-model)
covers local, same-process, and DHT modes.

The Kernel discovers and registers Workers, dispatches commands through a crash-recoverable state machine, and pulls telemetry on a fixed schedule.
The Kernel is **pull-only and passive** — it never pushes to your app, and it never receives unsolicited MDK Protocol data from a
Worker (the one inbound exception is the public key a Worker offers once on the discovery swarm connection). It always
initiates, on the cadences set in `opts.cadences`, which is what keeps it from being overwhelmed by upstream pressure and why Workers
are described as passive. Callers connect over HRPC using the Kernel's public key (published to `<tmpdir>/mdk/.kernel-key` on start).
For telemetry, the scheduler fans `telemetry.pull` out to ready Workers; on-demand queries route to the owning Worker for a specific
device. Callers do send command requests to Kernel, but Kernel then dispatches each one to the owning Worker via its own initiated call.

Kernel does **not** extend any Worker class. It is a standalone `EventEmitter`-based lib, independent of the
[`WorkerRuntime`](../mdk-worker/lib/worker-runtime.js) class that hosts [device Workers](../../workers/README.md).

Kernel is a pass-through coordinator, and the list of what it leaves alone is deliberately long: it has no HTTP surface, performs no
user authentication, and holds no business logic or cross-Worker aggregation. Consumers reach it through the
[Gateway](../gateway/README.md)'s REST API, or through the standalone [`@tetherto/mdk-mcp`](../mcp/README.md) server's tools
(each backed by its own [`@tetherto/mdk-client`](../client/README.md), the same way the Gateway connects) — everything above routing is the caller's responsibility — see
[responsibility boundaries](../../../docs/concepts/control-plane.md#responsibility-boundaries). Its one brush with permissions is the
write-action path, which requires a device-family permission such as `miner:w` in the `authPerms` the caller sends.

> [!TIP]
> New to Kernel? The [control plane](../../../docs/concepts/control-plane.md) explains which layer owns what and how a request travels
> from a consumer down to a device.
> For deployment shapes and the active/passive connection model, see [deployment topologies](../../../docs/concepts/deployment-topologies.md).
> Most apps start Kernel via [`getKernel()`](../mdk/README.md) — the `@tetherto/mdk-core` bootstrap API — rather than calling `createKernel()` directly.

## Prerequisites

- Node.js >= 24

## Install

```bash
npm install @tetherto/mdk-kernel
```

## Quickstart

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
use `getKernel()` from `@tetherto/mdk-core`.

## API

### `createKernel(opts)` → `KernelManager`

Factory that returns a configured, unstarted `KernelManager`. Caller controls the lifecycle.

| Option                          | Status   | Type       | Default               | Description                                          |
| ------------------------------- | -------- | ---------- | --------------------- | ---------------------------------------------------- |
| `opts.db`                       | Optional | `string`   | `os.tmpdir()/mdk/...` | Hyperbee store directory                             |
| `opts.root`                     | Optional | `string`   | `os.tmpdir()/mdk`     | Config root directory                                |
| `opts.listeners.hrpc`           | Optional | `object\|false` | Enabled          | HRPC listener config; `false` to disable             |
| `opts.auth.whitelist`           | Optional | `string[]` | `[]`                  | HRPC firewall — hex public keys of allowed callers   |
| `opts.discovery.topic`          | Optional | `string`   | None; no DHT listener without one | 32-byte hex DHT topic Workers join       |
| `opts.cadences.telemetryPullMs` | Optional | `number`   | `10000`               | Telemetry poll interval                              |
| `opts.cadences.healthPingMs`    | Optional | `number`   | `5000`                | Health ping interval                                 |
| `opts.cadences.statePullMs`     | Optional | `number`   | `5000`                | DHT Worker identity and device-list refresh interval |

### `KernelManager`

Returned by `createKernel()` or `new KernelManager(conf, ctx)`.

```js
await kernel.init()    // Creates facilities, stores, modules
await kernel.start()   // Starts transports, discovery, scheduler, health monitor
await kernel.stop()    // Graceful shutdown

kernel.getPublicKey()  // Buffer — HRPC public key (clients connect with it; share with Workers for allowlisting)
```

Each running Kernel needs its own Hyperbee store directory. Two Kernel instances that use the same `opts.db` path contend for the same files and fail on file locks. The default development root is `os.tmpdir()/mdk`; production deployments should use an explicit, instance-specific path.

`createKernel()` leaves `init()`, `start()`, and `stop()` to the caller. The higher-level `getKernel()` API from `@tetherto/mdk-core` initializes and starts Kernel, publishes its HRPC key, and registers signal-driven cleanup.

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

| Subsystem   | Modules / code | What it does                                                       |
|-------------|----------------|--------------------------------------------------------------------|
| Discovery   | [`discovery/dht-listener.js`](lib/discovery/dht-listener.js); local and same-process modes live in [`@tetherto/mdk-core`](../mdk/lib/local-discovery.js) | Obtains a Worker's RPC public key, then `WorkerRegistry` drives it to `READY` |
| Transport   | [`transport/hrpc-listener.js`](lib/transport/hrpc-listener.js), [`transport/envelope-router.js`](lib/transport/envelope-router.js), [`transport/worker-channel.js`](lib/transport/worker-channel.js) | Inbound HRPC connections; `WorkerChannel` is the outbound path Kernel uses to call Workers |
| Coordination | [`modules/worker-registry/`](lib/modules/worker-registry/index.js): `WorkerRegistry`, `CommandDispatcher`, `CommandStateMachine`, `TelemetryCollector`, `Scheduler`, `HealthMonitor`, `ActionManager`, `ActionCaller`; plus [`permissions/`](lib/permissions/index.js) | The single-responsibility modules detailed in the subsections below |
| Storage     | [`storage/stores.js`](lib/storage/stores.js), [`storage/wal.js`](lib/storage/wal.js) | Persists the registry, capabilities, command Write-Ahead Log (WAL), and action-approver state in Hyperbee |
| Protocol    | [`protocol/actions.js`](lib/protocol/actions.js), [`protocol/envelope.js`](lib/protocol/envelope.js), [`protocol/schemas.js`](lib/protocol/schemas.js) | The MDK envelope and action set Workers and callers speak; holds `PROTOCOL_VERSION` |

### `WorkerRegistry`

Two flat indexes — `deviceId → { workerId, channel, capabilities }` and `workerId → { state, deviceIds, channel, rpcKey, … }`.
Source of truth for routability.

**State machine** (constants in [`lib/modules/worker-registry/states.js`](lib/modules/worker-registry/states.js)):
```text
UNREGISTERED → DISCOVERED → IDENTITY_SAVED → READY → TERMINATED
```

Workers progress through this lifecycle automatically as Kernel pulls their identity and capabilities over DHT, though the live path
is shorter than the table suggests: a Worker discovered over DHT is registered straight into `IDENTITY_SAVED` and then `READY`.
`DISCOVERED` is what a persisted Worker reloads into on `recover()` while it waits to reconnect. `UNREGISTERED` and `TERMINATED` are
declared in the transition table but never assigned at runtime — `terminate()` deletes the Worker's registry entry outright.

### `CommandDispatcher`

Validates incoming command envelopes, resolves the owning Worker from the registry — by `deviceId` for device scope, by `workerId` for
worker and rack scope — checks that the command exists in the Worker's declared capabilities, then enqueues via the state machine.
See [Command control](#command-control) for how scopes and targets are handled.

### `CommandStateMachine`

Tracks every command's full execution lifecycle, backed by a Write-Ahead Log (WAL) in Hyperbee. The guarantee that matters is on the
outbound side: a command's RPC to its Worker is issued only after the `DISPATCHED` and `EXECUTING` transitions have been appended to
the WAL, so a crash mid-flight leaves a durable record of what was in progress. On restart, `recover()` sweeps the whole WAL: in-flight commands with
retries left are restored to `QUEUED`, those out of retries are failed with `ERR_RECOVERY_EXHAUSTED`, and terminal entries are deleted to
compact the log. Restoring to `QUEUED` does not re-send the command; `recover()` never calls `_dispatch`, so a recovered command waits for a
caller to drive it.

**State machine:**
```text
QUEUED → DISPATCHED → EXECUTING → SUCCESS
                              └→ FAILED
                              └→ TIMEOUT → QUEUED (retry) or FAILED (max retries)
```

### `TelemetryCollector`

Thin proxy. Routes `telemetry.pull` queries to the appropriate Worker and passes the response back to the caller. Workers own
all aggregation and storage — Kernel persists no telemetry at all. (It does hold an in-process subscriber list for callback fan-out,
so it is not literally stateless, but nothing it keeps survives the process.)

**Supported query types:** `metrics`, `list`, `count`, `logs`, `logs_multi`, `historical_logs`, `settings`, `config`,
`thing_config`, `stats`, `ext_data`

### `Scheduler`

System metronome. Runs non-overlapping interval jobs for telemetry pulls, health pings, and state pulls. Jobs are idempotent
— safe to restart with no state.

| Job              | Default  | Operation                                                               |
| ---------------- | -------- | ----------------------------------------------------------------------- |
| `telemetry.pull` | 10000 ms | Pulls telemetry from ready Workers over HRPC                            |
| `health.ping`    | 5000 ms  | Checks registered Worker liveness over HRPC                             |
| `state.pull`     | 5000 ms  | Refreshes Worker identity and device lists when DHT discovery is active |

Configure all three intervals with `createKernel({ cadences: { telemetryPullMs, healthPingMs, statePullMs } })`. The higher-level `getKernel()` API exposes `telemetryPullMs` and `healthPingMs` as flat options. These cadences affect scheduled HRPC calls after discovery; they do not change DHT discovery traffic.

### `HealthMonitor`

Ping-based liveness checker. Sends `health.ping` to every registered Worker on a configurable cadence and updates the registry with the result.

**State machine per Worker:**
```text
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

Once an action clears its vote threshold, the approver calls back into `callTargets()`, which builds a `command.request` envelope and
hands it to `CommandDispatcher` — the same path a direct write takes. Approval gates which writes execute; it does not give them a
separate execution route.

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

The only client transport: encrypted Noise connections over the Hyperswarm DHT, addressed by Kernel's public key. Kernel is the
**passive listener** — the caller always initiates the connection.

How the caller obtains that key depends on where it runs:

- **Same host (zero-config default)**: `getKernel()` writes Kernel's HRPC public key as hex to a well-known key file
  (`<tmpdir>/mdk/.kernel-key`) after start, and the caller reads it from there automatically. The file is not deleted on
  shutdown, and the key stays stable across restarts because the RPC seed is persisted in Kernel's conf store rather than
  regenerated. Override the path with `opts.keyFile`, or pass `keyFile: false` to disable publishing
- **Remote or multi-host**: share the key from `kernel.getPublicKey()` with the caller out-of-band

Admission is controlled by an allowlist of hex public keys. An empty allowlist admits any HRPC caller, so a configured
allowlist is what restricts connections to approved callers:

```js
createKernel({
  auth: { whitelist: ['<gateway-pubkey-hex>', '<mcp-pubkey-hex>'] }
})
```

This is a transport-level check on which backend processes may connect. It says nothing about the person or agent behind a
request — see [control plane](../../../docs/concepts/control-plane.md#transport-identity-and-admission) for that distinction.

## MDK protocol

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

**Action constants** (from [`lib/protocol/actions.js`](./lib/protocol/actions.js), `PROTOCOL_VERSION = '0.2.0'`):

| Constant                  | Wire value                 | Direction                   |
|---------------------------|----------------------------|-----------------------------|
| `IDENTITY_REQUEST`        | `identity.request`         | Kernel → Worker             |
| `CAPABILITY_REQUEST`      | `capability.request`       | Kernel → Worker             |
| `TELEMETRY_PULL`          | `telemetry.pull`           | Kernel → Worker (scheduled) |
| `COMMAND_REQUEST`         | `command.request`          | Kernel → Worker             |
| `HEALTH_PING`             | `health.ping`              | Kernel → Worker (scheduled) |
| `WORKER_LIST`             | `worker.list`              | Gateway → Kernel            |
| `DEVICE_CAPABILITIES`     | `device.capabilities`      | Gateway → Kernel            |
| `WORKER_TERMINATE`        | `worker.terminate`         | Gateway → Kernel            |
| `STATE_PULL`              | `state.pull`               | Kernel → Worker (scheduled) |
| `COMMAND_STATUS`          | `command.status`           | Gateway → Kernel            |
| `COMMAND_STATUS_RESPONSE` | `command.status.response`  | Kernel → Gateway            |
| `COMMAND_CANCEL`          | `command.cancel`           | Gateway → Kernel            |
| `COMMAND_CANCEL_RESPONSE` | `command.cancel.response`  | Kernel → Gateway            |
| `ACTION_PUSH`             | `action.push`              | Gateway → Kernel            |
| `ACTION_PUSH_BATCH`       | `action.push-batch`        | Gateway → Kernel            |
| `ACTION_GET`              | `action.get`               | Gateway → Kernel            |
| `ACTION_GET_BATCH`        | `action.get-batch`         | Gateway → Kernel            |
| `ACTION_QUERY`            | `action.query`             | Gateway → Kernel            |
| `ACTION_VOTE`             | `action.vote`              | Gateway → Kernel            |
| `ACTION_CANCEL_BATCH`     | `action.cancel-batch`      | Gateway → Kernel            |
| `WRITE_CALLS_REQUEST`     | `write.calls.request`      | Kernel → Worker             |
| `WRITE_CALLS_RESPONSE`    | `write.calls.response`     | Worker → Kernel             |

### Command control

Beyond the basic dispatch/result cycle, three exported constants extend the CSM with status queries, cancellation, and scoped fan-out.

**`COMMAND_STATUS` / `COMMAND_STATUS_RESPONSE`**: query the live state of an in-flight or recently settled command. The Gateway sends `command.status` with a `commandId`; Kernel replies with the current CSM state (`QUEUED`, `DISPATCHED`, `EXECUTING`, `SUCCESS`, `FAILED`, or `TIMEOUT`). Routed by [`envelope-router.js`](./lib/transport/envelope-router.js) → `dispatcher.getStatus(commandId)`.

**`COMMAND_CANCEL` / `COMMAND_CANCEL_RESPONSE`**: attempt to cancel a command before or during execution. Cancellation succeeds only when the command is in a `QUEUED` or `DISPATCHED` state; commands already in `EXECUTING` or a terminal state return an error response. Routed → `dispatcher.cancel(commandId)`.

**`COMMAND_SCOPES`**: an object (`{ DEVICE: 'device', WORKER: 'worker', RACK: 'rack' }`) that sets the targeting resolution for a command:

| Scope    | Addresses                                       | Routed by                  |
|----------|-------------------------------------------------|----------------------------|
| `device` | A single target device                          | `deviceId` on the envelope |
| `worker` | Devices registered to a Worker                  | `workerId` in the payload  |
| `rack`   | Devices across the Workers in a rack            | `workerId` in the payload  |

The scope field is validated in [`lib/protocol/schemas.js`](./lib/protocol/schemas.js) against `VALID_COMMAND_SCOPES`. Both `COMMAND_SCOPES` and `VALID_COMMAND_SCOPES` are exported from [`lib/protocol/actions.js`](./lib/protocol/actions.js).

Kernel does not expand a scope into a device list. For `worker` and `rack` scope the caller supplies the `targets` array, and `_resolveTarget` passes it through unchanged; for `device` scope `targets` is `null` and the envelope's `deviceId` routes the command. Enumerating which devices a scope covers is the caller's job. Kernel does not cap the size of `targets` — a caller fanning a command out to an entire fleet in one request is not rejected.

## Storage

All state is persisted in Hyperbee (append-only B-tree over Hypercore):

| Store                | Purpose                         |
|----------------------|---------------------------------|
| `kernel-registry`    | Worker identities and state     |
| `ork-capabilities`   | Device → contract mappings      |
| `kernel-command-wal` | Command WAL for crash recovery  |

## Testing

```bash
npm test                                    # lint + unit + integration
npx brittle tests/unit/registry.test.js     # single test file
npx brittle tests/integration/csm.test.js   # integration test
```

Tests use real Corestore + `tmpdir` — no mocks for storage.

## Errors

| Code                     | Fires when                                                                   | Fix                                       |
| ------------------------ | -----------------------------------------------------------------------------| ------------------------------------------|
| `ERR_ACTION_DENIED`      | The voter's auth permissions do not include write access for every base type the action targets | Obtain write permission for all affected device families before voting |
| `ERR_ACTION_INVALID`     | A write-call request's action is missing or not a string                                 | Pass a non-empty string action name |
| `ERR_ACTION_INVALID_MISSING_ID` | An update-thing rack action omits the target record `id` in the first param       | Set `id` on the first param |
| `ERR_ACTION_INVALID_MISSING_WORKER_ID` | A rack action other than rack-reboot omits `workerId` in the first param   | Set `workerId` on the first param |
| `ERR_ACTION_INVALID_QUERY_ID` | A forget-things rack action omits a string `query.id` in the first param            | Provide `params[0].query.id` as a string |
| `ERR_CANCELLED`          | A queued command is cancelled before it executes                                         | Resubmit the command if execution is still wanted |
| `ERR_CHANNEL_NO_SEND_METHOD` | The target channel exposes no usable send path (no HRPC key with an initialized RPC layer, and no `request()` function) | Use a channel created by `connect()`, or provide an in-process `request` handler |
| `ERR_CHANNEL_NOT_CONNECTED` | A send is attempted with no channel object                               | Establish the Worker channel before sending |
| `ERR_CHANNEL_RPC_KEY_REQUIRED` | `connect()` is called without the Worker's `rpcKey`                   | Pass the Worker's RPC public key to `connect()` |
| `ERR_CHANNEL_TIMEOUT`    | A Worker does not respond within the send timeout                           | Confirm the Worker is reachable and healthy, or raise the timeout |
| `ERR_COMMAND_FAILED`     | A Worker returns a non-SUCCESS result carrying no error of its own          | Check the Worker logs for why the command was rejected |
| `ERR_COMMAND_ID_REQUIRED` | A status or cancel request omits the `commandId`                           | Supply the `commandId` returned when the command was queued |
| `ERR_COMMAND_NOT_FOUND`  | The requested `commandId` has no tracked command                            | Use a `commandId` that is still tracked; a completed command may have been evicted |
| `ERR_COMMAND_NOT_IN_CAPABILITIES` | The requested command is not declared in the target Worker's capabilities | Issue a command the Worker advertises |
| `ERR_COMMAND_REQUIRED`   | A dispatched command payload omits `command`                                | Include the command name in the payload |
| `ERR_DEVICE_ID_REQUIRED` | A device-scoped command omits `deviceId` on the envelope                    | Set `deviceId` on the envelope |
| `ERR_DEVICE_NOT_FOUND`   | No registered Worker owns the given `deviceId`                              | Target a `deviceId` registered by a ready Worker |
| `ERR_KERNEL_ACTION_CALLS_EMPTY` | An action push resolves to no executable write calls, either for a specific Worker or across all Workers | Confirm the query matches ready Workers and the caller holds the required write permissions |
| `ERR_KERNEL_NO_DISCOVERY` | `registerWorker` runs on a Kernel started without discovery configured     | Configure DHT discovery before registering Workers |
| `ERR_KERNEL_NOT_INITIALIZED` | `start()` is called before the Kernel is initialized                    | Call `init()` before `start()` |
| `ERR_KERNEL_NOT_STARTED` | `registerWorker` is called before the Kernel is started                     | Start the Kernel before registering Workers |
| `ERR_KERNEL_SHUTDOWN`    | A command is executing or dispatched when the Kernel drains for shutdown    | Resubmit the command after the Kernel restarts |
| `ERR_MAX_RETRIES_EXHAUSTED` | A command's send to the Worker keeps failing (timeout or channel error) until its retries are exhausted                         | Confirm the Worker is reachable and the channel is wired; raise retries or the timeout if it is merely slow |
| `ERR_PARAM_RANGE`        | A numeric command parameter falls below its declared `min` or above its `max` | Pass a value within the parameter's declared range |
| `ERR_PARAM_TYPE`         | A command parameter's value does not match its declared type                | Pass the parameter as its declared type |
| `ERR_PARAMS_INVALID`     | A write-call request's `params` is not an array                             | Pass `params` as an array |
| `ERR_PAYLOAD_INVALID`    | `pushActionsBatch` receives a `batchActionsPayload` that is not an array    | Pass `batchActionsPayload` as an array |
| `ERR_QUERIES_INVALID`    | `queryActions` receives a `queries` value that is not an array              | Pass `queries` as an array |
| `ERR_QUERIES_TYPE_INVALID` | A query entry omits a string `type`                                       | Give every query entry a string `type` |
| `ERR_QUERY_INVALID`      | A write-call `query` is not a plain object or is not a valid mingo query    | Pass a valid mingo query object |
| `ERR_RECOVERY_EXHAUSTED` | A command recovered after restart was in flight and has no retries remaining | Resubmit the command and investigate why it kept failing before shutdown |
| `ERR_RPC_NOT_INITIALIZED` | A channel request runs before the transport's RPC layer is initialized     | Initialize the Kernel transport before sending over the channel |
| `ERR_UNKNOWN_ACTION`     | An incoming envelope's `action` has no route handler                        | Send a supported action |
| `ERR_WORKER_ID_REQUIRED` | A `worker.terminate` envelope, or a Worker- or rack-scoped command, omits `workerId` | Include `workerId` in the payload |
| `ERR_WORKER_NOT_FOUND`   | The referenced `workerId` is not registered                                 | Register the Worker, or use a known `workerId` |
| `ERR_WORKER_NOT_ROUTABLE` | The resolved Worker is registered but not in a routable state              | Wait until the Worker is ready before sending commands |
| `ERR_WORKER_RESPONSE_INVALID` | A Worker returns a response that is not an object                      | Ensure the Worker returns a valid protocol response |

Kernel validates the structure of every inbound envelope. A raw envelope that does not satisfy the
[MDK Protocol](#mdk-protocol) schema raises an `ERR_ENVELOPE_*` code from
[`protocol/envelope.js`](lib/protocol/envelope.js). Callers that go through [`@tetherto/mdk-client`](../client/README.md)
or a [`WorkerRuntime`](../mdk-worker/lib/worker-runtime.js) never construct envelopes by hand, so they never hit this
class of error.

## Directory layout

```text
kernel/
├── index.js                  # Exports: KernelManager, createKernel
├── setup-config.sh           # Copies config/*.example to real config files
├── config/
│   └── kernel.json.example   # Config template: HRPC allowlist, discovery topic, cadences
├── lib/
│   ├── kernel.manager.js        # KernelManager (EventEmitter) — lifecycle orchestration
│   ├── protocol/
│   │   ├── actions.js        # ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION
│   │   ├── envelope.js       # build(), buildResponse(), serialize(), deserialize()
│   │   └── schemas.js        # Envelope/command validation, VALID_COMMAND_SCOPES
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
- Understand [which layer owns what, and how a request reaches a device](../../../docs/concepts/control-plane.md)
- Learn how [Workers register devices and expose capabilities](../../workers/README.md), and how [Kernel discovers them](../../workers/docs/architecture.md#discovery-model)
- See the [write-action approval flow (UI → Gateway → Kernel)](../../../docs/guides/gateway/write-actions.md)
- Choose a [deployment shape](../../../docs/concepts/deployment-topologies.md)
- See the [full MDK architectural model](../../../docs/concepts/architecture.md)
