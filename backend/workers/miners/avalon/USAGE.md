# Avalon Worker

Drives Canaan Avalon Bitcoin miners over the native TCP CGMiner API. Supports one model family today: A1346.

This page documents what's specific to Avalon: the SDK surface: the manager class this package exports, how to run a mock device, and the shape of `registerThing` options. For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](plugin/mdk-contract.json) directly. For model coverage across all Workers, see the [generated catalogue](../../docs/supported-hardware.md#miners).

For the canonical install pattern that applies to every Worker in the monorepo, see [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md). 

## Exported functions

| Model | `model` value | Mock `type` value |
| --- | --- | --- |
| A1346 | `a1346` | `a1346` |

Import:

```js
const { plugin, startAvalonWorker, AvalonMiner } = require('@tetherto/mdk-worker-avalon')
```

`startAvalonWorker(opts)` boots a `WorkerRuntime` host for one or more Avalon devices of the same `model`; it is the
entry point every `run` invocation below uses. `plugin` is the raw Worker Plugin object
(`{ contract, dir, connect, disconnect }`) for hosts that construct `WorkerRuntime` themselves. `AvalonMiner` is the
internal device-driver class used by `plugin.connect()` — most integrations never touch it directly.

## Running a mock device

The mock binds a TCP server that answers Avalon's native CGMiner API with canned data. The model `type` parameter controls which response set the mock serves (from `mock/initial_states/<type>/`).

Standalone:

```bash
node backend/workers/miners/avalon/mock/server.js --port 14030 --type a1346
```

Programmatic — this is what the example uses:

```js
const avMock = require('@tetherto/mdk-worker-avalon/mock/server')
avMock.createServer({
  port: 14030,
  host: '127.0.0.1',
  type: 'a1346',
  serial: 'AV-001'
})
```

| `createServer` option | Type | Default | Notes |
| --- | --- | --- | --- |
| `port` | number | `4028` | TCP port to bind. |
| `host` | string | `'127.0.0.1'` | Interface to bind. |
| `type` | string | required | Only `a1346` today. |
| `serial` | string | required | Serial number reported by the mock. |

The mock control agent (`mock-control-agent.js`) lets tests mutate mock state at runtime; it's documented in code and used by the integration tests at [`tests/integration/avalon.miner.test.js`](tests/integration/avalon.miner.test.js).

## Registering devices

`startAvalonWorker(opts)` boots a `WorkerRuntime` for the `a1346` model, seeding devices from `opts.seedDevices` on
the first boot against an empty `opts.storeDir`:

```js
const { getKernel } = require('@tetherto/mdk')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()
const worker = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './store/avalon-rack-1',
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'AV-001' },
    opts: { address: '127.0.0.1', port: 14030 }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

| `opts` field | Type | Status | Notes |
| --- | --- | --- | --- |
| `workerId` | string | Required | One runtime process = one `workerId`. |
| `model` | string | Required | Only `a1346` today. |
| `storeDir` | string | Required | Persistent store directory; also holds the provisioned device set. |
| `kernelTopic` | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`. |
| `seedDevices` | array | Optional | `{ id?, info, opts }` entries applied once, only when the store is empty. |

Each `seedDevices`/`registerThing` entry's `opts` shape: `address` (string, required, device IP or hostname), `port`
(number, required, real devices use 4028; mocks use the bound port). The Avalon CGMiner API is unauthenticated, so no
username or password is required in `opts`. `info` is free-form metadata stored alongside the device; common fields
read by the dashboard are `container`, `serialNum`, `macAddress`, `pos`, and `site`. Nothing in `info` affects Worker
behavior.

To register a device with an already-running Worker instead of at boot, send the `registerThing` command over HRPC:

```js
const { createMdkClient } = require('@tetherto/mdk/backend/core/client')

const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
await client.connect()
await client.sendWorkerCommand('avalon-rack-1', null, 'registerThing', {
  id: 'AV-002',
  info: { container: 'site-1', serialNum: 'AV-002' },
  opts: { address: '127.0.0.1', port: 14031 }
})
```

`registerThing` persists the device config immediately, but it only takes effect once the Worker is stopped and
restarted (`await worker.stop()`, then `startAvalonWorker` again with the same `storeDir` and no `seedDevices`) —
there is no hot-add. See
[Worker Runtime legacy services](../../../../docs/reference/maintainers/worker-runtime-legacy-services.md) for how
`registerThing` is served (the `provisioning` service built-in).

## Runnable example

This package has no in-package `examples/` directory. The repo-root example boots a mock A1346, starts a Kernel and
Gateway, and starts the Worker, then stays running until Ctrl+C:

```bash
node examples/backend/miners/avalon/index.js
```

This is the Avalon mirror of [`examples/backend/miners/mdk.client.miner.js`](../../../../examples/backend/miners/mdk.client.miner.js), which uses Whatsminer.

## Capabilities

The full telemetry list (real-time/average hashrate, power, temperature, fan speeds, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, `setLED`, `setupPools`, ...) is in [`mdk-contract.json`](plugin/mdk-contract.json). Per-model alert thresholds live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## Next steps

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide Worker install pattern
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this Worker
- [`docs/reference/glossary.md`](../../../../docs/reference/glossary.md) — vocabulary (Kernel, Worker, manager, thing, mock)
- [`mdk-contract.json`](plugin/mdk-contract.json) — runtime contract source of truth
