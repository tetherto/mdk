# @tetherto/mdk

Bootstrap utilities for MDK. This package is the primary entry point for application developers. It provides high-level convenience functions that wire together the ORK kernel, device workers, and the App Node HTTP server without requiring direct knowledge of lower-level APIs.

## Install

```bash
npm install @tetherto/mdk
```

## Usage

```js
const { getOrk, startWorker, startAppNode, waitForDiscovery } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')

// 1. Start ORK
const ork = await getOrk()

// 2. Start a worker
const { manager } = await startWorker(WM_M56S, { ork })

// 3. Register a device with the worker
await manager.registerThing({
  info: { serialNum: 'WM-001' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})

// 4. Wait for ORK to discover and register the worker
await waitForDiscovery(ork)

// 5. Optionally start the HTTP API
const server = await startAppNode({ ork, port: 3000, noAuth: true })
```

## API

### `getOrk(opts?)` → `Promise<OrkManager>`

Start the ORK with defaults suited for single-process development. Automatically:
- Reads the DHT topic from `DEFAULT_TOPIC_FILE` (or generates one if absent)
- Opens an IPC socket at `DEFAULT_IPC_SOCK`
- Registers a `SIGINT` handler for graceful shutdown

```js
const ork = await getOrk()
// ork.topic — hex DHT topic used
// ork.getPublicKey() — HRPC public key
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.root` | `string` | Data root directory (default: `os.tmpdir()/mdk`) |
| `opts.storeDir` | `string` | Override Hyperbee store path |
| `opts.topic` | `string` | 32-byte hex DHT topic (overrides topic file) |
| `opts.topicFile` | `string` | Override path to topic file |
| `opts.ipc` | `object\|false` | IPC socket config; `false` to disable |
| `opts.hrpc` | `object\|false` | HRPC config (default: enabled, empty whitelist) |
| `opts.telemetryPullMs` | `number` | Telemetry poll interval in ms |
| `opts.healthPingMs` | `number` | Health ping interval in ms |

### `startWorker(ManagerClass, opts?)` → `Promise<{ manager, adapter, store }>`

Start a device worker and connect it to the ORK via Hyperswarm DHT.

```js
const { manager, adapter } = await startWorker(WM_M56S, {
  ork,                              // OrkManager from getOrk()
  rack: 'rack-1',                   // Rack ID (default: 'rack-1')
  root: './data',                   // Data root
  workerId: 'whatsminer-rack-1'     // Override worker ID
})
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.ork` | `OrkManager` | ORK instance; cleanup is auto-registered |
| `opts.rack` | `string` | Rack/site identifier |
| `opts.root` | `string` | Data root for worker stores and config |
| `opts.workerId` | `string` | Override worker identity string |
| `opts.orkTopic` | `string` | DHT topic to join (reads from topic file if absent) |
| `opts.contract` | `object` | Override `mdk-contract.json` contents |
| `opts.workerPackagePath` | `string` | Path to package containing `mdk-contract.json` |

Returns:
- `manager` — the `ManagerClass` instance (e.g. `WM_M56S`)
- `adapter` — `MDKWorkerAdapter` — the Hyperswarm HRPC bridge
- `store` — `StoreFacility` used by the adapter

### `startAppNode(opts?)` → `Promise<WrkServerHttp>`

Start the Fastify-based HTTP/WebSocket server. Writes config files under `opts.root`, deep-merging any override objects with the example defaults.

```js
const server = await startAppNode({
  ork,
  port: 3000,
  noAuth: true,            // skip OAuth2 (development)
  root: './data/app-node'
})
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.root` | `string` | Config/data root (default: `os.tmpdir()/mdk/app-node`) |
| `opts.port` | `number` | HTTP port (default: 3000) |
| `opts.env` | `string` | Environment string (default: `'development'`) |
| `opts.noAuth` | `boolean` | Skip OAuth2 plugins; use stub config |
| `opts.ork` | `OrkManager` | ORK instance; App Node stop is registered on cleanup |
| `opts.orkIpc` | `string\|false` | IPC socket path for MDK client; `false` to disable |
| `opts.common` | `object` | Overrides for `common.json` |
| `opts.auth` | `object` | Overrides for `auth.config.json` |
| `opts.httpd` | `object` | Overrides for `httpd.config.json` |
| `opts.store` | `object` | Overrides for `store.config.json` |
| `opts.additionalRoutes` | `array` | Extra Fastify route definitions |

### `startOrk(opts?)` → `Promise<OrkManager>`

Lower-level ORK start. Prefer `getOrk()` for new code. Does not register SIGINT or read the topic file.

### `waitForDiscovery(ork, timeout?)` → `Promise<WorkerEntry[]>`

Poll the registry until at least one worker reaches `READY` state with devices populated, or `timeout` ms elapses (default: 30 000 ms). Returns the full list of registered workers.

```js
await waitForDiscovery(ork, 15000)
const workers = ork.registry.listWorkers()
```

### Constants

```js
const { DEFAULT_TOPIC_FILE, DEFAULT_IPC_SOCK } = require('@tetherto/mdk')
// DEFAULT_TOPIC_FILE — os.tmpdir()/mdk/.dht-topic
// DEFAULT_IPC_SOCK   — os.tmpdir()/mdk/ork.sock
```

## Single-Process Full Stack

The typical pattern for running everything in one process during development:

```js
const { getOrk, startWorker, startAppNode, waitForDiscovery } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')
const { AM_S19XP } = require('@tetherto/miner-antminer')

async function main () {
  const ork = await getOrk()

  const { manager: wm } = await startWorker(WM_M56S, { ork })
  await wm.registerThing({ info: { serialNum: 'WM-001' }, opts: { address: '192.168.1.10', port: 14028, password: 'admin' } })

  const { manager: am } = await startWorker(AM_S19XP, { ork })
  await am.registerThing({ info: { serialNum: 'AM-001' }, opts: { address: '192.168.1.20', port: 4028 } })

  await waitForDiscovery(ork)

  await startAppNode({ ork, port: 3000, noAuth: true })
  console.log('MDK running at http://localhost:3000')
}

main()
```

## Config Management

`startWorker()` and `startAppNode()` copy example config files into `opts.root/config/` on first run. After that, the files are left untouched so your edits survive restarts. Pass override objects to `startAppNode()` to programmatically set specific values without editing files.

Config file precedence:
1. Existing file on disk (your edits are authoritative)
2. Deep-merged overrides from `opts.*`
3. `.example` template from the package

## Directory Layout

```
mdk/
├── index.js          # getOrk, startWorker, startAppNode, waitForDiscovery
├── services.js       # startServices — facility bootstrap helpers
└── utils/
    ├── constants.js  # MDK_STORE and other well-known names
    └── initialize.js # Service initialization helpers
```
