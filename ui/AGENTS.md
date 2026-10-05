# MDK — agent guide

MDK (Mining Development Kit) is a UI toolkit for mining dashboards designed
so AI agents can build features from plain-language intents without parsing
the package source.

## Start here

This file is the single front door. Read in order — each step links the
next level of detail:

1. **This file** — the machine-readable manifests, how to read them, and
   the load-bearing layering rule (all below).
2. **Architecture tour** — [`docs/AGENT_FIRST.md`](docs/AGENT_FIRST.md).
   How the agent-first system fits together; read first if you're new.
3. **Package layout & dependency flow** —
   [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): the package picture plus
   the exhaustive per-package surface map.
4. **Export contract** — [`packages/react-devkit/AGENT_READY.md`](packages/react-devkit/AGENT_READY.md).
   Every public export must satisfy this: tier system, required JSDoc tags,
   paste-ready templates, and the full error catalogue.
5. **Operator agent chat** —
   [`packages/ui-agent/README.md`](packages/ui-agent/README.md). `<CoPilot />`
   is a one-line drop-in, but it needs a gateway carrying the agent plugin and
   an MCP tool server behind it; the README walks the whole chain.
6. **Run the shell template end-to-end** —
   [`docs/AGENT_FIRST.md#run-the-mdk-ui-shell-template-end-to-end`](docs/AGENT_FIRST.md#run-the-mdk-ui-shell-template-end-to-end).
   The in-repo `@tetherto/mdk-gateway` backend, Google OAuth setup, the Vite proxy, and
   common first-run errors. Read before suggesting `npm run dev` on a scaffold.

## Machine-readable artifacts

Every package ships a flat JSON manifest under `dist/` that agents can
load with a single `require()` / `fetch()`. They are reachable via subpath
exports, so no tooling sits between you and the data.

| Package                       | Artifact                | Subpath import                                | What it describes                                                  |
| ----------------------------- | ----------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `@tetherto/mdk-react-devkit`  | `dist/registry.json`    | `@tetherto/mdk-react-devkit/registry.json`    | Every public component + hook with props, JSDoc, tier, indexes.    |
| `@tetherto/mdk-react-devkit`  | `dist/blueprints.json`  | `@tetherto/mdk-react-devkit/blueprints.json`  | Intent → recipe map (Markdown body included).                      |
| `@tetherto/mdk-react-adapter` | `dist/hooks.json`       | `@tetherto/mdk-react-adapter/hooks.json`      | React hooks (store / utility / permission / ui / external) + provider. |
| `@tetherto/mdk-ui-foundation` | `dist/stores.json`      | `@tetherto/mdk-ui-foundation/stores.json`     | Zustand stores (state + actions) and TanStack Query helpers.       |

All manifests are regenerated on every `npm run build` and are checked
into the published package, so they always match the installed version.

### Reading the manifests

```js
// Every public component + hook, with props, tier, and name indexes.
import registry from '@tetherto/mdk-react-devkit/registry.json' with { type: 'json' }

// The curated agent surface — start here.
const agentReady = registry.components.filter((c) => c.tier === 'agent-ready')

// Faceted lookup: `indexes` holds name → component-name lists for every
// facet (`componentsByDomain`, `componentsByKernelCapability`,
// `componentsByCategory`, `componentsByTier`), so intersect the ones the
// intent gives you. Entries also carry the raw `domainContext`,
// `kernelCapabilities`, `category`, and `tier` fields.
const { componentsByDomain: byDomain, componentsByKernelCapability: byCap } = registry.indexes
const hashrate = (byDomain['mining-operations'] ?? []).filter((n) =>
  (byCap['hashrate-monitoring'] ?? []).includes(n),
)

// Each entry points at its own prose + runnable example, relative to the
// package root — read them before generating code against the component.
const entry = registry.components[registry.indexes.componentsByName.LineChartCard]
entry.usageDoc   // → 'src/domain/components/.../USAGE.md'
entry.examples   // → ['src/domain/components/.../line-chart-card.example.tsx']
```

`blueprints.json` (intent → recipe), `hooks.json` (adapter hooks), and
`stores.json` (`{ stores, queryHelpers, utilities }`) read the same way.

## Separation of concerns — load-bearing rule

Before generating any component or page, internalise the layering so
new code lands in the right package:

- **Components render data; nothing else.** No `useQuery`, no `fetch`,
  no unit conversions, no `useMemo` that shapes telemetry.
- **Hooks (in `@tetherto/mdk-react-adapter`)** own the data → render
  shape transformation. They fetch, convert units, format, and return
  ready-to-render payloads (e.g. `ChartCardData`).
- **State and API contracts live in `@tetherto/mdk-ui-foundation`.** Query
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

0. **Bootstrap an app** (skip if you already have one) — copy
   [`examples/mdk-ui-shell-template/`](../examples/mdk-ui-shell-template/README.md),
   or run [`mdk create dashboard`](../packages/cli/README.md) to get the same
   template alongside a running backend stack.
1. **Intent → recipe** — scan `blueprints.json` for a blueprint whose
   `intent` matches the user's goal; its Markdown `body` is the recipe.
2. **Recipe → component** — intersect `registry.json`'s `indexes`
   (`componentsByDomain`, `componentsByKernelCapability`,
   `componentsByCategory`, `componentsByTier`) to find the component.
3. **Read the contract before generating** — every registry entry points at
   its `usageDoc` (`USAGE.md`) and `examples` (`*.example.tsx`). Read both;
   copy prop names and types verbatim from the entry's `props`.
4. **Add the page** — write `src/pages/<Name>.tsx`, append a one-line entry
   to `src/routes.ts` above `// mdk:routes-end`, and add its nav icon in
   `src/constants/navigation.tsx` above `// mdk:nav-end`.
5. **Verify** — `npx tsc --noEmit` and `npx eslint src/pages/<Name>.tsx`.

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

This runs as a blocking gate in root CI too — the **🤖 Agent-readiness
contract (UI)** job in the repo's `.github/workflows/ci.yml` — so a new
violation fails the pull request, not just the local run. A companion **🔒
USAGE baseline monotonicity** job blocks any growth of
`usage-proptable-baseline.json`.
