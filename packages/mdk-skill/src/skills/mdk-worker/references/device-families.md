# Device families — what exists, what to copy

**Load this only when the user explicitly asks to follow the existing MDK
Worker families and their structure** — typically when contributing a Worker
into the MDK monorepo itself, or deliberately mirroring how a shipped family
handles its device protocol. The families below are tightly coupled to the
mining use cases they were built for; a third party integrating their own
device should NOT start from them — the default starting point is
`../assets/worker-template/` (step 1 of the skill workflow).

All paths under [`backend/workers/`](../../../../../../backend/workers/README.md). Shipped families come in two
shapes, and the table's Shape column gives each family's:

- **Directory-loaded** `WorkerRuntimeV2` packages, for example Avalon: `mdk-contract.json` plus `src/` handlers,
  and for a hardware device a `src/device.js` that builds the vendor client from the ambient device module.
- **Module-exporting** `WorkerRuntime` packages, for example Antspace: `plugin/index.js` →
  `{ contract, dir, connect, disconnect? }`, plus a `plugin/boot.js` that wires the deprecated Worker-infra store
  services and exposes a `start<Family>Worker()` helper.

A **new** Worker follows the directory-loaded model: it is the shape `mdk create worker` scaffolds, and it needs
none of the deprecated store services. See this skill's main authoring flow ([`SKILL.md`](../SKILL.md) steps 5-6)
and [`worker-base-api.md`](./worker-base-api.md#directory-loaded-plugins-workerruntimev2) for that model; the rest of
this page describes the module-exporting shape's conventions.

| Family          | Path | Shape | Protocol | Telemetry / commands | Copy it when… |
| --------------- | ---- | ----- | -------- | -------------------- | ------------- |
| **Avalon**      | [`miners/avalon`](../../../../../../backend/workers/miners/avalon/README.md) | `WorkerRuntimeV2` | CGMiner ASCII over TCP | 9 / 4 | Plain-text TCP command APIs |
| **ABB**         | [`power-meter/abb`](../../../../../../backend/workers/power-meter/abb/README.md) | `WorkerRuntimeV2` | Modbus TCP | 9 / 0 | Modbus register maps; **multi-model**: `MODEL_CLASSES` lookup keyed off `config.model` (B23/B24/M1M20/M4M20/REU615) |
| **Satec / Schneider** | [`power-meter/satec`](../../../../../../backend/workers/power-meter/satec/README.md), [`power-meter/schneider`](../../../../../../backend/workers/power-meter/schneider/README.md) | `WorkerRuntimeV2` | Modbus TCP | read-only | Same shape as ABB, single/dual model |
| **Seneca**      | [`temperature/seneca`](../../../../../../backend/workers/temperature/seneca/README.md) | `WorkerRuntime` v1 | Modbus TCP | 2 / 0 | Minimal read-only sensor; per-device `register` in config; fault-sentinel semantics (850.0) in the contract |
| **Antspace**    | [`containers/antspace`](../../../../../../backend/workers/containers/antspace/README.md) | `WorkerRuntime` v1 | HTTP JSON | 5 / 5 | Cooling containers; model variants (hydro/immersion); approval-gated commands via `constraints` |
| **Bitdeer**     | [`containers/bitdeer`](../../../../../../backend/workers/containers/bitdeer/README.md) | `WorkerRuntime` v1 | MQTT | — | Subscription-style transports |
| **f2pool/ocean** | [`minerpools/f2pool`](../../../../../../backend/workers/minerpools/f2pool/README.md), external [`ocean-mdk-worker`](https://github.com/OCEAN-xyz/mdk-wrk-minerpool-ocean) | `WorkerRuntimeV2` | Pool HTTP APIs | — | Non-hardware "device" integrations |

Whatsminer (CGMiner JSON over TCP, AES-encrypted, token auth) is no longer an in-repo family to copy from — it's the
external [`whatsminer-mdk-worker`](https://github.com/whatsminer/whatsminer-mdk-worker) contract plugin, hosted on
`WorkerRuntimeV2` via a thin per-deployment adapter (see `examples/mvp-site/backend/whatsminer-adapter.js`). Antminer
(HTTP CGI, Digest auth) is likewise the external [`antminer-mdk-worker`](https://github.com/bitmain-official/antminer-mdk-worker)
contract plugin, hosted the same way (see `examples/mvp-site/backend/antminer-adapter.js`).

Do **not** copy from `miners/wm-v3` (empty stub) or model anything on the
`ThingManager`/`MinerManager` class architecture in [`backend/workers/README.md`](../../../../../../backend/workers/README.md)
— that's the legacy pre-plugin model.

## Anatomy of the module-exporting families

Applies only to the families the table marks `WorkerRuntime` v1. The directory-loaded families and the
`mdk create worker` scaffold use the flat layout described in
[`worker-base-api.md`](./worker-base-api.md#directory-loaded-plugins-workerruntimev2).

```text
<family>/
├── index.js            # Exports { plugin, start<Family>Worker?, <DeviceClass>? }
├── plugin/
│   ├── index.js        # The Worker Plugin
│   ├── boot.js         # Production families: worker-infra hosting helper
│   ├── mdk-contract.json
│   └── src/{telemetry,commands}/*.js
├── lib/                # Device client class (plain vendor I/O; multi-model families add lib/models/)
├── mock/server.js      # Firmware simulator
├── config/             # Sample device configs (production families)
└── tests/{unit,integration}/
```

Conventions that hold across every module-exporting family:

- `connect(config, { deviceId })` validates required config keys up front
  (throwing `ERR_DEVICE_CONFIG_INVALID`-style errors), builds the device
  client, probes it once, returns it. `disconnect` exists wherever the client
  holds a socket.
- Multi-model families select a class from a `MODEL_CLASSES` map keyed by
  `config.model` / `config.type` (see Antspace).
- Handler files mirror contract names 1:1 under `plugin/src/`.
- Numeric safety is expressed as a param `min`/`max`, or an approval `constraints` string
  (Antspace `resetCoolingSystem`: "Requires two approvals."). Prefer declaring both for
  physical setpoints.
- Tests are brittle, split `tests/unit/` (handlers against the mock) and
  `tests/integration/` (plugin hosted end-to-end).

## The shared mock framework

[`backend/workers/mock/`](../../../../../../backend/workers/mock/README.md)

Per-family mocks are thin leaves over `@tetherto/mdk-worker-mock`:
`BaseMock` (CLI, initial-state loading, lifecycle) → category mock
([`miner.mock.js`](../../../../../../backend/workers/mock/miner.mock.js) resolves commands to `cmds/<command>.js` files,
[`powermeter.mock.js`](../../../../../../backend/workers/mock/powermeter.mock.js) pins Modbus,
[`sensor.mock.js`](../../../../../../backend/workers/mock/sensor.mock.js) reuses it,
[`container.mock.js`](../../../../../../backend/workers/mock/container.mock.js),
[`minerpool.mock.js`](../../../../../../backend/workers/mock/minerpool.mock.js)) → device leaf
(`<family>/mock/server.js`, e.g. `class WhatsminerMock extends MinerMock`
with `static dir/TYPES/defaultPort` and a `createTransport()` override).
Transports live in [`mock/transports/`](../../../../../../backend/workers/mock/transports/) (tcp, http, modbus, mqtt).

A standalone Worker (like the template) can instead ship a self-contained
`mock/server.js` exporting `createServer(opts) → { server, state, exit }` —
that's the pattern the smoke harness and template tests use.
