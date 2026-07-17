# Whatsminer Worker

Drives MicroBT Whatsminer Bitcoin miners over an encrypted TCP API with token-based authentication. Supports five model families: M30S+, M30S++, M53S, M56S, and M63.

This page documents what's specific to Whatsminer: the SDK surface: the manager classes this package exports, how to run a mock device, and the shape of `registerThing` options. For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](plugin/mdk-contract.json) directly. For model coverage across all Workers, see the [generated catalogue](../../docs/supported-hardware.md#miners).

For the canonical install pattern that applies to every Worker in the monorepo, see [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md). 

## Exported functions

| Model | `model` value | Mock `type` value |
| --- | --- | --- |
| M30S+ | `m30sp` | `m30sp` |
| M30S++ | `m30spp` | `m30spp` |
| M53S | `m53s` | `m53s` |
| M56S | `m56s` | `m56s` |
| M63 | `m63` | `m63` |

Import:

```js
const { plugin, startWhatsminerWorker, Whatsminer } = require('@tetherto/mdk-worker-whatsminer')
```

`startWhatsminerWorker(opts)` boots a `WorkerRuntime` host for one or more Whatsminer devices of the same `model`; it
is the entry point every `run` invocation below uses. `plugin` is the raw Worker Plugin object
(`{ contract, dir, connect, disconnect }`) for hosts that construct `WorkerRuntime` themselves. `Whatsminer` is the
internal device-driver class used by `plugin.connect()` — most integrations never touch it directly.

## Run a mock device

The mock binds a TCP server that answers Whatsminer's native API (encrypted, token-authenticated) with canned data. The model `type` parameter controls which response set the mock serves (from `mock/initial_states/<type>/`).

Standalone:

```bash
node backend/workers/miners/whatsminer/mock/server.js --port 14028 --type m56s
```

Or, from this package, with the `npm run mock` script — the model `type` is the first argument
(case-insensitive). For a custom port or other flags, use the standalone form above:

```bash
npm run mock m56s
```

Programmatic — this is what the examples use:

```js
const wmMock = require('@tetherto/mdk-worker-whatsminer/mock/server')
wmMock.createServer({
  port: 14028,
  host: '127.0.0.1',
  type: 'm56s',
  serial: 'WM-001',
  password: 'admin'
})
```

| `createServer` option | Type | Default | Notes |
| --- | --- | --- | --- |
| `port` | number | required | TCP port to bind. |
| `host` | string | `'127.0.0.1'` | Interface to bind. |
| `type` | string | required | One of `m30sp`, `m30spp`, `m53s`, `m56s`, `m63`. |
| `serial` | string | required | Serial number reported by the mock. |
| `password` | string | `'admin'` | Password the mock derives its token-auth key from. |

The mock control agent (`mock-control-agent.js`) lets tests mutate mock state at runtime; it's documented in code and used by the integration tests at [`tests/integration/whatsminer.test.js`](tests/integration/whatsminer.test.js).

## Registering devices

`startWhatsminerWorker(opts)` boots a `WorkerRuntime` for one `model`, seeding devices from `opts.seedDevices` on the
first boot against an empty `opts.storeDir`:

```js
const { getKernel } = require('@tetherto/mdk')
const { startWhatsminerWorker } = require('@tetherto/mdk-worker-whatsminer')

const kernel = await getKernel()
const worker = await startWhatsminerWorker({
  workerId: 'whatsminer-rack-1',
  model: 'm56s',
  storeDir: './store/whatsminer-rack-1',
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'WM-001' },
    opts: { address: '127.0.0.1', port: 14028, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

| `opts` field | Type | Status | Notes |
| --- | --- | --- | --- |
| `workerId` | string | Required | One runtime process = one `workerId`. |
| `model` | string | Required | One of `m30sp`, `m30spp`, `m53s`, `m56s`, `m63`. |
| `storeDir` | string | Required | Persistent store directory; also holds the provisioned device set. |
| `kernelTopic` | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`. |
| `seedDevices` | array | Optional | `{ id?, info, opts }` entries applied once, only when the store is empty. |

Each `seedDevices`/`registerThing` entry's `opts` shape: `address` (string, required, device IP or hostname), `port`
(number, required, real devices use 14028; mocks use the bound port), `password` (string, required, Whatsminer API
password — the Worker negotiates a session token from it via HMAC-SHA256 challenge-response; there is no separate
username). `info` is free-form metadata stored alongside the device; common fields read by the dashboard are
`container`, `serialNum`, `macAddress`, `pos`, and `site`. Nothing in `info` affects Worker behavior.

To register a device with an already-running Worker instead of at boot, send the `registerThing` command over HRPC:

```js
const { createMdkClient } = require('@tetherto/mdk/backend/core/client')

const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
await client.connect()
await client.sendWorkerCommand('whatsminer-rack-1', null, 'registerThing', {
  id: 'WM-002',
  info: { container: 'site-1', serialNum: 'WM-002' },
  opts: { address: '127.0.0.1', port: 14029, password: 'admin' }
})
```

`registerThing` persists the device config immediately, but it only takes effect once the Worker is stopped and
restarted (`await worker.stop()`, then `startWhatsminerWorker` again with the same `storeDir` and no `seedDevices`) —
there is no hot-add. See
[Worker Runtime legacy services](../../../../docs/reference/maintainers/worker-runtime-legacy-services.md) for how
`registerThing` is served (the `provisioning` service built-in).

## Runnable examples

| Purpose | Example | Run from |
| --- | --- | --- |
| Boot one mock M56S, start a Kernel and Worker, print the HRPC key and device ID, stay running until Ctrl+C | [`examples/backend/miners/mdk.client.miner.js`](../../../../examples/backend/miners/mdk.client.miner.js) | repo root |
| End-to-end parity check exercising every legacy operator flow (metrics, commands, logs, stats, comments, settings, approval-gated actions, provisioning + restart) | [`examples/run-runtime-parity.js`](examples/run-runtime-parity.js) | this package |

```bash
node examples/backend/miners/mdk.client.miner.js
# or, from this package:
node backend/workers/miners/whatsminer/examples/run-runtime-parity.js
```

For a model other than M56S, run that model's mock directly (`npm run mock <type>`, see above) and adapt the
`model` option in your own boot script — there is no separate runnable file per model.

## Capabilities

The full telemetry list (real-time/average hashrate, power, temperature, fan speeds, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, `setLED`, `setupPools`, `setPowerPct`, ...) is in [`mdk-contract.json`](plugin/mdk-contract.json). Per-model alert thresholds live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## Next steps

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide Worker install pattern
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this Worker
- [`docs/reference/glossary.md`](../../../../docs/reference/glossary.md) — vocabulary (Kernel, Worker, manager, thing, mock)
- [`mdk-contract.json`](plugin/mdk-contract.json) — runtime contract source of truth
