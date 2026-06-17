# Worker install pattern

Every worker package in this workspace ships the same shape. Per-manufacturer specifics live in each worker's own `USAGE.md`.

## What a worker package contains

```
backend/workers/<family>/<provider>/
  index.js              # exports the manager classes (one per device model)
  lib/                  # manager implementations + protocol translation
  mock/server.js        # local HTTP server mimicking the vendor's device API
  mock/initial_states/  # canned responses the mock returns
  config/*.json.example # config templates copied by setup-config.sh
  setup-config.sh       # copies *.example -> active config files
  mdk-contract.json     # runtime contract: metadata, telemetry, commands, errors
  tests/                # unit + integration tests
  package.json          # vendor-specific deps (e.g. digest-fetch for antminer)
  USAGE.md              # this package's install/run notes (per-package)
  examples/             # runnable scenarios per the qvac model
```

The contract — [`mdk-contract.json`](../../workers/miners/antminer/mdk-contract.json) is the engineering source of truth for telemetry units, command 
shapes, and supported models. 

## The two ways to run a worker

### As a library, in your own Node process

The canonical SDK shape. You instantiate the manager class via [`startWorker`](../../core/mdk/index.js) from `@tetherto/mdk` and register devices 
programmatically:

```js
const { getOrk, startWorker } = require('@tetherto/mdk')
const { AM_S19XP } = require('@tetherto/miner-antminer')

const ork = await getOrk()
const { manager } = await startWorker(AM_S19XP, { ork })

await manager.registerThing({
  info: { container: 'site-1', serialNum: 'AM-001' },
  opts: { address: '127.0.0.1', port: 14021, username: 'root', password: 'root' }
})
```

This is what every example under [`examples/backend/README.md`](../../../examples/backend/README.md) does. The per-package `USAGE.md` documents which 
manager class names a given worker exports and what `opts` it needs.

### Standalone via `worker.js`

The core SDK ships [`backend/core/mdk/worker.js`](../../core/mdk/worker.js): a shared process entry compatible with pm2, Docker, or `node worker.js` 
directly. It is driven by environment variables, not CLI flags — [`utils/service-bootstrap.js`](../../core/mdk/utils/service-bootstrap.js) reads `SERVICE` 
(and, for a worker, `WORKER`/`TYPE`/`RACK`) and bootstraps the matching manager. (The only `--wtype` in play is the one it passes when spawning the App Node's own worker; 
miner workers run with a fixed internal `wtype`.)

Choosing this over the library shape is a deployment-topology decision, not just "for production": running each service as its own OS process 
(under pm2 or Docker) is what lets a supervisor allocate resources per process/container, restart or scale one worker independently, and keep a 
worker crash from taking down its siblings or the App Node. The library shape instead runs everything in one Node heap (lower footprint, simplest). 
See [`docs/concepts/deployment-topologies.md`](../../../docs/concepts/deployment-topologies.md) for the full trade-off.

## Run a mock device

Every worker bundles a mock server next to its real-device code. To run a mock Antminer S19XP on port 14021:

```bash
node backend/workers/miners/antminer/mock/server.js --port 14021 --type s19xp
```

Or programmatically (this is what the examples do):

```js
const amMock = require('@tetherto/miner-antminer/mock/server')
amMock.createServer({ port: 14021, host: '127.0.0.1', type: 's19xp', serial: 'AM-001', password: 'root' })
```

The mock binds an HTTP server that answers the vendor's native API with canned data from `mock/initial_states/`. Per-worker mock options (supported types, 
default credentials, control port) are documented in each worker's `USAGE.md`.

## Configuration

`setup-config.sh` copies every `config/*.example` into an active config file (strips the `.example` suffix). Pass `-t` to also seed test variants:

```bash
cd backend/workers/miners/antminer
./setup-config.sh        # copies *.example -> active
./setup-config.sh -t     # additionally seeds tests/test.*.json
```

The example files are checked in; the copied actives are gitignored, leaving room for environment-specific overrides.

## Coverage

| Worker | USAGE.md | examples | manifest entry |
| --- | --- | --- | --- |
| `miners/antminer` | [USAGE.md](../miners/antminer/USAGE.md) | [examples/](../miners/antminer/examples/) | [workers-manifest.yaml](workers-manifest.yaml) |
| `miners/whatsminer` | [USAGE.md](../miners/whatsminer/USAGE.md) | [examples/](../miners/whatsminer/examples/)  | [workers-manifest.yaml](workers-manifest.yaml) |
| `miners/avalon` | [USAGE.md](../miners/avalon/USAGE.md) | [examples/](../miners/avalon/examples/)| [workers-manifest.yaml](workers-manifest.yaml) |
| containers, minerpools, power-meter, temperature | _Phase 3+_ | varies under `examples/backend/` | _Phase 3+_ |

The full model coverage for every worker (all families) is generated from the contracts: see [`docs/supported-hardware.md`](supported-hardware.md).

## Next steps

- [`orchestrator.md`](orchestrator.md) — the ORK side of the install picture
- [`workers-manifest.yaml`](workers-manifest.yaml) — agent-readable manifest of variants + mock ports
- [`docs/tutorials/get-started/run.md`](../../../docs/tutorials/get-started/run.md) — narrative onboarding that uses this pattern
- [`docs/reference/maintainers/agent-ready-sdk.md`](../../../docs/reference/maintainers/agent-ready-sdk.md) — the workspace-wide USAGE.md + examples 
convention this page implements
