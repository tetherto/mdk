# MDK UI architecture

**Audience**: Engineering team

How the repo is laid out and why: what MDK is, the toolkit packages and how
they depend on each other, the monorepo directory layout, the per-package
surface map, and how build / state / styling / testing fit together. For
machine-readable manifests and the `mdk-ui` CLI, see [`AGENTS.md`](../AGENTS.md).
For contributor workflow and tiers, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## What MDK UI is

MDK (Mining Development Kit) provides a reusable UI toolkit for building mining
dashboard applications. This monorepo is its frontend implementation — a
set of npm workspace packages that consuming applications depend on.

## Three-package toolkit

The UI toolkit is split along a **framework-first** axis: a framework-agnostic
headless core, a per-framework adapter, and a per-framework UI library on
top. A separate `@tetherto/mdk-ui-cli` provides agent-first tooling, and
`@tetherto/mdk-fonts` ships font assets independently.

### `@tetherto/mdk-ui-core` — framework-agnostic core

Pure TypeScript, no React:

- Zustand vanilla stores: `authStore`, `devicesStore`, `notificationStore`,
  `timezoneStore`, `actionsStore`. Each store ships a singleton **and** a
  factory function for testing.
- `createMdkQueryClient` factory that returns a configured
  `@tanstack/query-core` `QueryClient`.
- Telemetry primitives (subscription manager, stale detection helpers,
  ring buffer).
- Command lifecycle state machine.
- Shared types.

### `@tetherto/mdk-react-adapter` — React bindings

- `<MdkProvider>` — wraps `QueryClientProvider` from
  `@tanstack/react-query` and exposes the resolved API base URL via
  React context.
- One React hook per core store (`useAuth`, `useDevices`, …) built on
  `useStore(<vanillaStore>)` from `zustand`.
- Pass-through re-exports of `useQuery`, `useMutation`, `useQueryClient`.
- Designed so adding a future React Native or Web Components adapter is a
  matter of writing a sibling package — no changes to the core.

### `@tetherto/mdk-react-devkit` — React UI library

- `src/core/` — ~60 generic UI primitives built on Radix UI: Button,
  Dialog, Switch, Select, Data Table, Charts, …
- `src/foundation/` — mining-domain components, custom hooks, a TanStack
  Query API stub (real endpoints live in the consuming applications).

## Dependency graph

The app runtime chain is **headless → React adapter → React devkit → catalog
(or your app)**. The CLI sits beside that chain for tooling and agents.

```
                                     ┌────────────────────────────┐
                                     │ @tetherto/mdk-ui-core      │
                                     │ • Zustand vanilla stores   │
                                     │ • QueryClient factory      │
                                     │ • dist/stores.json         │
                                     └─────────────┬──────────────┘
                                                   │
                          ┌────────────────────────┴──────────────────────────┐
                          │                                                   │
        ┌─────────────────▼───────────────┐         (future non-React adapters)
        │ @tetherto/mdk-react-adapter     │
        │ • <MdkProvider>                 │
        │ • Store hooks                   │
        │ • dist/hooks.json               │
        └─────────────────┬───────────────┘
                          │
        ┌─────────────────▼───────────────────────────────┐
        │ @tetherto/mdk-react-devkit                      │
        │ • src/core + src/foundation                     │
        │ • dist/registry.json + blueprints.json          │
        └─────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────▼────────────┐    ┌────────────────────────┐
        │ @tetherto/mdk-catalog-ui        │    │ @tetherto/mdk-fonts    │
        │ (apps/catalog)                  │    └────────────────────────┘
        └──────────────────────────────┘

        ┌──────────────────────────────┐
        │ @tetherto/mdk-ui-cli (mdk-ui)│  reads manifests from the three
        │ devDependency at build time  │  TS packages above; not in the
        └──────────────────────────────┘  runtime app dependency chain
```

## Directory layout

```
mdk-ui/
├── AGENTS.md             # Agent entry: manifests, mdk-ui CLI, quick recipes
├── CLAUDE.md             # Claude Code guidance for this repo
├── packages/
│   ├── ui-core/          # @tetherto/mdk-ui-core        — headless state + telemetry
│   ├── react-adapter/    # @tetherto/mdk-react-adapter  — React bindings for the core
│   ├── react-devkit/     # @tetherto/mdk-react-devkit   — React UI (core + foundation)
│   ├── cli/              # @tetherto/mdk-ui-cli           — mdk-ui binary (agent-first)
│   └── fonts/            # @tetherto/mdk-fonts            — JetBrains Mono assets
├── apps/
│   └── catalog/          # @tetherto/mdk-catalog-ui          — Vite/React showcase
├── docs/                 # Architecture, agent-first, build, styling, contributing
└── scripts/              # Bundle-size and other repo helpers
```

**Tooling:**

- **npm workspaces** with centralized root `overrides` for security and version governance
- **Turborepo** for task orchestration and caching
- **TypeScript** strict mode across all packages; shared `tsconfig.base.json`
- **ESLint** flat config via `@antfu/eslint-config`

## Packages

### `@tetherto/mdk-ui-core`

**Purpose:** Framework-agnostic headless package. Plain TypeScript, no React.

**Location:** `packages/ui-core`

**Surface:**

- Zustand vanilla stores (`createStore` from `zustand/vanilla`):
  `authStore`, `devicesStore`, `notificationStore`, `timezoneStore`,
  `actionsStore`, each exposing both the singleton and a `createXStore`
  factory for testing
- TanStack `QueryClient` factory: `createMdkQueryClient`
- Telemetry primitives: subscription manager, stale-detection helpers,
  ring buffer
- Command lifecycle state machine
- Shared types and utility helpers

**Agent manifest:** `dist/stores.json` (subpath `@tetherto/mdk-ui-core/stores.json`).
Regenerated by `npm run build:stores` during `build`.

**Build:** `tsc -p tsconfig.build.json` → `dist/` (ESM + `.d.ts`).

**Usage:**

```ts
import { actionsStore, createMdkQueryClient } from "@tetherto/mdk-ui-core";

const client = createMdkQueryClient({ apiBaseUrl: "/api" });
actionsStore.getState().setAddPendingSubmissionAction({ action: "noop" });
```

### `@tetherto/mdk-react-adapter`

**Purpose:** React bindings for `@tetherto/mdk-ui-core`.

**Location:** `packages/react-adapter`

**Surface:**

- `<MdkProvider>` — wraps `QueryClientProvider` and supplies API
  base-URL context. Required at the app root for the devkit to work
- Store hooks (one per core store): `useAuth`, `useDevices`,
  `useNotifications`, `useTimezone`, `useActions`. Implemented via
  `useStore(<store>)` from `zustand`
- Re-exports of `useQuery`, `useMutation`, `useQueryClient` from
  `@tanstack/react-query`
- Subpath `./hooks` for hook modules; `./provider` for `MdkProvider`

**Agent manifest:** `dist/hooks.json` (subpath
`@tetherto/mdk-react-adapter/hooks.json`). Regenerated by
`npm run build:hooks` during `build`.

**Build:** `tsc -p tsconfig.build.json` emits a `dist/` (ESM + `.d.ts`).
The package `exports` map resolves to `dist/`, so external NPM consumers
import the pre-built declarations and runtime JS directly.

**Usage:**

```tsx
import { MdkProvider, useAuth, useDevices } from "@tetherto/mdk-react-adapter";
```

### `@tetherto/mdk-react-devkit`

**Purpose:** React UI library that powers MDK-based applications.

**Location:** `packages/react-devkit`

**Internal layout:**

- `src/core/` — generic UI primitives built on Radix UI (Button, Dialog,
  Switch, Table, Charts, …). BEM class names, SCSS design tokens, CSS
  custom property theming. Many folders ship co-located `USAGE.md` and
  `*.example.tsx` for `agent-ready` exports
- `src/foundation/` — mining-domain layer:
  - `components/` — domain components (`./domain` subpath)
  - `features/` — full-page compositions (`./feature` subpath)
  - `hooks/`, `api/` (placeholder), `utils/`, `types/`, … — reached via
    `./foundation` or the top-level barrel (no separate `./hooks` / `./api`
    export subpaths today)
- `blueprints/` — curated intent → component recipes (source for
  `dist/blueprints.json`)
- `scripts/` — `generate-registry.mts`, `check-agent-ready.mjs`,
  `agent-ready-baseline.json`
- [`AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md) — strict
  export contract (tiers, JSDoc, `USAGE.md`, examples)

**Exports (subpath):**

| Subpath | Resolves to |
| --- | --- |
| `.` | Top-level barrel |
| `./core` | Core primitives |
| `./foundation` | Foundation barrel (components, features, hooks, api, …) |
| `./domain` | `dist/foundation/components` |
| `./feature` | `dist/foundation/features` |
| `./registry.json` | Machine-readable component + hook registry |
| `./blueprints.json` | Machine-readable blueprint index |
| `./styles.css` | Compiled stylesheet (Vite) |
| `./styles` | `src/core/styles/_mixins.scss` |
| `./tokens.scss` | `src/core/styles/_colors.scss` |

**Agent manifests:** `dist/registry.json`, `dist/blueprints.json`.
Built by `npm run build:registry` (part of `build`). Validated by
`npm run check:agent-ready`.

**Usage:**

```tsx
import { Button, Dialog } from "@tetherto/mdk-react-devkit/core";
import { useNotification } from "@tetherto/mdk-react-devkit/foundation";
import "@tetherto/mdk-react-devkit/styles.css";
```

### `@tetherto/mdk-ui-cli`

**Purpose:** Agent-first CLI for registry discovery, co-located docs/examples,
page scaffolding, and targeted typecheck. Binary: `mdk-ui`.

**Location:** `packages/cli`

**Surface:**

- Commander-based `mdk-ui` commands (`registry`, `find`, `docs`, `example`,
  `suggest`, `blueprints`, `hooks`, `stores`, `add page`, `check`, `init`,
  `sync`, …). See [`packages/cli/README.md`](../packages/cli/README.md).
- Reads installed workspace packages' `dist/*.json` manifests (does not
  parse TypeScript source)
- `dist/cli-manifest.json` (subpath `@tetherto/mdk-ui-cli/cli-manifest.json`)
  describes the CLI's own command surface (`mdk-ui --json-help`)

**Build:** `tsc` → `dist/`, copy templates, emit `cli-manifest.json`.

**Usage:** `npx mdk-ui --help` from a consumer project with devkit, adapter,
and core installed. Repo contributors run it via the workspace after
`npm run build`.

### `@tetherto/mdk-fonts`

**Purpose:** Font assets for the toolkit.

**Location:** `packages/fonts`

**Exports:** JetBrains Mono `@font-face` declarations and files.

**Usage:**

```tsx
import "@tetherto/mdk-fonts/jetbrains-mono.css";
```

## Build strategy

| Package | TS output (consumed) | CSS / JSON artifacts |
| --- | --- | --- |
| `@tetherto/mdk-ui-core` | pre-built `dist/` ESM + `.d.ts` | `dist/stores.json` |
| `@tetherto/mdk-react-adapter` | pre-built `dist/` ESM + `.d.ts` | `dist/hooks.json` |
| `@tetherto/mdk-react-devkit` | pre-built `dist/` ESM + `.d.ts` | `dist/styles.css`, `dist/registry.json`, `dist/blueprints.json` |
| `@tetherto/mdk-ui-cli` | pre-built `dist/` + `mdk-ui` bin | `dist/cli-manifest.json` |
| `@tetherto/mdk-fonts` | n/a | `dist/jetbrains-mono.css` + woff2 |

Every TypeScript library package is **pre-built** — consumers import `dist/`
via `exports`, not source. Tasks run through Turborepo for ordering and
caching (`npm run <task>` is forwarded to `turbo`). For the full build
pipeline, post-process steps, the CSS layer-wrap plugin, granular scripts,
and the Turborepo task DAG, see [`BUILD.md`](BUILD.md).

## State management

State lives in `@tetherto/mdk-ui-core` as Zustand vanilla stores. React
components consume them via `useAuth` / `useDevices` / `useNotifications` /
`useTimezone` / `useActions` from `@tetherto/mdk-react-adapter`; non-React
code reads or writes the same singletons via `store.getState()` /
`store.setState()`. Redux, react-redux, and any alternative state library are
**not** used — see the no-Redux rule in [`CLAUDE.md`](../CLAUDE.md#state-management).
The API layer is currently a placeholder in
`packages/react-devkit/src/foundation/api/`; future hooks use TanStack Query
against `createMdkQueryClient()`, with `<MdkProvider>` supplying the client
and base URL.

## Separation of concerns

The toolkit is layered so the three concerns — data (`ui-core`), glue
(`react-adapter` hooks), and presentation (`react-devkit` components) — each
live in exactly one place; pages are thin assembly. This is a load-bearing
rule with red-flag patterns and a techdebt list; the canonical statement
lives in [`CLAUDE.md`](../CLAUDE.md#separation-of-concerns-load-bearing-rule).

## Styling

SCSS source compiled by Vite. Public design tokens (CSS custom properties)
live in `packages/react-devkit/src/core/styles/_colors.scss`, re-exported as
`@tetherto/mdk-react-devkit/tokens.scss`; mixins are re-exported as
`@tetherto/mdk-react-devkit/styles`. The compiled stylesheet declares
`@layer base, mdk, app;`, so consumer styles win against devkit component
styles without specificity hacks. For BEM/CVA conventions, the cascade-layer
model, and the theming guide, see [`STYLING.md`](STYLING.md).

## Technology stack

| Concern        | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| UI primitives  | Radix UI                                                     |
| Styling        | SCSS + cascade layers; no CSS-in-JS, no Tailwind             |
| Forms          | React Hook Form + Zod                                        |
| State          | Zustand vanilla (core) + Zustand React bindings (adapter)    |
| Data fetching  | TanStack Query (`query-core` in headless, `react-query` in adapter) |
| Charts         | Chart.js, lightweight-charts                                 |
| Table          | TanStack Table                                               |
| Testing        | Vitest + React Testing Library                               |
| Build          | Vite + `tsc`                                                 |
| Monorepo       | Turborepo + npm workspaces                                   |

## Testing

- Vitest + React Testing Library + happy-dom/jsdom across all packages.
- `@tetherto/mdk-react-devkit` runs three Vitest projects — `node` (pure
  logic), `core-dom` (core components, light DOM mocks), and
  `foundation-dom` (foundation, heavier React/DOM mocks) — so foundation's
  mocking setup does not pollute the lighter core/node tests.
  `@tetherto/mdk-ui-core` and `@tetherto/mdk-react-adapter` each run a single
  project.
- Tests interact directly with the real Zustand singletons via `getState()`
  and `vi.spyOn`; there is no `Provider` to mock and no `configureStore`.
- Coverage thresholds are 80% per package today, raised as packages mature.

For test layout, utilities, and the full coverage policy, see
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## CI pipeline

Five GitHub Actions jobs: `security` → parallel (`quality`, `test`,
`build`) → `summary`.

- **security**: `npm audit`.
- **quality**: lint + typecheck + format check across all workspaces.
- **test**: Vitest with coverage across all workspaces (current
  thresholds: 80% per package).
- **build**: full `turbo build`, including the CSS layer-wrap plugin.

Root `npm run fullcheck` runs build, lint, typecheck, format,
`check:agent-ready` on the devkit, and coverage before push.
