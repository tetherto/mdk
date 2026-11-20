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

3. [Generation scripts](#generation-scripts): scripts read source-of-truth files (`mdk-contract.json`, JSDoc) and regenerate docs so
   they never drift from the code.

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

That holds for this repo, which tracks no copy of them. It does not hold for the docs site, which reads them out of a local checkout of this repo where nothing rebuilds them on its own: a manifest left over from an earlier build goes on being published until someone regenerates. `npm run regenerate-docs` is what refreshes them here — see [the per-target commands](#regenerating). A correction made in component source reaches the docs site only once these are rebuilt there; until then the site publishes the manifest it has, and a reference marked agent-ready can carry a fact the source no longer supports.

**Source of truth:**

- `registry.json`: props and metadata read from JSDoc tags (`@tier`, `@category`, `@domain`, `@kernelCapability`) and types in component source. For agent-ready components the registry also records a pointer to the co-located `USAGE.md` and `*.example.tsx` files (referenced as docs, not read for prop facts). See the export contract at [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md).
- `hooks.json`: read from JSDoc in [`ui/packages/react-adapter/src/`](../../../ui/packages/react-adapter/src/index.ts) hooks.
- `stores.json`: read from JSDoc in [`ui/packages/ui-foundation/src/`](../../../ui/packages/ui-foundation/src/index.ts) stores.

### PR workflow

When a PR changes component source (JSDoc tags, props, `USAGE.md`), the `dist/` manifests update on the next `npm run build`, locally or in CI. **Do not commit `dist/*.json` files.** They are gitignored to avoid merge conflicts and drift: CI rebuilds them on every run, and published packages include the build output. Neither of those reaches the docs site's checkout, which is the consumer that can go stale; run `npm run regenerate-docs` there.

The skill's committed `ui-registry/` copy is the exception: a generation target whose regeneration and freshness gate live with the others under [Generation scripts](#generation-scripts) (the [component reference target](#component-reference-in-the-mdk-ui-component-skill), checked by [freshness in CI](#freshness-in-ci)).

To regenerate **and** verify the agent-ready contract holds:

```bash
cd ui
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit
```

This gate runs in root CI as the **🤖 Agent-readiness contract (UI)** job in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), on any pull request that changes `ui/` or CI infrastructure. It builds the registry and checks registry completeness, the `USAGE.md` prop-table policy, and agent-ready metadata as one contract. A paired **🔒 USAGE baseline monotonicity** job compares `usage-proptable-baseline.json` against the pull request base as sets, so a new prop-table path is reported: additions fail the step, removals pass. Both jobs are advisory. `continue-on-error` sits on the checking step rather than the job, so the job ends green and a violation is reported on the pull request without blocking the merge. Neither belongs in the required status checks, and a red step still has to be read and acted on. See [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md) for the rules it enforces.

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
| CLI command definitions | [CLI reference](#cli-reference), hand-maintained until its generator lands |

Change a fact once at its source (a prop type, option, default, or JSDoc description; a Worker contract) and every projection follows on the next regeneration. Forget, and CI names the exact drift before it merges. The `check:usage-proptables` gate stops new hand-authored props tables from becoming competing sources of truth: existing debt is baselined, removals are allowed, additions or swaps fail.

[`docs/scripts/regenerate-docs.mjs`](../../scripts/regenerate-docs.mjs) runs every generator; its `TARGETS` list is the authoritative inventory. It orchestrates only, calling each generator where it lives — a generator sits beside what it reads, which is a question about placement, not about who maintains it. Exit codes: `0` every checked projection is current, `3` committed generated files are stale, `1` generation itself broke or a target could not run. Keep them blocking wherever stale generated content could merge.

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
| Gateway and app HTTP API references, route-table field reference | `npm run generate:api-reference` | repo root |
| Component reference in the skill | `npm run generate:ui-registry` | repo root |
| Props sections in devkit `USAGE.md` files | `npm run generate:usage-proptables` | repo root |

A full run also refreshes targets that are not in that list, because they are not pages committed here: the `dist/` manifests the docs site reads out of this checkout. They come out of the devkit build the component reference generator already runs, so they have no command of their own.

| Build artifact, read out of this checkout | Refreshed by | Run from |
|---|---|---|
| `ui/packages/react-devkit/dist/registry.json` | `npm run regenerate-docs` | repo root |
| `ui/packages/react-adapter/dist/hooks.json` | `npm run regenerate-docs` | repo root |
| `ui/packages/ui-foundation/dist/stores.json` | `npm run regenerate-docs` | repo root |

None of these is committed, so `--check` has nothing to diff them against and does not report on them. Regenerating is the only way to be sure they are current.

Each Markdown target repeats its command in a `DO NOT EDIT` header, which travels with the page a person is looking at. The component reference is minified JSON and cannot carry a comment, so its command is recorded in [`packages/mdk-skill/README.md`](../../../packages/mdk-skill/README.md) and `sources.map.json` instead. The `USAGE.md` props sections carry theirs in the `BEGIN GENERATED` marker; everything between the markers is generator-owned, and hand-authored prop notes live outside them under a `… Props detail` heading.

### Checking without changing anything

```bash
npm run regenerate-docs -- --check
```

Report mode regenerates into the working tree, diffs the result against the last commit, then restores the tree exactly as found. It declares when a page is out of date: it exits non-zero and names the stale files. This is the pre-release check, the only mode that catches a stale page before someone suspects one.

Behaviors to know:

- Report mode declines to run when a generated file already carries uncommitted edits, because it cannot tell a stale page from work in progress. Commit or stash first.
- The component reference and the `USAGE.md` props sections need [`ui/`](../../../ui/README.md)'s dependencies installed. Without them the run fails and names those targets. Run [`npm run setup`](../../../CONTRIBUTING.md#development-environment-setup) to install them, or `--allow-skip` to proceed without.

**What a passing `--check` covers.** Every committed target, because a target that cannot run fails the run and is named. A green `--check` therefore means what it says, in CI and at a terminal alike — the exit code is the whole verdict, with no output left to read for a caveat.

A target can only fail this way when `ui/`'s dependencies are missing, which [`npm run setup`](../../../CONTRIBUTING.md#development-environment-setup) installs. To accept partial coverage anyway, mid-setup:

```bash
npm run regenerate-docs -- --check --allow-skip
```

That reports the skip, carries on, and exits `0` on what it could check. The `dist/` manifests above sit outside `--check` either way: nothing commits them, so there is nothing to compare them against.

### Supported Workers catalogue

Generates the Supported Workers tables from Worker contract files, split by maintainer, with "Partner-maintained Workers" listed first:

- Partner-maintained Workers: built by the partner, a device manufacturer or a mining pool, in their own repository
- MDK-maintained Workers: built in this repo

**Source:** `backend/workers/**/mdk-contract.json` for in-repo Workers, plus every entry in [`backend/workers/external-workers.json`](../../../backend/workers/external-workers.json) for partner-maintained ones.

**Output:** [`backend/workers/docs/supported-workers.md`](../../../backend/workers/docs/supported-workers.md) and its machine-readable twin [`backend/workers/docs/catalogue.json`](../../../backend/workers/docs/catalogue.json).

**Generator:** [`backend/workers/scripts/generate-catalogue.js`](../../../backend/workers/scripts/generate-catalogue.js), runnable on its own with `npm run generate:catalogue` from the repo root. It lives beside the contracts it reads rather than under `docs/scripts/`, and it calls engineering's schema validator — but it is maintained with the other generators that feed docs pages.

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

The generator runs only from a pull request that touches a file in this repo, so a partner-side change never triggers it. The nightly `External contract check` workflow (`.github/workflows/external-contract-check.yml`) closes that gap: it re-fetches every pinned contract via `npm run check:external-contracts` ([`docs/scripts/check-external-contracts.mjs`](../../scripts/check-external-contracts.mjs)) and refreshes its `external-contract` [tracking issue](linters.md#tracking-issues) on breakage (unreachable, private, GC'd SHA, schema violation). A reachable-but-stale pin, behind the partner's latest change, is a tracked follow-up, not a failure.
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
- Link ref: the ref the link already has on the page, or `main` for a package the page does not list yet.
  [`release:bump` pins it](linters.md#public-urls-into-this-repo), so a package added after a release is never linked at a tag that lacks it

The generator writes nothing and exits non-zero when a listed package has no description, shares its name with another, or has a contract that cannot be parsed. Schema conformance is not checked here; the [Supported Workers catalogue](#supported-workers-catalogue) already validates every contract.

### HTTP API references

Documents the Gateway's own routes and each configured app's routes from the declarations the runtime registers from, so no route,
method, path or parameter on these pages is typed by hand. The route-table field reference comes from the schema that validates the
route tables.

**Source:** the route objects `createAuthRoutes` returns in
[`backend/core/gateway/workers/lib/auth-routes.js`](../../../backend/core/gateway/workers/lib/auth-routes.js), each app's
`mdk-plugin.json` listed in [`docs/api-reference.config.json`](../../api-reference.config.json) under the name and mount a stack gives
it, and [`backend/core/app-runtime/mdk-plugin.schema.json`](../../../backend/core/app-runtime/mdk-plugin.schema.json)

**Output:** `http-api.md` and `openapi.json` (OpenAPI 3.1) for the [Gateway](../../../backend/core/gateway/docs/http-api.md) and for
each configured app, such as the [mvp-site example](../../../examples/mvp-site/backend/gateway-plugins/site/docs/http-api.md), and the
[route-table field reference](../../../backend/core/app-runtime/docs/route-table-fields.md)

**Generator:** [`docs/scripts/generate-api-reference.mjs`](../../scripts/generate-api-reference.mjs), runnable on its own with
`npm run generate:api-reference` from the repo root. The conversion and rendering are exports of `@tetherto/mdk-app-runtime`, which an
app in its own repository calls the same way

Nothing on these pages is inferred. Purpose is the declared `description` (a Gateway route's `schema.description`), Responses and
Errors are the declared responses (a Gateway route's `schema.responses`, OpenAPI's field, which Fastify ignores), Access is the
`spec.rbac` requirement `routeAccess` resolves for the route the loader normalizes, and anything a declaration does not state shows as
"Not declared" and is listed under the page's declaration gaps. Fix a gap in the declaration, then regenerate. The generator copies a
description as written, so code names in it go in backticks. A release bump regenerates these pages, because the
Gateway's OpenAPI document carries the Gateway package version.

The errors an HTTP caller receives on any app route are generated. The Gateway's
[`workers/lib/shared-responses.js`](../../../backend/core/gateway/workers/lib/shared-responses.js) declares them once, in request
order: each stage's fixed codes with their statuses, and a rule for each answer that carries no fixed code, such as Fastify's body
parsing errors or the codes a controller relays from the Kernel client. The Gateway owns the declaration because it answers every
one of them over HTTP; app runtime's converter adds none.
The generator calls `addSharedResponses` on every app's document, adds the stages a sign-in route meets to the Gateway's, and every
page lists them by stage. Nothing at runtime reads the declaration: the hooks keep their own literals, and the Gateway's unit tests
raise each code through the code that answers it, app runtime's client included, and check its declared status. The
[Gateway's HTTP reference](../../../backend/core/gateway/docs/http-api.md#errors-on-every-app-route) is the one page prose links
for them.

To change what every app route answers:

1. Edit the entry in [`workers/lib/shared-responses.js`](../../../backend/core/gateway/workers/lib/shared-responses.js), keeping
   the list in request order.
2. Add or update the case that raises the code: a stage the Gateway answers in its
   [shared responses test](../../../backend/core/gateway/tests/unit/lib/shared-responses.test.js), a forwarding code or the
   controller rule in its [forwarding test](../../../backend/core/gateway/tests/unit/lib/shared-responses-forwarding.test.js).
   The forwarding test fails on a code app runtime's protocol adds until the code is declared, or listed there with the reason no
   HTTP caller receives it.
3. Run `npm run generate:api-reference` from the repo root.

Never write one of these codes or its status into a hand-written table. Link the Gateway's section from the sentence that needs it.

Every other error table stays hand-maintained in its owning package. Each `ERR_*` code is thrown as a string where it fires, the
error-documentation policy forbids scraping those strings into a table, and a startup or client-library error is not an HTTP
response, so OpenAPI is no home for it. The nightly table-reference check confirms that each code cited alone in a table's first
cell still appears in that package's source:

| Table | Owning package | Disposition |
| --- | --- | --- |
| [App runtime errors](../../../backend/core/app-runtime/README.md#errors) | `@tetherto/mdk-app-runtime` | Startup and client-library errors hand-maintained; the errors an HTTP caller receives link the generated Gateway section |
| [Route table load errors](../../../backend/core/app-runtime/README.md#route-table-load-errors) | `@tetherto/mdk-app-runtime` | Hand-maintained, deferred; moved here from the Gateway README, since app-runtime's loader throws every code in it |
| [Gateway errors](../../../backend/core/gateway/README.md#errors) | `@tetherto/mdk-gateway` | Links the generated errors every app route can answer and the route table load errors; its own boot errors are named in prose |
| [MCP server errors](../../../backend/core/mcp/README.md#errors) | `@tetherto/mdk-mcp` | Hand-maintained, deferred until codes are declared |

The sign-in routes declare their own errors, which are HTTP responses too: each route object declares OpenAPI `responses`, built
from the status map in `auth-routes.js` that the handlers answer with, and the Gateway page's Errors section is generated from them.
A Gateway unit test raises every declared code and checks it arrives with its declared status. An app route table declares a code's
status the same way, in `x-mdk-errors` on the response for that status ([`x-mdk-errors`](../../../backend/core/app-runtime/docs/route-table-fields.md#fields));
a code listed only in `errors` shows its status as "Not declared".

### Component reference in the mdk-ui-component skill

Keeps the component data shipped inside the `mdk-ui-component` skill in step with the devkit. The skill directs coding agents to these files for component props, so a stale copy tells an agent to pass props that no longer exist.

**Source:** `ui/packages/react-devkit/dist/registry.json`, itself generated from JSDoc tags, `USAGE.md` files and examples in the devkit's source

**Output:** [`packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry/`](../../../packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry/index.json): an `index.json` of component names by category, hook names and type names, plus one file per component, hook and type under `components/`, `hooks/` and `types/`

**Generator:** [`docs/scripts/sync-ui-registry.mjs`](../../scripts/sync-ui-registry.mjs), which rebuilds the devkit registry and splits it, with the layout in [`docs/scripts/lib/ui-registry-split.mjs`](../../scripts/lib/ui-registry-split.mjs)

The split keeps an agent from reading the whole registry, about 290 KB, to look up one component. Each entry is copied verbatim on purpose: trimming entries to what the skill reads today would create a second shape to keep in step with the devkit's registry schema. The registry's `indexes` are not copied, since `index.json` carries the categories and each entry carries the fields the other indexes are built from.

Regenerate through `npm run regenerate-docs` or `npm run generate:ui-registry` from the repo root, never the devkit's `build:registry` alone: both route through turbo so the devkit's type dependencies build first, while the bare script on an unbuilt checkout resolves those imports to `any` and writes a registry that silently will not match a built tree.

### CLI reference

Lists every `mdk` command with its arguments, flags and defaults, so end users never have to read the CLI package README
to find a flag.

**Source:** the Commander definitions in `packages/cli/src/commands/*.ts` and `packages/cli/src/program.ts` (`.command`,
`.argument`, `.option`, `.description`, `.summary`), plus the `spec.mcp` keys `packages/cli/src/lib/spec.ts` accepts.

**Output:** [`docs/reference/tooling/cli.md`](../tooling/cli.md)

**Generator:** none yet. The page is a hand-maintained projection, and its frontmatter `notes:` says so and points here.
Until a generator exists, a change to a command's help string and the matching row on the page travel in the same pull
request, and a release review re-checks every row against the source.

The generator to add is a `TARGETS` entry in [`docs/scripts/regenerate-docs.mjs`](../../scripts/regenerate-docs.mjs)
that builds the program with `buildProgram()` from `packages/cli/src/program.ts`, walks `program.commands` recursively,
and emits the per-command tables from each command's registered arguments and options, with the help group from
`HELP_GROUPS` as the section. The narrative sentences around the tables stay hand-written, outside generated markers, so
the page keeps its links to the owning guides. Once that lands, the `notes:` key comes off the frontmatter and the page
carries the usual `DO NOT EDIT` header for its generated regions.

### Freshness in CI

`.github/workflows/docs-freshness.yml` runs `regenerate-docs --check` on every pull request. The job is a required status check, and a required check that never reports leaves the pull request unmergeable, so the workflow has no path filter: a change that touches neither the sources nor the generated pages still gets a quick, passing run. It installs the UI workspace, and a target that cannot run fails the job on the tool's own exit code. It **blocks** the pull request whenever any generated page is stale — a stale page ships facts the sources no longer support — and lists every stale path in the job summary. When a source change requires regenerated output, run `npm run regenerate-docs` from the repo root and commit the deterministic result in the same pull request. A generator that crashes, or any target skipped in CI, also blocks, because then the run did not verify every page.

## Next steps

- [`ui/AGENTS.md`](../../../ui/AGENTS.md): agent/consumer guide for UI manifests (CLI commands, what they contain)
- [`ui/packages/react-devkit/AGENT_READY.md`](../../../ui/packages/react-devkit/AGENT_READY.md): export contract every public component must satisfy
- [`agent-ready-sdk.md`](agent-ready-sdk.md): backend/Workers contract (mdk-contract.json, USAGE.md, examples)
- [`ia.md`](ia.md): information architecture and QA gates (check:port-signals, check:facets-fresh, check:integrations-fresh)
- [`linters.md`](linters.md): link verification and example-path checking gates already wired in CI
