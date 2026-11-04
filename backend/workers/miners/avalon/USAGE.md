# Avalon Worker

Drives Canaan Avalon Bitcoin miners over the native TCP CGMiner API. Supports one model family today: A1346.

This page documents what's specific to Avalon: the SDK surface: the manager class this package exports, how to run a mock device, and the shape of `registerThing` options. For the runtime contract — telemetry units, command shapes, error codes, alert thresholds — read [`mdk-contract.json`](plugin/mdk-contract.json) directly. For model coverage across all Workers, see the [generated catalogue](../../docs/supported-workers.md).

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

Programmatic:

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

The mock control agent ([`mock-control-agent.js`](../../mock/mock-control-agent.js)) lets tests mutate mock state at runtime; it's documented in code and used by the integration tests at [`tests/integration/avalon.miner.test.js`](tests/integration/avalon.miner.test.js).

## Registering devices

`startAvalonWorker(opts)` boots a `WorkerRuntime` for the `a1346` model, seeding devices from `opts.seedDevices` on
the first boot against an empty `opts.storeDir`:

```js
const { getKernel } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')

const kernel = await getKernel()
const worker = await startAvalonWorker({
  workerId: 'avalon-rack-1',
  model: 'a1346',
  storeDir: './store/avalon-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  seedDevices: [{
    info: { container: 'site-1', serialNum: 'AV-001' },
    opts: { address: '127.0.0.1', port: 14030, password: 'admin' }
  }]
})
await kernel.registerWorker(worker.runtime.getPublicKey())
```

| `opts` field | Type | Status | Notes |
| --- | --- | --- | --- |
| `workerId` | string | Required | One runtime process = one `workerId`. |
| `model` | string | Required | Only `a1346` today. |
| `storeDir` | string | Required | Persistent store directory; also holds the provisioned device set. |
| `allowedKeys` | array | Required | RPC caller keys the Worker accepts; pass `kernel.getClientPublicKey()`. Without it (or `allowAll: true` for local development) the Worker throws `ERR_WORKER_ALLOWED_KEYS_REQUIRED`. |
| `kernelTopic` | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`. |
| `seedDevices` | array | Optional | `{ id?, info, opts }` entries applied once, only when the store is empty. |

Each `seedDevices`/`registerThing` entry's `opts` shape: `address` (string, required, device IP or hostname), `port`
(number, required, real devices use 4028; mocks use the bound port), `password` (string, required by the plugin's
own config validation, even though the CGMiner wire protocol itself does not authenticate). `info` is free-form
metadata stored alongside the device; common fields
read by the dashboard are `container`, `serialNum`, `macAddress`, `pos`, and `site`. Nothing in `info` affects Worker
behavior.

To register a device with an already-running Worker instead of at boot, push a `registerThing` write action through the Kernel. The Kernel routes it
to the Worker named in `params[0].workerId` and runs it once the action has the approvals that Worker requires:

```js
const { createMdkClient } = require('@tetherto/mdk-client')
const { name, privateKeyPem } = require('./.mdk/credentials/agents/provisioner.json')

const client = createMdkClient({
  kernelKey: kernel.getPublicKey(),
  kernelCredential: { name, privateKey: privateKeyPem }
})
await client.connect()
await client.pushAction({
  query: {},
  action: 'registerThing',
  voter: 'provisioner',
  authPerms: ['miner:w'],
  params: [{
    workerId: 'avalon-rack-1',
    id: 'AV-002',
    info: { container: 'site-1', serialNum: 'AV-002' },
    opts: { address: '127.0.0.1', port: 14031 }
  }]
})
```

`registerThing` is a write action, so the Kernel evaluates it against `spec.rbac` before any Worker sees it.
`mdk sa add provisioner` writes the credential this reads, and the account needs `actions: write` to push, plus
`devices: write`.
[Provisioning a device](../../../../docs/guides/security/index.md#provisioning-a-device) covers how to scope that grant
and why a successful push is not yet a live device.


`registerThing` persists the device config immediately, but it only takes effect once the Worker is stopped and
restarted (`await worker.stop()`, then `startAvalonWorker` again with the same `storeDir` and no `seedDevices`) —
there is no hot-add. See
[Worker Runtime store services](../../../core/mdk-worker/README.md#store-services) for how
`registerThing` is served (the `provisioning` service built-in).

## Run against a mock

Start the mock from the repo root on the port your `seedDevices` entry names, then boot the Worker against it with the
`startAvalonWorker` call in [Registering devices](#registering-devices), which uses `14030`:

```bash
npm run mock a1346 14030
```

The [Avalon Worker guide](../../../../docs/guides/miners/run-avalon-worker.md) has a complete, runnable `avalon-dev.js`
for the second terminal. Its seed entry uses the CGMiner default `4028`, so start the mock with `npm run mock a1346 4028`
for that script.

## Capabilities

The full telemetry list (real-time/average hashrate, power, temperature, fan speeds, efficiency, accepted/rejected shares, ...) and command list (`reboot`, `setPowerMode`, `setLED`, `setupPools`, ...) is in [`mdk-contract.json`](plugin/mdk-contract.json). Per-model alert thresholds live in [`config/base.thing.json.example`](config/base.thing.json.example) under the `alerts.<rack-type>` blocks.

## Next steps

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md) — workspace-wide Worker install pattern
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml) — agent-readable index entry for this Worker
- [`docs/reference/glossary.md`](../../../../docs/reference/glossary.md) — vocabulary (Kernel, Worker, manager, thing, mock)
- [`mdk-contract.json`](plugin/mdk-contract.json) — runtime contract source of truth
