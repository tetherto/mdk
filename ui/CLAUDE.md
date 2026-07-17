# CLAUDE.md

Guidance for Claude Code working in this repository. Detailed references
live under `docs/` — link inline where relevant.

## Commands

```bash
corepack enable && npm install
npm run build          # build all packages (required before first dev)
npm run dev            # watch all packages + catalog app
npm run test           # vitest, all packages
npm run lint           # eslint, all packages
npm run typecheck      # tsc --noEmit, all packages
npm run fullcheck      # build + lint + typecheck + format + check:agent-ready + test:coverage
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit  # after devkit export changes
```

Repo-level agent surfaces (registry, `mdk-ui` CLI, manifests): read
[`AGENTS.md`](AGENTS.md) first. Human contributor workflow:
[`CONTRIBUTING.md`](../CONTRIBUTING.md). Strict export contract:
[`packages/react-devkit/AGENT_READY.md`](packages/react-devkit/AGENT_READY.md).

Granular per-package and per-area scripts (`build:ts`, `watch:scss`,
single-file test invocations, etc.) are listed in
[`docs/BUILD.md`](docs/BUILD.md).

## Architecture

npm workspaces monorepo on Turborepo, split so non-React adapters can be
added later without touching the core. Dependency flow:
`catalog → react-devkit → react-adapter → ui-foundation`. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

- **`packages/ui-foundation`** (`@tetherto/mdk-ui-foundation`) — framework-agnostic
  headless layer: Zustand vanilla stores (`authStore`, `devicesStore`,
  `notificationStore`, `timezoneStore`, `actionsStore`), TanStack
  `QueryClient` factory, telemetry primitives, command lifecycle state
  machine, shared types. Pure TS, no React.
- **`packages/react-adapter`** (`@tetherto/mdk-react-adapter`) — React
  bindings: `<MdkProvider>`, store hooks (`useAuth`, `useDevices`,
  `useNotifications`, `useTimezone`, `useActions`), pass-through
  re-exports of `useQuery` / `useMutation`.
- **`packages/react-devkit`** (`@tetherto/mdk-react-devkit`) — React UI
  library. `src/primitives/` exports generic primitives on Radix UI with BEM
  + SCSS tokens; `src/domain/` exports mining-domain components and
  hooks.
- **`packages/cli`** (`@tetherto/mdk-ui-cli`, bin `mdk-ui`) — agent-first
  CLI: registry discovery, doc/example fetching, page scaffolding,
  typecheck/lint helpers.
- **`packages/fonts`** (`@tetherto/mdk-fonts`) — JetBrains Mono assets.
- **`apps/catalog`** — Vite/React showcase wrapped in `<MdkProvider>`.

All three TS packages ship pre-built `dist/` so consumers don't compile
our source. Run `npm run build` once on a fresh checkout. Build details
in [`docs/BUILD.md`](docs/BUILD.md).

### State management

State lives in `@tetherto/mdk-ui-foundation` as Zustand vanilla stores, consumed
from React via `@tetherto/mdk-react-adapter` hooks. Outside React, read
or write the stores directly via `store.getState()` / `store.setState()`.
**Do not add Redux, react-redux, or any alternative state library.**

### Data fetching

API layer is a placeholder under
`packages/react-devkit/src/domain/api/`. New hooks use TanStack Query
via `createMdkQueryClient` from `@tetherto/mdk-ui-foundation` and `<MdkProvider>`.

### Styling

- SCSS with design tokens; import shared mixins via
  `@use "@tetherto/mdk-react-devkit/styles" as *;`.
- Theme via CSS variables; no inline styles on components.
- BEM: block `mdk-<component>`, modifier `--<variant>-<value>`.
- CVA (`class-variance-authority`) for type-safe variant props.
- Cascade layers: stylesheet declares `@layer base, mdk, app;`. Tokens
  in `base`, component rules in `mdk`, consumer styles win without
  specificity hacks. See [`docs/STYLING.md`](docs/STYLING.md).
- **Register every new component `.scss` in a bundled entry index.** A
  component imports its own stylesheet from its `.tsx`
  (`import "./foo.scss"`), but the published package strips those imports
  from `dist/*.js` — so a stylesheet only ships if it is also
  `@forward`/`@use`-d from `src/styles-domain.scss` (domain, via
  `src/domain/styles/index.scss`) or `src/styles.scss` (primitives, via
  `src/primitives/styles/index.scss`). Miss it and the component compiles,
  passes tests, and renders **completely unstyled** in built consumers
  (the operator shell, not the catalog). `npm run build` runs
  `check:styles` (`scripts/check-style-forwards.mjs`) to fail fast on any
  unregistered stylesheet — do not bypass it; add the `@forward` line.

### Separation of concerns (load-bearing rule)

This is the rule that organises everything else — break it and the layers collapse.

- **Components render data; nothing else.** No data fetching, no
  business rules, no unit conversion, no telemetry shaping inside JSX or
  component files. Accept already-shaped props, return markup.
- **Hooks connect data to components.** Adapter hooks own the data
  fetching, unit conversion, formatting, and "latest sample" derivation
  — they return chart-ready / table-ready / card-ready payloads.
- **Pages are thin glue.** A dashboard page reads hooks and passes their
  output straight to components. If you see a `useMemo` in a page that
  divides by 1e6 or builds a `datasets` array, that logic belongs in a
  hook.
- **All API + state interaction lives in `@tetherto/mdk-ui-foundation`.**
  Query factories, query keys, query-param builders, Zustand stores,
  token utilities, type contracts. The adapter and devkit consume them
  but never reimplement them.
- **No tag / aggregate-field strings leak past the data layer.** Page
  files must never reference `t-miner`, `t-powermeter`, `power_w_sum_aggr`,
  `site_power_w`, etc. Those belong in `packages/ui-foundation/src/utils/dashboard-queries.ts`
  (and similar builders) and are consumed by adapter hooks.

**Red flag — stop and refactor (or file techdebt):**

- A component that calls `useQuery` or `fetch` directly.
- A page that does unit conversions, formatter functions, or builds
  `LineChartCardData` / table rows inline.
- A "fat" domain component that embeds telemetry shaping (the
  retired `ConsumptionLineChart` / `HashRateLineChart` are the
  canonical anti-examples — use `<LineChartCard>` with adapter hooks
  instead).
- A hook that returns raw backend entries when its callers all need
  the same derived shape — push the shaping into the hook.

When you spot a fresh pattern violation you can't fix in the current
change, file a GitHub issue labelled `techdebt` (the file + why it
violates) — see [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md#tracking-tech-debt).

### Component patterns

- Radix UI primitives as unstyled base; wrap with `forwardRef`.
- Forms: React Hook Form + Zod.
- Tables: TanStack React Table.
- Charts: Chart.js / react-chartjs-2; `lightweight-charts` for financial.
- Dashboard line charts: `<LineChartCard>` from
  `@tetherto/mdk-react-devkit` is the canonical primitive — pure
  presentation. Adapter hooks build the `ChartCardData` payload.

### Testing

- Vitest + `@testing-library/react` + `happy-dom` / `jsdom`.
- `@tetherto/mdk-react-devkit` runs three Vitest projects: `node`
  (pure logic), `primitives-dom` (primitives components), `domain-dom`
  (heavier React/DOM mocks).
- Tests interact with the **real** Zustand singletons from
  `@tetherto/mdk-ui-foundation` — use `vi.spyOn` on store actions and
  `getState().reset()` in `beforeEach`. Do **not** mock `react-redux`
  or reintroduce a Provider.
- Test utilities are exported from each package's `src/test-utils/`.
- Coverage thresholds and exclusions: [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md#coverage).

### TypeScript

Strict mode (`strict`, `noUncheckedIndexedAccess`, `noImplicitAny`),
target ES2022, ESM-only. All packages extend `tsconfig.base.json`.

### Code style

ESLint uses `@antfu/eslint-config`. Enforced: **double quotes**,
**semicolons required**, 2-space indent, 120-char soft limit. Husky +
lint-staged enforce on staged files.

### Commits

[Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<scope>): <subject>`. Types: `feat`, `fix`, `docs`, `style`,
`refactor`, `test`, `chore`. Example:
`feat(react-devkit): add MinerCard component`.

## Catalog app conventions (`apps/catalog`)

Wrapped in `<MdkProvider>` at the root; each route maps to a page or
example.

**Navigation** — Add routes to both `src/constants/navigation.tsx`
(under `Guides`, `Core`, or `Foundation`) and `src/router.tsx`. Nav
labels must match page titles exactly.

**Page headers** — Every routed page opens with `<DemoPageHeader>`
from `src/components/demo-page-header.tsx`. Do **not** use raw `<h1>`,
`<h2>`, or `<Typography variant="heading1/2">` as the page title.

**Sub-sections** — Use `<DemoBlock>` from `src/components/demo-block.tsx`
for variant demos within a page (renders `heading3` + card wrapper).

**No inline styles** — Use existing `demo-section__*` utility classes
in `App.scss` or add new BEM modifiers there. The Theming demo is the
only exception (sets `--mdk-*` CSS variables on a preview region).

**Toasts, not alerts** — Use `useDemoToast` from
`src/utils/use-demo-toast.tsx` instead of `alert()` / `window.alert()`.

**Seeding store state** — Demos that drive a component reading from a
shared Zustand store should seed the singleton from `useEffect` and
reset it on unmount. Prefer scenario selectors over side-by-side blocks
since stores are global.

## Adding dependencies

```bash
npm install <pkg> --workspace @tetherto/mdk-react-devkit    # to a package
npm install -D <pkg> --workspace @tetherto/mdk-ui-foundation      # dev dep
npm install -w <pkg>                                        # to workspace root
```

Check `package.json` workspaces/overrides before adding deps — versions
are centrally managed.
