# Avalon Worker

Drives Canaan Avalon Bitcoin miners over the native TCP CGMiner API. Supports one model family today: A1346.

This page documents what's specific to Avalon: how the package is hosted, the device options, how to run a mock
device, and the class the package exports. For the runtime contract (telemetry units, command shapes, error codes)
read [`mdk-contract.json`](mdk-contract.json) directly. For model coverage across all Workers, see the
[generated catalogue](../../docs/supported-workers.md).

The canonical install pattern that applies to every Worker in the monorepo is in
[`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md).

## Package shape

| Model | `type` value     | Mock `type` value |
| ----- | ---------------- | ----------------- |
| A1346 | `miner-av-a1346` | `a1346`           |

The package is a directory-loaded Worker Plugin: [`mdk-contract.json`](mdk-contract.json) at its root plus the
handler files under `src/` (see [`src/device.js`](src/device.js)), hosted by `WorkerRuntimeV2`. There is no boot function and no plugin module to
`require()`; the one export is the device driver class, for hosts that drive a miner without the runtime:

```js
const { AvalonMiner } = require('@tetherto/mdk-worker-avalon')
```

## Running a mock device

The mock binds a TCP server that answers Avalon's native CGMiner API with canned data. The model `type` parameter
controls which response set the mock serves (from `mock/initial_states/<type>/`).

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

| `createServer` option | Type   | Default       | Notes                                |
| --------------------- | ------ | ------------- | ------------------------------------ |
| `port`                | number | `4028`        | TCP port to bind; `0` picks a free one |
| `host`                | string | `'127.0.0.1'` | Interface to bind                    |
| `type`                | string | required      | Only `a1346` today                   |
| `serial`              | string | required      | Serial number reported by the mock   |

The mock control agent ([`mock-control-agent.js`](../../mock/mock-control-agent.js)) lets tests mutate mock state at
runtime; it's documented in code and used by the integration tests at
[`tests/integration/avalon.miner.test.js`](tests/integration/avalon.miner.test.js).

## Declaring devices

The device list is fixed at construction: adding or removing a miner is a config edit and a restart. With `mdk run`,
the list is `config.devices` under the Worker's `spec.workers` entry in `mdk.yaml`; `mock: true` starts one mock
per device on the port each device names:

```yaml
spec:
  workers:
    - name: avalon
      package: '@tetherto/mdk-worker-avalon'
      config:
        mock: true
        devices:
          - id: AV-001
            opts: { address: 127.0.0.1, port: 14030, password: admin }
```

In your own host process, hand `WorkerRuntimeV2` the same list:

```js
const path = require('path')
const { getKernel } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()
const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
  workerId: 'avalon-rack-1',
  storeDir: './store/avalon-rack-1',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'AV-001', config: { address: '127.0.0.1', port: 14030, password: 'admin' } }]
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

| Runtime option | Type   | Status   | Notes                                                                                     |
| -------------- | ------ | -------- | ----------------------------------------------------------------------------------------- |
| `workerId`     | string | Required | One runtime process = one `workerId`.                                                     |
| `devices`      | array  | Required | `{ deviceId, config }` entries; `config` is the device options table below.                |
| `allowedKeys`  | array  | Required | RPC caller keys the Worker accepts; pass `kernel.getClientPublicKey()`. Without it (or `allowAll: true` for local development) the Worker throws `ERR_WORKER_ALLOWED_KEYS_REQUIRED`. |
| `storeDir`     | string | Optional | Keeps the RPC key stable across restarts.                                                 |
| `kernelTopic`  | string | Optional | DHT discovery topic (hex); omit to register directly with `kernel.registerWorker()`.       |
| `config`       | object | Optional | Worker-level block every device reads: default `type`, `conf`, `pools`.                   |

Device options (`opts` in `mdk.yaml`, `config` per device in the host):

| Field                   | Required | Notes                                                                                    |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `address`               | Yes      | Device IP or hostname. `host` is accepted as an alias                                     |
| `password`              | Yes      | Required by the plugin's own validation; reads over the CGMiner API need no credentials  |
| `port`                  | No       | Real devices use `4028`; mocks use the bound port. Defaults to `4028`                     |
| `type`                  | No       | Defaults to `miner-av-a1346`; resolves the rated W/TH for `snap`                          |
| `nominalEfficiencyWThs` | No       | Overrides the rated efficiency table                                                      |
| `timeout`               | No       | Per-request timeout in milliseconds. Defaults to `10000`                                  |
| `conf.pools`            | No       | Pools `setupPools` applies when called without `pools`                                    |

## Run against a mock

With `mdk run`, `mock: true` in the `mdk.yaml` entry starts the mock for you. By hand, start the mock from the repo
root, then boot the Worker against it with the host snippet in [Declaring devices](#declaring-devices):

```bash
npm run mock a1346 14030
```

The [Avalon Worker guide](../../../../docs/guides/miners/run-avalon-worker.md) walks through both paths.

## Capabilities

The telemetry list (average hashrate, power, temperature, fan speed, status, uptime, efficiency, power mode, snap)
and command list (`reboot`, `setPowerMode`, `setLED`, `setupPools`) is in [`mdk-contract.json`](mdk-contract.json).

## Next steps

- [`backend/workers/docs/install-pattern.md`](../../docs/install-pattern.md): workspace-wide Worker install pattern
- [`backend/workers/docs/workers-manifest.yaml`](../../docs/workers-manifest.yaml): agent-readable index entry for this Worker
- [`docs/reference/glossary.md`](../../../../docs/reference/glossary.md): vocabulary (Kernel, Worker, Worker Plugin, mock)
- [`mdk-contract.json`](mdk-contract.json): runtime contract source of truth
