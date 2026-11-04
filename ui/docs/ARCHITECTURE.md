# MDK UI architecture

**Audience**: Engineering team

How the repo is laid out and why: what MDK is, the toolkit packages, and how
they depend on each other, the monorepo directory layout, the per-package
surface map, and how build / state / styling / testing fit together. For
machine-readable manifests, see [`AGENTS.md`](../AGENTS.md).
For contributor workflow and tiers, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## What MDK UI is

MDK (Mining Development Kit) provides a reusable UI toolkit for building mining
dashboard applications. This monorepo is its frontend implementation — a
set of npm workspace packages that consuming applications depend on.

## Three-package toolkit

The UI toolkit is split along a **framework-first** axis: a framework-agnostic
headless core, a per-framework adapter, and a per-framework UI library on
top.

### `@tetherto/mdk-ui-foundation` — framework-agnostic core

Pure TypeScript, no React:

- Zustand vanilla stores: `authStore`, `devicesStore`, `notificationStore`,
  `timezoneStore`. Each store ships a singleton **and** a
  factory function for testing.
- `createMdkQueryClient` factory that returns a configured
  `@tanstack/query-core` `QueryClient`.
- Shared types.

### `@tetherto/mdk-react-adapter` — React bindings

- `<MdkProvider>` — wraps `QueryClientProvider` from
  `@tanstack/react-query` and exposes the resolved API base URL and
  `AuthProvider`-based auth context via React context. Full seam details in
  the `@tetherto/mdk-react-adapter` package entry in `## Packages`.
- One React hook per core store (`useAuth`, `useDevices`, …) built on
  `useStore(<vanillaStore>)` from `zustand`.
- Utility hooks (permissions, token lifecycle, timezone formatting,
  pagination, local storage, …) and the installed-app hooks. No data
  hooks for specific endpoints: apps read their own Gateway routes with
  `useQuery` — see [Reading your own data](../packages/react-adapter/README.md#reading-your-own-data).
- Pass-through re-exports of `useQuery`, `useMutation`, `useQueryClient`.
- Designed so adding a future React Native or Web Components adapter is a
  matter of writing a sibling package — no changes to the core.

### `@tetherto/mdk-react-devkit` — React UI library

- [`src/primitives/`](../packages/react-devkit/src/primitives/) — 69 generic UI primitives built on Radix UI: Button,
  Dialog, Switch, Select, Data Table, Charts, …
- [`src/domain/`](../packages/react-devkit/src/domain/) — mining-domain components, all props-driven: the
  consuming application fetches the data and passes it in.

## Dependency graph

The app runtime chain is **headless → React adapter → React devkit → catalog
(or your app)**. The CLI sits beside that chain for tooling and agents.

```
                                     ┌────────────────────────────┐
                                     │ @tetherto/mdk-ui-foundation      │
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
        │ • src/primitives + src/domain                     │
        │ • dist/registry.json                            │
        └─────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────▼────────────┐
        │ @tetherto/mdk-catalog-ui        │
        │ (apps/catalog)                  │
        └──────────────────────────────┘
```

## Directory layout

```
mdk-ui/
├── AGENTS.md             # Agent entry: manifests, how to read them, quick recipes
├── CLAUDE.md             # Claude Code guidance for this repo
├── packages/
│   ├── ui-foundation/          # @tetherto/mdk-ui-foundation        — headless state + telemetry
│   ├── react-adapter/    # @tetherto/mdk-react-adapter  — React bindings for the core
│   ├── react-devkit/     # @tetherto/mdk-react-devkit   — React UI (primitives + domain)
├── apps/
│   └── catalog/          # @tetherto/mdk-catalog-ui          — Vite/React showcase
├── api-surface/          # Committed export-shape baselines (check:api-surface)
├── docs/                 # Architecture, agent-first, build, styling, contributing
└── scripts/              # Bundle-size, API-surface and other repo helpers
```

**Tooling**:

- **npm workspaces** with centralized root `overrides` for security and version governance
- **Turborepo** for task orchestration and caching
- **TypeScript** strict mode across all packages; shared [`tsconfig.base.json`](../tsconfig.base.json)
- **oxlint** for linting, configured in [`.oxlintrc.json`](../.oxlintrc.json)

## Packages

### `@tetherto/mdk-ui-foundation`

**Purpose**: Framework-agnostic headless package. Plain TypeScript, no React.

**Location**: [`packages/ui-foundation`](../packages/ui-foundation/README.md)

**Surface**:

- Zustand vanilla stores (`createStore` from `zustand/vanilla`):
  `authStore`, `devicesStore`, `notificationStore`, `timezoneStore`,
  each exposing both the singleton and a `createXStore`
  factory for testing
- TanStack `QueryClient` factory: `createMdkQueryClient`
- The client's base URL and auth-aware fetcher (`getApiBaseUrl`, `getFetcher`)
- Auth providers: `noAuth`, `bearerTokenAuth`, `passwordAuth`, `gatewayRedirectAuth`
- Device type / tag helpers ([`device-tags.ts`](../packages/ui-foundation/src/utils/device-tags.ts)):
  `isMiner`, `isContainer`, brand predicates, `appendIdToTag(s)`
- Shared API types: telemetry rows, layouts, auth, `MdkFetchError`

**Agent manifest**: `dist/stores.json` (subpath `@tetherto/mdk-ui-foundation/stores.json`).
Regenerated by `npm run build:stores` during `build`.

**Build**: `tsc -p tsconfig.build.json` → `dist/` (ESM + `.d.ts`).

**Usage**:

```ts
import { createMdkQueryClient, devicesStore } from "@tetherto/mdk-ui-foundation";

const client = createMdkQueryClient({ apiBaseUrl: "/api" });
devicesStore.getState().setSelectedDevices([]);
```

### `@tetherto/mdk-react-adapter`

**Purpose**: React bindings for `@tetherto/mdk-ui-foundation`.

**Location**: [`packages/react-adapter`](../packages/react-adapter/README.md)

**Surface**:

- `<MdkProvider>` — wraps `QueryClientProvider` and supplies API
  base-URL and auth context. Required at the app root for the devkit to work.
  Its `auth` prop takes an `AuthProvider` (from `@tetherto/mdk-ui-foundation`)
  — `passwordAuth({ baseUrl })` for a dashboard on an MDK stack, `bearerTokenAuth()`
  (the default `createMdkQueryClient` applies when used without a provider) or
  `noAuth()` for fixture-backed demos, since every app route on a real stack answers
  `401`, and `gatewayRedirectAuth()`
  for the bundled Gateway's OAuth-redirect flow, which
  is `MdkProvider`'s own default. The seam itself is complete, but
  `gatewayRedirectAuth()`'s sign-in redirect needs an OAuth endpoint the
  Gateway does not ship — see
  [`@tetherto/mdk-react-adapter`'s Authentication section](../packages/react-adapter/README.md#authentication)
- Store hooks (one per core store): `useAuth`, `useDevices`,
  `useNotifications`, `useTimezone`. Implemented via
  `useStore(<store>)` from `zustand`
- Utility hooks: permissions (`useHasPerms`, `useCheckPerm`,
  `useIsFeatureEditingEnabled`), token lifecycle (`useAuthToken`,
  `useTokenPolling`), `useTimezoneFormatter`, and UI helpers
  (`usePagination`, `useLocalStorage`, `useKeyDown`, …)
- Installed-app hooks: `useInstalledApps`, `useInstalledAppUis`, `useInstalledAppPanels`
- Re-exports of `useQuery`, `useMutation`, `useQueryClient` from
  `@tanstack/react-query`
- Subpath `./hooks` for hook modules; `./provider` for `MdkProvider`

**Agent manifest**: `dist/hooks.json` (subpath
`@tetherto/mdk-react-adapter/hooks.json`). Regenerated by
`npm run build:hooks` during `build`.

**Build**: `tsc -p tsconfig.build.json` emits a `dist/` (ESM + `.d.ts`).
The package `exports` map resolves to `dist/`, so external npm consumers
import the pre-built declarations and runtime JS directly.

**Usage**:

```tsx
import { MdkProvider, useAuth, useDevices } from "@tetherto/mdk-react-adapter";
```

### `@tetherto/mdk-react-devkit`

**Purpose**: React UI library that powers MDK-based applications.

**Location**: [`packages/react-devkit`](../packages/react-devkit/README.md)

**Internal layout**:

- [`src/primitives/`](../packages/react-devkit/src/primitives/): generic UI primitives built on Radix UI (Button, Dialog,
  Switch, Table, Charts, …). BEM class names, SCSS design tokens, CSS
  custom property theming. Many folders ship co-located `USAGE.md` and
  `*.example.tsx` for `agent-ready` exports
- [`src/domain/`](../packages/react-devkit/src/domain/): mining-domain layer:
  - [`components/`](../packages/react-devkit/src/domain/components/index.ts): domain components
  - [`constants/`](../packages/react-devkit/src/domain/constants/index.ts), [`types/`](../packages/react-devkit/src/domain/types/index.ts), [`utils/`](../packages/react-devkit/src/domain/utils/), `styles/` — all reached via
    the `./domain` barrel or the top-level barrel (no separate `./components`
    export subpath)
- [`scripts/`](../packages/react-devkit/scripts/): [`generate-registry.mts`](../packages/react-devkit/scripts/generate-registry.mts), [`check-agent-ready.mjs`](../packages/react-devkit/scripts/check-agent-ready.mjs),
  [`agent-ready-baseline.json`](../packages/react-devkit/scripts/agent-ready-baseline.json)
- [`AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md): strict
  export contract (tiers, JSDoc, `USAGE.md`, examples)

**Exports (subpath)**:

| Subpath | Resolves to |
| --- | --- |
| `.` | Top-level barrel |
| `./primitives` | Generic primitives |
| `./domain` | Mining-domain barrel (components, constants, types, utils) |
| `./registry.json` | Machine-readable component + hook registry |
| `./styles.css` | Compiled stylesheet (Vite) |
| `./styles` | [`src/primitives/styles/_mixins.scss`](../packages/react-devkit/src/primitives/styles/_mixins.scss) |
| [`./tokens.scss`](../packages/react-devkit/src/primitives/components/dropdown-menu/tokens.scss) | [`src/primitives/styles/_colors.scss`](../packages/react-devkit/src/primitives/styles/_colors.scss) |

**Agent manifest**: `dist/registry.json`.
Built by `npm run build:registry` (part of `build`). Validated by
`npm run check:agent-ready`.

**Usage**:

```tsx
import { Button, Dialog } from "@tetherto/mdk-react-devkit/primitives";
import { useNotification } from "@tetherto/mdk-react-devkit/domain";
import "@tetherto/mdk-react-devkit/styles.css";
import "@tetherto/mdk-react-devkit/styles-domain.css"; // only if using domain (mining-domain) components
```

### `@tetherto/mdk-ui-agent`

**Purpose**: The operator agent chat, as one drop-in for any MDK shell. Renders
the agent app's six-event SSE contract as a conversation, including
tool activity and the approval gate on writes.

**Location**: `packages/ui-agent`

**Surface**:

- `<CoPilot />` — the docked overlay (launcher + panel), mounted once at the app
  root. Props are all optional; it reads the API base URL and the auth token
  from `MdkProvider` when there is one.
- `ChatUIEntry` (subpath `./chat-page`) — the same conversation as a
  full-height route page, for shells that want it in the router instead.
- `./core` — the headless half: the event union, the SSE reader, the turn
  reducer and the conversation store. No React; it does touch `localStorage`,
  `fetch` and `crypto` via guarded `globalThis` lookups, so it degrades
  gracefully outside a browser rather than being DOM-free. The root package
  re-exports everything here too, so a consumer can reach the same functions
  from `@tetherto/mdk-ui-agent` without the `/core` subpath — the subpath
  exists to pull in the protocol layer without the components, not because
  the root barrel omits it.
- `./styles.css` — imported once alongside the devkit stylesheets.

**Layering**: keeps foundation / adapter / devkit's separation *inside* the
package (`core/` → `hooks/` → `components/`) rather than spread across the three,
because the deliverable is a single injectable unit. It borrows `Button`,
`Loader` and `createIcon` from the devkit and themes off `--mdk-color-*` tokens
through its own `--mdk-agent-*` indirection, so a host can retheme the panel
alone.

**Build**: `tsc` → `dist/`, `vite` → `dist/styles.css`.

**Note**: published to npm as `@tetherto/mdk-ui-agent`. The backend
half is a stack concern; see
[`packages/ui-agent/README.md`](../packages/ui-agent/README.md) for the whole
chain from an empty machine.

## Build strategy

| Package | TS output (consumed) | CSS / JSON artifacts |
| --- | --- | --- |
| `@tetherto/mdk-ui-foundation` | pre-built `dist/` ESM + `.d.ts` | `dist/stores.json` |
| `@tetherto/mdk-react-adapter` | pre-built `dist/` ESM + `.d.ts` | `dist/hooks.json` |
| `@tetherto/mdk-react-devkit` | pre-built `dist/` ESM + `.d.ts` | `dist/styles.css`, `dist/styles-domain.css`, `dist/registry.json` |

Every TypeScript library package is **pre-built** — consumers import `dist/`
via `exports`, not source. Tasks run through Turborepo for ordering and
caching (`npm run <task>` is forwarded to `turbo`). For the full build
pipeline, post-process steps, the CSS layer-wrap plugin, granular scripts,
and the Turborepo task DAG, see [`BUILD.md`](BUILD.md).

## State management

State lives in `@tetherto/mdk-ui-foundation` as Zustand vanilla stores. React
components consume them via `useAuth` / `useDevices` / `useNotifications` /
`useTimezone` from `@tetherto/mdk-react-adapter`; non-React
code reads or writes the same singletons via `store.getState()` /
`store.setState()`. Redux, react-redux, and any alternative state library are
**not** used — see the no-Redux rule in [`CLAUDE.md`](../CLAUDE.md#state-management).
MDK ships no data hooks for specific endpoints. An app wraps its own Gateway
routes with `useQuery` (re-exported by `@tetherto/mdk-react-adapter`) against
the client `<MdkProvider>` builds with `createMdkQueryClient()`, and passes the
result to devkit components as props.

## Separation of concerns

The toolkit is layered so the three concerns — data (`ui-foundation`), glue
(`react-adapter` hooks), and presentation (`react-devkit` components) — each
live in exactly one place; pages are thin assembly. This is a load-bearing
rule with red-flag patterns and a techdebt list; the canonical statement
lives in [`CLAUDE.md`](../CLAUDE.md#separation-of-concerns-load-bearing-rule).

## Styling

SCSS source compiled by Vite. Public design tokens (CSS custom properties)
live in [`packages/react-devkit/src/primitives/styles/_colors.scss`](../packages/react-devkit/src/primitives/styles/_colors.scss), re-exported as
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
  logic), `primitives-dom` (primitives components, light DOM mocks), and
  `domain-dom` (domain, heavier React/DOM mocks) — so the domain's
  mocking setup does not pollute the lighter primitives/node tests.
  `@tetherto/mdk-ui-foundation` and `@tetherto/mdk-react-adapter` each run a single
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
`check:agent-ready` on the devkit, `check:api-surface`, and coverage before push.
