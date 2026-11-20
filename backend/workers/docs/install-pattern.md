# Worker install pattern

Every Worker package in this workspace ships the same shape. Per-manufacturer specifics live in each Worker's own `README.md`.

## What a Worker package contains

```text
backend/workers/<family>/<provider>/
  mdk-contract.json     # runtime contract: metadata, telemetry, commands, errors; names the handlers
  src/
    device.js           # builds this device's client from the ambient device module (f2pool: `pool.js`)
    telemetry/*.js      # one (params) handler per metric field
    commands/*.js       # one (params) handler per write action, where the device has any
  lib/                  # device client implementations + protocol translation
  mock/server.js        # local server mimicking the vendor's device API
  mock/initial_states/  # canned responses the mock returns
  smoke.config.js       # device spec for `mdk validate worker --smoke`
  index.js              # exports the device classes, for a host that drives a device without the runtime
  tests/                # unit + integration tests
  package.json          # vendor-specific deps
```

The [Antspace, Bitdeer and Seneca packages](../README.md#1-worker-plugin) are still on the older module-exporting
shape: their contract and handlers live under `plugin/`, they ship a `plugin/boot.js` boot helper on
`WorkerRuntime` v1, and they keep `config/*.json.example` templates.

[`mdk-contract.json`](../../workers/miners/avalon/mdk-contract.json) is the engineering source of truth for telemetry units,
command shapes, and supported models.

## The two ways to run a Worker

### As a library, in your own Node process

The canonical SDK shape. Point [`WorkerRuntimeV2`](../../core/mdk-worker/lib/worker-runtime-v2.js) at the package
directory and hand it the device list (`mdk run` does the same from `mdk.yaml`):

```js
const path = require('path')
const { getKernel } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')

const kernel = await getKernel()

const runtime = new WorkerRuntimeV2(path.dirname(require.resolve('@tetherto/mdk-worker-avalon/package.json')), {
  workerId: 'avalon-rack-1',
  storeDir: './data/avalon',
  allowedKeys: [kernel.getClientPublicKey()],
  devices: [{ deviceId: 'AV-001', config: { address: '127.0.0.1', port: 14030, password: 'admin' } }]
})
await runtime.start()
await kernel.registerWorker(runtime.getPublicKey())
```

`allowedKeys` is required: the Worker refuses to start without the Kernel's client key (`ERR_WORKER_ALLOWED_KEYS_REQUIRED`).
The [Avalon](../../../docs/guides/miners/run-avalon-worker.md), [Antspace](../../../docs/guides/containers/run-antspace-worker.md)
and [Bitdeer](../../../docs/guides/containers/run-bitdeer-worker.md) guides run this shape against each Worker's mock.
The per-package `README.md` documents each Worker's device options and mock, and Avalon adds a `USAGE.md`. The Antspace,
Bitdeer and Seneca packages still ship a `start<Family>Worker()` boot helper on `WorkerRuntime` v1 instead.

### Standalone via [`worker.js`](../../core/mdk/worker.js)

The core SDK ships [`backend/core/mdk/worker.js`](../../core/mdk/worker.js): a shared process entry compatible with pm2, Docker, or `node worker.js`
directly. It is driven by environment variables, not CLI flags — [`utils/service-bootstrap.js`](../../core/mdk/utils/service-bootstrap.js) reads `SERVICE`
(and, for a Worker, `WORKER`/`TYPE`/`RACK`, plus `MDK_REPO_ROOT` naming the MDK source checkout) and bootstraps the matching manager.
A directory-loaded family (Avalon, ABB, SATEC, Schneider, F2Pool) is hosted on `WorkerRuntimeV2` with its device list from
`MDK_WORKER_DEVICES` (a JSON array in the `mdk.yaml` `devices` shape) or `MDK_WORKER_DEVICES_FILE`, and its worker env from
`MDK_WORKER_ENV` (a JSON object, for a secret such as `F2POOL_API_SECRET`) or `MDK_WORKER_ENV_FILE`. `startServices()` writes both files
from a service's `devices` and `env` and sets the `_FILE` variables.
A Worker started this way joins the DHT topic, and the Kernel admits it only if its RPC key is in `discovery.workerKeys` (or
`discovery.allowAnyWorker: true` is set for development). (The only `--wtype` in play is the one it passes when spawning the Gateway's own Worker;
miner Workers run with a fixed internal `wtype`.)

Choosing this over the library shape is a deployment-topology decision, not just "for production": running each service as its own OS process
(under pm2 or Docker) is what lets a supervisor allocate resources per process/container, restart or scale one Worker independently, and keep a
Worker crash from taking down its siblings or the Gateway. The library shape instead runs everything in one Node heap (lower footprint, simplest).
See [`docs/concepts/deployment-topologies.md`](../../../docs/concepts/deployment-topologies.md) for the full trade-off.

## Run a mock device

Every Worker bundles a mock server next to its real-device code. From the repo root, `npm run mock` starts any of them by
type, with the port as a bare number (run it with no arguments to list every device and its types):

```bash
npm run mock a1346 14030
```

Dash-free tokens are translated for you (a bare number is the port, `key=value` sets any flag). From the
first dashed token on, the rest of the entry is handed to the mock unchanged, so raw flags after npm's `--`
work too:

```bash
npm run mock d40_m56 -- --port 10883 --id D40-DEV
```

A mock's own CLI takes flags only. A stray positional argument is refused with `ERR_MOCK_CLI_POSITIONAL`
rather than ignored.

To run the same mock directly:

```bash
node backend/workers/miners/avalon/mock/server.js --port 14030 --type a1346
```

Or programmatically:

```js
const avMock = require('@tetherto/mdk-worker-avalon/mock/server')
avMock.createServer({ port: 14030, host: '127.0.0.1', type: 'a1346', serial: 'AV-001' })
```

The mock binds a server that answers the vendor's native protocol with canned data from `mock/initial_states/`: TCP, HTTP,
Modbus or MQTT, depending on the family. Per-Worker mock options (supported types, default credentials, control port) are
documented in each Worker's `README.md`.

## Configuration

A directory-loaded Worker takes its devices from `config.devices[]` under `spec.workers` in `mdk.yaml`, or
from the `devices` list a host hands `WorkerRuntimeV2`. There is no per-package config file to seed. The
per-package `README.md` documents each Worker's device options, and `smoke.config.js` at the package root
holds the device spec `mdk validate worker --smoke` runs against the bundled mock.

The Antspace, Bitdeer and Seneca packages ship `config/*.json.example` templates instead. There is nothing to copy
by hand: an active `config/*.json` is used when present, and the example is the fallback. The active copies are
gitignored, leaving room for environment-specific overrides.

## Coverage

| Worker | USAGE.md | examples | manifest entry |
| --- | --- | --- | --- |
| [`miners/avalon`](../miners/avalon/README.md) | [USAGE.md](../miners/avalon/USAGE.md) | [`avalon-dev.js`](../../../docs/guides/miners/run-avalon-worker.md) | [workers-manifest.yaml](workers-manifest.yaml) |
| containers, minerpools, power-meter, temperature | _Phase 3+_ | `npm run mock` plus the per-family guide | _Phase 3+_ |

The full model coverage for every Worker (all families) is generated from the contracts: see [`docs/supported-workers.md`](supported-workers.md).
Partner-maintained Workers (Antminer, Whatsminer) are plain contract plugins in their own repositories, hosted on
`WorkerRuntimeV2` rather than through a boot function — see [`run-antminer-worker.md`](../../../docs/guides/miners/run-antminer-worker.md).

## Next steps

- [`build-a-worker.md`](../../../docs/guides/workers/build-a-worker.md) — build your own Worker in a separate repo, for a new device family
- [`backend/core/kernel/README.md`](../../core/kernel/README.md) — the Kernel side of the install picture
- [`workers-manifest.yaml`](workers-manifest.yaml) — agent-readable manifest of variants + mock ports
- [`docs/tutorials/run-a-site.md`](../../../docs/tutorials/run-a-site.md): narrative onboarding that uses this pattern
- [`docs/reference/maintainers/agent-ready-sdk.md`](../../../docs/reference/maintainers/agent-ready-sdk.md) — the workspace-wide USAGE.md + examples
convention this page implements
