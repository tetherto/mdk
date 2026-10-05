---
name: mdk
description: >
  Build on the MDK (Mining Device Kit) platform. Use whenever a task mentions
  MDK, the Kernel, a Worker, a Worker Plugin, mdk-contract.json,
  @tetherto/mdk-* packages, a miner / power meter / sensor / container
  integration, a cross-worker aggregation endpoint, a UI component for
  Worker/plugin data, or deploying an MDK stack.
metadata:
  suite: mdk-developer-skill
  mdk_version: "0.5.0"
license: Apache-2.0
---

# Building on MDK

MDK is a P2P mining device management platform layered as:
**Consumers → Gateway (or the standalone MCP server) → Kernel → Workers → Devices**.

The Kernel ([`backend/core/kernel`](../../../../../backend/core/kernel/README.md)) discovers Workers over the Hyperswarm DHT,
pulls telemetry, dispatches commands, and monitors health. Workers
([`backend/workers/`](../../../../../backend/workers/README.md)) are device-protocol adapters: a **Worker Plugin**, either
a directory-loaded package (`mdk-contract.json` + `src/` handlers, hosted on
`WorkerRuntimeV2` — the shape `mdk create worker` scaffolds) or the older
`{ contract, dir, connect }` + handler-module shape hosted on the generic
`WorkerRuntime` ([`backend/core/mdk-worker`](../../../../../backend/core/mdk-worker/index.js); both shapes are documented in
[`../mdk-worker-plugin/references/worker-base-api.md`](../mdk-worker-plugin/references/worker-base-api.md)).
All Kernel ↔ Worker communication is MDK Protocol envelopes over
`@hyperswarm/rpc` — never direct method calls.

Load [`references/architecture.md`](./references/architecture.md) when you need the module-level picture, and
[`references/protocol.md`](./references/protocol.md) before touching anything that sends or receives
envelopes. [`references/package-index.md`](./references/package-index.md) maps every package name to its actual
folder. [`references/glossary.md`](./references/glossary.md) decodes the terminology.

## Route to the right skill

Skills are installed as flat siblings — each row names a skill directory next
to this one. **Read this table first** on every MDK task; many user prompts
need more than one skill in order.

### Single-skill tasks

| Task purpose                     | Use skill                            | Read first              |
| -------------------------------- | ------------------------------------ | ----------------------- |
| Integrate a new device (miner, power meter, sensor, container) | `mdk-worker-plugin` | [`references/protocol.md`](./references/protocol.md) |
| Add / change a Gateway aggregation HTTP endpoint only | `mdk-gateway-plugin` | Worker `mdk-contract.json` |
| Build a UI page/widget for an **existing** `/api/...` route | `mdk-ui-component` | [`mdk-ui-component/references/ui-registry.json`](../mdk-ui-component/references/ui-registry.json) |
| Deploy / run / register plugins in `mdk.yaml` | `mdk-deployment` | project `mdk.yaml` |
| Size a site from a description (Workers, host tier, envelope) | `mdk-site-sizing` | [`mdk-site-sizing/references/envelope.json`](../mdk-site-sizing/references/envelope.json) |

### Composite prompts (use multiple skills, in order)

Prompts like **"create a UI to show \<metric\> for a \<device\>"** are
**not** UI-only. Follow this chain:

| Step | Skill                            | What you do                           |
| ---- | -------------------------------- | ------------------------------------- |
| 1    | *(discovery)* | Resolve each `mdk.yaml` → `spec.workers[].package` to its `mdk-contract.json` at the package root (or legacy `plugin/mdk-contract.json`); confirm the telemetry channel, unit, and brand/fingerprint exist |
| 2    | `mdk-gateway-plugin` | If no Gateway route returns that shaped metric, `mdk create plugin <name>` (scaffolds + registers under `mdk.yaml` → `gateway.plugins`) then write the controller + `mdk-plugin.json` |
| 3    | `mdk-deployment`                 | Restart Gateway/Worker as needed       |
| 4    | `mdk-ui-component` | Hook (`useQuery`) → presentational panel → thin page → `routes.ts`; props from [`ui-registry.json`](../mdk-ui-component/references/ui-registry.json) only |
| 5    | `mdk-deployment`                 | Verify with `curl` + running dashboard |

Skip step 2–3 when the route already exists and returns the right JSON.
Skip step 1's device work — if the Worker/channel is missing, insert
`mdk-worker-plugin` **before** step 2.

```
User: "show / UI / dashboard for <metric> on <device family>"
        │
        ▼
  Contract exists? ──no──► mdk-worker-plugin ──┐
        │ yes                                  │
        ▼                                      ▼
  /api route exists? ──no──► mdk-gateway-plugin ──► mdk-deployment
        │ yes                                  │
        ▼                                      ▼
  mdk-ui-component  ◄──────────────────────────┘
        │
        ▼
  mdk-deployment (smoke: curl + UI)
```

### Quick examples

| User says                                              | Skills (ordered)                         |
| ------------------------------------------------------ | ---------------------------------------- |
| "Create a UI to show \<metric\> for \<device family\>" | discover contract → `mdk-gateway-plugin` → `mdk-deployment` → `mdk-ui-component` |
| "Add a fleet-wide rollup API"                          | `mdk-gateway-plugin` → `mdk-deployment`  |
| "Chart the existing `/api/...` in the dashboard"       | `mdk-ui-component`                       |
| "Integrate a new Modbus meter"                         | `mdk-worker-plugin`                      |
| "Start Kernel + Worker + Gateway"                      | `mdk-deployment`                         |
| "Size this site / how many Workers for N miners"       | `mdk-site-sizing`                        |

## Non-negotiable invariants

- **Workers never call the Kernel.** The protocol is unidirectional: the
  Kernel pulls (`telemetry.pull`, `state.pull`, `health.ping`) and pushes
  commands (`command.request`). A Worker only ever answers `handleRequest`.
- **`mdk-contract.json` is the single source of truth** for a Worker's
  telemetry, commands, health states and error codes. Validate it against
  `references/mdk-contract.schema.json` (the Kernel terminates Workers whose
  capability payload is malformed, and rejects commands not declared in it).
- **Never add transport-level envelope fields.** The envelope is exactly
  `{ id, version, type, action, sender, target, deviceId, timestamp, payload }`
  — extend `payload` instead.
- **Use canonical `@tetherto/mdk-*` names only** — the full list lives in
  [`references/package-index.md`](./references/package-index.md).
- **Never invent UI prop names or telemetry fields** — registry + contracts
  only (`mdk-ui-component` / `mdk-gateway-plugin`).
