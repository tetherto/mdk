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
top. `@tetherto/mdk-fonts` ships font assets independently.

### `@tetherto/mdk-ui-foundation` — framework-agnostic core

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
  `@tanstack/react-query` and exposes the resolved API base URL and
  `AuthProvider`-based auth context via React context. Full seam details in
  the `@tetherto/mdk-react-adapter` package entry in `## Packages`.
- One React hook per core store (`useAuth`, `useDevices`, …) built on
  `useStore(<vanillaStore>)` from `zustand`.
- Op Center read hooks (`useExplorerList`, `useContainerWidgets`,
  `useSite`, `useFeatureFlags`, `usePduLayout`, and more) — fetch, poll,
  and shape data for the Operational Center pages. See the [package README](../packages/react-adapter/README.md#op-center-read-hooks).
- Pass-through re-exports of `useQuery`, `useMutation`, `useQueryClient`.
- Designed so adding a future React Native or Web Components adapter is a
  matter of writing a sibling package — no changes to the core.

### `@tetherto/mdk-react-devkit` — React UI library

- [`src/primitives/`](../packages/react-devkit/src/primitives/) — ~60 generic UI primitives built on Radix UI: Button,
  Dialog, Switch, Select, Data Table, Charts, …
- [`src/domain/`](../packages/react-devkit/src/domain/) — mining-domain components, custom hooks, a TanStack
  Query API stub (real endpoints live in the consuming applications).

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
        │ • dist/registry.json + blueprints.json          │
        └─────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────▼────────────┐    ┌────────────────────────┐
        │ @tetherto/mdk-catalog-ui        │    │ @tetherto/mdk-fonts    │
        │ (apps/catalog)                  │    └────────────────────────┘
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
│   └── fonts/            # @tetherto/mdk-fonts            — JetBrains Mono assets
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
- **ESLint** flat config via `@antfu/eslint-config`

## Packages

### `@tetherto/mdk-ui-foundation`

**Purpose**: Framework-agnostic headless package. Plain TypeScript, no React.

**Location**: [`packages/ui-foundation`](../packages/ui-foundation/README.md)

**Surface**:

- Zustand vanilla stores (`createStore` from `zustand/vanilla`):
  `authStore`, `devicesStore`, `notificationStore`, `timezoneStore`,
  `actionsStore`, each exposing both the singleton and a `createXStore`
  factory for testing
- TanStack `QueryClient` factory: `createMdkQueryClient`
- `queryKeys`: centralized key factories for auth, devices, telemetry,
  Op Center reads (`site`, `listRacks`, `pduLayout`, `globalData`,
  `thingConfig`, `globalConfig`), Pool Manager reads/mutations, and
  thing-comment mutations (`addThingComment`, `editThingComment`,
  `deleteThingComment`)
- Query factories ([`factories.ts`](../packages/ui-foundation/src/presets/mining/factories.ts)): `{ queryKey, queryFn }` objects for
  mining read endpoints; **Thing-comment mutation factories**
  (`addThingCommentMutation`, `editThingCommentMutation`,
  `deleteThingCommentMutation`) sharing one `thingCommentMutationFn`
  implementation; pool factories in [`pool-factories.ts`](../packages/ui-foundation/src/presets/mining/pool-factories.ts) (no GET factory for
  comments — they are embedded in the Thing record and returned via `listThingsQuery`)
- **Device-action submission builders** ([`device-actions.ts`](../packages/ui-foundation/src/utils/device-actions.ts)):
  `DEVICE_ACTION`, `DEVICE_BATCH_ACTION`, and `POWER_MODE` constants;
  `DeviceActionSubmission` / `DeviceActionCrossThing` types;
  `buildDeviceActionSubmission` with the extras-spread-first override
  guard; `buildContainerCrossThing` / `buildMinerCrossThing` cross-thing
  helpers; per-action builders (`buildRebootAction`,
  `buildSetPowerModeAction`, `buildSetPowerPctAction`, `buildSetLedAction`,
  `buildSwitchContainerAction`, `buildSwitchCoolingSystemAction`,
  `buildSetTankEnabledAction`, `buildSetAirExhaustEnabledAction`,
  `buildResetAlarmAction`, `buildSwitchSocketAction`,
  `buildSetPlcRegistersAction`, `buildUpdateThingBatchEntry`)
- Query parameter builders: Op Center (`buildExplorerListThingsParams`,
  `buildContainerDetailParams`, `buildContainerWidgetsListParams`, etc.),
  alert, dashboard, and pool builders
- Container tab utilities: `CONTAINER_TAB_MATRIX` keyed by model family,
  `resolveContainerModelFamily`, `getSupportedContainerTabs`,
  `isPduContainerTab`, and family predicates
- `flattenKernelEnvelope`: null-safe helper that flattens per-Kernel
  nested envelopes from `list-things` / `list-racks` into a flat row array
- Command lifecycle state machine
- Shared API types: tail-log, list-things, history-log, ext-data, auth,
  and Op Center contracts (`ListRacksParams`, `PduLayoutParams`,
  `PduLayoutResponse`, `GlobalDataParams`, `ThingConfigParams`,
  `ThingCommentBody`, `ContainerSettingsEntry`)

**Agent manifest**: `dist/stores.json` (subpath `@tetherto/mdk-ui-foundation/stores.json`).
Regenerated by `npm run build:stores` during `build`.

**Build**: `tsc -p tsconfig.build.json` → `dist/` (ESM + `.d.ts`).

**Usage**:

```ts
import { actionsStore, createMdkQueryClient } from "@tetherto/mdk-ui-foundation";

const client = createMdkQueryClient({ apiBaseUrl: "/api" });
actionsStore.getState().setAddPendingSubmissionAction({ action: "noop" });
```

### `@tetherto/mdk-react-adapter`

**Purpose**: React bindings for `@tetherto/mdk-ui-foundation`.

**Location**: [`packages/react-adapter`](../packages/react-adapter/README.md)

**Surface**:

- `<MdkProvider>` — wraps `QueryClientProvider` and supplies API
  base-URL and auth context. Required at the app root for the devkit to work.
  Its `auth` prop takes an `AuthProvider` (from `@tetherto/mdk-ui-foundation`)
  — `bearerTokenAuth()` (the default `createMdkQueryClient` applies when used
  without a provider) or `noAuth()` for an open API, and `gatewayRedirectAuth()`
  from the mining preset for the bundled Gateway's OAuth-redirect flow, which
  is `MdkProvider`'s own default. The seam itself is complete, but
  `gatewayRedirectAuth()`'s refresh needs the bundled Gateway `auth` plugin,
  which ships unwired, and its sign-in redirect needs an OAuth endpoint the
  Gateway does not ship — see
  [`@tetherto/mdk-react-adapter`'s Authentication section](../packages/react-adapter/README.md#authentication)
- Store hooks (one per core store): `useAuth`, `useDevices`,
  `useNotifications`, `useTimezone`, `useActions`. Implemented via
  `useStore(<store>)` from `zustand`
- **`useDeviceAction`** — queues a `DeviceActionSubmission` (built with
  the foundation's `buildXxx` helpers) into `actionsStore`; exposes
  `canSubmit` (`actions:w`); device actions share the review tray with
  pool actions
- **`useThingComment`** (`COMMENTS_WRITE_PERM`) — `addComment` /
  `editComment` / `deleteComment` against `/auth/thing/comment`;
  invalidates `list-things` on every write
- Write-action hooks: `useSubmitPendingActions`, `useSubmitSingleAction`,
  `useVoteOnAction`, `useCancelAction`, `usePendingActions`,
  `useLiveActions` — connect UI to the Gateway `/auth/actions*`
  voting/approval pipeline; `toVotingPayload` (in [`action-write-utils.ts`](../packages/react-adapter/src/hooks/action-write-utils.ts))
  derives targeting solely from `query` (built from `tags`), stripping
  `tags` / `crossThing` and every other client-only field
- Op Center read hooks (`@category op-center`): `useExplorerList`,
  `useThingDetail`, `useRackLayout`, `useCabinetGroups`, `useSite`,
  `useFeatureFlags`, `usePduLayout`, `useContainerSettings`,
  `useContainerWidgets` — fetch/poll/shape data for the Operational
  Center pages. Full list and polling behaviour in the [package README](../packages/react-adapter/README.md#op-center-read-hooks)
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
  - [`features/`](../packages/react-devkit/src/domain/features/index.ts): full-page compositions
  - `hooks/`, `api/` (placeholder), [`utils/`](../packages/react-devkit/src/domain/utils/), [`types/`](../packages/react-devkit/src/domain/types/index.ts), … — all reached via
    the `./domain` barrel or the top-level barrel (no separate `./components`
    / `./features` / `./hooks` / `./api` export subpaths today)
- [`blueprints/`](../packages/react-devkit/blueprints/README.md): curated intent → component recipes (source for
  `dist/blueprints.json`)
- [`scripts/`](../packages/react-devkit/scripts/): [`generate-registry.mts`](../packages/react-devkit/scripts/generate-registry.mts), [`check-agent-ready.mjs`](../packages/react-devkit/scripts/check-agent-ready.mjs),
  [`agent-ready-baseline.json`](../packages/react-devkit/scripts/agent-ready-baseline.json)
- [`AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md): strict
  export contract (tiers, JSDoc, `USAGE.md`, examples)

**Exports (subpath)**:

| Subpath | Resolves to |
| --- | --- |
| `.` | Top-level barrel |
| `./primitives` | Generic primitives |
| `./domain` | Mining-domain barrel (components, features, hooks, api, …) |
| `./registry.json` | Machine-readable component + hook registry |
| `./blueprints.json` | Machine-readable blueprint index |
| `./styles.css` | Compiled stylesheet (Vite) |
| `./styles` | [`src/primitives/styles/_mixins.scss`](../packages/react-devkit/src/primitives/styles/_mixins.scss) |
| [`./tokens.scss`](../packages/react-devkit/src/primitives/components/dropdown-menu/tokens.scss) | [`src/primitives/styles/_colors.scss`](../packages/react-devkit/src/primitives/styles/_colors.scss) |

**Agent manifests**: `dist/registry.json`, `dist/blueprints.json`.
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
the agent gateway plugin's six-event SSE contract as a conversation, including
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

**Note**: `private: true` — workspace-linked only, not published. The backend
half is a stack concern; see
[`packages/ui-agent/README.md`](../packages/ui-agent/README.md) for the whole
chain from an empty machine.

### `@tetherto/mdk-fonts`

**Purpose**: Font assets for the toolkit.

**Location**: [`packages/fonts`](../packages/fonts/README.md)

**Exports**: JetBrains Mono `@font-face` declarations and files.

**Usage**:

```tsx
import "@tetherto/mdk-fonts/jetbrains-mono.css";
```

## Build strategy

| Package | TS output (consumed) | CSS / JSON artifacts |
| --- | --- | --- |
| `@tetherto/mdk-ui-foundation` | pre-built `dist/` ESM + `.d.ts` | `dist/stores.json` |
| `@tetherto/mdk-react-adapter` | pre-built `dist/` ESM + `.d.ts` | `dist/hooks.json` |
| `@tetherto/mdk-react-devkit` | pre-built `dist/` ESM + `.d.ts` | `dist/styles.css`, `dist/styles-domain.css`, `dist/registry.json`, `dist/blueprints.json` |
| `@tetherto/mdk-fonts` | n/a | `dist/jetbrains-mono.css` + woff2 |

Every TypeScript library package is **pre-built** — consumers import `dist/`
via `exports`, not source. Tasks run through Turborepo for ordering and
caching (`npm run <task>` is forwarded to `turbo`). For the full build
pipeline, post-process steps, the CSS layer-wrap plugin, granular scripts,
and the Turborepo task DAG, see [`BUILD.md`](BUILD.md).

## State management

State lives in `@tetherto/mdk-ui-foundation` as Zustand vanilla stores. React
components consume them via `useAuth` / `useDevices` / `useNotifications` /
`useTimezone` / `useActions` from `@tetherto/mdk-react-adapter`; non-React
code reads or writes the same singletons via `store.getState()` /
`store.setState()`. Redux, react-redux, and any alternative state library are
**not** used — see the no-Redux rule in [`CLAUDE.md`](../CLAUDE.md#state-management).
The API layer is currently a placeholder in
`packages/react-devkit/src/domain/api/`; future hooks use TanStack Query
against `createMdkQueryClient()`, with `<MdkProvider>` supplying the client
and base URL.

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
`check:agent-ready` on the devkit, and coverage before push.
