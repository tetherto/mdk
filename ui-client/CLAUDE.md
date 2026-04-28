# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Setup
corepack enable && pnpm install
pnpm build                  # build all packages (required before dev)

# Development
pnpm dev                    # watch all packages + demo app
pnpm dev:demo               # demo app only (HMR)
pnpm dev:packages           # packages only, no demo

# Granular build/watch
pnpm build:ts               # TypeScript only
pnpm build:scss             # SCSS only
pnpm watch:ts               # watch TypeScript only
pnpm watch:scss             # watch SCSS only
pnpm clean                  # remove all build artifacts

# Testing
pnpm test                   # run all tests once
pnpm test:watch             # watch mode
pnpm test:coverage          # with coverage report

# Run a single test file
pnpm --filter @tetherto/core test -- <path/to/file.test.ts>
pnpm --filter @tetherto/foundation test -- <path/to/file.test.ts>

# Code quality
pnpm check                  # lint + format + typecheck
pnpm lint:fix               # lint with auto-fix
pnpm typecheck              # TypeScript check only
pnpm fullcheck              # build + lint + typecheck + format + test:coverage
```

## Architecture

This is a **pnpm monorepo** powered by Turborepo with two publishable packages and a demo app:

- **`packages/core`** (`@tetherto/core`) — base UI component library built on Radix UI primitives. Components use CSS class-based styling (BEM: `mdk-button`, `mdk-button--variant-primary`), SCSS design tokens, and CSS variables for theming. No runtime CSS-in-JS.
- **`packages/foundation`** (`@tetherto/foundation`) — domain layer: 70+ custom hooks, Redux Toolkit state slices, RTK Query API client infrastructure, and domain-specific components for mining operations dashboards. Depends on `@tetherto/core`.
- **`packages/fonts`** (`@tetherto/fonts`) — font assets only (JetBrains Mono).
- **`apps/demo`** — Vite/React app that showcases components. Uses React Router for routing.

Dependency flow: `demo → foundation → core`.

### Build strategy

`@tetherto/core` is **fully pre-built** — tsc emits JS + declarations, Vite compiles SCSS, Terser minifies. Consumers import from `dist/`.

`@tetherto/foundation` **exports TypeScript source directly** — no pre-compilation of JS; consuming apps compile it themselves. Only its CSS is Vite-built. This gives instant feedback during development without a rebuild step.

### State management

Redux Toolkit slices live in `packages/foundation/src/state/slices/`: `auth`, `notification`, `actions`, `devices`, `timezone`. RTK Query infrastructure is in `packages/foundation/src/api/` but API routes are currently placeholders. Use Redux Toolkit patterns (slices, selectors, immer) — do not introduce other state libraries.

### Styling

- SCSS with design tokens; import shared mixins via `@use '@tetherto/core/styles' as *;`
- Theme via CSS variables; no inline styles on components
- Class names follow BEM: block `mdk-<component>`, modifier `--<variant>-<value>`
- CVA (`class-variance-authority`) for type-safe variant props

### Component patterns

- Radix UI primitives as unstyled base; wrap with `forwardRef`
- Form components use React Hook Form + Zod for validation
- Tables use TanStack React Table
- Charts: Chart.js / react-chartjs-2 for standard charts; `lightweight-charts` for financial charts

### Testing

- Vitest + `@testing-library/react` + `happy-dom` / `jsdom`
- `@tetherto/foundation` splits into two Vitest projects: `node` (pure logic: utils, state, constants) and `dom` (component tests)
- Coverage thresholds: 80% (`@tetherto/core`), 94% (`@tetherto/foundation`)
- Test utilities are exported from `src/test-utils/` in each package

### TypeScript

Strict mode is on (`strict`, `noUncheckedIndexedAccess`, `noImplicitAny`). Target is ES2022. ESM-only — no CommonJS exports. All packages extend `tsconfig.base.json` at the repo root.

### Code style

ESLint uses `@antfu/eslint-config`. Enforced style: **double quotes**, **semicolons required**, 2-space indent, 120-char soft line limit. Pre-commit hooks (Husky + lint-staged) enforce formatting and linting on staged files.

### Commit convention

Follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`. Example: `feat(components): add MinerCard component`.

### Build outputs

`@tetherto/core` builds to `dist/` (ESM JS + declarations + CSS). `@tetherto/foundation` only builds CSS to `dist/`; its TS source is imported directly. Run `pnpm build` before `pnpm dev` on a fresh checkout.

### Demo app conventions (`apps/demo`)

The demo app uses React Router; each route maps to a page or example component. When adding or editing demo pages:

**Navigation** — Add new routes to `src/constants/navigation.tsx` (Core or Foundation section) and `src/router.tsx`. Nav labels must match page titles exactly.

**Page headers** — Every routed page must open with `<DemoPageHeader>` from `src/components/demo-page-header.tsx`:
```tsx
import { DemoPageHeader } from '../components/demo-page-header'

<DemoPageHeader title="My Component" description="Optional subtitle" />
```
Do **not** use raw `<h1>`, `<h2>`, `<Typography variant="heading1/2">` as the page-level title.

**In-page sub-sections** — Use `<DemoBlock>` from `src/components/demo-block.tsx` for individual variant demos within a page (renders `heading3` + card wrapper):
```tsx
import { DemoBlock } from '../../../components/demo-block'

<DemoBlock title="Variant name" description="...">
  <MyComponent />
</DemoBlock>
```

**No inline styles** — Use existing `demo-section__*` utility classes (defined in `App.scss`) or add new BEM modifiers there. Never `style={{ ... }}` on layout wrappers.

**Toasts instead of alerts** — Use `useDemoToast` from `src/utils/use-demo-toast.tsx` instead of `alert()` / `window.alert()`.

### Adding dependencies

```bash
pnpm add <pkg> --filter @tetherto/foundation   # add to a specific package
pnpm add -D <pkg> --filter @tetherto/core      # add dev dependency to a package
pnpm add -w <pkg>                         # add to workspace root
```

Dependency versions are managed via the pnpm version catalog — check `pnpm-workspace.yaml` before adding new deps to avoid version drift.
