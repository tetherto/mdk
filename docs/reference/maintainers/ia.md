# Information architecture

**One fact, one folder; tags are the IA, paths are not.**

The monorepo builds on contracts that already ship:

- **Workers** ship [`mdk-contract.json`](../../../backend/workers/miners/avalon/plugin/mdk-contract.json) per package,
validated against [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json), vendored in this repo.
The contract carries metadata, telemetry, commands, health, and errors — programmatic contract + AI reasoning context in one file.
- **UI** components carry JSDoc tags (`@tier`, `@category`, `@domain`, `@kernelCapability`); the registry generator (`ui/packages/react-devkit/scripts/generate-registry.mts`)
and sibling generators emit `dist/registry.json`,
`dist/hooks.json`, `dist/stores.json`. See [`ui/AGENTS.md`](../../../ui/AGENTS.md).
<!-- mdk-monorepo: repoint to package-level AGENTS.md until ui/docs/AGENT_READY.md is populated -->

Every public artefact adds `USAGE.md` plus runnable examples on top of its existing contract.

Worker:

```text
backend/workers/<family>/<provider>/
  mdk-contract.json              # existing — runtime contract (metadata, telemetry, commands, ...)
  USAGE.md                       # new — prose (human + LLM)
  examples/run-<scenario>.js     # new — one runnable Node file per scenario (qvac model)
```

UI component:

```text
ui/<pkg>/src/.../<component>/
  index.tsx                      # JSDoc tags drive dist/registry.json
  USAGE.md                       # new — prose
  <component>.example.tsx        # new — runnable, co-located
```

`USAGE.md` and the runnable examples are the only new conventions. See [`agent-ready-sdk.md`](agent-ready-sdk.md#what-this-monorepo-adds-on-top) for what goes in them and the rule against restating contract or JSDoc fields.

## Where docs live

| Location | Owns |
|----------|------|
| [`docs/`](../../README.md) | Role-based router ([`README.md`](../../README.md)) and end-user-facing SoT content ([`concepts/`](../../concepts/)) |
| [`docs/reference/maintainers/`](README.md) | Docs maintainer plumbing: this file, [`agent-ready-sdk.md`](agent-ready-sdk.md), [`tag-vocab.yaml`](tag-vocab.yaml), [`single-source-of-truth.md`](single-source-of-truth.md), and the hand-maintained [`integrations/`](integrations/index.md) catalogue (lives here, not at `docs/integrations/`, until [`check:integrations-fresh`](#checkintegrations-fresh) keeps it honest) |
| [`backend/core/docs/`](../../../backend/core/docs/README.md) | Core workspace conventions (`mdk`, `client`, `kernel`, `gateway`, …) |
| [`ui/`](../../../ui/README.md) | UI workspace conventions for react-devkit, adapter, ui-foundation, CLI |
| [`backend/workers/docs/`](../../../backend/workers/docs/architecture.md) | Workers workspace conventions (Worker lifecycle, install pattern, taxonomy) |
| `*/packages/**/<artefact>/` | Per-artefact contract + docs: `mdk-contract.json` (Workers, existing) or JSDoc on `src/` (UI), plus `USAGE.md` and `examples/` |

## Integration ontology

The "kinds" used by the docs catalogue for browsing. Each kind is a **docs-side roll-up** over one or more `metadata.deviceFamily` values:

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

- `metadata.deviceFamily`, `metadata.provider`, `metadata.modelsSupported[]` are constrained (or open-set) by [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json).
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

Suggested CI checks that would make the IA self-enforcing. **Most are not wired today** (`check:agent-ready` is the exception) **and none are prerequisites for the BE or FE port.** Engineering decides whether to adopt each remaining gate per-team; for any gate not adopted, docs maintainers absorb the upkeep manually (each section below names the fallback). The constraint surface stays in [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json) for Workers and the UI registry generator for components, whether or not these gates land.

### `check:contract`

Validates every `backend/workers/**/mdk-contract.json` against [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json). Would fail the build on malformed contracts
(missing required fields, wrong types, unknown enum values defined by the schema). The schema and an ajv validator already exist and run today
in [`backend/workers/scripts/generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js), but only as a warn-only step, not a build-failing gate —
this gate would make that same validation blocking if adopted.

**Why it matters:** today a typo in `metadata.deviceFamily` (e.g. `power-meterr`) ships silently; the docs catalogue then drops that Worker
from browse without telling anyone.

**If not adopted:** docs maintainers notice the missing Worker during integration audits and ping the Worker author for a contract fix. The
warn-only validation in [`generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js) surfaces the error in its own output, so contracts that ship cleanly through that path catches typos there.

### `check:facets-fresh`

Drift detector for the presentation overlay in [`tag-vocab.yaml`](tag-vocab.yaml). After the aggregator runs
(see [Derived vocabulary](#derived-vocabulary)) it compares overlay entries against the slugs actually shipping in contracts and JSDoc
and reports these kinds of drift:

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

### `check:agent-ready` (UI side)

The UI workspace's lint gate fails when a public export is missing required JSDoc tags (`@tier`, `@category`,
`@domain`, `@kernelCapability`) or its co-located `USAGE.md` / `*.example.tsx`. It is the one gate already wired, as a blocking root-CI job; [`single-source-of-truth.md`](single-source-of-truth.md#pr-workflow) owns the job detail and its paired USAGE-baseline check.

**Why it matters:** the contract this IA describes only holds if every UI export actually carries the JSDoc that drives `dist/registry.json`. The
gate is what keeps that promise honest.

**If not adopted:** UI exports without JSDoc surface as raw slugs in the catalogue (same fallback as `check:facets-fresh`). Docs maintainers flag
missing tags during integration audits and request the JSDoc be added.

### `check:port-signals`

Lints `docs/**/*.md` and warns when a non-anchor reference-style link definition has no adjacent `<!-- docs@tether.io: … -->` (or `<!-- mdk-monorepo: … -->`)
HTML comment per the vocabulary in [`single-source-of-truth.md`](single-source-of-truth.md). Catches missing routing hints in this repo's pre-commit / CI before they reach the
downstream port-sync transforms. Soft warning, not a hard gate — adding a new slug should never block on the docs pipeline being ready.

**Why it matters:** every cross-reference in the user-facing pages needs a port-time disposition (rewrite to upstream, preserve URL, drop on port,
internal-only). Without this gate, a new slug added without a comment is silently invisible to the pipeline until the build breaks downstream.

**Ownership:** this gate is docs-side and has no engineering dependency — docs maintainers can wire it whenever there's appetite for the work.

### `check:integrations-fresh`

> Implemented. [`backend/workers/scripts/generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js)
> (run `npm run regenerate-docs` from the repo root, or `npm run generate:catalogue` — also from the repo root — for this generator alone) walks
> `backend/workers/**/mdk-contract.json`, validates each against the vendored schema
> with ajv, and generates the catalogue at [`backend/workers/docs/supported-workers.md`](../../../backend/workers/docs/supported-workers.md) plus
> [`catalogue.json`](../../../backend/workers/docs/catalogue.json). The user-facing entrypoint is [`docs/reference/supported-workers.md`](../supported-workers.md). The hand-maintained tables
> under [`integrations/hardware/`](integrations/hardware/index.md) are thin pointers to the generated catalogue. Validation is warn-only
> (it does not block); wiring it as a blocking CI gate is still engineering's call.
>
> Freshness of the generated catalogue is covered by [`npm run regenerate-docs -- --check`](single-source-of-truth.md#generation-scripts) and the
> `docs-freshness` workflow, which **blocks** when `supported-workers.md` or `catalogue.json` no longer matches the contracts. What remains ungated is the
> drift described below, between shipping Workers and the hand-maintained tables under [`integrations/`](integrations/index.md).

Drift detector for the hand-maintained catalogue tables under [`integrations/`](integrations/index.md). Would walk
`backend/workers/**/mdk-contract.json` and compare against the rows in [`integrations/hardware/*.md`](integrations/hardware/index.md) and
[`integrations/pools.md`](integrations/pools.md) (external services have no rows yet — no Worker has shipped in that kind).
If adopted, it would report these kinds of drift:

1. **Workers missing from the catalogue** — a shipping Worker has no row in the relevant index table. The catalogue is meant to be exhaustive,
so this would be a build failure.
2. **Orphan catalogue rows** — an index-table row references a `backend/workers/...` path that no longer exists. Same severity.

**Why it matters:** today the integration index pages are hand-maintained. A new Whatsminer model added to `mdk-contract.json` ships without
appearing in the catalogue; a deleted Worker silently leaves an orphan row. This gate would make the drift loud. The folder lives under
[`docs/reference/maintainers/integrations/`](integrations/index.md) (not `docs/integrations/`) precisely because it is still plumbing — until this gate lands, the tables are
not safe enough to be user-facing. Each index page carries an invisible `<!-- mdk-monorepo: hand-maintained ... -->` reminder at the top so
a maintainer editing the file sees it inline. The eventual end state replaces these tables with a build step that generates them from
`dist/index.json` (see [Derived vocabulary](#derived-vocabulary)); the gate is the bridge.

**If not adopted:** docs maintainers walk the workers tree on each integration audit and update the catalogue tables manually. The tables
stay under [`maintainers/`](./README.md) and never graduate to user-facing `docs/integrations/`.

### `check:plugin-manifest`

There is no `mdk-plugin.schema.json` today. The manifest format is enforced imperatively by `_validateManifest` in
[`backend/core/app-runtime/lib/plugin-loader.js`](../../../backend/core/app-runtime/lib/plugin-loader.js) and documented
by example (the shipping manifests) and by the loader rather than as a generated field table.

A machine-readable schema would enable:

1. **Generated field-table docs**: the manifest format section in the [Gateway apps guide](../../guides/gateway/apps.md)
   could be generated from the schema the same way route tables are generated from manifests
2. **Well-formedness validation (`check:plugin-manifest`)**: a CI gate that validates every `mdk-plugin.json` in the repo against
   the schema, catching malformed manifests before they reach the loader at startup

This is a docs-maintainer recommendation, not currently on the engineering roadmap. Until the schema exists, the manifest format
remains documented by example and the loader is the authoritative validator.

**If not adopted:** docs maintainers keep the manifest format section in the README in step with `_validateManifest` manually.

### `check:tutorial-commands-fresh`

Drift detector for hardwired command lists in tutorial prose — not currently applicable. This gate was written when
[`docs/tutorials/run-a-site.md`](../../tutorials/run-a-site.md) hardcoded a curated subset of the CLI's `HELP` block; that tutorial no longer embeds
any command list (verified: no reference to `HELP` or `cli.js` remains in it). Revive this section if a tutorial starts
hardcoding a command list again — the mechanism (diff a CI-run `--help` output against the hardwired block) still applies.

### Combined effect

Wired, each gate closes one drift path, named in its section above: contracts parse against the schema (`check:contract`), UI exports carry their JSDoc and prose (`check:agent-ready`), the overlay tracks what ships (`check:facets-fresh`), cross-references carry port hints (`check:port-signals`), the integration catalogue tracks shipping Workers (`check:integrations-fresh`), every `mdk-plugin.json` is well-formed (`check:plugin-manifest`), and tutorial command lists track the source (`check:tutorial-commands-fresh`).

Unwired, maintainers chase that drift by hand: the IA still describes the shape, only enforcement is missing. The constraint surface stays in the schema and JSDoc validator; the docs layer stays an overlay, never a gatekeeper.

## Derived vocabulary

Suggested target shape for [`tag-vocab.yaml`](tag-vocab.yaml). Not wired today; this section names the direction so the overlay does not
quietly grow back into a parallel taxonomy.

### The problem with hand-curated vocab

A docs-authored allow-list — "these are the valid `metadata.provider` values" — inverts authority. Engineers ship `mdk-contract.json` and
JSDoc; those are the facts. A YAML in [`docs/`](../../README.md) declaring what's "allowed" makes docs the gatekeeper: a new vendor lands cleanly in the schema,
the contract validates, but the docs CI yells until somebody updates a parallel file in another folder. That is exactly the parallel process
this IA is designed to avoid.

### Buckets and their sources of truth

| Vocabulary axis | Real source of truth | What docs should do |
|-----------------|----------------------|---------------------|
| `device-families` | [`mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json) enum (engineer-owned, breaking change to extend) | Read the schema. |
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
