# @tetherto/mdk-client

MDK Protocol client for ORK. Encodes MDK Protocol envelopes and sends them to ORK over **HRPC** (the `@hyperswarm/rpc` gateway, by public key) or **IPC** (a local Unix socket). This is the transport layer used by the App Node (and any other process) to talk to ORK — and, by key, directly to a worker's RPC server.

## Install

```bash
npm install @tetherto/mdk-client
```

## Usage

```js
const { createMdkClient } = require('@tetherto/mdk-client')

// HRPC — connect to the ORK gateway by its public key (hex or Buffer)
const client = createMdkClient({ hrpc: { key: orkPublicKey } })
// ...or IPC — connect over a local Unix socket
// const client = createMdkClient({ ipc: '/tmp/mdk/ork.sock' })

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

Exactly one transport option must be given.

| Option | Type | Description |
|--------|------|-------------|
| `opts.hrpc` | `object` | HRPC transport opts: `{ key, seed?, bootstrap?, dht?, rpc? }`. `key` is the ORK gateway **or** a worker's RPC public key (hex string or Buffer). |
| `opts.ipc` | `string` | Path to the ORK Unix socket. |
| `opts.transport` | `object` | Pre-built transport (`{ connect, close, request }`). Test seam — bypasses `hrpc`/`ipc` selection. |

Throws `ERR_MDK_CLIENT_TRANSPORT_REQUIRED` if none is given, or `ERR_MDK_CLIENT_HRPC_KEY_REQUIRED` if `hrpc` is passed without a `key`.

### `createWorkerClient(rpcKey, hrpcOpts?)` → client

Convenience factory for a client bound **directly to a worker** by its RPC public key (resolve the key with [`getWorkerKey`](#getworkerkeyworkerid--promisestring--null)). Same client surface as `createMdkClient`; use it for ops the worker adapter handles directly (`registerThing`, `forgetThings`, …) rather than ORK contract commands. `hrpcOpts` forwards `seed`/`bootstrap`/`dht`/`rpc` to the transport.

```js
const { createWorkerClient } = require('@tetherto/mdk-client')
const wc = createWorkerClient(workerRpcKey)
await wc.connect()
await wc.sendCommand('wm-001', 'registerThing', params)
await wc.close()
```

### Client methods

#### `connect(opts?)` → `Promise<void>`

Open the connection to ORK (or the worker). Must be called before any other method.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `warmup` | `boolean` | `false` | Issue a best-effort `listWorkers()` after connecting to absorb the first-request DHT-route flake, so the first *real* request (including commands) is stable. Never throws — a failed warmup is swallowed. |
| `warmupRetries` | `number` | `3` | Warmup attempts. |
| `warmupDelayMs` | `number` | `600` | Delay between warmup attempts. |

`connect()` with no arguments behaves exactly as before (resolves once the transport connects; issues no request).

#### `close()` → `Promise<void>`

Close the connection.

#### `getStatus(opts?)` → `Promise<{ workers, totalDevices }>`

Read-only status aggregator over `listWorkers()` with built-in **first-request retry** and a timeout. Safe to retry because it only reads. Returns a stable, shaped result for tooling.

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

Raw `WORKER_LIST` response from the ORK registry. Prefer `getStatus()` for the shaped, retry-wrapped form.

```js
const { workers } = await client.listWorkers()
// workers: [{ workerId, state, deviceIds, healthState, rpcKey }]
```

#### `waitForWorkers(opts?)` → `Promise<worker[]>`

Poll `getStatus()` until `count` workers are READY, then resolve the matching workers. Out-of-process readiness wait for callers holding only the ORK key (the in-process equivalent is `@tetherto/mdk`'s `waitForDiscovery`). Throws `ERR_MDK_WAIT_WORKERS_TIMEOUT` on timeout.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `count` | `number` | `1` | Number of READY workers to wait for. |
| `requireDevices` | `boolean` | `true` | Only count workers with ≥1 device. |
| `timeoutMs` | `number` | `30000` | Overall timeout. |
| `intervalMs` | `number` | `1000` | Poll interval. |

#### `waitForDevice(deviceId, opts?)` → `Promise<true>`

Poll until `deviceId` appears in the ORK registry (optionally under a specific `workerId`). Used after provisioning to confirm the device synced. Throws `ERR_MDK_WAIT_DEVICE_TIMEOUT` on timeout.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `workerId` | `string` | `null` | Restrict the match to this worker. |
| `timeoutMs` | `number` | `30000` | Overall timeout. |
| `intervalMs` | `number` | `1000` | Poll interval. |

#### `getCapabilities(deviceId)` → `Promise<{ capabilities }>`

Fetch the `mdk-contract.json` capabilities for a device as declared by its worker.

#### `pullTelemetry(deviceId, queryType?)` → `Promise<object>`

Pull telemetry from the worker managing the given device. `queryType` defaults to `'metrics'`, and may be a string or a full query object (`{ type, key, tag, start, end, limit, ... }`).

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

Fetch a snapshot of the worker's state machine status for the given device.

#### `sendCommand(deviceId, command, params?)` → `Promise<object>`

Dispatch a command to the worker managing `deviceId`. When the client is connected to the **ORK**, the command must be declared in the worker's `mdk-contract.json`. When connected **directly to a worker** (see `createWorkerClient`), this also reaches adapter-handled ops like `registerThing`/`forgetThings`. Commands are **never auto-retried** (the ORK, not the transport, dedups command IDs).

```js
await client.sendCommand('wm-001', 'reboot', {})
await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })
await client.sendCommand('wm-001', 'setupPools', {
  pools: [{ url: 'stratum+tcp://pool.example.com:3333', user: 'worker1', pass: 'x' }]
})
```

#### `getWorkerKey(workerId)` → `Promise<string | null>`

Resolve a worker's RPC public key (hex) from the ORK registry (the ORK learned it via discovery), or `null` if the worker isn't registered. Pair with `createWorkerClient`/`sendWorkerCommand` for worker-direct ops.

#### `sendWorkerCommand(workerId, deviceId, command, params?, opts?)` → `Promise<object>`

Send a worker-direct command (e.g. `registerThing`) by `workerId` in one call: resolve the worker's key via the ORK, open a short-lived worker client, send, and close it. Returns the command response. Throws `ERR_MDK_WORKER_KEY_UNKNOWN` if the worker isn't in the registry. `opts.hrpc` forwards `seed`/`bootstrap`/`dht`/`rpc` to the worker client's transport.

```js
// Provision a device on a running worker, then wait for the ORK to sync it.
const res = await client.sendWorkerCommand('miner-worker', 'wm-007', 'registerThing', params)
await client.waitForDevice('wm-007', { workerId: 'miner-worker' })
```

#### `terminateWorker(workerId)` → `Promise<object>`

Signal ORK to evict a worker from the registry. The worker process itself continues running; it will re-register the next time it connects.

## Transport details

- **HRPC** — each request is an independent `@hyperswarm/rpc` call to the gateway's `mdk` responder, so concurrent requests are multiplexed by the RPC layer (no FIFO queue). The same transport addresses the ORK gateway or any worker's RPC server by public key. The first request after `connect()` can flake while the DHT route settles — use `getStatus()` (built-in retry) or `connect({ warmup: true })`.
- **IPC** — a Unix socket (`net.Socket`) exchanging newline-delimited JSON envelopes, one request in-flight per socket.

Either way, every message is a fully-formed MDK Protocol envelope and the model is request/response (one response per request).

## Use in App Node

The App Node uses `createMdkClient` internally. If you are writing a custom App Node or a standalone tool that needs to talk to ORK, this is the correct package to use.

```js
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ hrpc: { key: orkPublicKey } })
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
    ├── hrpc-client.js     # HRPCClient — @hyperswarm/rpc transport (by key)
    └── ipc-client.js      # IPCClient  — Unix socket transport
```
