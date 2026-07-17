# @tetherto/mdk

## Overview

Bootstrap utilities for MDK. This package is the primary entry point for application developers. It provides 
high-level convenience functions that wire together the [Kernel](../kernel/README.md), [device Workers](../../../docs/concepts/stack/workers.md), 
and the [Gateway](../gateway/README.md) HTTP server without requiring direct knowledge of lower-level APIs.

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
const { getKernel, startWorker, startGateway, waitForDiscovery, shutdown } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/mdk-worker-whatsminer')

// 1. Start Kernel
const kernel = await getKernel()

// 2. Start a Worker
const { manager } = await startWorker(WM_M56S, { kernel })

// 3. Register a device with the Worker
await manager.registerThing({
  info: { serialNum: 'WM-001' },
  opts: { address: '192.168.1.10', port: 14028, password: 'admin' }
})

// 4. Wait for Kernel to discover and register the Worker
await waitForDiscovery(kernel)

// 5. Optionally start the HTTP API
const server = await startGateway({ kernel, port: 3000, noAuth: true })

// In tests or scripts where SIGINT is not fired:
// await shutdown(kernel)
```

## API

### `getKernel(opts?)` → `Promise<KernelManager>`

Start the Kernel with defaults suited for single-process development. Automatically:
- In DHT mode, reads the topic from `DEFAULT_TOPIC_FILE` or generates one if absent
- In local mode, watches a shared Worker-key directory and does not create or join a DHT topic
- Publishes the HRPC public key as hex to `DEFAULT_KEY_FILE` after start, so out-of-process clients can connect without configuration
- Registers signal handlers for graceful shutdown

The key file is not deleted on shutdown: the key is stable across restarts (HRPC seeds persist in the Kernel store), so a leftover 
file stays correct for the same store directory.

```js
const kernel = await getKernel()
// kernel.topic — hex DHT topic used, or undefined in local mode
// kernel.getPublicKey() — HRPC public key
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.root` | `string` | Data root directory (default: `os.tmpdir()/mdk`) |
| `opts.storeDir` | `string` | Override Hyperbee store path |
| `opts.discovery` | `object` | Discovery config: `{ mode: 'dht' \| 'local', dir? }` (default: DHT) |
| `opts.topic` | `string` | 32-byte hex DHT topic (overrides topic file) |
| `opts.topicFile` | `string` | Override path to topic file |
| `opts.keyFile` | `string\|false` | Path for the HRPC key file (default: `DEFAULT_KEY_FILE`); `false` to disable publishing |
| `opts.hrpc` | `object\|false` | HRPC config (default: enabled, empty allowlist) |
| `opts.telemetryPullMs` | `number` | Telemetry poll interval in ms |
| `opts.healthPingMs` | `number` | Health ping interval in ms |

Cadence options are flat on `getKernel()`. For nested `cadences` configuration, including `statePullMs`, use the 
[`createKernel()` API](../kernel/README.md#createkernelopts--kernelmanager).

### `startWorker(ManagerClass, opts?)` → `Promise<{ manager, adapter, store }>`

Start a device Worker and connect it to Kernel through DHT, local, or same-process discovery.

```js
const { manager, adapter } = await startWorker(WM_M56S, {
  kernel,                              // KernelManager from getKernel()
  rack: 'rack-1',                   // Rack ID (default: 'rack-1')
  root: './data',                   // Data root
  workerId: 'whatsminer-rack-1'     // Override Worker ID
})
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.kernel` | `KernelManager` | Kernel instance; cleanup is auto-registered |
| `opts.rack` | `string` | Rack/site identifier |
| `opts.root` | `string` | Data root for Worker stores and config |
| `opts.workerId` | `string` | Override Worker identity string |
| `opts.discovery` | `object` | Discovery config: `{ mode: 'dht' \| 'local', dir? }` (default: DHT) |
| `opts.orkTopic` | `string` | DHT topic to join (reads from topic file if absent) |
| `opts.contract` | `object` | Override `mdk-contract.json` contents |
| `opts.workerPackagePath` | `string` | Path to package containing `mdk-contract.json` |

`opts.workerPackagePath` is auto-detected from `require.cache`; pass it explicitly only if detection fails — see [Troubleshooting](#workerpackagepath-auto-detection-fails).

Returns:
- `manager` — the `ManagerClass` instance (e.g. `WM_M56S`)
- `adapter` — `MDKWorkerAdapter` — the Hyperswarm HRPC bridge
- `store` — `StoreFacility` used by the adapter

> [!NOTE]
> `workerId` defaults to `manager.getThingType() + '-' + rack`. Two Workers of different `ManagerClass` types never conflict 
> on the default `rack-1`. Two Workers of the **same** `ManagerClass` and rack share a store directory — intentional for 
> horizontal scaling. Pass distinct `rack` values for independent same-type Workers.

### `startGateway(opts?)` → `Promise<WrkServerHttp>`

Start the Fastify-based HTTP/WebSocket server. Writes config files under `opts.root`, deep-merging any override objects 
with the example defaults.

```js
const server = await startGateway({
  kernel,
  port: 3000,
  noAuth: true,            // skip OAuth2 (development)
  root: './data/gateway'
})
```

| Option | Type | Description |
|--------|------|-------------|
| `opts.root` | `string` | Config/data root (default: `os.tmpdir()/mdk/gateway`) |
| `opts.port` | `number` | HTTP port (default: 3000) |
| `opts.env` | `string` | Environment string (default: `'development'`) |
| `opts.noAuth` | `boolean` | Skip OAuth2 plugins; use stub config |
| `opts.kernel` | `KernelManager` | Kernel instance; Gateway stop is registered on cleanup. Its `getPublicKey()` also resolves the Kernel key |
| `opts.kernelKey` | `string\|Buffer\|false` | Kernel HRPC listener public key (hex or Buffer); `false` to run without a Kernel connection (`mdkClient` stays `null`) |
| `opts.keyFile` | `string` | Key file to resolve the Kernel key from (default: `DEFAULT_KEY_FILE`) |
| `opts.bootstrap` | `array` | DHT bootstrap nodes threaded to the Gateway's Client (testnets) |
| `opts.common` | `object` | Overrides for `common.json` |
| `opts.auth` | `object` | Overrides for `auth.config.json` |
| `opts.httpd` | `object` | Overrides for `httpd.config.json` |
| `opts.store` | `object` | Overrides for `store.config.json` |
| `opts.additionalRoutes` | `array` | Extra Fastify route definitions (raw escape hatch; prefer `extraPluginDirs`) |
| `opts.extraPluginDirs` | `array` | Plugin package directories to load at boot alongside the built-in plugins |

The Kernel HRPC key is resolved **before any boot side effects**, in this order:

1. `opts.kernelKey` — hex or Buffer; `false` means run without a Kernel connection
2. `opts.kernel.getPublicKey()` — in-process Kernel handle
3. Key file — `opts.keyFile` or `DEFAULT_KEY_FILE`
4. Otherwise throws `ERR_KERNEL_KEY_FILE_NOT_FOUND`

The Gateway worker connects to the Kernel over HRPC with the resolved key; a failed connect degrades gracefully (`mdkClient = null`) rather 
than crashing the HTTP server.

### `startKernel(opts?)` → `Promise<KernelManager>`

Lower-level Kernel start. Prefer `getKernel()` for new code. Does not register SIGINT or read the topic file, and writes the key file only when 
`opts.keyFile` is explicitly passed.
For caller-managed construction and lifecycle, use [`createKernel()` from `@tetherto/mdk-kernel`](../kernel/README.md#createkernelopts--kernelmanager).

### `waitForDiscovery(kernel, timeout?)` → `Promise<WorkerEntry[]>`

Poll the registry until at least one Worker reaches `READY` state with devices populated, or `timeout` ms elapses 
(default: 30 000 ms). Returns the full list of registered Workers.

```js
await waitForDiscovery(kernel, 15000)
const workers = kernel.registry.listWorkers()
```

### `onShutdown(cleanupFn, opts?)` → handler

Register a one-shot cleanup handler on `SIGINT` / `SIGTERM`. Returns the handler so tests can invoke it directly.

| Option | Type | Description |
|--------|------|-------------|
| `opts.signals` | `string[]` | Signals to listen for (default: `['SIGINT', 'SIGTERM']`) |
| `opts.forceMs` | `number` | Force-exit timeout if cleanup hangs (default: 3000 ms) |

> `getKernel()`, `startWorker()`, and `startGateway()` register their own `onShutdown`
> handlers internally. Call this only when you need to add teardown logic outside
> a boot handle — for example, closing a database or flushing a log buffer.

### `shutdown(handle)` → `Promise<void>`

Gracefully stop any MDK boot handle — Kernel, Gateway, or Worker. Drains the handle's `_cleanup` array in registration order, 
then calls `.stop()` on the handle itself. Idempotent: calling `shutdown` twice on the same handle is safe.

```js
await shutdown(kernel) // stops Gateway and Workers (chained), then stops Kernel
```

Prefer `shutdown(kernel)` over calling `shutdown` on each handle separately: passing the Kernel handle tears everything down in the 
order services were started.

### Constants

```js
const { DEFAULT_TOPIC_FILE, DEFAULT_KEY_FILE } = require('@tetherto/mdk')
// DEFAULT_TOPIC_FILE — os.tmpdir()/mdk/.dht-topic
// DEFAULT_KEY_FILE   — os.tmpdir()/mdk/.kernel-key (Kernel HRPC public key, hex)
```

## Single-process full stack

The typical pattern for running everything in one process during development:

```js
const { getKernel, startWorker, startGateway, waitForDiscovery } = require('@tetherto/mdk')
const { WM_M56S } = require('@tetherto/mdk-worker-whatsminer')
const { AM_S19XP } = require('@tetherto/mdk-worker-antminer')

async function main () {
  const kernel = await getKernel()

  const { manager: wm } = await startWorker(WM_M56S, { kernel })
  await wm.registerThing({ info: { serialNum: 'WM-001' }, opts: { address: '192.168.1.10', port: 14028, password: 'admin' } })

  const { manager: am } = await startWorker(AM_S19XP, { kernel })
  await am.registerThing({ info: { serialNum: 'AM-001' }, opts: { address: '192.168.1.20', port: 4028 } })

  await waitForDiscovery(kernel)

  await startGateway({ kernel, port: 3000, noAuth: true })
  console.log('MDK running at http://localhost:3000')
}

main()
```

## Config management

`startWorker()` and `startGateway()` copy example config files into `opts.root/config/` on first run. After that, the files 
are left untouched so your edits survive restarts. Pass override objects to `startGateway()` to programmatically set specific values 
without editing files.

Config file precedence:
1. Existing file on disk (your edits are authoritative).
2. Deep-merged overrides from `opts.*`.
3. `.example` template from the package.

## Directory layout

```
mdk/
├── index.js          # `getKernel`, `startWorker`, `startGateway`, `waitForDiscovery`
├── services.js       # `startServices` — facility bootstrap helpers
└── utils/
    ├── constants.js  # MDK_STORE and other well-known names
    └── initialize.js # Service initialization helpers
```

## Troubleshooting

### `workerPackagePath` auto-detection fails

`startWorker` locates `mdk-contract.json` by walking `require.cache` from the `ManagerClass` module up to six parent directories. This fails 
when the class is re-exported through an intermediary module — the cache entry points to the intermediary, not the Worker package root. Pass 
`opts.workerPackagePath` explicitly to skip auto-detection:

```js
const WM_PKG = require.resolve('@tetherto/miner-whatsminer/mdk-contract.json').replace('/mdk-contract.json', '')
const { manager } = await startWorker(WM_M56S, { kernel, workerPackagePath: WM_PKG })
```

### Migrating from the explicit bootstrap API

Pre-`getKernel()` code required manually generating a topic and passing it to both `startWorker` and `startKernel`, as well as supplying `wtype` 
and `workerPackagePath` explicitly:

```js
// Before
const TOPIC = crypto.randomBytes(32).toString('hex')
const WM_PKG = path.join(__dirname, '../workers/whatsminer')

const { manager } = await startWorker(WM_M56S, {
  rack: 'rack-1', root: ROOT, orkTopic: TOPIC,
  wtype: 'wrk-miner-wm', workerPackagePath: WM_PKG
})
const kernel = await startKernel({ root: ROOT, discovery: { topic: TOPIC }, loadConf: () => {} })
```

```js
// After
const kernel = await getKernel()
const { manager } = await startWorker(WM_M56S, { kernel })
```

`getKernel()` handles topic file, key file, and SIGINT registration. `startWorker` derives `wtype` from the `ManagerClass` prototype and locates 
`workerPackagePath` automatically.

## Next steps

- [Run the Gateway](../../../docs/guides/gateway/run.md): programmatic and standalone startup, auth configuration, and HRPC key setup
- [Add hardware devices](../../../docs/concepts/stack/workers.md): understand how Workers register devices and expose them to Kernel
- [Add custom routes with plugins](../../../docs/guides/gateway/plugins.md): extend the Gateway via `extraPluginDirs`
- [See the backend site example](../../../examples/backend/site/README.md): multi-Worker, multi-device setup in a separate-process topology
- [Understand the the full MDK layer model](../../../docs/concepts/architecture.md)
