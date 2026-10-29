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
are described as passive. Callers connect over HRPC using the Kernel's public key (published to `~/.mdk/.kernel-key` on start).
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
  discovery: { topic: '<32-byte hex topic>', workerKeys: ['<worker RPC key hex>'] }
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
| `opts.listeners.hrpc.bootstrap` | Optional | `array`    | Public DHT            | HyperDHT bootstrap nodes; pass the same list to every component on a private DHT network |
| `opts.listeners.hrpc.dhtHost`   | Optional | `string`   | All interfaces        | Interface the Kernel's DHT node binds: `127.0.0.1` on one machine, a LAN address on an isolated LAN ([private DHT](../../../docs/guides/deployment/private-dht.md)) |
| `opts.auth.whitelist`           | Optional | `Array<string\|{key}>` | `[]` (admits nobody) | The HRPC caller keys that may connect — see [Caller admission and authorization](#caller-admission-and-authorization) |
| `opts.discovery.workerKeys`     | Optional | `string[]` | `[]` (admits nobody)  | Worker RPC keys accepted from the discovery topic — see [Kernel → Worker](#kernel--worker) |
| `opts.discovery.allowAnyWorker` | Optional | `boolean`  | `false`               | Admit every Worker that announces on the topic. Development only; logs a warning |
| `opts.discovery.topic`          | Optional | `string`   | None; no DHT listener without one | 32-byte hex DHT topic Workers join       |
| `opts.cadences.telemetryPullMs` | Optional | `number`   | `10000`               | Telemetry poll interval                              |
| `opts.cadences.healthPingMs`    | Optional | `number`   | `5000`                | Health ping interval                                 |
| `opts.cadences.statePullMs`     | Optional | `number`   | `5000`                | DHT Worker identity and device-list refresh interval |

`createKernel()` and the core SDK's `getKernel()` do not forward `commandResultTtlMs` or `healthFailureThreshold` options.
These settings are read from `conf.kernel` by `KernelManager`; the factories use the manager's defaults of 24 hours and three
failed health checks. Both factories construct their own configuration and disable config-file loading, so a separate `kernel.json`
does not supply these settings to a factory-created Kernel. A caller that needs to set them directly uses `new KernelManager(conf, ctx)`.

### `KernelManager`

Returned by `createKernel()` or `new KernelManager(conf, ctx)`.

```js
await kernel.init()    // Creates facilities, stores, modules
await kernel.start()   // Starts transports, discovery, scheduler, health monitor
await kernel.stop()    // Graceful shutdown

kernel.getPublicKey()        // Buffer — HRPC listener key (callers connect to it)
kernel.getClientPublicKey()  // Buffer — the key Kernel dials Workers with; Workers must allow it
kernel.allowKey(hex)         // admit an HRPC caller to connect; spec.rbac decides what it may do
kernel.revokeKey(hex)        // remove it; open connections stop being served
kernel.listAllowedKeys()     // hex keys admitted
kernel.allowWorkerKey(hex)   // admit a Worker RPC key on the discovery topic at runtime
kernel.registerWorker(hex)   // register a Worker by its RPC key directly (skips the topic)
```

Each running Kernel needs its own Hyperbee store directory. Two Kernel instances that use the same `opts.db` path contend for the same files and fail on file locks. The default development root is `os.tmpdir()/mdk`; production deployments should use an explicit, instance-specific path.

`createKernel()` leaves `init()`, `start()`, and `stop()` to the caller. The higher-level `getKernel()` API from `@tetherto/mdk-core` initializes and starts Kernel, publishes its HRPC key, and registers signal-driven cleanup.

**Events:**
- `'started'` — emitted after `start()` completes
- `'stopped'` — emitted after `stop()` completes
- `'caller-allowed'` `{ key }` / `'caller-revoked'` `{ key }` — after `allowKey()` / `revokeKey()`. Workers allow only the
  Kernel's client key: a caller the Kernel admits is never let past it to a Worker

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
worker and rack scope — checks that the command exists in the Worker's declared capabilities and that its params pass the contract's
`params` rules, then enqueues via the state machine. A target that declares no commands accepts none
(`ERR_COMMAND_NOT_IN_CAPABILITIES`), and params are checked with the same rules the Worker applies (`ERR_PARAM_REQUIRED`,
`ERR_PARAM_TYPE`, `ERR_PARAM_ENUM`, `ERR_PARAM_RANGE`), so a refused write is `REJECTED` before it is queued.
See [Command control](#command-control) for how scopes and targets are handled.

### Write-command log

Every `command.request` is recorded in the Kernel store, accepted or not: an `attempt` entry with the caller (its token's
subject, else its transport key, and the roles `spec.rbac` binds to it; `requesterId` for in-process callers), the app it came
`via` when an app acted for an operator (`caller` is then the operator, and `via` the app's subject and roles), the command,
its target (`scope`, `deviceId`, `workerId`, `targets`), its params with secret-looking fields replaced by `[REDACTED]`, the
outcome (`QUEUED` or `REJECTED`) and the error. A request `spec.rbac` refuses (`ERR_KERNEL_ACTION_FORBIDDEN`) is recorded too.
Each accepted command adds a `settled` entry with its terminal state. Entries are kept for `kernel.commandLogTtlMs` (default 30
days) and read newest first with the `command.log` action, which needs `commands: read`
(`mdkClient.getCommandLog({ start, end, limit })`, `limit` up to 1000, default 100).

### `CommandStateMachine`

Tracks every command's full execution lifecycle, backed by a Write-Ahead Log (WAL) in Hyperbee. The guarantee that matters is on the
outbound side: a command's RPC to its Worker is issued only after the `DISPATCHED` and `EXECUTING` transitions have been appended to
the WAL, so a crash mid-flight leaves a durable record of what was in progress. A command that was sent but got no response may already
have run on the device, so Kernel never re-sends it: a send that times out or errors settles the command as `TIMEOUT` with
`ERR_COMMAND_UNCONFIRMED`, and the caller reconciles by reading the device state back. On restart, `recover()` sweeps the whole WAL: in-flight
commands settle the same way, `QUEUED` commands are restored, and terminal entries older than `kernel.commandResultTtlMs` (default 24 h)
are logically deleted from the current database view; the same pruning runs at most hourly while new commands arrive. These deletes
do not reclaim historical Hypercore blocks, so the result TTL is not a physical disk-space limit. `recover()` never calls `_dispatch`, so a
restored `QUEUED` command waits for a caller to drive it.

A command reports three result levels, and success at one level never stands in for the next:

1. **Accepted**: `command.request` answers `{ commandId, status: 'QUEUED' }`. Nothing has reached the device yet.
2. **Terminal**: `command.status` answers `SUCCESS`, `FAILED` or `TIMEOUT` once the Worker replies or the send goes unconfirmed. It stays
   readable for `commandResultTtlMs`.
3. **Device verified**: `command.status` carries `verification`. When the command's contract entry declares `verify`, Kernel reads the named
   telemetry back through the Worker every `kernel.commandVerifyIntervalMs` (default 5 s), starting one interval after `SUCCESS` or
   `TIMEOUT`, until it equals the requested param (`VERIFIED`) or `withinMs` passes (`UNVERIFIED`). It is `PENDING` while Kernel reads,
   `NOT_DECLARED` when the contract has no `verify`, and `null` for `FAILED` and in-flight commands. A Kernel restart settles `PENDING` as
   `UNVERIFIED`.

**State machine:**
```text
QUEUED → DISPATCHED → EXECUTING → SUCCESS
                              └→ FAILED
                              └→ TIMEOUT (sent, outcome unconfirmed; never retried)
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
| `health.ping`    | 5000 ms  | Checks that each ready Worker process answers HRPC; it does not contact devices |
| `state.pull`     | 5000 ms  | Refreshes Worker identity and device lists when DHT discovery is active |

Configure all three intervals with `createKernel({ cadences: { telemetryPullMs, healthPingMs, statePullMs } })`. The higher-level `getKernel()` API exposes `telemetryPullMs`, `healthPingMs` and `statePullMs` as flat options. These cadences affect scheduled HRPC calls after discovery; they do not change DHT discovery traffic.

### `HealthMonitor`

Ping-based checker for the Worker process, not for the devices behind it. Sends `health.ping` to every `READY` Worker on the
`healthPingMs` cadence with a 3 s timeout; the Worker answers from memory with a constant `OK` and performs no device I/O. One or
two misses mark the Worker `SICK`, `healthFailureThreshold` misses (default 3) mark it `DEAD`, and one reply restores `HEALTHY`. The
only effect of `SICK` and `DEAD` is routing: `isRoutable()` returns false, so command dispatch is refused, while the registry state
stays `READY` and telemetry pulls continue. A `READY` and `HEALTHY` Worker says nothing about whether its devices are reachable; that
is reported per device in its [`health` telemetry channel](../mdk-worker/README.md#device-health-channel).

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
- `action.get`, `action.get-batch` and `action.query` return a copy of each record with secret-looking `params` fields
  (`password`, `secret`, `token`, `apiKey`, `privateKey`, `credentials`, and similar) replaced by `[REDACTED]`; the stored
  copy the approver executes is unchanged

### `ActionCaller`

Resolves a staged action into per-Worker write calls via `getWriteCalls(query, action, params, authPerms)`. Returns the targets
map, required permission strings, and per-Worker call payloads that `ActionManager` passes to the action approver.

A Worker's `write.calls.response` is schema-checked (at most `LIMITS.writeCalls` calls, `reqVotes` an integer from 1 to
`LIMITS.reqVotes`). Only calls for devices that Worker owns are kept; a rack action keeps only the call for the rack id the
Kernel asked about.

Once an action clears its vote threshold, the approver calls back into `callTargets()`, which re-checks device ownership,
builds a `command.request` envelope and hands it to `CommandDispatcher` — the same path a direct write takes. Approval gates which writes execute; it does not give them a
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
  (`~/.mdk/.kernel-key`) after start, and the caller reads it from there automatically. The file is not deleted on
  shutdown, and the key stays stable across restarts because the RPC seed is persisted in Kernel's conf store rather than
  regenerated. Override the path with `opts.keyFile`, or pass `keyFile: false` to disable publishing
- **Remote or multi-host**: share the key from `kernel.getPublicKey()` with the caller out-of-band

### Caller admission and authorization

Two checks, both fail-closed, run on every request.

**Admission** decides who may connect. Only public keys on the allowlist may connect; an **empty allowlist admits
nobody**. The firewall rejects unknown keys at connect time, and every request is re-checked, so `revokeKey()` takes
effect on connections that are already open (`ERR_KERNEL_CALLER_NOT_ALLOWED`).

```js
createKernel({ auth: { whitelist: ['<gateway-pubkey-hex>', '<app-runtime-pubkey-hex>'] } })
kernel.allowKey('<mcp-pubkey-hex>')   // at runtime, after init()
```

**Authorization** decides what an admitted caller may do. Every request but sign-in (`auth.*`) carries an access token in
`envelope.auth`, issued by this Kernel's [token issuer](../identity/README.md). A service account's token is bound to the
transport key that signed in, so it is refused from any other key. `KernelAuthorizer` verifies the token, then evaluates
its identity against the `spec.rbac` in force as the action's resource and verb (the `KERNEL_ACTIONS` table in
[`@tetherto/mdk-rbac`](../rbac/README.md#vocabulary)), once per instance the request touches:

| Request                                       | Checked as                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| A device action (`telemetry.pull`, `state.pull`, `device.capabilities`, `command.request`) | `devices` on `family/brand/worker/device` |
| `command.request` scoped to a worker or rack  | `devices: write` on every device the worker owns                           |
| `command.status`, `command.cancel`            | `devices` on the command's target                                          |
| `worker.terminate`                            | `workers: delete` on `family/brand/worker`                                 |
| `action.push`, `action.push-batch`            | `actions: write`, then `devices: write` on every device the push resolves to; one refused device refuses the push |
| `command.log`                                 | `commands: read`                                                           |
| Any other action                              | Its resource and verb, with no instance                                    |

The family is the Worker contract's `metadata.deviceFamily` and the brand its `metadata.brand` as a slug (`Antminer`
becomes `antminer`). A device that is unknown, or whose Worker is not ready, has no name, so a rule scoped by
`resourceNames` never matches it. The token's identity also replaces self-asserted identity: `command.request` records
its subject as `requesterId`, and a caller votes, pushes and cancels as its subject unless a rule grants it
`actions: delegate` (an app voting for the user it authenticated). Each decision is emitted as `authz-decision`
(`{ action, kind, sub, actorSub?, actorRoles?, allowed, reason, resource, resourceName?, policyVersion }`).

**Operators via an app.** An app serving a Gateway request sends the signed-in operator's access token in `envelope.actor`,
beside its own in `envelope.auth`. The Kernel verifies it like any token: it must be a current user token from this issuer,
bound to no transport key. A service account's token, a bound one, or one revoked since (a password change, a disabled user)
is refused. The operator is then evaluated exactly as the caller is, for every instance, and the request runs only when
`spec.rbac` allows both. The operator becomes the `requesterId`, the voter on pushes, votes and cancels (`payload.voter` is
ignored), and the `by` of an `rbac.apply`; the app is recorded `via`. An `actor` without `auth` is refused, so an operator's
token never stands in for the app's.

A request with no token gets `ERR_KERNEL_TOKEN_REQUIRED`, a bad or foreign token `ERR_KERNEL_TOKEN_INVALID`, a bad operator
token `ERR_KERNEL_ACTOR_INVALID`, and one no rule allows `ERR_KERNEL_ACTION_FORBIDDEN: <sub> may not <verb> <resource> [<name>]`
(`<operator> (via <sub>) may not ...` when the operator is the one refused). In-process calls (no transport caller) are not
checked.

Admission grants nothing beyond the connection: there are no allowlist roles, no full-access entries and no way to admit
every peer. An allowlist entry with `roles`, and `auth.allowAll` / `hrpc.allowAll`, are refused at start
(`ERR_KERNEL_CALLER_ROLES_UNSUPPORTED`, `ERR_KERNEL_ALLOW_ALL_REMOVED`).

The Gateway dials with `status.rpcClientKey` (in its status file), derived from a seed persisted in the Gateway store, so
one allowlist entry survives Gateway restarts. `@tetherto/mdk-core` wires the common cases for you:
`startGateway({ kernel })` admits the Gateway key on an in-process Kernel, and `getKernel()` admits keys that same-machine
processes publish to its trusted-keys dir (see the [mdk-core README](../mdk/README.md#trust-and-admission)).

### Kernel → Worker

Workers are fail-closed too: a Worker only answers the keys on its own allowlist. Kernel dials Workers with
`kernel.getClientPublicKey()` (its DHT keypair, not the listener key), so hand that key to every Worker
(`WorkerRuntime` `allowedKeys`). `mdk run` and the `@tetherto/mdk-core` helpers admit that key and no other, so every
command reaches a device through the Kernel's checks and its write-command log.

Topic discovery is fail-closed as well. Anyone who knows the topic can announce on it, so the Kernel registers only Worker RPC
keys on `discovery.workerKeys` (or added at runtime with `kernel.allowWorkerKey()`); an empty list admits nobody.
`discovery.allowAnyWorker: true` admits every topic peer; it exists for local experiments only and logs a warning at start.
`kernel.registerWorker()` and the `mdk-core` local-discovery mode hand the key in directly and skip the topic allowlist.
Identity and capability replies are validated against the protocol schemas, and each `workerId` is bound to the first RPC key it registered with (persisted), so a second key claiming that id is refused
until an admin terminates the old registration (`worker.terminate`).

### Input limits

Every request runs `validateFull` (envelope plus per-action payload schema) before routing. Caller arrays are capped
(`LIMITS` in [`protocol/schemas.js`](lib/protocol/schemas.js): 1000 `targets`/`ids`, 100 `batchActionsPayload`, 50
`queries`, 256 `authPerms`/`params`). `action.query` filters accept only plain comparison and logical operators
(`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`, `$nor`, `$not`, `$exists`, `$type`, `$size`,
`$all`, `$elemMatch`); `$regex`, `$where`, `$expr` and anything else is `ERR_QUERY_INVALID`.

> [!NOTE]
> The [`auth-whitelist` example](../../../examples/mvp-site/backend/auth-whitelist.example.js) shows the two-run key exchange with
> explicit admission. It starts the Gateway with `kernelKey` rather than the live Kernel, so the first run refuses the published
> Gateway key and the second admits it. Each run calls Kernel to show that admission alone grants nothing: the admitted Gateway is still
> refused until it presents an access token that `spec.rbac` allows.
> [Step 2 of the security blueprint](../../../docs/guides/security/index.md#step-2-admit-the-gateway-to-kernel) covers admitting the Gateway in
> production.

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
| `COMMAND_LOG`             | `command.log`              | Gateway → Kernel            |
| `ACTION_PUSH`             | `action.push`              | Gateway → Kernel            |
| `ACTION_PUSH_BATCH`       | `action.push-batch`        | Gateway → Kernel            |
| `ACTION_GET`              | `action.get`               | Gateway → Kernel            |
| `ACTION_GET_BATCH`        | `action.get-batch`         | Gateway → Kernel            |
| `ACTION_QUERY`            | `action.query`             | Gateway → Kernel            |
| `ACTION_VOTE`             | `action.vote`              | Gateway → Kernel            |
| `ACTION_CANCEL_BATCH`     | `action.cancel-batch`      | Gateway → Kernel            |
| `RBAC_GET`                | `rbac.get`                 | CLI → Kernel                |
| `RBAC_APPLY`              | `rbac.apply`               | CLI → Kernel                |
| `AUTH_LOGIN`              | `auth.login`               | Gateway / CLI → Kernel      |
| `AUTH_REFRESH`            | `auth.refresh`             | Gateway / CLI / app → Kernel |
| `AUTH_TOKEN`              | `auth.token`               | App runtime / agent → Kernel |
| `AUTH_LOGOUT`             | `auth.logout`              | Gateway / CLI → Kernel      |
| `AUTH_JWKS`               | `auth.jwks`                | Gateway / MCP → Kernel      |
| `IDENTITY_USER_LIST`      | `identity.user.list`       | CLI → Kernel                |
| `IDENTITY_USER_UPSERT`    | `identity.user.upsert`     | CLI → Kernel                |
| `IDENTITY_USER_DELETE`    | `identity.user.delete`     | CLI → Kernel                |
| `IDENTITY_SA_LIST`        | `identity.sa.list`         | CLI → Kernel                |
| `IDENTITY_SA_UPSERT`      | `identity.sa.upsert`       | CLI → Kernel                |
| `IDENTITY_SA_DELETE`      | `identity.sa.delete`       | CLI → Kernel                |
| `IDENTITY_KEYS_ROTATE`    | `identity.keys.rotate`     | CLI → Kernel                |
| `WRITE_CALLS_REQUEST`     | `write.calls.request`      | Kernel → Worker             |
| `WRITE_CALLS_RESPONSE`    | `write.calls.response`     | Worker → Kernel             |

### Command control

Beyond the basic dispatch/result cycle, three exported constants extend the CSM with status queries, cancellation, and scoped fan-out.

**`COMMAND_STATUS` / `COMMAND_STATUS_RESPONSE`**: query the state of an in-flight command, or of a settled one for `commandResultTtlMs` after it settles. The Gateway sends `command.status` with a `commandId` (`mdkClient.getCommandStatus(commandId)`); Kernel replies with the current CSM state (`QUEUED`, `DISPATCHED`, `EXECUTING`, `SUCCESS`, `FAILED`, or `TIMEOUT`), its `result` or `error`, and the device `verification` described under [`CommandStateMachine`](#commandstatemachine). Routed by [`envelope-router.js`](./lib/transport/envelope-router.js) → `dispatcher.getStatus(commandId)`.

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
| `kernel-rbac`        | The `spec.rbac` in force and every applied version |
| `kernel-identity`    | Users, service accounts, signing keys and sessions |

`kernel-rbac` holds the [RBAC](../rbac/README.md) policy. `createKernel({ rbac })` (and `getKernel`) takes `spec.rbac` from
`mdk.yaml`: `init()` refuses an invalid one with `ERR_RBAC_POLICY_INVALID`, and `start()` applies it; `null` applies the empty
policy, which denies everything. Without the option the Kernel reloads the last applied policy. `rbac.apply` switches a running
Kernel to a new policy, and a refused one leaves the policy in force untouched.

`kernel-identity` holds the [token issuer](../identity/README.md). `createKernel({ serviceAccounts })` (and `getKernel`) takes the
stack's service accounts as `{ name, publicKey }`, and `start()` makes the registered set exactly that list; without the option the
registered accounts are kept. `createKernel({ identity })` sets the issuer name and token lifetimes. `auth.token` binds a service
account's tokens to the HRPC caller that signed in, unless the payload sends `bind: false`; `auth.refresh` of a bound session only
works from that caller. `kernel.verifyToken(token, { cnf })` verifies an access token the Kernel issued.

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
| `ERR_COMMAND_UNCONFIRMED` | A command was sent to its Worker but no response arrived (send timeout, channel error, or Kernel crash mid-flight); it may have run | Read the device state back and resubmit only if the command did not take effect; Kernel never retries it |
| `ERR_DEVICE_ID_REQUIRED` | A device-scoped command omits `deviceId` on the envelope                    | Set `deviceId` on the envelope |
| `ERR_DEVICE_NOT_FOUND`   | No registered Worker owns the given `deviceId`                              | Target a `deviceId` registered by a ready Worker |
| `ERR_KERNEL_ACTION_CALLS_EMPTY` | An action push resolves to no executable write calls, either for a specific Worker or across all Workers | Confirm the query matches ready Workers and the caller holds the required write permissions |
| `ERR_KERNEL_ACTION_FORBIDDEN` | The request's token is valid but no rule in `spec.rbac` grants its identity the action's resource and verb, for each instance the request touches (named in the message) | Bind the identity to a role that allows it in `mdk.yaml`, then `mdk rbac apply` |
| `ERR_KERNEL_ALLOW_ALL_REMOVED` | `auth.allowAll` or `hrpc.allowAll` is set                                  | Admit callers by key: `auth.whitelist`, `kernel.allowKey()` or the trusted-keys dir |
| `ERR_KERNEL_CALLER_ROLES_UNSUPPORTED` | An allowlist entry carries `roles`                              | List the key alone; bind its token's identity to roles in `spec.rbac` |
| `ERR_KERNEL_NO_AUTHORIZER` | An HRPC caller reaches a router built without an authorizer          | Route requests through a `KernelManager`, which wires its authorizer |
| `ERR_KERNEL_NO_DISCOVERY` | `registerWorker` runs on a Kernel started without discovery configured     | Pass `discovery.topic` (DHT mode) or `discovery: { mode: 'local' }` before registering Workers |
| `ERR_KERNEL_NO_IDENTITY` | An `auth.*` or `identity.*` action reaches a listener built without a token issuer | Route identity actions through a `KernelManager`, which wires its issuer |
| `ERR_KERNEL_NO_RBAC`     | `rbac.get` or `rbac.apply` reaches a listener built without a policy store  | Route RBAC actions through a `KernelManager`, which wires its store |
| `ERR_KERNEL_NOT_INITIALIZED` | `start()` is called before the Kernel is initialized                    | Call `init()` before `start()` |
| `ERR_KERNEL_NOT_STARTED` | `registerWorker` is called before the Kernel is started                     | Start the Kernel before registering Workers |
| `ERR_KERNEL_SERVICE_ACCOUNTS_INVALID` | `ctx.serviceAccounts` is not a list                               | Pass `[{ name, publicKey }]`, or omit it |
| `ERR_KERNEL_SHUTDOWN`    | A command is executing or dispatched when the Kernel drains for shutdown    | After the Kernel restarts, read the device state back and resubmit only if the command did not take effect |
| `ERR_KERNEL_ACTOR_INVALID` | `envelope.actor` fails verification: malformed, expired, revoked, not a user's token, or bound to a transport key (the `ERR_IDENTITY_TOKEN_*` code follows) | The operator signs in again; send only a user's access token as the actor |
| `ERR_KERNEL_TOKEN_INVALID` | `envelope.auth` fails verification: malformed, expired, signed by an unknown key, or bound to another transport key (the `ERR_IDENTITY_TOKEN_*` code follows) | Sign in again; use a token only from the caller it was issued to |
| `ERR_KERNEL_TOKEN_REQUIRED` | A request other than sign-in (`auth.*`) carries no `envelope.auth` | Sign in, and send the access token with every request (`kernelCredential` on the client) |
| `ERR_PARAM_RANGE`        | A numeric command parameter falls below its declared `min` or above its `max` | Pass a value within the parameter's declared range |
| `ERR_PARAM_TYPE`         | A command parameter's value does not match its declared type                | Pass the parameter as its declared type |
| `ERR_PARAMS_INVALID`     | A write-call request's `params` is not an array                             | Pass `params` as an array |
| `ERR_PAYLOAD_FIELD_REQUIRED` | An `auth.*` or `identity.*` payload omits a required string field (named in the message) | Send the field |
| `ERR_PAYLOAD_INVALID`    | `pushActionsBatch` receives a `batchActionsPayload` that is not an array, an `auth.*` or `identity.*` payload is not an object, or `auth.token`'s `bind` is not a boolean | Send the payload in the documented shape |
| `ERR_PAYLOAD_RBAC_INVALID` | A `rbac.apply` payload's `rbac` is neither a mapping nor `null`           | Send `spec.rbac` as a mapping, or `null` for no policy |
| `ERR_PAYLOAD_RBAC_REQUIRED` | A `rbac.apply` payload carries no `rbac` field                           | Send `{ rbac }` |
| `ERR_QUERIES_INVALID`    | `queryActions` receives a `queries` value that is not an array              | Pass `queries` as an array |
| `ERR_QUERIES_TYPE_INVALID` | A query entry omits a string `type`                                       | Give every query entry a string `type` |
| `ERR_QUERY_INVALID`      | A write-call `query` is not a plain object or is not a valid mingo query    | Pass a valid mingo query object |
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
│   └── kernel.json.example   # Config template: HRPC allowlist (empty = nobody), discovery topic/workerKeys/allowAnyWorker, cadences
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
- [Secure the site](../../../docs/guides/security/index.md): the allowlist in production, end to end
- Understand [which layer owns what, and how a request reaches a device](../../../docs/concepts/control-plane.md)
- Learn how [Workers register devices and expose capabilities](../../workers/README.md), and how [Kernel discovers them](../../workers/docs/architecture.md#discovery-model)
- See the [write-action approval flow (UI → Gateway → Kernel)](../../../docs/guides/gateway/write-actions.md)
- Choose a [deployment shape](../../../docs/concepts/deployment-topologies.md)
- See the [full MDK architectural model](../../../docs/concepts/architecture.md)
