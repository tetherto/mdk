# @tetherto/mdk

## Overview

Bootstrap utilities for MDK. This package is the primary entry point for application developers. It provides 
high-level convenience functions that wire together the [ORK kernel](../ork/README.md), [device workers](../../../docs/concepts/stack/workers.md), and the [App Node](../app-node/README.md) HTTP
server without requiring direct knowledge of lower-level APIs.

## Prerequisites

- Node.js >= 24

## Install

This package is part of the MDK monorepo and requires both core and Worker dependencies. After cloning, install from the repo root:

```bash
backend/core/install-packages.sh
backend/workers/install-packages.sh
```

See [Run the stack](../../../docs/tutorials/get-started/run.md) for the full clone-and-install walkthrough.

## Usage

```js
const { getOrk, startWorker, startAppNode, waitForDiscovery, shutdown } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/miner-whatsminer')

// 1. Start ORK
const ork = await getOrk()

// 2. Start a Worker
const { manager } = await startWorker(WM_M56S, { ork })

// 3. Register a device with the Worker
await manager.registerThing({
  info: { serialNum: 'WM-001' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})

// 4. Wait for ORK to discover and register the Worker
await waitForDiscovery(ork)

// 5. Optionally start the HTTP API
const server = await startAppNode({ ork, port: 3000, noAuth: true })

// In tests or scripts where SIGINT is not fired:
// await shutdown(ork)
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
| `opts.hrpc` | `object\|false` | HRPC config (default: enabled, empty allowlist) |
| `opts.telemetryPullMs` | `number` | Telemetry poll interval in ms |
| `opts.healthPingMs` | `number` | Health ping interval in ms |

### `startWorker(ManagerClass, opts?)` → `Promise<{ manager, adapter, store }>`

Start a device Worker and connect it to the ORK via Hyperswarm DHT.

```js
const { manager, adapter } = await startWorker(WM_M56S, {
  ork,                              // OrkManager from getOrk()
  rack: 'rack-1',                   // Rack ID (default: 'rack-1')
  root: './data',                   // Data root
  workerId: 'whatsminer-rack-1'     // Override Worker ID
})
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.ork` | `OrkManager` | ORK instance; cleanup is auto-registered |
| `opts.rack` | `string` | Rack/site identifier |
| `opts.root` | `string` | Data root for Worker stores and config |
| `opts.workerId` | `string` | Override Worker identity string |
| `opts.orkTopic` | `string` | DHT topic to join (reads from topic file if absent) |
| `opts.contract` | `object` | Override `mdk-contract.json` contents |
| `opts.workerPackagePath` | `string` | Path to package containing `mdk-contract.json` |

Returns:
- `manager` — the `ManagerClass` instance (e.g. `WM_M56S`)
- `adapter` — `MDKWorkerAdapter` — the Hyperswarm HRPC bridge
- `store` — `StoreFacility` used by the adapter

### `startAppNode(opts?)` → `Promise<WrkServerHttp>`

Start the Fastify-based HTTP/WebSocket server. Writes config files under `opts.root`, deep-merging any override objects 
with the example defaults.

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
| `opts.orkKey` | `string\|Buffer` | ORK HRPC gateway public key (hex or Buffer); selects HRPC transport and disables IPC. Use for cross-host deployments where ORK runs on a separate host |
| `opts.orkIpc` | `string\|false` | IPC socket path for MDK client (default: `DEFAULT_IPC_SOCK`); `false` to disable. Ignored when `orkKey` is set |
| `opts.common` | `object` | Overrides for `common.json` |
| `opts.auth` | `object` | Overrides for `auth.config.json` |
| `opts.httpd` | `object` | Overrides for `httpd.config.json` |
| `opts.store` | `object` | Overrides for `store.config.json` |
| `opts.additionalRoutes` | `array` | Extra Fastify route definitions (raw escape hatch; prefer `extraPluginDirs`) |
| `opts.extraPluginDirs` | `array` | Plugin package directories to load at boot alongside the built-in plugins |

### `startOrk(opts?)` → `Promise<OrkManager>`

Lower-level ORK start. Prefer `getOrk()` for new code. Does not register SIGINT or read the topic file.

### `waitForDiscovery(ork, timeout?)` → `Promise<WorkerEntry[]>`

Poll the registry until at least one worker reaches `READY` state with devices populated, or `timeout` ms elapses 
(default: 30 000 ms). Returns the full list of registered workers.

```js
await waitForDiscovery(ork, 15000)
const workers = ork.registry.listWorkers()
```

### `onShutdown(cleanupFn, opts?)` → handler

Register a one-shot cleanup handler on `SIGINT` / `SIGTERM`. Returns the handler so tests can invoke it directly.

| Option | Type | Description |
|--------|------|-------------|
| `opts.signals` | `string[]` | Signals to listen for (default: `['SIGINT', 'SIGTERM']`) |
| `opts.forceMs` | `number` | Force-exit timeout if cleanup hangs (default: 3000 ms) |

> `getOrk()`, `startWorker()`, and `startAppNode()` register their own `onShutdown`
> handlers internally. Call this only when you need to add teardown logic outside
> a boot handle — for example, closing a database or flushing a log buffer.

### `shutdown(handle)` → `Promise<void>`

Gracefully stop any MDK boot handle — ORK, App Node, or Worker. Drains the handle's `_cleanup` array in registration order, 
then calls `.stop()` on the handle itself. Idempotent: calling `shutdown` twice on the same handle is safe.

```js
await shutdown(ork) // stops App Node and Workers (chained), then stops ORK
```

Prefer `shutdown(ork)` over calling `shutdown` on each handle separately: passing the ORK handle tears everything down in the 
order services were started.

### Constants

```js
const { DEFAULT_TOPIC_FILE, DEFAULT_IPC_SOCK } = require('@tetherto/mdk')
// DEFAULT_TOPIC_FILE — os.tmpdir()/mdk/.dht-topic
// DEFAULT_IPC_SOCK   — os.tmpdir()/mdk/ork.sock
```

## Single-Process full stack

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

## Config management

`startWorker()` and `startAppNode()` copy example config files into `opts.root/config/` on first run. After that, the files 
are left untouched so your edits survive restarts. Pass override objects to `startAppNode()` to programmatically set specific values 
without editing files.

Config file precedence:
1. Existing file on disk (your edits are authoritative).
2. Deep-merged overrides from `opts.*`.
3. `.example` template from the package.

## Directory layout

```
mdk/
├── index.js          # `getOrk`, `startWorker`, `startAppNode`, `waitForDiscovery`
├── services.js       # `startServices` — facility bootstrap helpers
└── utils/
    ├── constants.js  # MDK_STORE and other well-known names
    └── initialize.js # Service initialization helpers
```

## Next steps

- [Run the App Node](../../../docs/how-to/app-node/run.md): programmatic and standalone startup, auth configuration, and IPC/HRPC setup
- [Add hardware devices](../../../docs/concepts/stack/workers.md): understand how Workers register devices and expose them to ORK
- [Add custom routes with plugins](../../../docs/how-to/app-node/plugins.md): extend the App Node via `extraPluginDirs`
- [See the backend site example](../../../examples/backend/site/README.md): multi-worker, multi-device setup in a separate-process topology
- [Understand the the full MDK layer model](../../../docs/concepts/architecture.md)
