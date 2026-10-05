---
name: mdk-worker-plugin
description: >
  Integrate a new device into MDK as a device Worker. Use for any task like
  "new device / miner / power meter / sensor / container Worker", "build a
  Worker", "integrate hardware", "wrap a device protocol (Modbus / CGMiner /
  HTTP / MQTT)", or anything creating or editing an mdk-contract.json, a
  Worker Plugin, or telemetry/command handlers under backend/workers/.
metadata:
  suite: mdk-developer-skill
  mdk_version: "0.7.0"
license: Apache-2.0
---

# Integrate a new MDK device Worker

A device Worker is a **Worker Plugin**: a package directory holding an
`mdk-contract.json` plus one small handler module per telemetry channel and
per command. It exports no module of its own. `WorkerRuntimeV2`
(`@tetherto/mdk-worker`) loads the directory and instantiates the plugin once
per device — handlers are plain `(params)` functions that read device context
from `require('@tetherto/mdk-worker/device')`. Workers are **site-agnostic**:
they know nothing about the site they run in, so everything here is testable
locally against a device mock before a Kernel ever exists.

The final package shape (this is `assets/worker-template/`, a verbatim copy of
`packages/cli/templates/worker/` — the same tree `mdk create worker` scaffolds):

```
<your-worker>/
├── mdk-contract.json            # single source of truth (package root)
├── package.json                 # no main/exports — the runtime loads the dir
├── smoke.config.js              # glue for scripts/worker-smoke.mjs
├── src/
│   ├── client.js                # vendor-protocol I/O via ambient device context
│   ├── telemetry/<name>.js      # one file per telemetry channel
│   └── commands/<name>.js       # one file per command
└── mock/server.js               # vendor firmware simulator
```

## Workflow

### 1. Start from the Worker template

The default starting point for every new Worker is `assets/worker-template/`
— a complete minimal Worker Plugin (contract + client + handlers + mock) with
no assumptions about your device category.

Do **not** model a new Worker on the MDK monorepo's shipped device families
(Whatsminer, Antminer, ABB, Seneca, …) by default — those still use the older
`plugin/` layout and are tightly coupled to the mining use cases they were
built for. Only when the user **explicitly asks** to follow the existing MDK
Worker families and their structure (e.g. contributing a Worker into this
monorepo, or deliberately mirroring a shipped family's protocol handling)
should you read [`references/device-families.md`](./references/device-families.md)
and copy from the named family instead.

### 2. Scaffold

In a CLI-managed project, scaffold and register in one step:

```bash
mdk create worker <name>
```

This copies the CLI Worker template into `workers/<name>`, links it as an npm
workspace member (root `npm install`, skip with `--no-install`), and appends
it under `mdk.yaml` → `spec.workers` with a `mock: true` seed device (skip
with `--no-stack-entry`) — so it is runnable immediately with
`mdk run worker <name>` before you change a line.

Outside the CLI (e.g. contributing inside the monorepo, or no `mdk.yaml`
project), copy `assets/worker-template/` to your Worker's location instead.
Either way, rename the template-specific parts (contract metadata, client
methods, mock behavior). Remember to adapt `smoke.config.js` (mock boot,
device opts, sample command params) and `package.json` (name, description).
The plugin is location-independent — put the package wherever your project
keeps packages. (Only Workers contributed to the MDK monorepo itself follow
its `backend/workers/<category>/<family>/` layout.)

### 3. Author `mdk-contract.json`

Start from [`assets/mdk-contract.template.json`](./assets/mdk-contract.template.json); the field-by-field guide is
[`references/contract-authoring.md`](./references/contract-authoring.md) — load it now. Non-negotiables:

- Every telemetry/command entry needs a `handler` path (e.g. `src/telemetry/<name>.js`)
  — the loader hard-fails without it.
- **Every `number` command param must declare `min` and `max`.** The Kernel
  enforces bounds only when declared (`ERR_PARAM_RANGE`); an undeclared bound
  is an unprotected physical setpoint.
- Read-only devices (meters, sensors) declare `"commands": []`.
- `description` / `overview` / `constraints` are simultaneously machine docs
  and AI operator context — write real semantics ("If 0, device is booting"),
  and put safety thresholds in the contract, not in code comments.

### 4. Validate the contract — loop until clean

```
node <this-skill>/scripts/validate-contract.mjs <worker>/mdk-contract.json
```

Validates against `references/mdk-contract.schema.json` plus semantic
checks (handler files exist, no duplicate names, numeric params bounded).
Fix and re-run until it exits 0. Handler files must exist first — stubs from
the template are enough at this stage.

### 5. Build the mock, then the device client

Write `mock/server.js` first — a standalone simulator of the vendor firmware
API that knows nothing about MDK. The template's self-contained HTTP JSON
mock is the pattern to follow; adapt it to your device's protocol. (Workers
living inside the MDK monorepo may instead reuse its shared mock framework in
[`backend/workers/mock/`](../../../../../backend/workers/mock/README.md).) Then write `src/client.js`: plain vendor-protocol
I/O. Bind to ambient device context
(`require('@tetherto/mdk-worker/device')` → `{ opts, env, config, logger }`)
rather than exporting a `createClient(opts)` factory — the runtime loads the
module fresh per device. Throw `ERR_*` errors. No envelopes, no base classes.

### 6. Wire the handlers

There is no `connect()` and no `plugin/index.js`. Each handler is
`async (params) => result` and talks to the device through `src/client.js`
(or by reading ambient context itself). Telemetry returns the channel value
(matching the contract's declared `type`); commands return a result object or
throw an `ERR_*` error. Full runtime semantics: [`references/worker-base-api.md`](references/worker-base-api.md).

Template pattern:

```js
'use strict'
const client = require('../client')
module.exports = async () => (await client.getSummary()).hashrate_ths
```

### 7. Test locally — the four-step loop

Load [`references/local-testing.md`](./references/local-testing.md) for the full procedure. In order:

1. **Contract validation** — step 4 above (no runtime).
2. **In-process smoke** — `node <this-skill>/scripts/worker-smoke.mjs <worker-dir>`
   boots your plugin against your mock (via `smoke.config.js`), asserts every
   declared telemetry channel returns a value of the declared type, and that
   out-of-bounds command params are rejected. No Kernel, no DHT.
3. **Standalone protocol check** — host the package on `WorkerRuntimeV2` with a
   tiny caller and drive real envelopes through `handleRequest`.
4. **Site integration** — add the Worker to a site stack (e.g.
   [`examples/full-site/start.js`](../../../../../examples/full-site/start.js))
   and confirm a real Kernel registers it end-to-end.

### 8. Boot into a site

In a CLI-managed project this is just `mdk run worker <name>` (or `mdk run`
to boot the whole stack together) — see `mdk-deployment`. The rest of this
section is the manual path, for when nothing owns the runtime yet.

A caller process owns the runtime (the plugin package itself never does):

```js
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')
const runtime = new WorkerRuntimeV2(pkgDir, {
  workerId: 'my-worker-1',
  devices: [{ deviceId: 'dev-0', opts: { host: '127.0.0.1', port: 18080 } }],
  kernelTopic // hex topic → DHT announce; omit for local-only
})
await runtime.start()
```

The Worker joins the DHT topic; the Kernel pulls identity + capabilities and
starts scheduling telemetry/health. **No Kernel changes are ever needed to add
a Worker.**

## Gotchas

- **Unidirectional protocol**: a Worker never calls the Kernel — it only
  answers. If you think you need to push, you need a telemetry channel that
  the Kernel pulls.
- **`deviceId` ownership is exclusive** per Worker; duplicate ids in
  `opts.devices` throw `ERR_DEVICE_ID_DUPLICATE` at construction.
- One device offline must never affect siblings — failures stay inside that
  device's instance (V2 has no boot-time probe; unreachable devices surface
  as errors in telemetry payloads rather than `ERR_DEVICE_UNAVAILABLE`).
- Use `debug` / the ambient `logger`, never `console.log`, in Worker code.
  Errors are `ERR_SCREAMING_SNAKE` strings.
- The published contract strips `handler` paths; everything else in the
  contract is visible to sites and AI operators — write it accordingly.

## Hand-off

This skill stops at a working Worker Plugin + contract. For prompts that also
ask to **show** the data in a UI:

| Next need                                    | Skill                |
| -------------------------------------------- | -------------------- |
| Aggregate / expose HTTP API over this Worker | `mdk-gateway-plugin` |
| Register Worker in `mdk.yaml` and run it     | `mdk-deployment`     |
| Dashboard page / tiles / charts              | `mdk-ui-component`   |

See the composite routing table in [`../mdk/SKILL.md`](../mdk/SKILL.md).
