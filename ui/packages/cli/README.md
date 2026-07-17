# `@tetherto/mdk-ui-cli`

Agent-first command-line interface for the [MDK Devkit](../react-devkit/README.md). The
`mdk-ui` binary exposes the component registry, co-located docs and examples,
React adapter hooks, ui-foundation stores, and a small set of scaffolding utilities
so AI agents can build pages without parsing the package source.

## Install

The CLI ships alongside `@tetherto/mdk-react-devkit` as a workspace package:

```bash
npm install --save-dev @tetherto/mdk-ui-cli \
  @tetherto/mdk-react-devkit \
  @tetherto/mdk-react-adapter \
  @tetherto/mdk-ui-foundation
```

Once installed, `npx mdk-ui --help` lists every supported subcommand.

## Commands

### Discovery

| Command | Description |
| --- | --- |
| `mdk-ui registry [--filter components\|hooks\|all] [--tier agent-ready\|advanced\|all] [--format json\|table]` | Print the machine-readable component registry from `@tetherto/mdk-react-devkit`. |
| `mdk-ui find [--capability X] [--domain Y] [--category Z] [--tier T]` | Filter the registry by Kernel capability / domain / category / tier. |
| `mdk-ui blueprints` | List curated recipes that map an intent to a starting component set. |
| `mdk-ui blueprint <id>` | Print one blueprint (markdown, ready to feed an LLM). |
| `mdk-ui suggest <free text>` | Keyword-overlap scorer across components, hooks, blueprints, adapter hooks **and** stores. Returns five ranked groups: `components`, `hooks`, `blueprints`, `adapterHooks`, `stores`. |
| `mdk-ui hooks [--category store\|utility\|permission\|ui\|external] [--format json\|table]` | Print the React hooks manifest from `@tetherto/mdk-react-adapter` (`dist/hooks.json`). |
| `mdk-ui stores [--category auth\|devices\|notifications\|timezone\|actions] [--format json\|table]` | Print the Zustand stores + TanStack Query helpers manifest from `@tetherto/mdk-ui-foundation` (`dist/stores.json`). |
| `mdk-ui --json-help` | Dump the CLI's own command surface as `dist/cli-manifest.json` (args, options, subcommands). |

### Reading a component

| Command | Description |
| --- | --- |
| `mdk-ui docs <ComponentName>` | Print the co-located `USAGE.md` for a component. |
| `mdk-ui example <ComponentName>` | Print a runnable example for a component. |

### Scaffolding

| Command | Description |
| --- | --- |
| `mdk-ui add page <name> --component <ComponentName>` | Scaffold a page at `src/pages/<Name>.tsx` with correct imports and required prop stubs. |
| `mdk-ui check <file>` | Run `tsc --noEmit` scoped to a single file and emit structured JSON errors. |
| `mdk-ui init [--ide cursor\|claude\|none]` | Generate `.mdk/context.md` (and optional IDE rule file) in the consuming project. |
| `mdk-ui sync` | Refresh the "Existing pages" / "Existing hooks" sections in `.mdk/context.md`. |

### Docs-site generation

Turn the built package manifests into a documentation dataset + pages. Public
surface only — a leak guard blocks private references.

| Command | Description |
| --- | --- |
| `mdk-ui docs:generate --docs-repo <mdk-docs> --version-label <x.y.z>` | **One-command orchestration.** Locates the monorepo, builds it so every manifest (registry / hooks / stores / fonts) is fresh, then generates the reference dataset + pages + report into the docs repo. Add `--skip-build` to reuse the existing `dist/`, `--report-only` for a CI drift check. |
| `mdk-ui docs:build --docs-repo <mdk-docs> --version-label <x.y.z> [--devkit-dir …]` | Lower-level step used by `docs:generate`. Builds the dataset from already-built manifests (does **not** build the monorepo). Use it directly when you manage the build yourself and want to point at explicit `--devkit-dir` / `--adapter-dir` / `--core-dir` / `--fonts-dir` checkouts. |

`docs:generate` is the reusable core a docs site wraps with its own config
resolution and prose sync — see `mdk-docs`'s `npm run docs:generate`. To bring a
new package (e.g. a backend module) into the same pipeline, have it emit a
machine-readable manifest the way the UI packages do; see
[`ui/docs/extending-docs-to-backend.md`](../../docs/extending-docs-to-backend.md).

## Recommended flow (for agents)

```
suggest <intent>
  ├─ adapterHooks / stores hits? ── mdk-ui hooks / mdk-ui stores ──► wire state layer
  │
  ├─ component / blueprint hits?
  │     ├─ blueprint matched ──► mdk-ui blueprint <id>
  │     │                              │
  │     └─ no match ──► mdk-ui find --domain X --capability Y
  │                            │
  │                            ▼
  │                    mdk-ui docs <Component>
  │                    mdk-ui example <Component>
  │                            │
  └──────────────────► mdk-ui add page <Name> --component <Component>
                               │
                               ▼
                       mdk-ui check <file>  ── fix errors ──► done
```

Every command emits JSON by default (machine-readable) and accepts
`--format table` for humans.

All devkit commands accept `--package <name>` to target a non-default package
(defaults to `@tetherto/mdk-react-devkit`). The `hooks` command accepts
`--adapter <name>` (defaults to `@tetherto/mdk-react-adapter`) and the
`stores` command accepts `--core <name>` (defaults to `@tetherto/mdk-ui-foundation`).

## Bootstrapping a new project

```bash
# 1. Install
npm install --save-dev @tetherto/mdk-ui-cli
npm install @tetherto/mdk-react-devkit @tetherto/mdk-react-adapter @tetherto/mdk-ui-foundation

# 2. Initialise agent context + IDE wiring
npx mdk-ui init --ide cursor      # writes .mdk/context.md + .cursor/rules/mdk.mdc
# or
npx mdk-ui init --ide claude      # writes .mdk/context.md + CLAUDE.md

# 3. Discover what's available
npx mdk-ui suggest "mining dashboard with hashrate"
npx mdk-ui hooks --format table
npx mdk-ui stores --format table

# 4. Scaffold pages
npx mdk-ui add page Dashboard --component LineChartCard
npx mdk-ui check src/pages/Dashboard.tsx

# 5. Keep context in sync as the project grows
npx mdk-ui sync
```

## Machine-readable manifests

All manifests are regenerated on every `npm run build` and are importable
via subpath exports:

| Manifest | Subpath import | CLI command |
| --- | --- | --- |
| `dist/registry.json` | `@tetherto/mdk-react-devkit/registry.json` | `mdk-ui registry` |
| `dist/blueprints.json` | `@tetherto/mdk-react-devkit/blueprints.json` | `mdk-ui blueprints` |
| `dist/hooks.json` | `@tetherto/mdk-react-adapter/hooks.json` | `mdk-ui hooks` |
| `dist/stores.json` | `@tetherto/mdk-ui-foundation/stores.json` | `mdk-ui stores` |
| `dist/cli-manifest.json` | `@tetherto/mdk-ui-cli/cli-manifest.json` | `mdk-ui --json-help` |

## V1 gap

The `check` command currently only catches **typecheck** errors. Render-time
validation (mount the file in jsdom, assert it doesn't throw) is a planned V2
extension — see `src/commands/check.ts`.
