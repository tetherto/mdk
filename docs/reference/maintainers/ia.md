# Information architecture

**One fact, one folder; tags are the IA, paths are not.**

The monorepo builds on contracts that already ship:

- **Workers** ship [`mdk-contract.json`](../../../backend/workers/miners/whatsminer/plugin/mdk-contract.json) per package, 
validated against `mdk-contract.schema.json` (upstream today; vendoring into this repo is pending — see [QA gates](#qa-gates)). 
The contract carries metadata, telemetry, commands, health, and errors — programmatic contract + AI reasoning context in one file.
- **UI** components carry JSDoc tags (`@tier`, `@category`, `@domain`, `@orkCapability`); the registry generator (`ui/<pkg>/scripts/generate-registry.mts`, 
lands when the UI workspace is populated) and sibling generators emit `dist/registry.json`, 
`dist/blueprints.json`, `dist/hooks.json`, `dist/stores.json`. See [`ui/AGENTS.md`](../../../ui/AGENTS.md).
<!-- mdk-monorepo: repoint to package-level AGENTS.md until ui/docs/AGENT_READY.md is populated -->

Every public artefact adds `USAGE.md` plus runnable examples on top of its existing contract.

Worker:

```
backend/workers/<family>/<provider>/
  mdk-contract.json              # existing — runtime contract (metadata, telemetry, commands, ...)
  USAGE.md                       # new — prose (human + LLM)
  examples/run-<scenario>.js     # new — one runnable Node file per scenario (qvac model)
```

> Examples ship as runnable `.js` files (e.g. `run-s19xp.js`), matching what is on disk. Earlier drafts named these `<scenario>.start.sh`; `.js` 
> is the convention in use.

UI component:

```
ui/<pkg>/src/.../<component>/
  index.tsx                      # JSDoc tags drive dist/registry.json
  USAGE.md                       # new — prose
  <component>.example.tsx        # new — runnable, co-located
```

`USAGE.md` and the runnable examples are the only new conventions. They complement the existing contracts; they never duplicate fields the contract or JSDoc already owns.

## Where docs live

| Location | Owns |
|----------|------|
| [`docs/`](../../README.md) | Role-based router ([`README.md`](../../README.md)) and end-user-facing SoT content (`concepts/`) |
| [`docs/reference/maintainers/`](README.md) | Docs maintainer plumbing: this file, [`agent-ready-sdk.md`](agent-ready-sdk.md), [`tag-vocab.yaml`](tag-vocab.yaml), [`port-signals.md`](port-signals.md), [`worker-runtime-legacy-services.md`](worker-runtime-legacy-services.md), and the hand-maintained [`integrations/`](integrations/index.md) catalogue (lives here, not at `docs/integrations/`, until [`check:integrations-fresh`](#checkintegrations-fresh) keeps it honest) |
| [`backend/core/docs/`](../../../backend/core/docs/README.md) | Core workspace conventions (`mdk`, `client`, `kernel`, `gateway`, …) |
| [`ui/`](../../../ui/README.md) | UI workspace conventions for react-devkit, adapter, ui-foundation, cli |
| [`backend/workers/docs/`](../../../backend/workers/docs/architecture.md) | Workers workspace conventions (Worker lifecycle, install pattern, taxonomy) |
| `*/packages/**/<artefact>/` | Per-artefact contract + docs: `mdk-contract.json` (Workers, existing) or JSDoc on `src/` (UI), plus `USAGE.md` and `examples/` |

## Integration ontology

Three "kinds" used by the docs catalogue for browsing. Each kind is a **docs-side roll-up** over one or more `metadata.deviceFamily` values:

| Kind | `device-families` it covers | Examples |
|------|-----------------------------|----------|
| **Hardware** | `miner`, `container`, `power-meter`, `sensor` | physical field devices reporting state through Workers |
| **Pool integrations** | `minerpool` | protocol adapters for mining-pool APIs (not hardware) |
| **External services** | (none yet) | future Workers for mempool, weather, market data feeds |

> The `kind` label lives **only** in [`tag-vocab.yaml`](tag-vocab.yaml) under `integration-kinds`. `mdk-contract.json` has no `kind` field — 
Workers declare `metadata.deviceFamily`, and the docs build groups them under the matching kind.

## Tag vocabulary

[`tag-vocab.yaml`](tag-vocab.yaml) is a **presentation overlay**, not a constraint surface. It does not declare which tags are valid — that authority 
lives with the engineers who own the schema and JSDoc:

- `metadata.deviceFamily`, `metadata.provider`, `metadata.modelsSupported[]` are constrained (or open-set) by [`mdk-contract.schema.json`](agent-ready-sdk.md).
- `@tier`, `@category`, `@domain`, `@kernelCapability` are constrained by the registry generator that consumes UI JSDoc.

The overlay does two things:

1. **Slug → display-label mappings** for `device-families`, `providers`, `tiers`, `categories`, `domains`, `kernel-capabilities`. Missing entries 
fall back to the slug. Adding a new vendor or UI category never requires a docs PR — the new slug ships through the schema or the registry, and 
the overlay catches up only when someone wants prettier display.
2. **`integration-kinds`** — the one genuinely docs-authored section. A roll-up over `metadata.deviceFamily` for the catalogue browse under 
[`integrations/`](integrations/index.md).

This file is a transitional shape; see [Derived vocabulary](#derived-vocabulary) for the target end state where the labels are extracted by a 
build step from shipping contracts and JSDoc.

Per-model folders (`*/packages/hardware/<vendor>/<model>/`) appear only when there is genuinely model-specific prose the contract can't hold; 
default is just an entry in `metadata.modelsSupported[]`.

## QA gates

Suggested CI checks that would make the IA self-enforcing. **None are wired today and none are prerequisites for the BE or FE port.** Engineering 
decides whether to adopt each gate per-team; for any gate not adopted, docs maintainers absorb the upkeep manually (each section below names the 
fallback). The constraint surface stays where it belongs — `mdk-contract.schema.json` for Workers, the UI registry generator for components — 
whether or not these gates ever land.

### `check:contract`

Validates every `backend/workers/**/mdk-contract.json` against `mdk-contract.schema.json`. Would fail the build on malformed contracts 
(missing required fields, wrong types, unknown enum values defined by the schema). The schema and validator already exist upstream — 
this gate would run them as part of CI if adopted.

**Why it matters:** today a typo in `metadata.deviceFamily` (e.g. `power-meterr`) ships silently; the docs catalogue then drops that Worker 
from browse without telling anyone.

**If not adopted:** docs maintainers notice the missing Worker during integration audits and ping the Worker author for a contract fix. The 
schema validation still runs upstream in `mdk-be`, so contracts that ship cleanly through that path will catch typos there.

### `check:facets-fresh`

Drift detector for the presentation overlay in [`tag-vocab.yaml`](tag-vocab.yaml). After the aggregator runs 
(see [Derived vocabulary](#derived-vocabulary)) it compares overlay entries against the slugs actually shipping in contracts and JSDoc 
and reports two kinds of drift:

1. **Missing labels** — a slug appears in a `mdk-contract.json` or in JSDoc but has no entry in the overlay. The catalogue falls back to the 
raw slug, so this is a soft warning, not a build break.
2. **Orphan labels** — an entry in the overlay no longer matches any shipping slug. Soft warning, used to keep the overlay tidy.

**Why it matters:** the overlay is opt-in pretty-printing, not a gatekeeper. Engineers do not need to update it when adding a new vendor — 
the schema validates the contract, the slug ships unchanged, and the catalogue keeps working. This gate would just keep the display layer honest 
without making docs a blocker for engineer changes.

**Note:** `integration-kinds` is the one section that is authored in [`tag-vocab.yaml`](tag-vocab.yaml) rather than derived. `check:facets-fresh` 
would warn when a `device-families` slug appears that no `integration-kinds.*.includes` covers — the catalogue would surface the Worker, but with no 
kind grouping. Adding a new family is the one case where the overlay actually needs a docs-side decision.

**If not adopted:** docs maintainers reconcile the overlay against shipping slugs on each integration audit. The fallback to raw slug means the 
catalogue keeps working in the meantime — no production blocker.

### `check:agent-ready` (UI side, already exists upstream)

The UI workspace's lint gate already exists in `fork-mdk-ui`: it fails when a public export is missing required JSDoc tags (`@tier`, `@category`, 
`@domain`, `@orkCapability`) or its co-located `USAGE.md` / `*.example.tsx`. Whether it lands here verbatim and stays in CI is the UI team's call as part of their port.

**Why it matters:** the contract this IA describes only holds if every UI export actually carries the JSDoc that drives `dist/registry.json`. The 
gate is what keeps that promise honest.

**If not adopted:** UI exports without JSDoc surface as raw slugs in the catalogue (same fallback as `check:facets-fresh`). Docs maintainers flag 
missing tags during integration audits and request the JSDoc be added.

### `check:port-signals`

Lints `docs/**/*.md` and warns when a non-anchor reference-style link definition has no adjacent `<!-- docs@tether.io: … -->` (or `<!-- mdk-monorepo: … -->`) 
HTML comment per the vocabulary in [`port-signals.md`](port-signals.md). Catches missing routing hints in mdk-prv pre-commit / CI before they reach the 
downstream port-sync transforms. Soft warning, not a hard gate — adding a new slug should never block on the docs pipeline being ready.

**Why it matters:** every cross-reference in the user-facing pages needs a port-time disposition (rewrite to upstream, preserve URL, drop on port, 
internal-only). Without this gate, a new slug added without a comment is silently invisible to the pipeline until the build breaks downstream.

**Ownership:** this gate is docs-side and has no engineering dependency — docs maintainers can wire it whenever there's appetite for the work. 
Until then, port signals are eyeballed during docs review.

### `check:integrations-fresh`

> Implemented. [`backend/workers/scripts/generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js) 
> (run `npm run generate:catalogue` in `packages/workers`) walks `backend/workers/**/mdk-contract.json`, validates each against the vendored schema 
> with ajv, and generates the catalogue at [`backend/workers/docs/supported-hardware.md`](../../../backend/workers/docs/supported-hardware.md) plus 
> `catalogue.json`. The user-facing entrypoint is [`docs/reference/supported-hardware.md`](../supported-hardware.md). The hand-maintained tables 
> under [`integrations/hardware/`](integrations/hardware/index.md) are now thin pointers to the generated catalogue. Validation is warn-only 
> (it does not block); wiring it as a blocking CI gate is still engineering's call.

Drift detector for the hand-maintained catalogue tables under [`integrations/`](integrations/index.md). Would walk 
`backend/workers/**/mdk-contract.json` and compare against the rows in [`integrations/hardware/*.md`](integrations/hardware/index.md), 
[`integrations/pools.md`](integrations/pools.md), and [`integrations/external-services.md`](integrations/external-services.md). 
If adopted, it would report two kinds of drift:

1. **Workers missing from the catalogue** — a shipping Worker has no row in the relevant index table. The catalogue is meant to be exhaustive, 
so this would be a build failure.
2. **Orphan catalogue rows** — an index-table row references a `backend/workers/...` path that no longer exists. Same severity.

**Why it matters:** today the integration index pages are hand-maintained. A new Whatsminer model added to `mdk-contract.json` ships without 
appearing in the catalogue; a deleted Worker silently leaves an orphan row. This gate would make the drift loud. The folder lives under 
`docs/maintainers/integrations/` (not `docs/integrations/`) precisely because it is still plumbing — until this gate lands, the tables are 
not safe enough to be user-facing. Each index page carries an invisible `<!-- mdk-monorepo: hand-maintained ... -->` reminder at the top so 
a maintainer editing the file sees it inline. The eventual end state replaces these tables with a build step that generates them from 
`dist/index.json` (see [Derived vocabulary](#derived-vocabulary)); the gate is the bridge.

**If not adopted:** docs maintainers walk the workers tree on each integration audit and update the catalogue tables manually. The tables 
stay under `maintainers/` and never graduate to user-facing `docs/integrations/`.

### `check:plugin-reference-fresh`

> Partially implemented. [`docs/scripts/generate-plugin-reference.js`](../../scripts/generate-plugin-reference.js) 
> (run `npm run generate:plugin-reference` in `backend/core/plugins`) reads each default plugin's `mdk-plugin.json` and regenerates the 
> route tables in [`backend/core/plugins/README.md`](../../../backend/core/plugins/README.md). The generator exists; the CI gate does not.

Freshness gate for the generated default-plugin route tables. Would run `npm run generate:plugin-reference` in CI and fail on a non-empty 
`git diff` in `backend/core/plugins/README.md` — the same regen-and-diff pattern as `check:integrations-fresh`. It would catch one kind of drift:

1. **Tables stale after a manifest change** — a route added, removed, or re-described in a default plugin's `mdk-plugin.json` is not reflected 
in the generated tables.

**Why it matters:** the default-plugin route tables are the published API surface for the Gateway's built-in endpoints. A table that lags the 
manifest documents routes that no longer exist or omits ones that do. Only the default plugins in `backend/core/plugins/` are covered; plugins 
mounted via `extraPluginDirs` are external and document their own routes.

**If not adopted:** docs maintainers re-run `npm run generate:plugin-reference` and commit the output whenever a default plugin's routes change.

### `check:plugin-manifest`

There is no `mdk-plugin.schema.json` today. The manifest format is enforced imperatively by `_validateManifest` in
[`backend/core/gateway/workers/lib/plugin-loader.js`](../../../backend/core/gateway/workers/lib/plugin-loader.js) and documented
by example (the shipping manifests) and by the loader rather than as a generated field table.

A machine-readable schema would enable two things:

1. **Generated field-table docs** — the manifest format section in [`backend/core/plugins/README.md`](../../../backend/core/plugins/README.md)
   could be generated from the schema the same way route tables are generated from manifests
2. **Well-formedness validation (`check:plugin-manifest`)** — a CI gate that validates every `mdk-plugin.json` in the repo against
   the schema, catching malformed manifests before they reach the loader at startup

This is a docs-maintainer recommendation, not currently on the engineering roadmap. Until the schema exists, the manifest format
remains documented by example and the loader is the authoritative validator.

**If not adopted:** docs maintainers keep the manifest format section in the README in step with `_validateManifest` manually.

### `check:tutorial-commands-fresh`

Drift detector for hardwired command lists in tutorial prose. Specifically, the full command reference in 
[`docs/tutorials/get-started/cli.md`](../../tutorials/get-started/cli.md) is a verbatim copy of the `help` block in 
[`examples/backend/mdk-e2e/client.js`](../../../examples/backend/mdk-e2e/client.js) (lines 132–153). A CI script that 
runs `echo -e 'help\nquit' | node examples/backend/mdk-e2e/client.js` and diffs the output against the hardwired block in the 
tutorial would catch drift whenever a command is added, removed, or renamed.

**Why it matters:** the command list is collapsed inside a `<details>` block and easy to miss during review. A new command 
added to `client.js` without a docs update is silently absent from the tutorial.

**If not adopted:** docs maintainers manually reconcile the tutorial command list against `client.js` on each review cycle.

### Combined effect

With all eight wired, an LLM browsing the catalogue can rely on eight guarantees:

1. Every Worker contract parses cleanly against the engineer-owned schema (`check:contract`).
2. Every UI export carries the JSDoc and co-located prose the catalogue expects (`check:agent-ready`).
3. The presentation overlay does not silently drift from what actually ships (`check:facets-fresh`).
4. Every cross-reference in user-facing Markdown carries a port-time routing hint (`check:port-signals`).
5. The hand-maintained integration catalogue tables stay in step with shipping Workers (`check:integrations-fresh`).
6. The generated default-plugin route tables stay in step with each plugin's `mdk-plugin.json` (`check:plugin-reference-fresh`).
7. Every `mdk-plugin.json` in the repo is well-formed against the machine-readable schema (`check:plugin-manifest`).
8. Hardwired command lists in tutorial prose stay in step with the source code they document (`check:tutorial-commands-fresh`).

Without these gates, docs maintainers chase drift manually — the IA still describes the shape, only the enforcement is missing. With them, 
the constraint surface stays where it belongs (schema + JSDoc validator) and the docs layer stays an overlay, never a gatekeeper.

## Derived vocabulary

Suggested target shape for [`tag-vocab.yaml`](tag-vocab.yaml). Not wired today; this section names the direction so the overlay does not 
quietly grow back into a parallel taxonomy.

### The problem with hand-curated vocab

A docs-authored allow-list — "these are the valid `metadata.provider` values" — inverts authority. Engineers ship `mdk-contract.json` and 
JSDoc; those are the facts. A YAML in `docs/` declaring what's "allowed" makes docs the gatekeeper: a new vendor lands cleanly in the schema, 
the contract validates, but the docs CI yells until somebody updates a parallel file in another folder. That is exactly the parallel process 
this IA is designed to avoid.

### Three buckets, three sources of truth

| Vocabulary axis | Real source of truth | What docs should do |
|-----------------|----------------------|---------------------|
| `device-families` | `mdk-contract.schema.json` enum (engineer-owned, breaking change to extend) | Read the schema. |
| `providers`, `modelsSupported[]` | Open-set fields observed in shipping `mdk-contract.json` files | Scan and aggregate. |
| `tiers`, `categories`, `domains`, `kernel-capabilities` | UI registry generator (already validates JSDoc) | Read `dist/registry.json`. |
| `integration-kinds` | Pure docs concept (no contract or JSDoc field) | Author here. |

### Target build step

A small aggregator (sibling of the `dist/contracts.json` + `dist/index.json` build named in 
[`agent-ready-sdk.md`](agent-ready-sdk.md#catalogue-aggregation)) walks `backend/workers/**/mdk-contract.json` and the
UI `dist/registry.json` and emits `dist/facets.json`:

```json
{
  "device-families": ["miner", "minerpool", "container", "power-meter", "sensor"],
  "providers": ["bitmain", "microbt", "canaan", "abb", "schneider", "satec", "seneca", "bitdeer", "ocean", "f2pool"],
  "models": ["microbt/miner/M53S", "bitmain/miner/S19", "..."],
  "tiers": ["agent-ready", "advanced", "internal"],
  "categories": ["charts", "tables", "..."]
}
```

The docs site reads `dist/facets.json` for membership, [`tag-vocab.yaml`](tag-vocab.yaml) for display labels (overlay), and 
`integration-kinds` from the same overlay for browse grouping. New vendor → new contract ships → new facet appears, no docs PR required.

### Combined effect with the QA gates

If adopted, `check:contract` would enforce the schema (engineers' constraint surface), `check:facets-fresh` would flag drift 
between the overlay and what ships, and `check:agent-ready` would keep UI annotations honest. None of them treat the docs-authored 
YAML as the source of truth — and that's the point.
