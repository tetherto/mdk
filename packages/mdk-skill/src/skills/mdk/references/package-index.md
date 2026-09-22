# Package ↔ folder index

Load this before referencing any `@tetherto/mdk-*` package or repo path.
Use only names that appear here — inventing package names is the #1 drift
failure. Paths are relative to the monorepo root.

## Core ([`backend/core/`](../../../../../../backend/core/README.md))

| Package | Folder | What it is |
| --- | --- | --- |
| `@tetherto/mdk-core` | [`backend/core/mdk`](../../../../../../backend/core/mdk/README.md) | Umbrella boot glue (`getKernel`, `startGateway`, `waitForDiscovery`, default topic file helpers); no generic `startWorker`, each Worker package ships its own boot function |
| `@tetherto/mdk-kernel` | [`backend/core/kernel`](../../../../../../backend/core/kernel/README.md) | The Kernel (ORK): protocol layer + 8 orchestration modules |
| `@tetherto/mdk-worker` | [`backend/core/mdk-worker`](../../../../../../backend/core/mdk-worker/index.js) | Worker Runtime: `WorkerRuntime`, `loadPlugin`, contract schema |
| `@tetherto/mdk-gateway` | [`backend/core/gateway`](../../../../../../backend/core/gateway/README.md) | HTTP gateway in front of the Kernel |
| `@tetherto/mdk-client` | [`backend/core/client`](../../../../../../backend/core/client/README.md) | Consumer client library |
| `@tetherto/mdk-mcp` | [`backend/core/mcp`](../../../../../../backend/core/mcp/README.md) | MCP server: exposes MDK data/actions to AI agents as tools |

Also under [`backend/core/`](../../../../../../backend/core/README.md): [`plugins/`](../../../../../../backend/core/plugins/README.md) (Gateway plugin surface, no published package yet), [`lib-stats/`](../../../../../../backend/core/lib-stats/README.md).

## Workers ([`backend/workers/`](../../../../../../backend/workers/README.md))

| Package | Folder | Device protocol |
| --- | --- | --- |
| `@tetherto/mdk-worker-antminer` | [`backend/workers/miners/antminer`](../../../../../../backend/workers/miners/antminer/README.md) | HTTP JSON (Digest auth) |
| `@tetherto/mdk-worker-avalon` | [`backend/workers/miners/avalon`](../../../../../../backend/workers/miners/avalon/README.md) | CGMiner ASCII over TCP |
| `@tetherto/mdk-worker-abb` | [`backend/workers/power-meter/abb`](../../../../../../backend/workers/power-meter/abb/README.md) | Modbus TCP |
| `@tetherto/mdk-worker-satec` | [`backend/workers/power-meter/satec`](../../../../../../backend/workers/power-meter/satec/README.md) | Modbus TCP |
| `@tetherto/mdk-worker-schneider` | [`backend/workers/power-meter/schneider`](../../../../../../backend/workers/power-meter/schneider/README.md) | Modbus TCP |
| `@tetherto/mdk-worker-seneca` | [`backend/workers/temperature/seneca`](../../../../../../backend/workers/temperature/seneca/README.md) | Modbus TCP |
| `@tetherto/mdk-worker-antspace` | [`backend/workers/containers/antspace`](../../../../../../backend/workers/containers/antspace/README.md) | HTTP JSON |
| `@tetherto/mdk-worker-bitdeer` | [`backend/workers/containers/bitdeer`](../../../../../../backend/workers/containers/bitdeer/README.md) | MQTT |
| `@tetherto/mdk-worker-emcd` | [`backend/workers/minerpools/emcd`](../../../../../../backend/workers/minerpools/emcd/README.md) | EMCD Pool API v1 |
| `@tetherto/mdk-worker-f2pool` | [`backend/workers/minerpools/f2pool`](../../../../../../backend/workers/minerpools/f2pool/README.md) | Pool HTTP API |
| `@tetherto/mdk-worker-ocean` | [`backend/workers/minerpools/ocean`](../../../../../../backend/workers/minerpools/ocean/README.md) | Pool HTTP API |
| `@tetherto/mdk-worker-demo` | [`backend/workers/samples/demo-worker`](../../../../../../backend/workers/samples/demo-worker/) | HTTP JSON (canonical minimal sample) |

Whatsminer support is no longer an in-repo package — it's the external [`whatsminer-mdk-worker`](https://github.com/whatsminer/whatsminer-mdk-worker) contract plugin (CGMiner JSON over TCP, AES-encrypted), hosted directly on `WorkerRuntimeV2` via a thin per-deployment adapter (see `examples/full-site/backend/whatsminer-adapter.js`).
| `@tetherto/mdk-worker-mock` | [`backend/workers/mock`](../../../../../../backend/workers/mock/README.md) | Shared device-mock framework (BaseMock, category mocks, transports) |

Generated worker docs: [`backend/workers/docs/supported-hardware.md`](../../../../../../backend/workers/docs/supported-hardware.md) and
[`backend/workers/docs/catalogue.json`](../../../../../../backend/workers/docs/catalogue.json) (from
[`backend/workers/scripts/generate-catalogue.js`](../../../../../../backend/workers/scripts/generate-catalogue.js)).

## UI ([`ui/packages/`](../../../../../../ui/packages/))

| Package | Folder | What it is |
| --- | --- | --- |
| `@tetherto/mdk-react-devkit` | [`ui/packages/react-devkit`](../../../../../../ui/packages/react-devkit/README.md) | React component toolkit; components under [`src/primitives/components/`](../../../../../../ui/packages/react-devkit/src/primitives/components/) and [`src/domain/components/`](../../../../../../ui/packages/react-devkit/src/domain/components/index.ts) |
| `@tetherto/mdk-react-adapter` | [`ui/packages/react-adapter`](../../../../../../ui/packages/react-adapter/README.md) | Hooks binding components to worker/plugin data |
| `@tetherto/mdk-ui-foundation` | [`ui/packages/ui-foundation`](../../../../../../ui/packages/ui-foundation/README.md) | Styling base |
| `@tetherto/mdk-ui-cli` | [`ui/packages/cli`](../../../../../../ui/packages/cli/README.md) | UI scaffolding CLI (`mdk-ui-shell` template) |
| `@tetherto/mdk-fonts` | [`ui/packages/fonts`](../../../../../../ui/packages/fonts/README.md) | Font assets |

## Examples

| Folder | What it runs |
| --- | --- |
| [`examples/full-site/`](../../../../../../examples/full-site/README.md) | Whole stack in one boot: mocks + Kernel + 11 workers + gateway + UI ([`start.js`](../../../../../../examples/full-site/start.js)) |
| [`examples/backend/demo-worker-caller/`](../../../../../../examples/backend/demo-worker-caller/index.js) | Hosts the demo Worker Plugin on `WorkerRuntime` in-process, no Kernel |

## Stale paths — do not reference

`packages/core/ork/`, `backend/core/ork/`, `backend/core/app-node/`, and `backend/workers/miners/wm-v3/` no
longer exist (ORK → Kernel and App Node → Gateway renames, and the wm-v3 removal): do not construct paths
into them. The "ThingManager / MinerManager" class architecture and the generic `startWorker(WorkerClass, opts)`
entry point are the legacy (pre-0.5.0) model; new/current workers ship their own boot function around
`WorkerRuntime` (the Worker Plugin model).
