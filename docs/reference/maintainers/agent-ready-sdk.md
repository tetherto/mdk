# Agent-ready contract — core and workers

Applies to [`backend/core/`](../../../backend/core/README.md) and [`backend/workers/`](../../../backend/workers/README.md) exports. Workers already ship the contract — `mdk-contract.json` per Worker. Core's per-export shape is still open (see [Decisions deferred](#decisions-deferred)). The UI protocol lives at [`ui/AGENTS.md`](../../../ui/AGENTS.md); this file does not bind UI.
<!-- mdk-monorepo: repoint to package-level AGENTS.md until ui/docs/AGENT_READY.md is populated -->

## What already ships

### Workers

Every Worker package on disk carries an **`mdk-contract.json`** that is the canonical contract for both programmatic capabilities and AI context.

Schema: [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json) — formal JSON Schema, vendored in this repo. See [QA gates](ia.md#qa-gates) for the proposed `check:contract` step that would make validation against it build-blocking (it already runs warn-only via [`generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js)).

Required top-level shape:

```json
{
  "metadata": {
    "provider": "microbt",
    "deviceFamily": "miner",
    "brand": "Whatsminer",
    "modelsSupported": ["M30SP", "M30SPP", "M53S", "M56S", "M63"],
    "overview": "Controls MicroBT Whatsminer Bitcoin miners. Operations affect physical hardware — prioritize thermal safety."
  },
  "capabilities": {
    "telemetry": [ /* per-metric: name, unit, type, description (semantic boundaries) */ ],
    "commands":  [ /* per-command: name, description, constraints, params, examples (intent + steps) */ ],
    "config":    { "schema": "<config-schema-id>" },
    "health":    { "supportedStates": [...], "alerts": [...], "troubleshooting": [...] },
    "errors":    { "E_CODE": "human-readable description" }
  }
}
```

The `description`, `constraints`, `troubleshooting`, and `errors` fields are not just documentation — they are the AI-reasoning surface. Treat them as load-bearing.

Where they live inside the shape above:

- `description` appears twice — once per telemetry metric (`capabilities.telemetry[i].description`, the semantic boundary for that signal: e.g. *"Real-time hashrate"* vs *"Average hashrate"*) and once per command (`capabilities.commands[i].description`, the intent of the operation: e.g. *"Restarts the miner controller. Takes 2-3 minutes to resume."*).
- `constraints` is per-command and optional (`capabilities.commands[i].constraints`), capturing operational guardrails the agent has to respect (e.g. *"Do not call more than once per 5 minutes."* on `reboot`).
- `troubleshooting` is an array of conditional remediation strings at the health level (`capabilities.health.troubleshooting`), each entry a vendor-validated *if X then Y* runbook step.
- `errors` is its own top-level map under `capabilities` (`capabilities.errors.<E_CODE>`), shown in the shape above; each value is the sentence the agent surfaces to the user when that code is reported.

See [`backend/workers/miners/avalon/plugin/mdk-contract.json`](../../../backend/workers/miners/avalon/plugin/mdk-contract.json) for a complete worked example with all four populated.

### Core

Nothing yet. Core monorepo presence today. The open question is whether [`backend/core/`](../../../backend/core/README.md) adopts UI's JSDoc shape (`@tier`, `@category`, `@domain`, `@kernelCapability` parsed by the registry generator) for non-UI exports, or has alt contract surface. See [Decisions deferred](#decisions-deferred).

## What this monorepo adds on top

`mdk-contract.json` covers the **runtime** contract. For the **docs / discovery** layer the monorepo adds co-located files per artefact:

```text
backend/workers/miners/avalon/
  package.json
  plugin/
    mdk-contract.json  # ← already exists, governs runtime
  USAGE.md              # ← already exists: prose for humans + LLMs (overview, install, gotchas)
  examples/             # ← new, not yet added: one runnable Node file per scenario (qvac model)
    run-<scenario>.js
```

(Whatsminer and Antminer are partner-maintained external Workers — see [`backend/workers/external-workers.json`](../../../backend/workers/external-workers.json) — so
`avalon` is the current in-repo miner example of this shape; it has no `examples/` directory yet, only `USAGE.md`.)

`USAGE.md` and `examples/` are the only **new** conventions. The contract itself is unchanged.

### USAGE.md scope

- One-paragraph overview that complements `metadata.overview` (the contract field is short; `USAGE.md` can go deeper).
- Install / run instructions per-`--wtype`, with a link to the matching example.
- Operational notes that don't fit in the schema (firmware caveats, mock setup, links to vendor docs).
- **Do not** restate `capabilities.telemetry` / `commands` / `health` — those are already in `mdk-contract.json` and the docs catalogue reads them from there.

Cross-references in `USAGE.md` carry the comment vocabulary defined in [`single-source-of-truth.md`](single-source-of-truth.md) — reference-style link definitions get a `<!-- docs@tether.io: … -->` or `<!-- mdk-monorepo: … -->` adjacent comment so the port-sync to tether.io knows how to handle each target. `check:port-signals` warns on missing routing hints.

### Examples convention

Flat `examples/` directory, one runnable `.js` file per scenario (named `run-<scenario>.js`), subdirs only when a feature has many variants. One file per variant means agents can `cat` exactly the file they need.

See [`backend/core/docs/examples-convention.md`](../../../backend/core/docs/examples-convention.md).

## Tag rules

Tags are read from the contract, never declared separately — see [`ia.md`'s Tag vocabulary](ia.md#tag-vocabulary) for the general
schema-vs-overlay philosophy and the QA gates that would enforce it. The one thing specific to Workers is which contract field maps to which
overlay bucket:

| Source field | Where it is constrained | Where it is displayed |
|--------------|------------------------|------------------------|
| `metadata.deviceFamily` | enum in [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json) | [`tag-vocab.yaml`](./tag-vocab.yaml) → `device-families` (label only, falls back to slug) |
| `metadata.provider` | open string in current schema | [`tag-vocab.yaml`](./tag-vocab.yaml) → `providers` (label only, falls back to slug) |
| `metadata.modelsSupported[]` | per-contract | aggregated by the docs build into namespaced ids |

## Catalogue aggregation

Planned: a build step that walks `backend/workers/**/mdk-contract.json` and emits:

- `dist/contracts.json` — flat array of every contract for cross-cutting queries.
- `dist/index.json` — combined with UI's `dist/registry.json` for a single browsable surface in published docs.
- `dist/facets.json` — derived facet membership: every `provider`, `device-family`, `model`, `tier`, `category`, `domain`, `kernel-capability` slug that actually ships across contracts and the UI registry. The docs site reads this for catalogue membership; [`tag-vocab.yaml`](tag-vocab.yaml) becomes overlay-only (display labels + `integration-kinds`). See [Derived vocabulary](ia.md#derived-vocabulary).

This mirrors how the UI workspace already handles components: read source-of-truth annotations (JSDoc → `dist/registry.json`), aggregate, ship to consumers. The aggregator itself is not yet built.

Once `dist/index.json` is shipping, it would also unlock [`check:integrations-fresh`](ia.md#checkintegrations-fresh) if engineering adopts it: the gate would compare shipping Workers against the hand-maintained catalogue tables under [`integrations/`](integrations/index.md) and fail the build on drift. Until then (and indefinitely if not adopted), the catalogue is docs-maintainer-owned (see Tag rules above).

## App route table reference

The apps MDK ships live in their own repositories, each listed in [`supported-plugins.md`](../supported-apps.md). Each carries an
`mdk-plugin.json` route table, the source of truth for its HTTP routes, and documents those routes in its own README, as any
third-party app a stack declares in `spec.apps` does.

## Decisions deferred

- **JSDoc parity for core exports.** Whether [`backend/core/`](../../../backend/core/README.md) adopts UI's JSDoc shape (`@tier`, `@category`, `@domain`, `@kernelCapability`) for non-UI exports, or stays contract-free. Do not introduce another format alongside `mdk-contract.json` and JSDoc — no `manifest.yaml` for core.
- **Where the JSON Schema lives long-term.** When monorepo absorbs schema ownership, discover location of [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json) — a possible home is `docs/schemas/` (not created yet; proposal only).
- **Whether `wtype`, `cooling`, `powerModes` deserve schema fields.** The current contract has them implicitly via `commands.setPowerMode.params`, but UI catalogue browse may want first-class fields.
- **Per-model folders** (`*/packages/hardware/<vendor>/<model>/`) appear only when there is genuinely model-specific prose the contract can't hold (firmware caveats, photos, vendor links). Default: no folder, just an entry in `modelsSupported[]`.
