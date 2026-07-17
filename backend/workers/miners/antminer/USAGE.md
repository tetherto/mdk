# Antminer Worker

Drives Bitmain Antminer Bitcoin miners over HTTP with digest authentication. Supports four model families: S19XP, S19XP Hydro, S21, and S21 Pro.

This page documents the SDK surface: the manager classes this package exports, how to run a mock device, and the shape of `registerThing` options. 
For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](plugin/mdk-contract.json) directly.

For the canonical install pattern that applies to every Worker in the monorepo, see [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md). 
This page only documents what's specific to Antminer.

## Exported functions

| Model | `model` value | Mock `type` value |
| --- | --- | --- |
| S19 XP | `s19xp` | `s19xp` |
| S19 XP Hydro | `s19xp_h` | `s19xp_h` |
| S21 | `s21` | `s21` |
| S21 Pro | `s21pro` | `s21pro` |

Import:

```js
const { plugin, startAntminerWorker, Antminer } = require('@tetherto/mdk-worker-antminer')
```

`startAntminerWorker(opts)` boots a `WorkerRuntime` host for one or more Antminer devices of the same `model`; it is
the entry point every `run` invocation below uses. `plugin` is the raw Worker Plugin object
(`{ contract, dir, connect, disconnect }`) for hosts that construct `WorkerRuntime` themselves. `Antminer` is the
internal device-driver class used by `plugin.connect()` — most integrations never touch it directly.

## Running a mock device

The mock binds an HTTP server that answers Bitmain's native API with canned data. The model `type` parameter controls which response set the mock 
serves (from `mock/initial_states/<type>/`).

Standalone:

```bash
node backend/workers/miners/antminer/mock/server.js --port 14021 --type s19xp
```

Programmatic — this is what the Phase 1 example uses:

```js
const amMock = require('@tetherto/mdk-worker-antminer/mock/server')
amMock.createServer({
  port: 14021,
  host: '127.0.0.1',
  type: 's19xp',
  serial: 'AM-001',
  password: 'root'
})
```

| `createServer` option | Type | Default | Notes |
| --- | --- | --- | --- |
| `port` | number | required | TCP port to bind. |
| `host` | string | `'127.0.0.1'` | Interface to bind. |
| `type` | string | required | One of `s19xp`, `s19xp_h`, `s21`, `s21pro`. |
| `serial` | string | required | Serial number reported by the mock. |
| `password` | string | `'root'` | Digest-auth password the mock accepts. |
| `mockControlPort` | number | none | Optional control-plane port for the mock-control-agent. |
| `delay` | number | `0` | Response delay in ms (for latency testing). |
| `error` | boolean | `false` | If true, mock returns error responses. |

The mock control agent (`mock-control-agent.js`) lets tests mutate mock state at runtime; it's documented in code and used by the integration 
tests at [`tests/integration/antminer.test.js`](tests/integration/antminer.test.js).

## Registering devices

`startAntminerWorker(opts)` boots a `WorkerRuntime` for one `model`, seeding devices from `opts.seedDevices` on the
first boot against an empty `opts.storeDir`:

```js
const { getKernel } = require('@tetherto/mdk')
const { startAntminerWorker } = require('@tetherto/mdk-worker-antminer')

const kernel = await getKernel()
const worker = await startAntminerWorker({
  workerId: 'antminer-rack-1',
  model: 's21',
  storeDir: './store/antminer-rack-1',
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'AM-001' },
    opts: { address: '127.0.0.1', port: 14021, username: 'root', password: 'root' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

| `opts` field | Type | Status | Notes |
| --- | --- | --- | --- |
| `workerId` | string | Required | One runtime process = one `workerId`. |
| `model` | string | Required | One of `s19xp`, `s19xp_h`, `s21`, `s21pro`. |
| `storeDir` | string | Required | Persistent store directory; also holds the provisioned device set. |
| `kernelTopic` | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`. |
| `seedDevices` | array | Optional | `{ id?, info, opts }` entries applied once, only when the store is empty. |

Each `seedDevices`/`registerThing` entry's `opts` shape: `address` (string, required, device IP or hostname), `port`
(number, required, HTTP, real devices typically 80; mocks use the bound port), `username` (string, required,
digest-auth username; real Antminer devices default to `root`), `password` (string, required, digest-auth password).
`info` is free-form metadata stored alongside the device; common fields read by the dashboard are `container`,
`serialNum`, `macAddress`, `pos`, and `site`. Nothing in `info` affects Worker behavior.

To register a device with an already-running Worker instead of at boot, send the `registerThing` command over HRPC:

```js
const { createMdkClient } = require('@tetherto/mdk/backend/core/client')

const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
await client.connect()
await client.sendWorkerCommand('antminer-rack-1', null, 'registerThing', {
  id: 'AM-002',
  info: { container: 'site-1', serialNum: 'AM-002' },
  opts: { address: '127.0.0.1', port: 14022, username: 'root', password: 'root' }
})
```

`registerThing` persists the device config immediately, but it only takes effect once the Worker is stopped and
restarted (`await worker.stop()`, then `startAntminerWorker` again with the same `storeDir` and no `seedDevices`) —
there is no hot-add. See
[Worker Runtime legacy services](../../../../docs/reference/maintainers/worker-runtime-legacy-services.md) for how
`registerThing` is served (the `provisioning` service built-in).

## Runnable examples

This package has no in-package `examples/` directory. The repo-root example is config-driven and boots a mock device
per configured Worker, starts a Kernel and Gateway, and starts each Worker, then stays running until Ctrl+C:

```bash
node examples/backend/miners/antminer/index.js
```

It falls back to the committed `config/mdk.config.json.example` when no local `config/mdk.config.json` is present.
This is the Antminer mirror of [`examples/backend/miners/mdk.client.miner.js`](../../../../examples/backend/miners/mdk.client.miner.js), which uses Whatsminer.

These are the Antminer mirror of [`examples/backend/miners/mdk.client.miner.js`](../../../../examples/backend/miners/mdk.client.miner.js), which uses Whatsminer.

## Capabilities

The full telemetry list (hashrate, power, temperature, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, 
`setLED`, `setupPools`, ...) is in [`mdk-contract.json`](plugin/mdk-contract.json). Per-model alert thresholds — hashboard temperature limits, hashrate bounds, 
pool/subaccount mismatches — live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## See also

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide Worker install pattern.
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this Worker.
- [`docs/reference/glossary.md`](../../../../docs/reference/glossary.md) — vocabulary (Kernel, Worker, manager, thing, mock).
- [`mdk-contract.json`](plugin/mdk-contract.json) — runtime contract source of truth.

