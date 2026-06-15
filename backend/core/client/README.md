# @tetherto/mdk-client

IPC client for ORK. Encodes MDK Protocol envelopes and sends them to the ORK over a Unix socket. This is the transport layer used by the App Node (and any other local process) to communicate with ORK.

## Install

```bash
npm install @tetherto/mdk-client
```

## Usage

```js
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ ipc: '/tmp/mdk/ork.sock' })
await client.connect()

// List all registered workers
const workers = await client.listWorkers()

// Pull telemetry for a device
const telemetry = await client.pullTelemetry('wm-001', 'metrics')

// Send a command
const result = await client.sendCommand('wm-001', 'reboot', {})

client.close()
```

## API

### `createMdkClient(opts)` → client

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `opts.ipc` | `string` | Yes | Path to the ORK Unix socket |

### Client Methods

#### `connect()` → `Promise<void>`

Open the persistent IPC connection to ORK. Must be called before any other method.

#### `close()`

Close the connection.

#### `listWorkers()` → `Promise<{ workers }>`

Returns all workers currently registered in the ORK registry, with their state and device IDs.

```js
const { workers } = await client.listWorkers()
// workers: [{ workerId, state, deviceIds, healthState }]
```

#### `getCapabilities(deviceId)` → `Promise<{ capabilities }>`

Fetch the `mdk-contract.json` capabilities for a device as declared by its worker.

#### `pullTelemetry(deviceId, queryType?)` → `Promise<object>`

Pull telemetry from the worker managing the given device. `queryType` defaults to `'metrics'`.

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

Dispatch a command to the worker managing `deviceId`. The command must be declared in the worker's `mdk-contract.json`.

```js
// Reboot a miner
await client.sendCommand('wm-001', 'reboot', {})

// Set power mode
await client.sendCommand('wm-001', 'setPowerMode', { mode: 'low' })

// Configure pools
await client.sendCommand('wm-001', 'setupPools', {
  pools: [{ url: 'stratum+tcp://pool.example.com:3333', user: 'worker1', pass: 'x' }]
})
```

#### `terminateWorker(workerId)` → `Promise<object>`

Signal ORK to evict a worker from the registry. The worker process itself continues running; it will re-register the next time it connects.

## Transport Details

The client connects over a Unix socket (`net.Socket`) and exchanges newline-delimited JSON messages. Each message is a fully-formed MDK Protocol envelope. The client uses a simple request/response model — one response per request, matched by the connection lifecycle (one request in-flight per socket).

## Use in App Node

The App Node uses `createMdkClient` internally. If you are writing a custom App Node or a standalone tool that needs to talk to ORK, this is the correct package to use.

```js
const { createMdkClient } = require('@tetherto/mdk-client')

const client = createMdkClient({ ipc: process.env.ORK_IPC_PATH || '/tmp/mdk/ork.sock' })
await client.connect()

// Pull site-wide device list
const { workers } = await client.listWorkers()
const allDeviceIds = workers.flatMap(w => w.deviceIds)
```

## Directory Layout

```
client/
├── index.js             # Exports createMdkClient
└── lib/
    └── ipc-client.js    # IPCClient — Unix socket transport
```
