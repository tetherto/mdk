# `@tetherto/mdk-ui-cli`

Agent-first command-line interface for the [MDK Devkit](../react-devkit/README.md). The
`mdk-ui` binary exposes the component registry, co-located docs and examples,
React adapter hooks, ui-core stores, and a small set of scaffolding utilities
so AI agents can build pages without parsing the package source.

## Install

The CLI ships alongside `@tetherto/mdk-react-devkit` as a workspace package:

```bash
npm install --save-dev @tetherto/mdk-ui-cli \
  @tetherto/mdk-react-devkit \
  @tetherto/mdk-react-adapter \
  @tetherto/mdk-ui-core
```

Once installed, `npx mdk-ui --help` lists every supported subcommand.

## Commands

### Discovery

| Command | Description |
| --- | --- |
| `mdk-ui registry [--filter components\|hooks\|all] [--tier agent-ready\|advanced\|all] [--format json\|table]` | Print the machine-readable component registry from `@tetherto/mdk-react-devkit`. |
| `mdk-ui find [--capability X] [--domain Y] [--category Z] [--tier T]` | Filter the registry by ORK capability / domain / category / tier. |
| `mdk-ui blueprints` | List curated recipes that map an intent to a starting component set. |
| `mdk-ui blueprint <id>` | Print one blueprint (markdown, ready to feed an LLM). |
| `mdk-ui suggest <free text>` | Keyword-overlap scorer across components, hooks, blueprints, adapter hooks **and** stores. Returns five ranked groups: `components`, `hooks`, `blueprints`, `adapterHooks`, `stores`. |
| `mdk-ui hooks [--category store\|utility\|permission\|ui\|external] [--format json\|table]` | Print the React hooks manifest from `@tetherto/mdk-react-adapter` (`dist/hooks.json`). |
| `mdk-ui stores [--category auth\|devices\|notifications\|timezone\|actions] [--format json\|table]` | Print the Zustand stores + TanStack Query helpers manifest from `@tetherto/mdk-ui-core` (`dist/stores.json`). |
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
`stores` command accepts `--core <name>` (defaults to `@tetherto/mdk-ui-core`).

## Bootstrapping a new project

```bash
# 1. Install
npm install --save-dev @tetherto/mdk-ui-cli
npm install @tetherto/mdk-react-devkit @tetherto/mdk-react-adapter @tetherto/mdk-ui-core

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
| `dist/stores.json` | `@tetherto/mdk-ui-core/stores.json` | `mdk-ui stores` |
| `dist/cli-manifest.json` | `@tetherto/mdk-ui-cli/cli-manifest.json` | `mdk-ui --json-help` |

## V1 gap

The `check` command currently only catches **typecheck** errors. Render-time
validation (mount the file in jsdom, assert it doesn't throw) is a planned V2
extension — see `src/commands/check.ts`.
