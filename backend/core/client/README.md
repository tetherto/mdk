# @tetherto/mdk-client

## Overview

MDK Protocol client for [Kernel](../kernel/README.md). Encodes MDK Protocol envelopes and sends them to Kernel over **HRPC** (the
`@hyperswarm/rpc` listener, by public key). This is the transport layer
used by the [Gateway](../gateway/README.md) (and any other process) to talk to Kernel — and, by key, directly to a
[Worker's](../../workers/README.md) RPC server.

> [!TIP]
> `@tetherto/mdk-client` is the protocol connector every Kernel caller uses — the [Gateway](../gateway/README.md) wraps
> it internally. For the full layer model, read the [Gateway README](../gateway/README.md)
> and/or the [architecture overview](../../../docs/concepts/architecture.md).

## When to use which client path

Use [`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client) for a Gateway plugin or any other consumer
talking to Kernel: device commands, status queries, telemetry pulls, and, through it,
[`sendWorkerCommand`](#sendworkercommandworkerid-deviceid-command-params-opts--promiseobject) /
[`pullWorkerTelemetry`](#pullworkertelemetryworkerid-query-opts--promiseobject) for provisioning operations
(`registerThing`, `forgetThings`) or Worker-scoped historical queries (logs, stats) that aggregate across a Worker's own
store.

> [!NOTE]
> Kernel also exposes `registerThing`/`forgetThings` as governed [write actions](#write-action-methods) and
> `pushAction`/`voteAction` for when you want the approval/voting flow instead of a direct call.

## Prerequisites

- Node.js >= 24. `@tetherto/mdk-client` ships as a Node.js package; no Python, Go, or other-language client exists yet

## Install

```bash
npm install @tetherto/mdk-client
```

## Usage

[`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client) is auto-connecting: [`connect()`](#connectopts--promisevoid)
is optional (only needed for an up-front warmup) — methods connect lazily on first use.

```js
const { createMdkClient } = require('@tetherto/mdk-client')

// kernelKey: from kernel.getPublicKey() in-process, or the key file Kernel
// publishes on start (`@tetherto/mdk-core`'s DEFAULT_KEY_FILE). Inside a Gateway
// plugin, pass the config from require('@tetherto/mdk-gateway/plugin')
// directly — kernelKey/kernelBootstrap are already folded in.
const client = createMdkClient({ kernelKey })

// Aggregated, retry-wrapped status (recommended for tooling/operators)
const { workers, totalDevices } = await client.getStatus()

// Pull telemetry for a device
const telemetry = await client.pullTelemetry('wm-001', 'metrics')

// Send a command
const result = await client.sendCommand('wm-001', 'reboot', {})

await client.close()
```

Want [`connect()`](#connectopts--promisevoid) mandatory before the first request instead of lazy, or need to inject a
raw test transport by hand? Use [`createRawMdkClient`](#createrawmdkclientopts--client), which
[`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client) wraps.

## API

### `createMdkClient(config, opts?)` → auto-connecting client

The client most consumers want: instantiate once from an ambient config and call action methods directly —
`mdkClient.listWorkers()` — like any connection-pooling DB client. The first method call connects (memoized); a
failed connect resets the memo so the next request retries. `connect()` is optional (explicit warm-up); `close()`
tears the connection down and lets a later call reconnect. There is no background reconnect loop and no backoff timer:
recovery is always driven by the next caller-initiated request.

| Argument | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `config.kernelKey` | Required unless `opts.transport` is set | `string \| Buffer` | None | The Kernel listener's public key. Inside a Gateway plugin, pass the whole `config` from `require('@tetherto/mdk-gateway/plugin')` — this is already folded in. |
| `config.kernelBootstrap` | Optional | `object` | None | HRPC bootstrap override, folded in the same way |
| `opts.errorCode` | Optional | `string` | `'ERR_MDK_CLIENT_UNAVAILABLE'` | Overrides the rejection code every request-issuing method throws when there's no connection. Not validated against the [documented error codes](#errors): any string is accepted, since a Gateway plugin commonly passes its own code instead. |
| `opts.transport` | Required unless `config.kernelKey` is set | `object` | None | Pre-built transport (`{ connect, close, request }`). Test seam — satisfies the `kernelKey` requirement instead. |

A host booted without a reachable Kernel keeps its routes up and fails per request with `opts.errorCode`, rather than
failing to boot.

### `createRawMdkClient(opts)` → client

The low-level factory `createMdkClient` wraps: opens a persistent connection and exposes the same method surface,
but the caller owns the lifecycle — call `connect()` before the first request. Use it directly for explicit
lifecycle control (an up-front warmup, a test transport) rather than [`createMdkClient`](#createmdkclientconfig-opts--auto-connecting-client)'s
ambient-config, auto-connecting form.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `opts.hrpc` | Required unless `opts.transport` is set | `object` | None | HRPC transport opts: `{ key, seed?, bootstrap?, dht?, rpc? }`. `key` is the Kernel listener **or** a Worker's RPC public key (hex string or Buffer) |
| `opts.transport` | Required unless `opts.hrpc` is set | `object` | None | Pre-built transport (`{ connect, close, request }`). Test seam — satisfies the `hrpc` requirement instead. |

Throws one of the [documented error codes](#errors): `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` or `ERR_MDK_CLIENT_HRPC_KEY_REQUIRED`.

### `createWorkerClient(rpcKey, hrpcOpts?)` → client

Use this for a direct, persistent connection to one Worker — several calls over its lifetime rather than a single
request. Requires the Worker's RPC public key — resolve it with
[`getWorkerKey`](#getworkerkeyworkerid--promisestring--null). Wraps `createRawMdkClient`, so `connect()` is explicit,
same as that factory.

Same client surface as `createMdkClient`; scoped to ops the Worker adapter handles directly (`registerThing`,
`forgetThings`, …) rather than Kernel contract commands. `hrpcOpts` forwards `seed`/`bootstrap`/`dht`/`rpc` to the
transport.

> [!NOTE]
> [`sendWorkerCommand`](#sendworkercommandworkerid-deviceid-command-params-opts--promiseobject) and
> [`pullWorkerTelemetry`](#pullworkertelemetryworkerid-query-opts--promiseobject) build one of these internally per call
> and close it. Call those for a single request.

```js
const { createWorkerClient } = require('@tetherto/mdk-client')
const wc = createWorkerClient(workerRpcKey)
await wc.connect()
await wc.sendCommand('wm-001', 'registerThing', params)
await wc.close()
```

### Client methods

#### `connect(opts?)` → `Promise<void>`

Open the connection to Kernel (or the Worker). Required before any other method on a `createRawMdkClient`/
`createWorkerClient` client; optional on a `createMdkClient` client, which connects itself on first use — call it
explicitly only for an up-front warmup.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `warmup` | Optional | `boolean` | `false` | Issue a best-effort `listWorkers()` after connecting to absorb the first-request DHT-route flake, so the first *real* request (including commands) is stable. Never throws — a failed warmup is swallowed. |
| `warmupRetries` | Optional | `number` | `3` | Warmup attempts |
| `warmupDelayMs` | Optional | `number` | `600` | Delay between warmup attempts |

`connect()` with no arguments behaves exactly as before (resolves once the transport connects; issues no request).

#### `close()` → `Promise<void>`

Close the connection.

#### `getStatus(opts?)` → `Promise<{ workers, totalDevices }>`

Read-only status aggregator over `listWorkers()` with built-in **first-request retry** and a timeout. Safe to retry because it only reads.
Returns a stable, shaped result for tooling.

```js
const { workers, totalDevices } = await client.getStatus()
// workers: [{ workerId, state, healthState, deviceIds, deviceCount, rpcKey }]
```

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `retries` | Optional | `number` | `3` | Attempts before giving up |
| `retryDelayMs` | Optional | `number` | `600` | Delay between attempts |
| `timeoutMs` | Optional | `number` | `8000` | Per-attempt timeout; rejects with `ERR_MDK_STATUS_TIMEOUT` |

#### `listWorkers()` → `Promise<{ workers }>`

Raw `WORKER_LIST` response from the Kernel registry. Prefer `getStatus()` for the shaped, retry-wrapped form.

```js
const { workers } = await client.listWorkers()
// workers: [{ workerId, state, deviceIds, healthState, rpcKey }]
```

#### `waitForWorkers(opts?)` → `Promise<worker[]>`

Poll `getStatus()` until `count` Workers are READY, then resolve the matching Workers. Out-of-process readiness wait for callers holding
only the Kernel key (the in-process equivalent is `@tetherto/mdk-core`'s `waitForDiscovery`). Throws `ERR_MDK_WAIT_WORKERS_TIMEOUT` on timeout.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `count` | Optional | `number` | `1` | Number of READY Workers to wait for |
| `requireDevices` | Optional | `boolean` | `true` | Only count Workers with ≥1 device |
| `timeoutMs` | Optional | `number` | `30000` | Overall timeout |
| `intervalMs` | Optional | `number` | `1000` | Poll interval |

#### `waitForDevice(deviceId, opts?)` → `Promise<true>`

Poll until `deviceId` appears in the Kernel registry (optionally under a specific `workerId`). Used after provisioning to confirm the device synced.
Throws `ERR_MDK_WAIT_DEVICE_TIMEOUT` on timeout.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `workerId` | Optional | `string` | `null` | Restrict the match to this Worker |
| `timeoutMs` | Optional | `number` | `30000` | Overall timeout |
| `intervalMs` | Optional | `number` | `1000` | Poll interval |

#### `getCapabilities(deviceId)` → `Promise<{ capabilities }>`

Fetch the `mdk-contract.json` capabilities for a device as declared by its Worker.

#### `pullTelemetry(deviceId, queryType?)` → `Promise<object>`

Pull telemetry from the Worker managing the given device. `queryType` defaults to `'metrics'`, and may be a string or a full query
object (`{ type, key, tag, start, end, limit, ... }`).

Available query types:

| Type | Returns |
|------|---------|
| `metrics` | Live hashrate, power, temperature, fan speeds |
| `list` | All registered devices |
| `count` | Device count |
| `logs` | Recent log entries |
| `logs_multi` | Logs for multiple devices |
| `historical_logs` | Historical log query |
| `settings` | Worker settings |
| `config` | Worker config |
| `thing_config` | Individual device config |
| `stats` | Aggregated statistics |
| `ext_data` | Extended device data |

#### `pullState(deviceId)` → `Promise<object>`

Fetch a snapshot of the Worker's state machine status for the given device.

#### `sendCommand(deviceId, command, params?)` → `Promise<object>`

Dispatch a command to the Worker managing `deviceId`. When the client is connected to the **Kernel**, the command must be declared in
the Worker's `mdk-contract.json`. When connected **directly to a Worker** (see `createWorkerClient`), this also reaches adapter-handled
ops like `registerThing`/`forgetThings`. Commands are **never auto-retried** (the Kernel, not the transport, removes duplicate command IDs).

```js
await client.sendCommand('wm-001', 'reboot', {})
await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })
await client.sendCommand('wm-001', 'setupPools', {
  pools: [{ url: 'stratum+tcp://pool.example.com:3333', user: 'worker1', pass: 'x' }]
})
```

**Return value:**

| Field | Type | Description |
| --- | --- | --- |
| `commandId` | `string` | Correlation ID generated by Kernel. Echo this to your caller to allow tracking. |
| `status` | `string` | `'SUCCESS'` or `'FAILED'` |
| `result` | `object` | Command-specific response payload (present when `status` is `'SUCCESS'`) |
| `error` | `string` | Error message (present when `status` is `'FAILED'`) |

```js
const res = await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })
// res.commandId  — 'a3f7...'
// res.status     — 'SUCCESS'
// res.result     — {}
```

#### `getWorkerKey(workerId)` → `Promise<string | null>`

Resolve a Worker's RPC public key (hex) from the Kernel registry (the Kernel learned it via discovery), or `null` if the Worker isn't
registered. Pair with `createWorkerClient`/`sendWorkerCommand` for Worker-direct ops.

#### `sendWorkerCommand(workerId, deviceId, command, params?, opts?)` → `Promise<object>`

Send a Worker-direct command (e.g. `registerThing`) by `workerId` in one call: resolve the Worker's key via the Kernel, open a
short-lived Worker client, send, and close it. Returns the command response. Throws `ERR_MDK_WORKER_KEY_UNKNOWN` if the Worker
isn't in the registry. `opts.hrpc` forwards `seed`/`bootstrap`/`dht`/`rpc` to the Worker client's transport.

```js
// Provision a device on a running Worker, then wait for the Kernel to sync it.
const res = await client.sendWorkerCommand('miner-worker', 'wm-007', 'registerThing', params)
await client.waitForDevice('wm-007', { workerId: 'miner-worker' })
```

#### `pullWorkerTelemetry(workerId, query, opts?)` → `Promise<object>`

Pull telemetry from a Worker directly, scoped to the Worker itself rather than one device — for Worker-infra query
types (`logs`, `logs_multi`, `list`, `stats`, `ext_data`) that aggregate over the Worker's own store. Resolves the
Worker's key via the Kernel registry, opens a short-lived Worker client, and closes it. Resolves with the bare
payload, like the Kernel-side helpers. Throws `ERR_MDK_WORKER_KEY_UNKNOWN` if the Worker isn't in the registry.
`opts.hrpc` forwards `seed`/`bootstrap`/`dht`/`rpc` to the short-lived Worker client's transport.

```js
const history = await client.pullWorkerTelemetry('miner-worker', { type: 'logs', key: 'stat-1D', tag: 't-miner', start, end })
```

#### `terminateWorker(workerId)` → `Promise<object>`

Signal Kernel to evict a Worker from the registry. The Worker process itself continues running; it re-registers the next time it connects.

### Write-action methods

The write-action methods wrap the `action.*` protocol envelope set and call through to the Kernel's `ActionManager`. They bypass the Gateway auth
layer — the caller is responsible for its own access control.

> [!NOTE]
> [React hook equivalents are available](../../../docs/concepts/control-plane.md#developer-surfaces).

#### `pushAction(opts)` → `Promise<object>`

Stage a single write action for approval. `opts`: `{ query, action, params, voter, authPerms, batchActionUID }`.

#### `pushActionsBatch(opts)` → `Promise<object>`

Stage a batch of write actions in one envelope. `opts`: `{ batchActionsPayload, voter, authPerms, batchActionUID, suffix }`.

#### `getAction({ id, type })` → `Promise<object>`

Fetch a single staged action by `id` and `type` (for example `'voting'`).

#### `getActionsBatch({ ids })` → `Promise<object>`

Fetch multiple staged actions by an array of ids.

#### `queryActions(opts)` → `Promise<object>`

Query staged actions with MongoDB-style filter expressions. `opts`: `{ queries, suffix, groupBatch }`.

#### `voteAction(opts)` → `Promise<1>`

Cast an approve or reject vote on a staged action. `opts`: `{ id, voter, approve, authPerms }`. Kernel checks the required
device-family permissions (`miner:w`, `container:w`, etc.) from `authPerms` before recording the vote.

#### `cancelActionsBatch(opts)` → `Promise<object[]>`

Cancel one or more staged actions by ids. `opts`: `{ ids, voter }`.

## Errors

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_MDK_CLIENT_UNAVAILABLE` | `createMdkClient`'s `config.kernelKey` is missing, or connecting failed | Supply `config.kernelKey` (or `opts.transport`), or check Kernel connectivity |
| `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` | `createRawMdkClient` called with neither `opts.hrpc` nor `opts.transport` | Pass one of them |
| `ERR_MDK_CLIENT_HRPC_KEY_REQUIRED` | `createRawMdkClient({ hrpc: {...} })` called without `hrpc.key` | Pass the Kernel's or a Worker's public key as `hrpc.key` |
| `ERR_MDK_CLIENT_NO_SUCH_METHOD` | A `createMdkClient` call resolves to a property that isn't a function on the raw client | Check the method name |
| `ERR_HRPC_NOT_CONNECTED` | A `createRawMdkClient`/`createWorkerClient` client's request-issuing method (not e.g. `close()`) is called before `connect()` has run, or after `close()` | Call `connect()` first |
| `ERR_MDK_STATUS_TIMEOUT` | `getStatus()`'s per-attempt timeout elapsed without Kernel answering `listWorkers()` | Increase `timeoutMs`, or check Kernel reachability |
| `ERR_MDK_WAIT_WORKERS_TIMEOUT` | `waitForWorkers()` gave up: fewer than `count` Workers were READY (and, since `requireDevices` defaults `true`, had at least one device) within `timeoutMs` | Increase `timeoutMs`, or lower `count`, or confirm the Workers are actually starting with devices |
| `ERR_MDK_WAIT_DEVICE_TIMEOUT` | `waitForDevice()` gave up: `deviceId` never appeared in the Kernel registry within `timeoutMs`, optionally scoped to a specific `workerId` | Confirm the device is being provisioned (on that Worker, if `workerId` was passed); increase `timeoutMs` |
| `ERR_MDK_WORKER_KEY_UNKNOWN` | `sendWorkerCommand`/`pullWorkerTelemetry` called with a `workerId` the Kernel registry doesn't know | Confirm the Worker is running and registered |

## Transport details

HRPC is the only transport: each request is an independent `@hyperswarm/rpc` call to the listener's `mdk` responder, so concurrent requests are
multiplexed by the RPC layer (no FIFO queue). The same transport addresses the Kernel listener or any Worker's RPC server by public key.
The first request after `connect()` can flake while the DHT route settles — use `getStatus()` (built-in retry) or `connect({ warmup: true })`.

Every message is a fully formed MDK Protocol envelope and the model is request/response (one response per request).

## Use in Gateway

Every Gateway plugin builds its own client from its per-plugin context, once per plugin, in a `lib/client.js` every
controller in the plugin requires — this is the shipped pattern (`site-monitor`, `site-hashrate`, `telemetry`):

```js
// lib/client.js
const { createMdkClient } = require('@tetherto/mdk-client')
const { config } = require('@tetherto/mdk-gateway/plugin')

module.exports = createMdkClient(config, { errorCode: 'ERR_KERNEL_CLIENT_NOT_CONNECTED' })
```

If you are writing a custom Gateway or a standalone tool that needs to talk to Kernel outside a plugin, `@tetherto/mdk-client`
is still the correct package — build a `kernelKey`-bearing config yourself:

```js
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ kernelKey })

// Wait for the fleet to come up, then read the site-wide device list.
await client.waitForWorkers({ count: 4 })
const { workers } = await client.getStatus()
const allDeviceIds = workers.flatMap(w => w.deviceIds)
```

## Directory layout

```text
client/
├── index.js              # Exports createMdkClient, createWorkerClient
├── lib/
│   └── hrpc-client.js     # HRPCClient — @hyperswarm/rpc transport (by key)
└── tests/
    └── unit/              # One suite per lib module + client-facing behavior
```

## Next steps

- [Run Kernel and the Gateway](../../../docs/guides/gateway/run.md) — Kernel must be running before `client.connect()` can succeed
- [Understand how a Gateway plugin builds its own `mdk-client` and what the Gateway adds around it](../gateway/README.md#extend-the-gateway)
- [Understand the MDK Protocol and Kernel's role as the kernel](../../../docs/concepts/architecture.md)
- [Full-site example](../../../examples/full-site/README.md) — see `createMdkClient` used end-to-end with Kernel and Workers
- [`startGateway()` option reference](../mdk/README.md) — if you are wiring `mdk-client` into a custom Gateway
