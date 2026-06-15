# MDK — Agent guide

MDK (Mining Development Kit) is a UI toolkit for mining dashboards designed
so AI agents can build features from plain-language intents without parsing
the package source.

## Start here

This file is the single front door. Read in order — each step links the
next level of detail:

1. **This file** — the machine-readable manifests, the `mdk-ui` CLI
   cheatsheet, and the load-bearing layering rule (all below).
2. **Architecture tour** — [`docs/AGENT_FIRST.md`](docs/AGENT_FIRST.md).
   How the agent-first system fits together; read first if you're new.
3. **Package layout & dependency flow** —
   [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): the package picture plus
   the exhaustive per-package surface map.
4. **Export contract** — [`packages/react-devkit/AGENT_READY.md`](packages/react-devkit/AGENT_READY.md).
   Every public export must satisfy this: tier system, required JSDoc tags,
   paste-ready templates, and the full error catalogue.
5. **CLI reference (consumer apps)** — [`packages/cli/README.md`](packages/cli/README.md).
   Every `mdk-ui` subcommand. Agents in downstream projects should use these
   commands rather than scanning the source.
6. **Run the shell template end-to-end** —
   [`docs/AGENT_FIRST.md#run-the-mdk-ui-shell-template-end-to-end`](docs/AGENT_FIRST.md#run-the-mdk-ui-shell-template-end-to-end).
   The `miningos-app-node` backend, Google OAuth setup, the Vite proxy, and
   common first-run errors. Read before suggesting `npm run dev` on a scaffold.

## Machine-readable artifacts

Every package ships a flat JSON manifest under `dist/` that agents can
load with a single `require()` / `fetch()`. The `mdk-ui` CLI is the
recommended access path, but the files are also reachable via subpath
exports for use in scripts.

| Package                       | Artifact                | Subpath import                                | CLI command           | What it describes                                                  |
| ----------------------------- | ----------------------- | --------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `@tetherto/mdk-react-devkit`  | `dist/registry.json`    | `@tetherto/mdk-react-devkit/registry.json`    | `mdk-ui registry`     | Every public component + hook with props, JSDoc, tier, indexes.    |
| `@tetherto/mdk-react-devkit`  | `dist/blueprints.json`  | `@tetherto/mdk-react-devkit/blueprints.json`  | `mdk-ui blueprints`   | Intent → recipe map (markdown body included).                      |
| `@tetherto/mdk-react-adapter` | `dist/hooks.json`       | `@tetherto/mdk-react-adapter/hooks.json`      | `mdk-ui hooks`        | React hooks (store / utility / permission / ui / external) + provider. |
| `@tetherto/mdk-ui-core`       | `dist/stores.json`      | `@tetherto/mdk-ui-core/stores.json`           | `mdk-ui stores`       | Zustand stores (state + actions) and TanStack Query helpers.       |
| `@tetherto/mdk-ui-cli`        | `dist/cli-manifest.json`| `@tetherto/mdk-ui-cli/cli-manifest.json`      | `mdk-ui --json-help`  | The CLI's own command surface (args, options, subcommands).        |

All manifests are regenerated on every `npm run build` and are checked
into the published package, so a fresh `npx mdk-ui <cmd>` always reads a
manifest that matches the installed version.

### CLI cheatsheet

```bash
# Components
npx mdk-ui registry --tier agent-ready          # curated agent surface (default)
npx mdk-ui find --capability hashrate-monitoring --domain mining-operations
npx mdk-ui docs <ComponentName>                  # USAGE.md
npx mdk-ui example <ComponentName>               # *.example.tsx

# Hooks (react-adapter)
npx mdk-ui hooks                                 # full manifest
npx mdk-ui hooks --category store --format table # filter + pretty-print

# Stores + query helpers (ui-core)
npx mdk-ui stores
npx mdk-ui stores --category devices --format table

# CLI self-description
npx mdk-ui --json-help                           # dumps dist/cli-manifest.json
```

## Separation of concerns — load-bearing rule

Before generating any component or page, internalise the layering so
new code lands in the right package:

- **Components render data; nothing else.** No `useQuery`, no `fetch`,
  no unit conversions, no `useMemo` that shapes telemetry.
- **Hooks (in `@tetherto/mdk-react-adapter`)** own the data → render
  shape transformation. They fetch, convert units, format, and return
  ready-to-render payloads (e.g. `ChartCardData`).
- **State and API contracts live in `@tetherto/mdk-ui-core`.** Query
  factories, query-param builders, Zustand stores, types. Adapter and
  devkit consume them; nothing reimplements them.
- **Pages are thin glue** — read hooks, pass output to components.

If you spot a component calling `useQuery` directly, a page building
`LineChartCardData` inline, or a tag/aggregate-field string
(`t-miner`, `site_power_w`, `power_w_sum_aggr`) outside the data
layer, **stop and refactor** — or, if you can't fix it in the current
change, file a GitHub issue labelled `techdebt` (the file + why it
violates), per [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md#tracking-tech-debt).

The full red-flags list, the retired `ConsumptionLineChart` /
`HashRateLineChart` anti-examples, and the canonical `<LineChartCard>` +
adapter-hook pattern (`useHashrateChartData`, `useSiteConsumptionChartData`)
live in [`CLAUDE.md`](CLAUDE.md#separation-of-concerns-load-bearing-rule) —
the single source for this rule.

## Quick recipe (for agents in downstream apps)

```bash
# 0. Bootstrap a new app (skip if you already have one)
npx mdk-ui create my-app                         # full Vite+React+MDK scaffold
npx mdk-ui create --list-templates               # see available templates

# 1. Local navigation: intent → recipe → component
npx mdk-ui suggest "<user goal>"
npx mdk-ui blueprints
npx mdk-ui blueprint <id>
npx mdk-ui find --domain <X> --capability <Y>

# 2. Read each component's contract before generating code
npx mdk-ui docs <ComponentName>
npx mdk-ui example <ComponentName>

# 3. Scaffold + verify
npx mdk-ui add feature <blueprintId>             # full-feature page from a blueprint
npx mdk-ui add page <Name> [--component <Comp>]  # single-component page (auto-resolves)
npx mdk-ui remove page <Name>                    # delete a scaffolded page + its route
npx mdk-ui check src/pages/<Name>.tsx
```

## Quick recipe (for contributors)

```bash
# Run the contract gate locally before pushing
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit

# Full pre-push sweep
npm run fullcheck
```

If `check:agent-ready` reports a NEW violation, the error message names the
file, the rule, and the one-line fix. The full catalogue lives in
[`packages/react-devkit/AGENT_READY.md`](packages/react-devkit/AGENT_READY.md).
