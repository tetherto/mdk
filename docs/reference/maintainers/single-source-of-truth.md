# A single source of truth vision

## TL;DR

- Regenerate every generated page in one command, from the repo root with `npm run regenerate-docs`
- Porting a page to the user docs needs a [port signal](#port-signals) on the source page and private-repo access

## Overview

This monorepo applies a single source of truth philosophy.

This includes the user docs at [https://docs.mdk.tether.io/](https://docs.mdk.tether.io/) that
consume this repo's data rather than risk drift between the two sites. These strategies hold that line:

1. [Port signals](#port-signals): pages carry porting hints, and a sync script ports the monorepo docs to the user docs.

2. [UI manifests](#ui-manifests): the UI packages generate machine-readable manifests from JSDoc tags which also write to `USAGE.md` files.

3. [Generation scripts](#generation-scripts): scripts read source-of-truth files (`mdk-contract.json`, `mdk-plugin.json`, JSDoc) and regenerate docs so they never drift from the code.

## Port signals

Authoring conventions for the comment hints that travel with Markdown and drive the port pipeline to [the user docs](https://docs.mdk.tether.io/).

These consumers read it:

1. The `check:port-signals` lint gate (see [`ia.md`](ia.md#qa-gates)): **not wired today** (no CI or pre-commit hook references it). Once adopted, it warns when a non-anchor link definition has no routing comment. Until then, port signals are eyeballed in docs review.
2. The port-sync transforms in the downstream Fumadocs build: rewrite link targets and convert GFM alerts to `<Callout>` JSX on port.

### Link slug routing

You only need this when adding a `[slug]: …` definition or a callout block; user-facing prose needs no signals.

Reference-style link definitions in `## Links` blocks (or anywhere in Markdown) carry an adjacent HTML comment that tells the port pipeline how to handle the target. Add the matching comment beside each cross-reference or alert:

| Comment on the lines immediately below `[slug]: …`  | Pipeline action                                       |
| --------------------------------------------------- | ----------------------------------------------------- |
| `<!-- docs@tether.io: <slug> → <upstream-path> -->` | Rewrite target to the upstream docs path on tether.io |
| `<!-- docs@tether.io: external link — preserve URL -->` | Keep the URL verbatim (non-Tether external URL)   |
| `<!-- docs@tether.io: no parity link -->` | Drop the link; render anchor text as plain text and emit a build warning |
| `<!-- mdk-monorepo: <note> -->` | Internal-only flag (e.g. temp link awaiting a code/README destination); pipeline ignores entirely |
| _(no comment) on `[slug]: #anchor`_ | In-page anchor: preserve verbatim alongside the parent page-to-page mapping |

A non-anchor link definition with **no signal** is a pipeline error: the slug has no routing rule. The `check:port-signals` gate would catch it once adopted.

A definition may carry **multiple comment lines** (e.g. one `docs@tether.io:` and one `mdk-monorepo:`); each is read independently.

#### Examples

Outbound mapping to an upstream docs page:

```markdown
[architecture]: ../architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->
```

Preserving a non-Tether external URL:

```markdown
[hypercore]: https://github.com/holepunchto/hypercore
<!-- docs@tether.io: external link — preserve URL -->
```

Monorepo source file (local relative path for IDE navigation, GitHub URL on port):

```markdown
[kernel-package]: ../../backend/core/kernel/index.js
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/index.js -->
```

Engineer-facing code link with no upstream parity:

```markdown
[envelope-impl]: ../../backend/core/kernel/lib/protocol/envelope.js
<!-- docs@tether.io: no parity link -->
```

Code link with a temp flag, for a target not yet populated (illustrative syntax only; `backend/core/client/` has since been populated, so treat the path as a placeholder, not a current status claim):

```markdown
[client-package]: ../../backend/core/client/
<!-- docs@tether.io: no parity link -->
<!-- mdk-monorepo: temp — target is empty (.gitkeep only) until its content lands -->
```

In-page anchor (uncommented by design):

```markdown
[architecture-section]: #the-kernel
```

### GFM alert → fumadocs `<Callout>`

GitHub renders `> [!TYPE]` blockquote alerts natively; Fumadocs uses `<Callout type="…">` JSX. Source files in this repo use GFM so they read correctly on GitHub; the port-sync maps:

| GFM source (this repo) | Fumadocs output (tether.io) |
|---|---|
| `> [!NOTE]`      | `<Callout type="info">`    |
| `> [!TIP]`       | `<Callout type="idea">`    |
| `> [!IMPORTANT]` | `<Callout type="warn">`    |
| `> [!WARNING]`   | `<Callout type="warning">` |
| `> [!CAUTION]`   | `<Callout type="error">`   |

Fumadocs also ships `<Callout type="success">`, which has no GFM equivalent. To reach it (or to override the default mapping for one block), drop an override comment immediately above the alert:

```markdown
<!-- callout: success -->
> [!NOTE]
> Deployment finished cleanly.
```

The port-sync reads `<!-- callout: <type> -->` directly above the alert and uses that type instead of the default; without an override, the table applies. The comment is invisible on GitHub, so authoring stays GitHub-native.

## UI manifests

Maintainer workflow for the UI manifests: what is committed vs. generated, and how to verify the contract. For the consumer view (what the manifests contain and how to query them), read [`ui/AGENTS.md`](../../../ui/AGENTS.md) first.

### What ships vs. what's tracked

The UI packages ship machine-readable manifests under `dist/` (`registry.json`, `hooks.json`, `stores.json`); [`ui/AGENTS.md`](../../../ui/AGENTS.md#machine-readable-artifacts) has the full table with packages, subpath imports, and CLI commands.

**These are build artifacts, not source files.** `ui/packages/*/dist/` is gitignored: manifests are generated on every `npm run build` and never committed. They **are** included in the published npm packages, so consumers get manifests that match the installed version.

**Source of truth:**

- `registry.json`: props and metadata read from JSDoc tags (`@tier`, `@category`, `@domain`, `@kernelCapability`) and types in component source. For agent-ready components the registry also records a pointer to the co-located `USAGE.md` and `*.example.tsx` files (referenced as docs, not read for prop facts). See the export contract at [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md).
- `hooks.json`: read from JSDoc in [`ui/packages/react-adapter/src/`](../../../ui/packages/react-adapter/src/index.ts) hooks.
- `stores.json`: read from JSDoc in [`ui/packages/ui-foundation/src/`](../../../ui/packages/ui-foundation/src/index.ts) stores.

### PR workflow

When a PR changes component source (JSDoc tags, props, `USAGE.md`), the `dist/` manifests update on the next `npm run build`, locally or in CI. **Do not commit `dist/*.json` files.** They are gitignored to avoid merge conflicts and drift: CI rebuilds them on every run, and published packages include the build output.

The skill's committed `ui-registry.json` copy is the exception: a generation target whose regeneration and freshness gate live with the others under [Generation scripts](#generation-scripts) (the [component reference target](#component-reference-in-the-mdk-ui-component-skill), checked by [freshness in CI](#freshness-in-ci)).

To regenerate **and** verify the agent-ready contract holds:

```bash
cd ui
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit
```

This gate runs in root CI as the **🤖 Agent-readiness contract (UI)** job in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), on any pull request that changes `ui/` or CI infrastructure. It builds the registry and checks registry completeness, the `USAGE.md` prop-table policy, and agent-ready metadata as one contract. A paired **🔒 USAGE baseline monotonicity** job compares `usage-proptable-baseline.json` against the pull request base as sets, so a new prop-table path cannot be baselined in: additions fail, removals are allowed. See [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md) for the rules it enforces.

[`ia.md`](ia.md) treats these manifests as the source of truth for UI component tiers, categories, domains, and Kernel capabilities, and tracks the proposed `check:facets-fresh` gate (see [`ia.md § QA gates`](ia.md#qa-gates)). Until it lands, maintainers track new agent-ready components manually during IA audits.

### Socket firewall note

If an `sfw`-routed `npm run build` or `npm run build:registry` hangs, Socket Firewall is blocking the toolchain's hosts. Source the repo allowlist; setup and the full host list live with the other lint tooling in [`linters.md § Nightly and PR diff link verification — linkinator`](linters.md#nightly-and-pr-diff-link-verification--linkinator).

## Generation scripts

Generated docs are a **checked projection of the facts that ship**, not a second hand-maintained copy that can drift. A generator reads the canonical source and rewrites its projection; hand-edits do not survive the next run.

| Canonical source | Generated projection |
|---|---|
| Worker contracts | Supported Workers catalogue |
| Package metadata | Package reference |
| UI types and JSDoc | Component registry |
| Component registry | Skill component reference, `## Props` sections in devkit `USAGE.md` files, docs-site props tables |

Change a fact once at its source (a prop type, option, default, or JSDoc description; a Worker contract) and every projection follows on the next regeneration. Forget, and CI names the exact drift before it merges. The `check:usage-proptables` gate stops new hand-authored props tables from becoming competing sources of truth: existing debt is baselined, removals are allowed, additions or swaps fail.

[`docs/scripts/regenerate-docs.mjs`](../../scripts/regenerate-docs.mjs) runs every generator; its `TARGETS` list is the authoritative inventory. It orchestrates only, calling each generator where it lives, so engineering keeps ownership of the generation logic. Exit codes: `0` every checked projection is current, `3` committed generated files are stale, `1` generation itself broke. Keep them blocking wherever stale generated content could merge.

### Regenerating

Run from the repo root:

```bash
npm run regenerate-docs
```

The command prints one line per page and names the files it wrote. It runs every generator even when one fails, so a single broken source file cannot hide a second problem.

A full run rebuilds the devkit component registry, so it needs [`ui/`](../../../ui/README.md)'s dependencies and can pull an unrelated diff into a narrow pull request. Use it for a repo-wide pass and for releases.

When one thing has changed, run that generator on its own. Each has its own command:

| Generated target | Command | Run from |
|---|---|---|
| Supported Workers | `npm run generate:catalogue` | repo root |
| Package reference | `npm run generate:package-catalog` | repo root |
| Component reference in the skill | `npm run generate:ui-registry` | repo root |
| Props sections in devkit `USAGE.md` files | `npm run generate:usage-proptables` | repo root |

Each Markdown target repeats its command in a `DO NOT EDIT` header, which travels with the page a person is looking at. The component reference is minified JSON and cannot carry a comment, so its command is recorded in [`packages/mdk-skill/README.md`](../../../packages/mdk-skill/README.md) and `sources.map.json` instead. The `USAGE.md` props sections carry theirs in the `BEGIN GENERATED` marker; everything between the markers is generator-owned, and hand-authored prop notes live outside them under a `… Props detail` heading.

### Checking without changing anything

```bash
npm run regenerate-docs -- --check
```

Report mode regenerates into the working tree, diffs the result against the last commit, then restores the tree exactly as found. It declares when a page is out of date: it exits non-zero and names the stale files. This is the pre-release check, the only mode that catches a stale page before someone suspects one.

Behaviors to know:

- Report mode declines to run when a generated file already carries uncommitted edits, because it cannot tell a stale page from work in progress. Commit or stash first.
- The component reference and the `USAGE.md` props sections need [`ui/`](../../../ui/README.md)'s dependencies installed. Without them those targets are skipped (named in the output) and the rest still run. The skip is reported, not fatal. Run [`npm run setup:ui`](../../../README.md) to cover the component reference too.

### Supported Workers catalogue

Generates the Supported Workers tables from Worker contract files, split by maintainer, with "Partner-maintained Workers" listed first:

- Partner-maintained Workers: built by the partner, a device manufacturer or a mining pool, in their own repository
- MDK-maintained Workers: built in this repo

**Source:** `backend/workers/**/mdk-contract.json` for in-repo Workers, plus every entry in [`backend/workers/external-workers.json`](../../../backend/workers/external-workers.json) for partner-maintained ones.

**Output:** [`backend/workers/docs/supported-workers.md`](../../../backend/workers/docs/supported-workers.md) and its machine-readable twin [`backend/workers/docs/catalogue.json`](../../../backend/workers/docs/catalogue.json).

**Generator:** [`backend/workers/scripts/generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js), owned by engineering and runnable on its own with `npm run generate:catalogue` from the repo root.

Fetching a partner's contract:

- The generator reads each `external-workers.json` entry's `mdk-contract.json` live over HTTPS at generation time, from its `repoUrl`, `ref` and `contractPath`. Nothing from the partner's repository is installed or executed; only that one file is read.
- `repoUrl` must be a plain `https://github.com/<owner>/<repo>` URL: the fetch goes to `raw.githubusercontent.com` unauthenticated, so only public GitHub repositories work today. Private repos and non-GitHub hosts are unsupported.
- Every contract, in-repo or fetched, is validated against [`backend/core/mdk-worker/mdk-contract.schema.json`](../../../backend/core/mdk-worker/mdk-contract.schema.json).

Pin `ref` to an immutable commit SHA, not a tag or branch. A branch moves on every push; a tag can be repointed (`git tag -f`, or a delete-and-recreate, as happens when re-cutting a botched release), so what gets fetched and validated next time could silently stop being what was last reviewed. A SHA cannot move.

**To add or update a partner-maintained Worker,** edit `external-workers.json` with:

- `name`, `repoUrl`, `ref` (a commit SHA, per above), and `contractPath` (the path to their `mdk-contract.json` in that repository at that ref)
- `brand`, `provider` and `family` (one of `miner`, `container`, `power-meter`, `sensor` or `minerpool`): these place and label the row even before a fetch succeeds; a successful fetch's own `metadata.brand`/`provider`/`deviceFamily` take priority once confirmed

Then regenerate and commit the result; there is no separate registration step.

Failure handling is per-entry and warn-only: an unreachable repository, a missing file at the ref/path, malformed JSON, or a schema violation is reported (not thrown), and only that one entry is affected. Every other entry still generates normally. A genuinely broken run, an exception outside this handling, exits non-zero.

> [!IMPORTANT]
> A partner contract that can't be confirmed this run (for example, no network) still gets a row in the output table,
> flagged "not confirmed this run" using only the manifest's own declared fields; it does not silently disappear.
> `npm run generate:catalogue` needs network access to fetch external contracts, so an offline maintainer can see that a row
> wasn't actually re-verified, rather than shipping a page that looks like the partner quietly stopped being supported.

Reported gaps land in:

- stderr on a manual run
- `catalogue.json`'s `conformanceGaps` array, each entry tagged `source: "external"` or `source: "in-repo"`
- a "Contract conformance" section at the bottom of the generated Markdown, naming exactly what to check: network connectivity, or the `repoUrl`/`ref`/`contractPath` fields in `external-workers.json`

The generator runs only from a pull request that touches a file in this repo, so a partner-side change never triggers it. The nightly `External contract check` workflow (`.github/workflows/external-contract-check.yml`) closes that gap: it re-fetches every pinned contract via `npm run check:external-contracts` ([`docs/scripts/check-external-contracts.mjs`](../../scripts/check-external-contracts.mjs)) and opens or refreshes an `external-contract`-labelled issue on breakage (unreachable, private, GC'd SHA, schema violation). A reachable-but-stale pin, behind the partner's latest change, is a tracked follow-up, not a failure.
The same nightly also checks that each `repoUrl` itself still resolves, since the generator reads only the raw contract file. Whether
the registry covers every Worker `examples/mvp-site` pins, at the same commit, is checked on every pull request by
`test/external-workers-registry.test.mjs`.

The [contract validation and catalogue generation process](ia.md#checkintegrations-fresh) covers what the generator checks before it writes.

#### Known issues with partner contract pins

This pipeline is temporary: supported Workers are moving to separately published npm packages, which replaces fetch-and-pin. The note should expire before V1. Known limits until then:

- A pin that still resolves can be out of date. The nightly check reports breakage only; the `ref` in [`external-workers.json`](../../../backend/workers/external-workers.json) advances only when someone edits it, and manufacturers such as Whatsminer publish no version to compare against.
- Fetched bytes are not content-hashed: integrity rests on GitHub serving the pinned SHA.
- Only `ref` is shape-checked. `name`, `repoUrl`, `brand` and the other fields fall back silently, so a malformed entry yields a label like `undefined (undefined)` rather than a clear error.

### Package reference

Lists every package in the monorepo on one page, so a reader can see what exists without walking each workspace.

**Source:** each `package.json` under `backend/core`, `backend/workers`, `ui/packages`, and `packages`, plus each integration's `mdk-contract.json`

**Output:** [`docs/reference/packages.md`](../packages.md)

**Generator:** [`docs/scripts/generate-package-catalog.mjs`](../../scripts/generate-package-catalog.mjs), runnable on its own with `npm run generate:package-catalog` from the repo root

Every column is inferred, so no `package.json` carries metadata for this page:

- Group: where the package lives. `backend/core` is Core, `backend/workers` is Extensions, `ui/packages` is UI, and `packages` is Tools
- Integration: any package with an `mdk-contract.json` at its root or under `plugin/`. Its section, name, and models come from the contract's `deviceFamily`, `brand`, and
  `modelsSupported`, and its purpose is the first sentence of `overview`
- Purpose for every other package: its `package.json` `description`
- Availability: `workspace` when the package is `"private": true`, otherwise `publishable`
- Link: the package's `README.md`, or its `package.json` when there is no README

Samples and demos (`backend/workers/samples/`) are skipped by a list in the generator. Add to that list when a new sample or demo should stay off
the page.

The generator writes nothing and exits non-zero when a listed package has no description, shares its name with another, or has a contract that cannot be parsed. Schema conformance is not checked here; the [Supported Workers catalogue](#supported-workers-catalogue) already validates every contract.

### Component reference in the mdk-ui-component skill

Keeps the component data shipped inside the `mdk-ui-component` skill in step with the devkit. The skill directs coding agents to this file for component props, so a stale copy tells an agent to pass props that no longer exist.

**Source:** `ui/packages/react-devkit/dist/registry.json`, itself generated from JSDoc tags, `USAGE.md` files and examples in the devkit's source

**Output:** [`packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry.json`](../../../packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry.json)

**Generator:** [`docs/scripts/sync-ui-registry.mjs`](../../scripts/sync-ui-registry.mjs), which rebuilds the devkit registry and copies it verbatim

The copy is verbatim on purpose. Trimming it to what the skill reads today would create a second shape to keep in step with the devkit's registry schema.

Regenerate through `npm run regenerate-docs` or `npm run generate:ui-registry` from the repo root, never the devkit's `build:registry` alone: both route through turbo so the devkit's type dependencies build first, while the bare script on an unbuilt checkout resolves those imports to `any` and writes a registry that silently will not match a built tree.

### Freshness in CI

`.github/workflows/docs-freshness.yml` runs `regenerate-docs --check` on every pull request. The job is a required status check, and a required check that never reports leaves the pull request unmergeable, so the workflow has no path filter: a change that touches neither the sources nor the generated pages still gets a quick, passing run. It installs the UI workspace and treats a skipped target as a failure, since there a skip means the install broke rather than that someone is working light. It **blocks** the pull request whenever any generated page is stale — a stale page ships facts the sources no longer support — and lists every stale path in the job summary. When a source change requires regenerated output, run `npm run regenerate-docs` from the repo root and commit the deterministic result in the same pull request. A generator that crashes, or any target skipped in CI, also blocks, because then the run did not verify every page.

## Next steps

- [`ui/AGENTS.md`](../../../ui/AGENTS.md): agent/consumer guide for UI manifests (CLI commands, what they contain)
- [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md): export contract every public component must satisfy
- [`agent-ready-sdk.md`](agent-ready-sdk.md): backend/Workers contract (mdk-contract.json, USAGE.md, examples)
- [`ia.md`](ia.md): information architecture and QA gates (check:port-signals, check:facets-fresh, check:integrations-fresh)
- [`linters.md`](linters.md): link verification and example-path checking gates already wired in CI
