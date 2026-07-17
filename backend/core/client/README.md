# @tetherto/mdk-client

## Overview

MDK Protocol client for [Kernel](../kernel/README.md). Encodes MDK Protocol envelopes and sends them to Kernel over **HRPC** (the
`@hyperswarm/rpc` listener, by public key). This is the transport layer
used by the [Gateway](../gateway/README.md) (and any other process) to talk to Kernel — and, by key, directly to a 
[Worker's](../../../docs/concepts/stack/workers.md) RPC server.

> [!TIP]
> `@tetherto/mdk-client` is the protocol connector every Kernel caller uses — the [Gateway](../gateway/README.md) wraps
> it internally. For the full layer model, read the [Gateway concept page](../../../docs/concepts/stack/gateway.md)
> and/or the [architecture overview](../../../docs/concepts/architecture.md).

## Prerequisites

- Node.js >= 24

## Install

```bash
npm install @tetherto/mdk-client
```

## Usage

```js
const { createMdkClient } = require('@tetherto/mdk-client')

// HRPC — connect to the Kernel listener by its public key (hex or Buffer).
// Get the key from kernel.getPublicKey() in-process, or read the key file
// the Kernel publishes on start (`@tetherto/mdk`'s DEFAULT_KEY_FILE).
const client = createMdkClient({ hrpc: { key: kernelPublicKey } })

await client.connect()

// Aggregated, retry-wrapped status (recommended for tooling/operators)
const { workers, totalDevices } = await client.getStatus()

// Pull telemetry for a device
const telemetry = await client.pullTelemetry('wm-001', 'metrics')

// Send a command
const result = await client.sendCommand('wm-001', 'reboot', {})

await client.close()
```

## API

### `createMdkClient(opts)` → client

A transport option must be given.

| Option | Type | Description |
|--------|------|-------------|
| `opts.hrpc` | `object` | HRPC transport opts: `{ key, seed?, bootstrap?, dht?, rpc? }`. `key` is the Kernel listener **or** a Worker's RPC public key (hex string or Buffer). |
| `opts.transport` | `object` | Pre-built transport (`{ connect, close, request }`). Test seam — bypasses `hrpc` selection. |

Throws `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` if none is given (including the removed `opts.ipc`), or `ERR_MDK_CLIENT_HRPC_KEY_REQUIRED` if `hrpc` is passed without a `key`.

### `createWorkerClient(rpcKey, hrpcOpts?)` → client

Convenience factory for a client bound **directly to a Worker** by its RPC public key (resolve the key with [`getWorkerKey`](#getworkerkeyworkerid--promisestring--null)). 

Same client surface as `createMdkClient`; use it for ops the Worker adapter handles directly (`registerThing`, `forgetThings`, …) rather 
than Kernel contract commands. `hrpcOpts` forwards `seed`/`bootstrap`/`dht`/`rpc` to the transport.

```js
const { createWorkerClient } = require('@tetherto/mdk-client')
const wc = createWorkerClient(workerRpcKey)
await wc.connect()
await wc.sendCommand('wm-001', 'registerThing', params)
await wc.close()
```

### Client methods

#### `connect(opts?)` → `Promise<void>`

Open the connection to Kernel (or the Worker). Must be called before any other method.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `warmup` | `boolean` | `false` | Issue a best-effort `listWorkers()` after connecting to absorb the first-request DHT-route flake, so the first *real* request (including commands) is stable. Never throws — a failed warmup is swallowed. |
| `warmupRetries` | `number` | `3` | Warmup attempts. |
| `warmupDelayMs` | `number` | `600` | Delay between warmup attempts. |

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retries` | `number` | `3` | Attempts before giving up. |
| `retryDelayMs` | `number` | `600` | Delay between attempts. |
| `timeoutMs` | `number` | `8000` | Per-attempt timeout; rejects with `ERR_MDK_STATUS_TIMEOUT`. |

#### `listWorkers()` → `Promise<{ workers }>`

Raw `WORKER_LIST` response from the Kernel registry. Prefer `getStatus()` for the shaped, retry-wrapped form.

```js
const { workers } = await client.listWorkers()
// workers: [{ workerId, state, deviceIds, healthState, rpcKey }]
```

#### `waitForWorkers(opts?)` → `Promise<worker[]>`

Poll `getStatus()` until `count` Workers are READY, then resolve the matching Workers. Out-of-process readiness wait for callers holding 
only the Kernel key (the in-process equivalent is `@tetherto/mdk`'s `waitForDiscovery`). Throws `ERR_MDK_WAIT_WORKERS_TIMEOUT` on timeout.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `number` | `1` | Number of READY Workers to wait for. |
| `requireDevices` | `boolean` | `true` | Only count Workers with ≥1 device. |
| `timeoutMs` | `number` | `30000` | Overall timeout. |
| `intervalMs` | `number` | `1000` | Poll interval. |

#### `waitForDevice(deviceId, opts?)` → `Promise<true>`

Poll until `deviceId` appears in the Kernel registry (optionally under a specific `workerId`). Used after provisioning to confirm the device synced. 
Throws `ERR_MDK_WAIT_DEVICE_TIMEOUT` on timeout.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `workerId` | `string` | `null` | Restrict the match to this Worker. |
| `timeoutMs` | `number` | `30000` | Overall timeout. |
| `intervalMs` | `number` | `1000` | Poll interval. |

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

#### `terminateWorker(workerId)` → `Promise<object>`

Signal Kernel to evict a Worker from the registry. The Worker process itself continues running; it will re-register the next time it connects.

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

## Transport details

HRPC is the only transport: each request is an independent `@hyperswarm/rpc` call to the listener's `mdk` responder, so concurrent requests are 
multiplexed by the RPC layer (no FIFO queue). The same transport addresses the Kernel listener or any Worker's RPC server by public key. 
The first request after `connect()` can flake while the DHT route settles — use `getStatus()` (built-in retry) or `connect({ warmup: true })`.

Every message is a fully formed MDK Protocol envelope and the model is request/response (one response per request).

## Use in Gateway

The Gateway uses `createMdkClient` internally. If you are writing a custom Gateway or a standalone tool that needs to talk to Kernel, this 
is the correct package to use.

```js
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ hrpc: { key: kernelPublicKey } })
await client.connect({ warmup: true })

// Wait for the fleet to come up, then read the site-wide device list.
await client.waitForWorkers({ count: 4 })
const { workers } = await client.getStatus()
const allDeviceIds = workers.flatMap(w => w.deviceIds)
```

## Directory layout

```
client/
├── index.js              # Exports createMdkClient, createWorkerClient
└── lib/
    └── hrpc-client.js     # HRPCClient — @hyperswarm/rpc transport (by key)
```

## Next steps

- [Run Kernel and the Gateway](../../../docs/guides/gateway/run.md) — Kernel must be running before `client.connect()` can succeed
- [Understand how the Gateway wraps `mdk-client` and what it adds](../../../docs/concepts/stack/gateway.md)
- [Understand the MDK Protocol and Kernel's role as the kernel](../../../docs/concepts/architecture.md)
- [Backend site example](../../../examples/backend/site/README.md) — see `createMdkClient` used end-to-end with Kernel and Workers
- [`startGateway()` option reference](../mdk/README.md) — if you are wiring `mdk-client` into a custom Gateway
