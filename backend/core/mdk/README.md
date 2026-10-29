# @tetherto/mdk-core

## Overview

Bootstrap utilities for MDK. This package is the primary entry point for application developers. It provides
high-level convenience functions that wire together the [Kernel](../kernel/README.md), [device Workers](../../workers/README.md),
and the [Gateway](../gateway/README.md) HTTP server without requiring direct knowledge of lower-level APIs.

## Prerequisites

- Node.js >= 24

## Install

This package is part of the MDK monorepo and requires both core and Worker dependencies. After cloning, install from the repo root:

```bash
npm install
```

The [run a mining site tutorial](../../../docs/tutorials/run-a-site.md) is the full clone-and-install walkthrough.

> [!NOTE]
> Installed from npm, this package pulls in `@tetherto/mdk-gateway`, so `npm audit` reports an `@fastify/static` advisory until
> your app's root `package.json` overrides it. See the Gateway's
> [known dependency advisory](../gateway/README.md#known-dependency-advisory).

## Usage

```js
const { getKernel, startGateway, waitForDiscovery, shutdown } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

// 1. Start Kernel
const kernel = await getKernel()

// 2. Start a Worker: each Worker package ships its own boot function that
//    constructs a WorkerRuntime internally (see @tetherto/mdk-worker).
//    Worker RPC is fail-closed: allow only the key the Kernel dials with, so
//    every command goes through the Kernel.
const { runtime } = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './data/avalon',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{ info: { serialNum: 'AV-001' }, opts: { address: '192.168.1.10', port: 4028, password: 'admin' } }]
})

// 3. Register the Worker with Kernel (same-process mode, no DHT/local discovery needed)
await kernel.registerWorker(runtime.getPublicKey())

// 4. Wait for Kernel to discover and register the Worker
await waitForDiscovery(kernel)

// 5. Optionally start the HTTP API (admits the Gateway's key on the Kernel; the
//    Worker keeps allowing the Kernel alone)
const server = await startGateway({ kernel, port: 3000 })

// The SDK installs no SIGINT/SIGTERM handlers unless asked
// (getKernel({ handleSignals: true })). Tear down explicitly:
// await shutdown(kernel)
```

> [!NOTE]
> - There is no single generic `startWorker(WorkerClass, opts)` entry point: every Worker package supplies its own
> boot function that [builds a `WorkerRuntime` for its plugin](#start-a-worker).
> - [Worker deployment options](../../../docs/concepts/deployment-topologies.md) include same-process, local, and DHT.

## API

### `getKernel(opts?)` → `Promise<KernelManager>`

Start the Kernel with defaults suited for single-process development. Automatically:
- In DHT mode, reads the topic from `DEFAULT_TOPIC_FILE` or generates one if absent
- In local mode, watches a shared Worker-key directory and does not create or join a DHT topic
- Publishes the HRPC public key as hex to `DEFAULT_KEY_FILE` after start, so out-of-process clients can connect without configuration
- Starts the HRPC listener **fail-closed**: the allowlist is empty unless you pass `opts.hrpc.whitelist`, and nobody is
  admitted until a key is added (`kernel.allowKey()`, `startGateway({ kernel })`, or the trusted-keys dir below). See
  [Trust and admission](#trust-and-admission)
- Publishes `kernel.pub` (its worker-dialing key, `kernel.getClientPublicKey()`) to the trusted-keys dir and admits the
  other keys published there
- With `opts.handleSignals: true` only, registers `SIGINT`/`SIGTERM` handlers that drain `kernel._cleanup`, stop the
  Kernel and call `process.exit(0)`. The default (library use) leaves the process's signals alone; call
  [`shutdown(kernel)`](#shutdownhandle--promisevoid) yourself

The key file is not deleted on shutdown: the key is stable across restarts (HRPC seeds persist in the Kernel store), so a leftover
file stays correct for the same store directory.

```js
const kernel = await getKernel()
// kernel.topic — hex DHT topic used, or undefined in local mode
// kernel.getPublicKey() — HRPC public key
```

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.root` | Optional | `string` | `~/.mdk` | Data root directory |
| `opts.storeDir` | Optional | `string` | Under `opts.root` | Override Hyperbee store path |
| `opts.discovery` | Optional | `object` | DHT mode | Discovery config: `{ mode: 'dht' \| 'local', dir?, workerKeys?, allowAnyWorker? }`. In DHT mode a Worker announcing on the topic is admitted only if its RPC key is in `workerKeys` (or added later with `kernel.allowWorkerKey()`); an empty list admits nobody unless `allowAnyWorker: true` (development only, logs a warning). Local mode and `registerWorker()` do not use this list |
| `opts.topic` | Optional | `string` | Read from `opts.topicFile` if it exists, else a fresh random topic (not persisted) | 32-byte hex DHT topic; overrides the topic file |
| `opts.topicFile` | Optional | `string` | `DEFAULT_TOPIC_FILE` | Path to the topic file |
| `opts.keyFile` | Optional | `string\|false` | `DEFAULT_KEY_FILE` | Path for the HRPC key file; `false` to disable publishing |
| `opts.hrpc` | Optional | `object\|false` | Enabled, empty allowlist (admits nobody) | HRPC config; `false` disables the listener |
| `opts.hrpc.whitelist` | Optional | `Array<string\|{key}>` | `[]` | Caller allowlist. Who may connect; what a caller may do is set by its access token and `spec.rbac` ([authorization](../kernel/README.md#caller-admission-and-authorization)) |
| `opts.hrpc.allowAll` | Removed | `boolean` | None | Refused at start (`ERR_KERNEL_ALLOW_ALL_REMOVED`): admission never admits every peer. An entry with `roles` is refused too (`ERR_KERNEL_CALLER_ROLES_UNSUPPORTED`) |
| `opts.hrpc.bootstrap` | Optional | `array` | Public DHT | HyperDHT bootstrap nodes; pass the same list to every component on a private DHT network |
| `opts.hrpc.dhtHost` | Optional | `string` | All interfaces | Interface the Kernel's DHT node binds: `127.0.0.1` on one machine, a LAN address on an isolated LAN |
| `opts.trustedKeysDir` | Optional | `string\|false` | `<root>/.trusted-keys` | Same-machine key rendezvous (see [Trust and admission](#trust-and-admission)); `false` disables |
| `opts.telemetryPullMs` | Optional | `number` | The Kernel's own default | Telemetry poll interval in ms |
| `opts.healthPingMs` | Optional | `number` | The Kernel's own default | Health ping interval in ms |
| `opts.statePullMs` | Optional | `number` | The Kernel's own default | Worker identity and device-list refresh interval in ms |
| `opts.handleSignals` | Optional | `boolean` | `false` | Install `SIGINT`/`SIGTERM` handlers that stop the Kernel and exit the process. Set it in a standalone Kernel process |

Cadence options are flat on `getKernel()`. For nested `cadences` configuration, use the
[`createKernel()` API](../kernel/README.md#createkernelopts--kernelmanager).

### Start a Worker

There is no generic `startWorker(WorkerClass, opts)` export in this package. Each Worker package (e.g.
`@tetherto/mdk-worker-avalon`) supplies its own boot function that constructs a
[`WorkerRuntime`](../mdk-worker/lib/worker-runtime.js) internally and connects it to Kernel through [DHT, local, or
same-process discovery](../../../docs/concepts/deployment-topologies.md). Every boot function accepts (`kernelTopic`, `discovery`,
or direct `kernel.registerWorker(runtime.getPublicKey())`).

```js
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const { runtime, stop } = await startAvalonWorker({
  workerId: 'avalon-rack-1',     // one runtime process = one workerId
  model: 'a1346',
  storeDir: './data/avalon',
  kernelTopic: null,               // omit/null to register by key instead of a DHT topic
  seedDevices: [{ info: { serialNum: 'AV-001' }, opts: { address: '192.168.1.10', port: 4028, password: 'admin' } }]
})

await kernel.registerWorker(runtime.getPublicKey()) // same-process discovery
```

> [!CAUTION]
> This boot shape (`storeDir`, `seedDevices`) is the deprecated thing/adapter Worker surface. A new Worker runs on
> `WorkerRuntimeV2`; see [Build a third-party Worker](../../../docs/guides/workers/build-a-worker.md).

Returns vary by Worker package, but every boot function returns at least `{ runtime, stop }`: `runtime` is the
`WorkerRuntime` instance (`getPublicKey()`, `getDeviceContext(deviceId)`); `stop()` tears the Worker down.

On this surface `opts.conf.thing` sets the store's sampling and retention. The keys that decide disk growth:

| Key | Default | Effect |
| --- | --- | --- |
| `storeSnapItvMs` | `300000` | How often one snapshot per device is appended to its `thing-5m-<deviceId>` log |
| `collectSnapsItvMs` | `60000` | How often the Worker polls its devices |
| `logRotateMaxLength` | Unset; rotation disabled | Rotate when the segment's Hypercore length reaches this threshold; this is not an exact count of telemetry samples |
| `logKeepCount` | `3` | Retention parameter used to select older segments for unlinking; it does not enable rotation |
| `rotateLogsItvMs` | `120000` | How often the rotation check runs |

To enable rotation, pass an explicit `opts.conf.thing.logRotateMaxLength`, for example `10000`. The bundled configuration examples
contain that value, but these boot functions do not load it automatically. Setting `logKeepCount` alone leaves rotation disabled.
Measure retained disk usage under the site's actual sampling rate and workload rather than treating these settings as a byte limit.

### `startGateway(opts?)` → `Promise<WrkServerHttp>`

Start the Fastify-based HTTP server. Writes config files under `opts.root`, deep-merging any override objects
with the example defaults.

```js
const server = await startGateway({
  kernel,
  port: 3000,
  root: './data/gateway',
  apps: [{ name: 'site', appDir: './apps/site', keyFile: './run/site.key' }],
  gatewayKeyFile: './run/gateway.key'
})
```

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.root` | Optional | `string` | `~/.mdk/gateway` | Config/data root |
| `opts.port` | Optional | `number` | `3000` | HTTP port |
| `opts.env` | Optional | `string` | `'development'` | Environment string |
| `opts.kernel` | Optional, one of `opts.kernel`/`opts.kernelKey`/`opts.keyFile` must resolve a key | `KernelManager` | None | Kernel instance; Gateway stop is registered on cleanup. Its `getPublicKey()` also resolves the Kernel key. |
| `opts.kernelKey` | Optional, see `opts.kernel` | `string\|Buffer\|false` | None | Kernel HRPC listener public key (hex or Buffer); `false` to run without one. The Gateway passes it to no app; each [app runtime](../app-runtime/README.md) takes its own `kernelKey` |
| `opts.keyFile` | Optional, see `opts.kernel` | `string` | `DEFAULT_KEY_FILE` | Key file to resolve the Kernel key from |
| `opts.bootstrap` | Optional | `array` | None | DHT bootstrap nodes for every DHT node the Gateway starts: its net facility, Kernel client and app runtime client |
| `opts.dhtHost` | Optional | `string` | All interfaces | Interface those DHT nodes bind |
| `opts.common` | Optional | `object` | `{}` | Overrides for `common.json` |
| `opts.httpd` | Optional | `object` | `{}` | Overrides for `httpd.config.json` |
| `opts.store` | Optional | `object` | `{}` | Overrides for `store.config.json` |
| `opts.additionalRoutes` | Optional | `array` | None | Extra Fastify route definitions; a raw escape hatch, prefer `apps` |
| `opts.apps` | Optional | `array` | None | The complete set of apps this Gateway mounts — nothing else is registered. See [Apps](#apps) |
| `opts.gatewayKeyFile` | Optional | `string` | None | File the Gateway writes the public key it presents to app runtimes to, once it is serving |
| `opts.handleSignals` | Optional | `boolean` | `false` | Standalone Gateway (no `opts.kernel`) only: install `SIGINT`/`SIGTERM` handlers that stop it and exit the process |
| `opts.trustedKeysDir` | Optional | `string\|false` | `opts.kernel.trustedKeysDir`, else `DEFAULT_TRUSTED_KEYS_DIR` | Where the Gateway publishes its client key (`status.rpcClientKey`) as `gateway.pub`; `false` disables. With `opts.kernel` the key is also admitted in-process |
| `opts.trustedKeyName` | Optional | `string` | `'gateway'` | File name for that key (set it when several Gateways share a dir) |
| `opts.authority` | Optional | `object` | From `opts.kernel` or `opts.gatewayCredential` | What checks every app route against `spec.rbac` and serves `/auth/*` (`@tetherto/mdk-gateway/workers/lib/authority`). Default: the in-process `opts.kernel`'s issuer and policy |
| `opts.gatewayCredential` | Optional | `{ name, privateKey }` | None | The Gateway's service account for a Kernel in another process (`opts.kernelKey`); it reads the policy, so it needs `policy: read` |

### Apps

Each `opts.apps` entry is `{ name, appDir, keyFile, mount? }`. The Gateway reads only the app's route table (`mdk-plugin.json` in
`appDir` or `appDir/plugin`) and forwards every request over HRPC to the app's runtime
([`@tetherto/mdk-app-runtime`](../app-runtime/README.md)), whose public key it re-reads from `keyFile` on every request; until the
file holds a key the app's routes answer `503`. `name` matches `^[a-z][a-z0-9-]*$` and is unique; `mount` defaults to `/apps/<name>`,
and `/` mounts the app at the root. Entries are validated before any boot side effect, throwing `ERR_GATEWAY_APPS_INVALID`,
`ERR_GATEWAY_APP_NAME_INVALID`, `ERR_GATEWAY_APP_DUPLICATE`, `ERR_GATEWAY_APP_DIR_REQUIRED`, `ERR_GATEWAY_APP_KEY_REQUIRED` or
`ERR_GATEWAY_APP_MOUNT_INVALID`.

Every runtime sees the same Gateway key, stable across restarts (seeded from `<root>/identity/seedRuntimeClient`); point each
runtime's `allowedKeyFiles` at `opts.gatewayKeyFile`.

### Declaring apps

`opts.apps` is the whole list; MDK bundles no apps.

```js
const { startGateway } = require('@tetherto/mdk-core')

await startGateway({
  kernel,
  port: 3847,
  gatewayKeyFile: './run/gateway.key',
  apps: [
    { name: 'demo', appDir: path.join(__dirname, 'apps', 'demo'), keyFile: './run/demo.key' },
    { name: 'site', appDir: path.join(__dirname, 'apps', 'site'), keyFile: './run/site.key', mount: '/' }
  ]
})
```


The Kernel HRPC key is resolved **before any boot side effects**, in this order:

1. `opts.kernelKey`: hex or Buffer; `false` means run without a Kernel connection.
2. `opts.kernel.getPublicKey()`: in-process Kernel handle.
3. Key file: `opts.keyFile` or `DEFAULT_KEY_FILE`.
4. Otherwise throws: `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

The Gateway worker opens no Kernel connection: each app runtime builds its own [`@tetherto/mdk-client`](../client/README.md), and
a failed connect fails that app's calls with
[`ERR_MDK_CLIENT_UNAVAILABLE`](../client/README.md#createmdkclientconfig-opts--auto-connecting-client) so as not to crash it.

### `startKernel(opts?)` → `Promise<KernelManager>`

Lower-level Kernel start. Prefer `getKernel()` for new code. Does not register SIGINT or read the topic file, and writes the key file only when
`opts.keyFile` is explicitly passed.
For caller-managed construction and lifecycle, use [`createKernel()` from `@tetherto/mdk-kernel`](../kernel/README.md#createkernelopts--kernelmanager).

### `startDhtBootstrap(opts?)` → `Promise<{ bootstrap, host, port, close }>`

Run a private HyperDHT bootstrap: a bootstrap node at `host:port` plus persistent DHT nodes that join through it, following hyperdht's
isolated-network pattern. Hand the returned `bootstrap` list to every component, with `dhtHost` set to the interface they bind. The
[local and air-gapped profile](../../../docs/guides/deployment/private-dht.md) walks through a whole stack.

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.host` | Optional | `string` | `'127.0.0.1'` | IPv4 address the bootstrap is reached at and advertised as |
| `opts.port` | Optional | `number` | `49737` | UDP port of the bootstrap node |
| `opts.bindHost` | Optional | `string` | `opts.host` | Interface to bind when it differs from `host` |
| `opts.nodes` | Optional | `number` | `2` | Persistent DHT nodes to run alongside it; announce and lookup need at least one |

```js
const net = await startDhtBootstrap({ host: '127.0.0.1' })
const kernel = await getKernel({ hrpc: { bootstrap: net.bootstrap, dhtHost: '127.0.0.1' } })
```

`dhtFromEnv(env?)` reads `MDK_DHT_BOOTSTRAP` (comma-separated `host:port`) and `MDK_DHT_HOST` into `{ bootstrap, dhtHost }`.
`parseBootstrap(value)` normalizes a list or a comma-separated string. Both refuse public `*.hyperdht.org` nodes.

### `waitForDiscovery(kernel, timeout?)` → `Promise<WorkerEntry[]>`

Poll the registry until at least one Worker reaches `READY` state with devices populated, or `timeout` ms elapses
(default: 30 000 ms). Returns the full list of registered Workers.

```js
await waitForDiscovery(kernel, 15000)
const workers = kernel.registry.listWorkers()
```

### `onShutdown(cleanupFn, opts?)` → handler

Register a one-shot cleanup handler on `SIGINT` / `SIGTERM`. Returns the handler so tests can invoke it directly.

| Option | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `opts.signals` | Optional | `string[]` | `['SIGINT', 'SIGTERM']` | Signals to listen for |
| `opts.forceMs` | Optional | `number` | `3000` | Force-exit timeout in ms if cleanup hangs |

> [!NOTE]
> `getKernel()`, `startGateway()`, and every Worker boot function register their own `onShutdown`
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
const { DEFAULT_TOPIC_FILE, DEFAULT_KEY_FILE, DEFAULT_TRUSTED_KEYS_DIR } = require('@tetherto/mdk-core')
// DEFAULT_TOPIC_FILE        — ~/.mdk/.dht-topic
// DEFAULT_KEY_FILE          — ~/.mdk/.kernel-key (Kernel HRPC public key, hex)
// DEFAULT_TRUSTED_KEYS_DIR  — ~/.mdk/.trusted-keys (kernel.pub, gateway.pub, ...)
```

### `libStats`

Telemetry aggregation ops (`applyStats`, `tallyStats`, `groupBy`, `getVal`, `defaults.timeframes`) used by `StatsService` and
by each Worker plugin's stats template. See [`lib/stats/README.md`](./lib/stats/README.md).

```js
const { libStats } = require('@tetherto/mdk-core')
const { groupBy } = libStats
```

## Device data and caller input

> [!CAUTION]
> **Deprecated.** [`createWorkerInfra`](./lib/worker-infra.js), the `*Service` classes and the `Thing` base classes
> (`Thing`, `Miner`, `Container`, `PowerMeter`, `Sensor`) are the legacy thing/adapter Worker surface. The in-repo
> Workers still run on them, so nothing is removed. A new Worker is a directory-loaded package on `WorkerRuntimeV2` and
> needs none of them; the [gaps that remain](../mdk-worker/README.md#store-services) are listed with the Worker Runtime
> store services.

The Worker-infra services treat everything arriving over RPC as untrusted:

- **Secrets are redacted.** `thing_config`, `list` and `getDeviceMeta` return `password`, `pass`, `passwd`, `apiKey`,
  `token`, `secret`, `privateKey`, `seed`, `mnemonic` (and keys ending in `Password`, `Secret`, `Token`, ...) as
  `'[REDACTED]'`, including `pools[].password`/`pass`. A `'[REDACTED]'` value sent back in an update is ignored, so an edit
  form fed from `thing_config` never overwrites a stored credential.
- **Queries are allowlisted.** `list`, `forgetThings` and info-history filters accept `$eq $ne $in $nin $exists $gt $gte $lt
  $lte $and $or $nor $not $elemMatch $all $size` and `$regex`. A `$regex` is a literal search, not a pattern: every
  regex metacharacter is matched as itself, except an optional leading `^` (starts with) and trailing `$` (ends with); it
  is capped at 256 characters and `$options` may only be `i`. `$where`, `$expr` and every other operator, paths under
  `opts.*` and secret-named paths are refused with `ERR_QUERY_*`, and filters run over the redacted records.
- **Device labels are checked.** `registerThing`/`updateThing` accept `info.container` and `info.pos` only as strings of
  up to 64 letters, digits, spaces and `_ . : # -`, starting with a letter or digit (`ERR_THING_INFO_CONTAINER_INVALID`,
  `ERR_THING_INFO_POS_INVALID`). Stats ops build their group maps without a prototype and skip `__proto__`,
  `constructor` and `prototype` keys, and op names are looked up in a fixed table (`ERR_STATS_OP_UNKNOWN`).
- **Device addresses are checked.** Remote `registerThing`/`updateThing` refuse loopback, unspecified, link-local (including
  `169.254.169.254`), cloud-metadata and multicast addresses, hostnames resolving to them, and ports outside 1–65535. Set
  `conf.thing.allowedAddressCidrs` (for example `['10.0.0.0/8']`) to replace that policy with an allowlist. Seed devices are
  operator config and are not checked. Changing a device's address drops its stored credentials unless the update supplies new ones.
- **Log reads are bounded.** `offset` must be an integer in `0..logMaxHeight`, `limit` is capped at `conf.thing.logMaxLimit`
  (default 10000), and `tailLog` opens only the `thing-5m` log of the addressed device and `stat-*` logs (plus keys in
  `conf.thing.tailLogKeys`). A device-scoped stat read may only use that device's tags.
- **Comments need an author.** `saveThingComment`/`editThingComment`/`deleteThingComment(req, ctx)` take the user from the
  authenticated `ctx.user` when the transport supplies one (a different `req.user` is refused), else from `req.user`. Only
  the author may edit or delete. `conf.thing.requireAuthenticatedCommentUser: true` refuses calls without `ctx.user`.

`startServices(config)` writes `ecosystem.config.js`, `docker-compose.generated.yml` and `mdk/` into the current directory.
`config.repoRoot` (required, `ERR_MDK_REPO_ROOT_REQUIRED`) names the MDK source checkout the services run from; it is never
searched for, and it reaches each process as `MDK_REPO_ROOT` (`/app/repo` under Docker). The Workers it starts join the DHT topic,
so the Kernel you start with `getKernel()` must admit them: pass their RPC keys in `discovery.workerKeys` (or call
`kernel.allowWorkerKey()`), or set `discovery.allowAnyWorker: true` for local development. Each
file carries a `@generated by @tetherto/mdk-core` marker; a file without it is never overwritten
(`ERR_MDK_GENERATED_FILE_CONFLICT`) unless `config.overwrite: true`. Docker publishes Gateway ports on `127.0.0.1` unless
`config.host` or `services[].host` names an interface. `config.dht` switches the stack to a private HyperDHT:

| `config.dht` key | Runtime | Default | Effect |
| --- | --- | --- | --- |
| `bootstrap` | PM2, Docker | None | An existing private bootstrap list; when set, no bootstrap service is generated |
| `host` | PM2 | `'127.0.0.1'` with a generated bootstrap; every interface with `bootstrap` | Interface every process binds, and where the generated bootstrap is reached; a loopback `host` with a non-loopback `bootstrap` is refused |
| `port` | PM2, Docker | `49737` | UDP port of the generated bootstrap |
| `subnet` | Docker | `172.31.249.0/24` | Subnet of the `mdk-dht` network; the bootstrap takes `.2` and services `.10` onward, each binding its own address |
| `internal` | Docker | `false` | Make `mdk-dht` an internal network with no route out; Gateways also join the default network to publish their port |

`initialize({ sources, root })` seeds config from the MDK source
checkout named by `sources` (required, `ERR_MDK_INIT_SOURCES_REQUIRED`) and throws `ERR_MDK_INIT_SOURCES_NOT_FOUND` when it
is not one. MDK packages (the Gateway, Worker packages, this package) are always resolved by package name.

## Single-process full stack

The typical pattern for running everything in one process during development:

```js
const { getKernel, startGateway, waitForDiscovery } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')
const { startSatecWorker } = require('@tetherto/mdk-worker-satec')

async function main () {
  const kernel = await getKernel()
  const allowedKeys = [kernel.getClientPublicKey()]

  const { runtime: av } = await startAvalonWorker({
    workerId: 'avalon-rack-1',
    model: 'a1346',
    storeDir: './data/avalon',
    allowedKeys,
    seedDevices: [{ info: { serialNum: 'AV-001' }, opts: { address: '192.168.1.10', port: 4028, password: 'admin' } }]
  })
  await kernel.registerWorker(av.getPublicKey())

  const { runtime: pm } = await startSatecWorker({
    workerId: 'satec-site-1',
    model: 'pm180',
    storeDir: './data/satec',
    allowedKeys,
    seedDevices: [{ info: { serialNum: 'SATEC-001' }, opts: { address: '192.168.1.30', port: 502, unitId: 1 } }]
  })
  await kernel.registerWorker(pm.getPublicKey())

  await waitForDiscovery(kernel)

  await startGateway({ kernel, port: 3000 })
  console.log('MDK running at http://localhost:3000')
}

main()
```

## Trust and admission

The Kernel HRPC listener and every Worker RPC server are **fail-closed**: they reject public keys they were not told
about, and an empty allowlist admits nobody. The Kernel has no way to admit every peer (`hrpc.allowAll` is refused at start),
and admission grants nothing: each request's access token is checked against `spec.rbac`. A Worker's `allowAll: true`
(`MDK_WORKER_ALLOW_ALL`) still admits everyone; it is for throwaway local experiments only, logs a warning, and `mdk run`
never sets it.

Who dials whom, and with which key:

| Caller | Dials | With key | Admitted by |
| --- | --- | --- | --- |
| Kernel | Workers | `kernel.getClientPublicKey()` (the Kernel's DHT keypair, stable across restarts) | Worker `allowedKeys` |
| Apps | Kernel, and Workers directly | `status.rpcClientKey` (Gateway DHT keypair, persisted) | Kernel allowlist and Worker `allowedKeys` |
| MCP / CLI clients | Kernel (and Workers) | a persistent `callerKeyPair(dir)` passed as `kernelKeyPair` | same |

Workers admit the Kernel's key and no other, so every command reaches a device through the Kernel's checks and its
[write-command log](../kernel/README.md#write-command-log). A caller that must reach a Worker directly
(`sendWorkerCommand`, `pullWorkerTelemetry`) needs its key added to that Worker's `allowedKeys` (or `MDK_WORKER_ALLOWED_KEYS`)
by the operator.

The SDK wires the local cases:

- **Same process.** `startGateway({ kernel })` calls `kernel.allowKey(gatewayKey)`. Workers allow
  `kernel.getClientPublicKey()` and nothing else (`trustKernel(runtime, kernel)`): every device call goes through the
  Kernel's `spec.rbac` check, so no caller it admits is let past it to a Worker.
- **Same machine, separate processes.** Every component meets in a trusted-keys dir (`getKernel` default
  `<root>/.trusted-keys`, `DEFAULT_TRUSTED_KEYS_DIR` = `~/.mdk/.trusted-keys`). The Kernel publishes `kernel.pub` and
  admits every other `<name>.pub` to connect (its token decides what it may do); a standalone `startGateway` publishes
  `gateway.pub`; a Worker process allows only the Kernel's `kernel.pub` from there (`trustKeysFromDir(runtime, dir)`,
  after `waitForKernelKey(dir)`). The dir is created `0700`; key files
  that are group/world-writable or owned by another user are ignored. Anyone who can write the dir is trusted, so keep it
  private, or pass `trustedKeysDir: false` and configure keys explicitly.
- **Across machines.** Nothing is shared automatically: put the Gateway/MCP keys in the Kernel's `hrpc.whitelist`, and
  the Kernel client key in each Worker's `allowedKeys`. A Worker that cannot learn a key fails to
  start with `ERR_WORKER_ALLOWED_KEYS_REQUIRED` rather than admitting everyone.

Helpers in `@tetherto/mdk-core/lib/local-discovery`: `trustedKeysDir(root)`, `publishTrustedKey(dir, name, key)`,
`readTrustedKeys(dir)`, `watchTrustedKeys(dir, onKey)`, `admitTrustedKeys(kernel, dir)`, `trustKeysFromDir(runtime, dir)`,
`waitForKernelKey(dir, { timeoutMs })`, `trustKernel(runtime, kernel)`, `callerKeyPair(dir)`.

`publishWorkerKey(dir, workerId, key)` / `discoverWorkerKeys(kernel, dir)` (local discovery) apply the same rules as the
trusted-keys dir: `workerId` must match `[A-Za-z0-9._-]+`, the dir is `0700` (an existing one that is a symlink, owned by
another user, or group/world-writable is refused with `ERR_KEYS_DIR_UNSAFE`), files are written `0600` atomically, and only
regular, owned, non-group/world-writable `<name>.key` files holding a 64-hex key are dialled.

`utils/service-bootstrap.js` (`SERVICE=worker`, which also needs `MDK_REPO_ROOT`) admits the keys in `DEFAULT_TRUSTED_KEYS_DIR` plus
`MDK_WORKER_ALLOWED_KEYS` (comma-separated hex); `MDK_WORKER_ALLOW_ALL=1` opts out for development.
Every service passes `MDK_DHT_BOOTSTRAP` and `MDK_DHT_HOST` to the DHT nodes it starts (a Worker's boot function, the Gateway's
`--kernelBootstrap` and `--kernelDhtHost` flags). `SERVICE=dht-bootstrap` runs `startDhtBootstrap()` from `MDK_DHT_HOST`,
`MDK_DHT_PORT` and `MDK_DHT_NODES` until `SIGINT` or `SIGTERM`.

## Config management

`startGateway()` and each Worker's boot function copy example config files into their `opts.root/config/` (or `storeDir`) on first run.
After that, the files are left untouched so your edits survive restarts. Pass override objects to `startGateway()` to programmatically
set specific values without editing files.

Config file precedence:
1. Existing file on disk (your edits are authoritative).
2. Deep-merged overrides from `opts.*`.
3. `.example` template from the package.

## Errors

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_ALERTS_LOGS_REQUIRED` | AlertsService is constructed without a `logs` instance | Pass the logs service in the AlertsService constructor options |
| `ERR_BEE_LOG_META_NOTFOUND` | A log key is rotated but has no meta record to advance | Initialize the log meta before rotating, or rotate only known log keys |
| `ERR_BEE_ROTATED_LOG_META_NOTFOUND` | A corrupted time log is rotated but its new meta cannot be read back | Inspect the log store for corruption and rebuild the affected log key |
| `ERR_COMMENT_ACCESS_DENIED` | A comment edit or delete is requested by a user who is not the comment's author, or the comment has no author | Perform the edit or delete as the user who created the comment |
| `ERR_COMMENT_USER_MISMATCH` | `req.user` differs from the authenticated `ctx.user` | Drop `req.user`; the authenticated identity is used |
| `ERR_COMMENT_USER_REQUIRED` | A comment call carries no user | Pass `ctx.user` (or `req.user`) |
| `ERR_COMMENT_USER_UNAUTHENTICATED` | `requireAuthenticatedUser` is set and no `ctx.user` is passed | Forward the authenticated identity as `ctx.user` |
| `ERR_CRON_UNSUPPORTED` | A cron expression's minute and hour fields do not map to a supported interval | Use a `*/n` minute, `*/n` hour, or `0 0` daily form |
| `ERR_DEVICE_TYPE_REQUIRED` | `createWorkerInfra` is called without `opts.deviceType` | Pass a `deviceType` string in the Worker infra options |
| `ERR_DEVICE_UNAVAILABLE` | A device call targets a `deviceId` that has no live runtime context | Register and bind the device before calling it |
| `ERR_END_INVALID` | A DB range read is requested without an `end` bound | Supply an `end` timestamp in the query |
| `ERR_ENTRIES_INVALID` | Settings are saved with an entries argument that is not an object | Pass an object of key/value settings entries |
| `ERR_HIST_LOG_NOTFOUND` | A history log is read but does not parse to an array of entries | Check that the log key holds valid history entries |
| `ERR_INFO_HISTORY_LOG_NOTFOUND` | An `info` historical-logs request finds no `thing-history-log` time log | Confirm info-history logging is enabled and the log exists |
| `ERR_INFO_HISTORY_LOG_TYPE_INVALID` | A historical-logs request omits `logType` | Set `logType` to `alerts` or `info` |
| `ERR_INVALID_ARG_TYPE` | Miner pool pre-processing is given a `pools` value that is not an array | Pass pools as an array |
| `ERR_INVALID_GROUP_RANGE_FORMAT` | A group-range string does not match the `<number><H\|D\|W\|M>` pattern | Use a range like `1H`, `1D`, `1W` or `1M` |
| `ERR_KERNEL_CLIENT_KEY_NOT_FOUND` | `waitForKernelKey` finds no `kernel.pub` in the trusted-keys dir in time | Start the Kernel first, or pass the Worker's `allowedKeys` explicitly |
| `ERR_KERNEL_CLIENT_KEY_UNAVAILABLE` | `trustKernel` is called with a Kernel that has no HRPC client key | Start the Kernel (with HRPC enabled) before its Workers |
| `ERR_KERNEL_KEY_FILE_NOT_FOUND` | `startGateway` cannot resolve a Kernel key from options or the key file | Start the Kernel first, pass `opts.kernelKey` or `opts.kernel`, or set `kernelKey: false` to run without a Kernel |
| `ERR_MDK_WORKER_ALLOWED_KEYS_REQUIRED` | `service-bootstrap` boots a Worker with no trusted key | Start the Kernel first, set `MDK_WORKER_ALLOWED_KEYS`, or `MDK_WORKER_ALLOW_ALL=1` for development |
| `ERR_KEY_INVALID` | A Worker external-data request has a query with no `key` | Include a `key` in the query |
| `ERR_LOG_HISTORY_LOGS_REQUIRED` | LogHistoryService is constructed without a `logs` instance | Pass the logs service in the constructor options |
| `ERR_LOG_KEY_INVALID` | A `tailLog` key is malformed or not a `thing-5m` / `stat-*` / `conf.tailLogKeys` log | Use an allowed log key |
| `ERR_LOG_LIMIT_INVALID` | A log read's `limit` is not a non-negative integer | Pass an integer `limit` |
| `ERR_LOG_OFFSET_INVALID` | A log read's `offset` is not an integer in `0..logMaxHeight` | Pass an integer offset within the retained rotations |
| `ERR_LOG_START_INVALID` / `ERR_LOG_END_INVALID` | A log read's `start`/`end` is not a finite timestamp | Pass millisecond timestamps |
| `ERR_LOG_TAG_FORBIDDEN` | A `tailLog` tag is not a provisioned device (`thing-5m`) or not one of the addressed device's tags | Read only the addressed device's logs |
| `ERR_LOG_KEY_NOTFOUND` | `tailLog` is called without `req.key` | Provide the log `key` in the request |
| `ERR_LOG_NOTFOUND` | A requested time log is absent. This covers the `alerts` historical log and any `tailLog` `key`-`tag` log. | Confirm the log key exists and data has been written to it |
| `ERR_LOG_TAG_INVALID` | `tailLog` is called without `req.tag` | Provide the log `tag` in the request |
| `ERR_LOGS_META_LOGS_REQUIRED` | LogsService is constructed without a `metaLogs` store | Pass a `metaLogs` store in the constructor options |
| `ERR_LOGS_STORE_REQUIRED` | LogsService is constructed without a `store` | Pass a `store` in the constructor options |
| `ERR_MDK_DHT_BOOTSTRAP_INVALID` | A bootstrap entry is not `host:port` with a port from 1 to 65535 | List entries as `host:port`, for example `127.0.0.1:49737` |
| `ERR_MDK_DHT_BOOTSTRAP_PUBLIC` | A private bootstrap list names a public `*.hyperdht.org` node or its address | List only your own bootstrap nodes |
| `ERR_MDK_DHT_CONFIG_INVALID` | `config.dht` is not an object, or a Docker `internal` network is combined with an external `bootstrap` list | Pass an object; drop `internal` or `bootstrap` |
| `ERR_MDK_DHT_HOST_INVALID` | `dhtHost`, `MDK_DHT_HOST` or `config.dht.host` is not an IP address, or a bootstrap host is not IPv4 | Use an IP literal such as `127.0.0.1` or the machine's LAN address |
| `ERR_MDK_DHT_HOST_UNREACHABLE` | `config.dht.host` is loopback and the bootstrap list names a non-loopback address | Set the host to this machine's LAN address, or leave it unset to bind every interface |
| `ERR_MDK_DHT_NODES_INVALID` | `startDhtBootstrap` is asked for fewer than one persistent node | Pass `nodes` of 1 or more |
| `ERR_MDK_DHT_PORT_INVALID` | The bootstrap port is not an integer from 1 to 65535 | Pass a valid UDP port |
| `ERR_MDK_DHT_SUBNET_INVALID` | `config.dht.subnet` is not an IPv4 CIDR of `/30` or wider | Pass a subnet such as `172.31.249.0/24` |
| `ERR_MDK_DHT_SUBNET_TOO_SMALL` | The Docker subnet has no address left for every service | Use a wider subnet |
| `ERR_MDK_GENERATED_FILE_CONFLICT` | `startServices` would overwrite a file in the site dir it did not generate | Move the file away or pass `overwrite: true` |
| `ERR_MDK_INIT_SOURCES_NOT_FOUND` | `initialize()` finds no MDK source checkout at `opts.sources` | Pass `opts.sources` pointing at an MDK monorepo checkout |
| `ERR_MDK_INIT_SOURCES_REQUIRED` | `initialize()` is called without `opts.sources` | Pass `opts.sources` pointing at an MDK monorepo checkout |
| `ERR_MDK_REPO_ROOT_REQUIRED` | `startServices` has no `config.repoRoot`, or the service bootstrap runs a Worker without `MDK_REPO_ROOT` | Pass `repoRoot` / set `MDK_REPO_ROOT` to the MDK source checkout |
| `ERR_KEYS_DIR_UNSAFE` | A Worker-keys dir is not a real directory, is owned by another user, or is group/world-writable | Use a private (`0700`) directory owned by the service user |
| `ERR_STATS_OP_UNKNOWN` | A stats spec names an op that is not one of the built-in ops | Use a built-in op name (`sum`, `avg`, `group_sum`, ...) |
| `ERR_THING_INFO_INVALID` | `registerThing`/`updateThing` `info` is not an object | Pass `info` as an object |
| `ERR_THING_INFO_CONTAINER_INVALID` / `ERR_THING_INFO_POS_INVALID` | `info.container` / `info.pos` is not a short label (64 chars of letters, digits, space, `_ . : # -`) or is a prototype key | Use a plain label |
| `ERR_MDK_SERVICE_ENV` | The `SERVICE` env var is unset | Set `SERVICE` to `gateway`, `worker` or `dht-bootstrap` |
| `ERR_MDK_SERVICE_NAME_RESERVED` | A service is named `dht-bootstrap` while `config.dht` generates that service | Rename the service |
| `ERR_MDK_SERVICE_UNKNOWN` | `SERVICE` is set to something other than `gateway`, `worker` or `dht-bootstrap` | Set `SERVICE` to `gateway`, `worker` or `dht-bootstrap` |
| `ERR_MDK_WORKER_ENV` | A Worker is started without both `WORKER` and `RACK`, or a non-pool Worker is started without `TYPE` | Set `WORKER` and `RACK`, and set `TYPE` for non-pool Workers |
| `ERR_MDK_WORKER_EXPORT` | The resolved Worker package does not export the expected factory function | Check the Worker package exports the factory named in its boot spec |
| `ERR_MDK_WORKER_UNKNOWN` | The `WORKER` name has no runtime boot entry, or the `WORKER`+`TYPE` pair has no plugin model | Use a known Worker name and a `TYPE` its boot spec defines |
| `ERR_NO_IMPL` | An abstract Thing or Container method is called on a class that has not overridden it | Implement the method on the concrete device class |
| `ERR_PROC_RACK_UNDEFINED` | PoolService is constructed with a context that has no `rack` | Pass `ctx.rack` when constructing the pool service |
| `ERR_PROVISIONING_DB_REQUIRED` | DeviceProvisioningService is constructed without a `db` | Pass a `db` in the constructor options |
| `ERR_PROVISIONING_DEVICE_TYPE_REQUIRED` | DeviceProvisioningService is constructed without a `deviceType` string | Pass a non-empty `deviceType` string |
| `ERR_QUERY_INVALID` | A Worker external-data request has no `query`, or a caller filter is not an object | Include a `query` object in the request |
| `ERR_QUERY_OPERATOR_FORBIDDEN` | A caller filter uses an operator outside the allowlist (`$where`, `$expr`, ...) | Use the allowlisted operators |
| `ERR_QUERY_PATH_FORBIDDEN` | A caller filter, sort or projection names `opts.*`, a secret-named field or a prototype key | Filter on `info.*`, `tags`, `type`, `id`, `code` |
| `ERR_QUERY_REGEX_INVALID` | A `$regex` is not a string, is over 256 characters, or has `$options` other than `i` | Send the literal text to search for, with optional `^` / `$` |
| `ERR_QUERY_TOO_COMPLEX` | A caller filter is deeper than 8 levels or has more than 500 nodes | Simplify the filter |
| `ERR_QUERY_OFFSET_INVALID` / `ERR_QUERY_LIMIT_INVALID` | `offset`/`limit` is not a non-negative integer | Pass integers |
| `ERR_STATS_KEYPATH_FORBIDDEN` / `ERR_STATS_KEYPATH_INVALID` | A `libStats` keypath reaches `__proto__`/`constructor`/`prototype` or is not `a.b[0].c` syntax | Use a plain property path |
| `ERR_RUNTIME_NOT_BOUND` | A device call runs before the runtime device-context getter is bound | Bind the runtime (start the Worker infra) before making device calls |
| `ERR_SET_LED_ENABLED_INVALID` | A miner `setLED` action is given a non-boolean `enabled` | Pass `enabled` as a boolean |
| `ERR_SETTINGS_DB_REQUIRED` | SettingsService is constructed without a `settingsDb` | Pass a `settingsDb` in the constructor options |
| `ERR_SNAPS_COLLECT_SNAP_REQUIRED` | SnapsService is constructed without a `collectSnap` function | Pass a `collectSnap` function in the constructor options |
| `ERR_SNAPS_LOGS_REQUIRED` | SnapsService is constructed without a `logs` instance | Pass the logs service in the constructor options |
| `ERR_START_INVALID` | A DB range read is requested without a `start` bound | Supply a `start` timestamp in the query |
| `ERR_STATS_LOGS_REQUIRED` | StatsService is constructed without a `logs` instance | Pass the logs service in the constructor options |
| `ERR_STORE_DIR_REQUIRED` | `createWorkerInfra` is called without `opts.storeDir` | Pass a `storeDir` path in the Worker infra options |
| `ERR_SWITCH_CONTAINER_ENABLED_INVALID` | A container `switchContainer` action is given a non-boolean `enabled` | Pass `enabled` as a boolean |
| `ERR_SWITCH_COOLING_SYSTEM_ENABLED_INVALID` | A `switchCoolingSystem` action is given a non-boolean `enabled` | Pass `enabled` as a boolean |
| `ERR_SWITCH_SOCKET_ARGS_INVALID` | A `switchSocket` action's first argument is not an array of tuples | Pass socket instructions as an array |
| `ERR_SWITCH_SOCKET_ENABLED_INVALID` | A `switchSocket` tuple's `enabled` is not a boolean | Pass the tuple's `enabled` as a boolean |
| `ERR_SWITCH_SOCKET_PDU_INDEX_INVALID` | A `switchSocket` tuple's PDU index is not a string | Pass the PDU index as a string |
| `ERR_SWITCH_SOCKET_SOCKET_INDEX_INVALID` | A `switchSocket` tuple's socket index is not a string | Pass the socket index as a string |
| `ERR_THING_CODE_INVALID` | A device is registered with a `code` that does not end in `-<digits>` | Supply a code ending in a hyphen and numeric suffix, or omit it to auto-generate |
| `ERR_THING_COMMENT_NOTFOUND` | A comment edit or delete targets an `id` or `ts` that no comment on the thing matches | Reference an existing comment `id` or `ts` |
| `ERR_THING_COMMENTS_NOTFOUND` | A comment edit or delete runs on a thing that has no comments | Add a comment before editing or deleting one |
| `ERR_THING_ADDRESS_FORBIDDEN` | A remote register/update points a device at a loopback, link-local, metadata, unspecified or multicast address, or outside `allowedAddressCidrs` | Use the device's LAN address, or add its network to `conf.thing.allowedAddressCidrs` |
| `ERR_THING_ADDRESS_INVALID` / `ERR_THING_ADDRESS_UNRESOLVABLE` | `opts.address` is not an IP or hostname, or the hostname does not resolve | Pass a valid, resolvable address |
| `ERR_THING_PORT_INVALID` | `opts.port` is not an integer 1–65535 | Pass a valid port |
| `ERR_TIME_RANGE_INVALID` / `ERR_TIME_RANGE_TOO_LARGE` | A pool time range is non-numeric or spans more than 9000 buckets | Narrow the range |
| `ERR_THING_IP_ADDRESS_EXISTS` | A device is registered or updated with an address already held by another device while duplicate IPs are disallowed | Use a unique address or enable `allowDuplicateIPs` |
| `ERR_THING_MACADDRESS_EXISTS` | A device is registered or updated with a MAC address already held by another device | Use a unique MAC address |
| `ERR_THING_NOTFOUND` | An operation references a device `id` that is not in the store | Register the device first or correct the `id` |
| `ERR_THING_POS_EXISTS` | A device is registered or updated with a position and container pair already held by another device | Use a free position within that container |
| `ERR_THING_SERIALNUM_EXISTS` | A device is registered or updated with a serial number already held by another device | Use a unique serial number |
| `ERR_THING_TAGS_INVALID` | Auxiliary tags are not an array, number more than 32, or one is not a label of at most 64 characters (letters, digits, space, `_ . : # -`, starting with a letter or digit; `__proto__`, `constructor` and `prototype` refused) | Pass short label strings as an array |
| `ERR_THING_VALIDATE_OPTS_INVALID` | A device is registered without an `opts` object | Include the device's `opts` in the registration payload |
| `ERR_THING_WITH_CODE_ALREADY_EXISTS` | A device is registered with a `code` already assigned to another device | Use a unique code or omit it to auto-generate |
| `ERR_THING_WITH_ID_ALREADY_EXISTS` | A device is registered with an `id` that already exists | Use a new `id` or omit it to auto-generate |
| `ERR_UNKNOWN_OPERATION` | Numeric aggregation is asked for an operation other than `avg` or `sum` | Use `avg` or `sum` |

## Directory layout

```text
mdk/
├── index.js              # `getKernel`, `startGateway`, `waitForDiscovery`
├── services.js           # `startServices` — facility bootstrap helpers
├── worker.js             # Worker-side entry point
├── lib/
│   ├── dht-bootstrap.js    # `startDhtBootstrap`, `dhtFromEnv`: private HyperDHT network
│   ├── local-discovery.js  # `discovery: { mode: 'local' }` helpers and the trusted-keys (admission) helpers
│   ├── utils.js            # Shared helpers (isValidSnap, isOffline, etc.)
│   ├── worker-infra.js     # `createWorkerInfra` — per-Worker infra bootstrap
│   ├── stats/              # `libStats` — telemetry aggregation ops (sum, avg, group_*, …)
│   ├── services/           # One class per domain service (Actions, Alerts, Comments, LogHistory, Logs, Pool, Provisioning, Settings, Snaps, Stats)
│   │   └── pool-utils/     # Shared pool-service constants and time helpers
│   ├── templates/          # Alert and stats computation templates
│   └── things/             # Thing subclasses — Container, Miner, PowerMeter, Sensor (base: Thing)
├── utils/
│   ├── constants.js        # MDK_STORE and other well-known names
│   ├── index.js            # Facility bootstrap helpers (Intervals, Store, ActionApprover)
│   ├── initialize.js       # Service initialization helpers
│   ├── service-bootstrap.js # Spawns/manages service subprocesses
│   └── compose-yaml.js     # `buildComposeYaml` — docker-compose file generation
└── tests/
    ├── unit/                # One suite per lib/service/thing/util module
    └── integration/         # Kernel-key-file, local-discovery, actions-flow (per Worker family)
```

## Next steps

- [Run the Gateway](../../../docs/guides/gateway/run.md): programmatic and standalone startup, auth configuration, and HRPC key setup
- [Add hardware devices](../../workers/README.md): understand how Workers register devices and expose them to Kernel
- [Add custom routes with apps](../../../docs/guides/gateway/apps.md): extend the Gateway with its own route handlers
- [See the MVP site example](../../../examples/mvp-site/README.md): multi-Worker, multi-device setup in a separate-process topology
- [Understand the the full MDK layer model](../../../docs/concepts/architecture.md)
