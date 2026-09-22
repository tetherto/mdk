# Device families — what exists, what to copy

**Load this only when the user explicitly asks to follow the existing MDK
worker families and their structure** — typically when contributing a worker
into the MDK monorepo itself, or deliberately mirroring how a shipped family
handles its device protocol. The families below are tightly coupled to the
mining use cases they were built for; a third party integrating their own
device should NOT start from them — the default starting point is
`../assets/worker-template/` (step 1 of the skill workflow).

All paths under [`backend/workers/`](../../../../../../backend/workers/README.md). Every family below except
`demo-worker` is a Worker Plugin on the older module-exporting shape (`plugin/index.js` →
`{ contract, dir, connect, disconnect? }`); production families additionally
ship `plugin/boot.js`, which wires worker-infra services and exposes a
`start<Family>Worker()` helper. This reflects what's actually shipped today,
not a recommendation — a **new** Worker should follow the directory-loaded
`WorkerRuntimeV2` model instead (`mdk-contract.json` + `src/` handlers, no
`plugin/index.js`, no `connect()`), the same shape `demo-worker` and `mdk
create worker`'s scaffold use. See this skill's main authoring flow
([`SKILL.md`](../SKILL.md) steps 5-6) and
[`worker-base-api.md`](./worker-base-api.md#directory-loaded-plugins-workerruntimev2)
for that model; the rest of this page describes the older shape's conventions.

| Family | Path | Protocol | Telemetry / commands | Copy it when… |
| --- | --- | --- | --- | --- |
| **demo-worker** | [`samples/demo-worker`](../../../../../../backend/workers/samples/demo-worker/) | HTTP JSON (hypothetical firmware) | 5 / 2 | Lean V2 sample (contract at package root + SQLite history). The skill/CLI scaffold is [`packages/cli/templates/worker/`](../../../../../../packages/cli/templates/worker/) → `../assets/worker-template/`. |
| **antminer** | [`miners/antminer`](../../../../../../backend/workers/miners/antminer/README.md) | HTTP JSON with Digest auth | 10 / 4 | HTTP devices behind auth; digest client setup in `connect` |
| **avalon** | [`miners/avalon`](../../../../../../backend/workers/miners/avalon/README.md) | CGMiner ASCII over TCP | 9 / 4 | Plain-text TCP command APIs |
| **abb** | [`power-meter/abb`](../../../../../../backend/workers/power-meter/abb/README.md) | Modbus TCP | 9 / 0 | Modbus register maps; **multi-model**: `MODEL_CLASSES` lookup keyed off `config.model` (B23/B24/M1M20/M4M20/REU615) |
| **satec / schneider** | [`power-meter/satec`](../../../../../../backend/workers/power-meter/satec/README.md), [`power-meter/schneider`](../../../../../../backend/workers/power-meter/schneider/README.md) | Modbus TCP | read-only | Same shape as abb, single/dual model |
| **seneca** | [`temperature/seneca`](../../../../../../backend/workers/temperature/seneca/README.md) | Modbus TCP | 2 / 0 | Minimal read-only sensor; per-device `register` in config; fault-sentinel semantics (850.0) in the contract |
| **antspace** | [`containers/antspace`](../../../../../../backend/workers/containers/antspace/README.md) | HTTP JSON | 5 / 5 | Cooling containers; model variants (hydro/immersion); approval-gated commands via `constraints` |
| **bitdeer** | [`containers/bitdeer`](../../../../../../backend/workers/containers/bitdeer/README.md) | MQTT | — | Subscription-style transports |
| **emcd** | [`minerpools/emcd`](../../../../../../backend/workers/minerpools/emcd/README.md) | HTTP with HMAC-SHA256 | 4 / 0 | Signed pool requests, account-scoped history and unavailable metrics |
| **f2pool / ocean** | [`minerpools/f2pool`](../../../../../../backend/workers/minerpools/f2pool/README.md), [`minerpools/ocean`](../../../../../../backend/workers/minerpools/ocean/README.md) | Pool HTTP APIs | — | Non-hardware "device" integrations |

Whatsminer (CGMiner JSON over TCP, AES-encrypted, token auth) is no longer an in-repo family to copy from — it's the
external [`whatsminer-mdk-worker`](https://github.com/whatsminer/whatsminer-mdk-worker) contract plugin, hosted on
`WorkerRuntimeV2` via a thin per-deployment adapter (see `examples/full-site/backend/whatsminer-adapter.js`).

Do **not** copy from `miners/wm-v3` (empty stub) or model anything on the
`ThingManager`/`MinerManager` class architecture in [`backend/workers/README.md`](../../../../../../backend/workers/README.md)
— that's the legacy pre-plugin model.

## Anatomy shared by the module-exporting families

Doesn't apply to `demo-worker`, whose flat directory-loaded layout is
described in [`worker-base-api.md`](./worker-base-api.md#directory-loaded-plugins-workerruntimev2)
instead.

```
<family>/
├── index.js            # exports { plugin, start<Family>Worker?, <DeviceClass>? }
├── plugin/
│   ├── index.js        # the Worker Plugin
│   ├── boot.js         # production families: worker-infra hosting helper
│   ├── mdk-contract.json
│   └── src/{telemetry,commands}/*.js
├── lib/                # device client class (plain vendor I/O; multi-model families add lib/models/)
├── mock/server.js      # firmware simulator
├── config/             # sample device configs (production families)
└── tests/{unit,integration}/
```

Conventions that hold across every module-exporting family:

- `connect(config, { deviceId })` validates required config keys up front
  (throwing `ERR_DEVICE_CONFIG_INVALID`-style errors), builds the device
  client, probes it once, returns it. `disconnect` exists wherever the client
  holds a socket.
- Multi-model families select a class from a `MODEL_CLASSES` map keyed by
  `config.model` / `config.type` (see abb, antspace).
- Handler files mirror contract names 1:1 under `plugin/src/`.
- Numeric safety is expressed as param `min`/`max` (whatsminer `setPowerPct`)
  or an approval `constraints` string (antspace `resetCoolingSystem`:
  "Requires two approvals."). Prefer declaring both for physical setpoints.
- Tests are brittle, split `tests/unit/` (handlers against the mock) and
  `tests/integration/` (plugin hosted end-to-end).

## The shared mock framework ([`backend/workers/mock/`](../../../../../../backend/workers/mock/README.md))

Per-family mocks are thin leaves over `@tetherto/mdk-worker-mock`:
`BaseMock` (CLI, initial-state loading, lifecycle) → category mock
([`miner.mock.js`](../../../../../../backend/workers/mock/miner.mock.js) resolves commands to `cmds/<command>.js` files,
[`powermeter.mock.js`](../../../../../../backend/workers/mock/powermeter.mock.js) pins Modbus, [`sensor.mock.js`](../../../../../../backend/workers/mock/sensor.mock.js) reuses it,
[`container.mock.js`](../../../../../../backend/workers/mock/container.mock.js), [`minerpool.mock.js`](../../../../../../backend/workers/mock/minerpool.mock.js)) → device leaf
(`<family>/mock/server.js`, e.g. `class WhatsminerMock extends MinerMock`
with `static dir/TYPES/defaultPort` and a `createTransport()` override).
Transports live in [`mock/transports/`](../../../../../../backend/workers/mock/transports/) (tcp, http, modbus, mqtt).

A standalone worker (like the template) can instead ship a self-contained
`mock/server.js` exporting `createServer(opts) → { server, state, exit }` —
that's the pattern the smoke harness and template tests use.
