---
name: mdk-gateway-plugin
description: >
  Build a Gateway / App Node plugin that exposes an HTTP API over one or more
  MDK Workers. Use when the task mentions "aggregate", "combine Workers",
  "site summary / rollup", "plugin", "mdk-plugin.json", "Gateway endpoint",
  "cross-worker endpoint", or when a UI needs live Worker data and no matching
  `/api/...` route exists yet.
metadata:
  suite: mdk-developer-skill
  mdk_version: "0.5.0"
license: Apache-2.0
---

# Build an MDK Gateway plugin

A Gateway plugin is a small Node package the Gateway loads from `mdk.yaml`.
It declares HTTP routes in `mdk-plugin.json` and implements each route as a
controller that queries Workers through its own `@tetherto/mdk-client`, built once per plugin from
`require('@tetherto/mdk-gateway/plugin')`.

Plugins are the **server half** of any "show me X from my devices" request.
If the UI needs data that no existing `/api/...` route returns, build the
plugin first, then hand off to `mdk-ui-component`.

## When to use this skill

| Situation                                             | Action                     |
| ----------------------------------------------------- | -------------------------- |
| UI / chart needs a metric and no Gateway route exists | Create a plugin here first |
| Aggregate / rollup / site summary" across devices     | Create a plugin            |
| Endpoint already exists (check `mdk.yaml` → `spec.gateway.plugins`, or `mdk status`) | Skip — go straight to `mdk-ui-component` |
| Need a new device protocol                            | Wrong skill — use `mdk-worker-plugin` |

## Workflow

### 1. site capability discovery (mandatory)

Do **not** invent channel names, units, or device brands. Ground every field
in an installed Worker contract.

**Resolve each Worker's contract from `mdk.yaml` → `spec.workers[].package`:**

| `package` value                               | Contract path                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Local path (`./workers/<name>`, `../…`)       | `<package>/mdk-contract.json` (or legacy `<package>/plugin/mdk-contract.json`)      |
| npm name (`@tetherto/mdk-worker-antminer`, …) | `node_modules/<package>/mdk-contract.json` (or legacy `…/plugin/mdk-contract.json`) |

Also scan `workers/*/mdk-contract.json` and `workers/*/plugin/mdk-contract.json` for any local scaffolds not yet
listed in `mdk.yaml`. If an npm package is listed but missing under
`node_modules/`, run `npm install` first — do not invent the contract.

Then:

1. Open each resolved `mdk-contract.json`.
2. Read `capabilities.telemetry[]` / `commands[]` — note `name`, `type`, `unit`.
3. Read `metadata.brand` / `deviceFamily` / `provider` for how to recognize
   the device family at runtime.
4. Confirm the Kernel actually has the Worker online (`mdk run worker <name>`
   or `mdk status`) before assuming data flows.

`getCapabilities` returns the capability list only — not full contract
metadata (no `brand`/`provider`) — so the fingerprint you match against at
runtime is the telemetry/command **name set**, derived from the contract you
just read, not a hard-coded device list.

### 2. Scaffold the package

```bash
mdk create plugin <plugin-name>
```

Scaffolds and registers in one step:

```
plugins/<plugin-name>/
├── package.json          # name: <plugin-name> (or @org/<plugin-name> with --org)
├── mdk-plugin.json       # routes + OpenAPI-ish response schema
└── controllers/
    └── summary.js        # async (req) => payload
```

It also links the package as an npm workspace member (root `npm install`,
skip with `--no-install`) and appends it under `mdk.yaml` →
`spec.gateway.plugins` (skip with `--no-stack-entry`) — no manual
`package.json` linking step.

### 3. Author `mdk-plugin.json`

Every route needs:

- `id` — stable dotted id (`<domain>.<metric>`, e.g. `fleet.summary`)
- `handler` — relative path to the controller
- `http.method` + `http.path` — the UI will `fetch` this path
- `http.responses.200.content.application/json.schema` — real response shape
- `description`, `constraints`, `examples`, `errors`, `safety`

Path convention: `/api/<domain>/<resource>` (e.g. `/api/fleet/summary`).

Full field notes: [`references/plugin-authoring.md`](./references/plugin-authoring.md).

### 4. Implement the controller

Build the client once per plugin, in a `lib/client.js` every controller requires — copy
[`backend/core/plugins/telemetry/lib/client.js`](../../../../../backend/core/plugins/telemetry/lib/client.js) verbatim, it's
the shipping example of this exact pattern.

```js
'use strict'

const mdkClient = require('../lib/client')

module.exports = async function myRoute (req) {
  // mdkClient methods return the bare payload — never read `.payload`
  const workersResp = await mdkClient.listWorkers()
  const workers = (workersResp && workersResp.workers) || []
  // … filter devices, pullTelemetry, shape response …
  return { /* matches mdk-plugin.json schema */ }
}
```

Typical [fan-out pattern](./references/controller-patterns.md):

1. `listWorkers()` → collect `deviceIds`.
2. `getCapabilities(deviceId)` → keep devices matching the contract fingerprint.
3. `pullTelemetry(deviceId, 'metrics')` → read `metrics.<channel>`.
4. Return a UI-friendly object (`unit`, totals, per-device rows).

### 5. Register in `mdk.yaml`

Already done if you scaffolded with `mdk create plugin` (step 2). Otherwise
add it by hand:

```yaml
spec:
  gateway:
    plugins:
      - package: <plugin-name>
        config: {}
```

Then restart the Gateway (`mdk run gateway` or `mdk run`). Wiring and boot
order details live in `mdk-deployment`.

### 6. Smoke-check the route

With the stack up:

```bash
curl -s http://127.0.0.1:<gateway-port>/api/<domain>/<resource> | jq .
```

Confirm the JSON matches the schema and examples in `mdk-plugin.json`.
Only then build UI against it.

## Non-negotiable invariants

- **Never reference a Worker, channel, or field** that is not in an installed
  contract. Aggregation must be site-grounded.
- **`mdkClient` returns bare payloads** — do not unwrap `.payload`.
- **Recognize device families from capability signatures** when
  `getCapabilities` omits brand/metadata (common). Prefer telemetry name sets
  over hard-coded `deviceId` lists.
- Controllers are **read-only by default**; set `"safety": "read-only"` unless
  the route intentionally mutates (commands).
- Throw `ERR_SCREAMING_SNAKE` strings; declare them under `errors` in the route.

## Hand-off

| Next need                             | Skill                     |
| ------------------------------------- | ------------------------- |
| Render this route in the dashboard    | `mdk-ui-component`        |
| Register / restart / verify the stack | `mdk-deployment`          |
| Device does not exist yet             | `mdk-worker-plugin` first |

## References

- [`references/plugin-authoring.md`](./references/plugin-authoring.md): `mdk-plugin.json` fields + a fully populated route example
- [`references/controller-patterns.md`](./references/controller-patterns.md): list / filter / `pullTelemetry` patterns
- [`../mdk/references/protocol.md`](../mdk/references/protocol.md): envelope / action set
- Shipped monorepo examples (when present): [`backend/core/plugins/`](../../../../../backend/core/plugins/README.md)
