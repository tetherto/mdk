# @tetherto/mdk-react-devkit

The React UI layer of the MDK toolkit. It bundles the generic UI
primitives and the mining-domain components into a single package whose
internal layout keeps the two layers clearly separated:

> **Contributing or extending the devkit?** Read
> [`AGENT_READY.md`](AGENT_READY.md) first — it's the contract every public
> export must satisfy (JSDoc tags, tier system, `USAGE.md` + example
> requirements). `npm run check:agent-ready` enforces it.

> **Building features in a consuming app?** Use the
> [`mdk-ui` CLI](../cli/README.md) — `suggest`, `blueprints`, `find`,
> `docs`, `example`, `add page`, `check`. Run `npx mdk-ui init` once to seed
> agent context in your project.

- `src/core/` — framework-agnostic-ish UI primitives built on Radix UI,
  design tokens, formatting utilities and types.
- `src/foundation/` — mining-domain components, features, presentation
  hooks (under `utils/`), constants, and types. Zustand stores live in
  `@tetherto/mdk-ui-core`; store hooks and `MdkProvider` live in
  `@tetherto/mdk-react-adapter`.

## Installation

This is a workspace package; depend on it from another workspace:

```json
{
  "dependencies": {
    "@tetherto/mdk-react-devkit": "*"
  }
}
```

## Usage

### Subpath imports (preferred — better tree-shaking)

```tsx
import { Button, Dialog } from "@tetherto/mdk-react-devkit/core";
import { useNotification } from "@tetherto/mdk-react-devkit/foundation";
// Store hooks and Query client — not separate devkit subpaths:
import { actionsStore, devicesStore } from "@tetherto/mdk-ui-core";
import { useActions, useDevices, useTimezone } from "@tetherto/mdk-react-adapter";
```

Presentation hooks ship on `./foundation` (or the top-level barrel), not
`@tetherto/mdk-react-devkit/hooks` — that subpath is not in `package.json`
`exports`.

### Top-level barrel

```tsx
import { Button, useNotification } from "@tetherto/mdk-react-devkit";
```

### Styles

```tsx
import "@tetherto/mdk-react-devkit/styles.css";
```

Or in SCSS:

```scss
@use "@tetherto/mdk-react-devkit/styles" as *;
```

See [STYLING.md](../../docs/STYLING.md) for the cascade-layer model, the public design
tokens (`--mdk-*` custom properties), and supported component-class
overrides.

## Subpath exports

| Subpath | Resolves to | Purpose |
| --- | --- | --- |
| `.` | `dist/index.{js,d.ts}` | Top-level barrel (`core` + `foundation`) |
| `./core` | `dist/core/index.{js,d.ts}` | Generic UI primitives |
| `./foundation` | `dist/foundation/index.{js,d.ts}` | Mining-domain layer: components, features, presentation hooks, constants, types |
| `./domain` | `dist/foundation/components/index.{js,d.ts}` | Mining-domain components only |
| `./feature` | `dist/foundation/features/index.{js,d.ts}` | Full-page feature compositions |
| `./registry.json` | `dist/registry.json` | Machine-readable component + hook registry |
| `./blueprints.json` | `dist/blueprints.json` | Intent → recipe index |
| `./styles.css` | `dist/styles.css` | Bundled stylesheet (cascade-layer ready) |
| `./styles` | `src/core/styles/_mixins.scss` | SCSS mixins (`@use`) |
| `./tokens.scss` | `src/core/styles/_colors.scss` | Design-token CSS variables (`@use`) |
| `./src/styles/index.scss` | `src/foundation/styles/index.scss` | Foundation SCSS entry (advanced) |

For `mdk-ui registry`, `docs`, and `example`, see [`AGENTS.md`](../../AGENTS.md) and
[`../cli/README.md`](../cli/README.md). Adapter hook and store manifests:
`@tetherto/mdk-react-adapter/hooks.json`, `@tetherto/mdk-ui-core/stores.json`.

### Hooks and data (not separate devkit subpaths)

| Need | Import from |
| --- | --- |
| Store hooks (`useAuth`, `useDevices`, `useTimezone`, …) | `@tetherto/mdk-react-adapter` |
| Zustand stores outside React | `@tetherto/mdk-ui-core` |
| Presentation hooks (`useNotification`, `useListViewFilters`, …) | `@tetherto/mdk-react-devkit/foundation` or `.` |
| TanStack `QueryClient` factory | `@tetherto/mdk-ui-core` (`createMdkQueryClient`) |

There is no `./hooks` or `./api` export today; those capabilities are reached
through `./foundation`, the adapter, or the core package.

## Build strategy

- **TypeScript** — `tsc -p tsconfig.build.json` emits ESM JS + `.d.ts`
  into `dist/`. A small post-process (`scripts/strip-style-imports.mjs`)
  removes the side-effect `.scss` / `.css` imports from emitted JS
  because the bundled `dist/styles.css` already contains every
  component's styles.
- **CSS** — Vite compiles `src/styles.scss` into `dist/styles.css`. PostCSS
  (`postcss-mdk-layer.mjs`) wraps top-level rules in `@layer mdk` and prepends
  `@layer base, mdk, app;`.
- **Registry** — `npm run build:registry` emits `dist/registry.json` and
  `dist/blueprints.json`. Run `npm run check:agent-ready` before changing
  public exports (also runs in root `npm run fullcheck`).
- **SCSS source** — `_mixins.scss` and `_colors.scss` stay exposed as
  subpath exports so downstream apps can `@use` them from their own SCSS.

## Development

```bash
npm run dev                    # watch CSS + TS
npm run build                  # build:ts + build:scss + build:registry
npm run build:ts               # TypeScript only
npm run build:scss             # Vite → dist/styles.css
npm run build:registry         # dist/registry.json + dist/blueprints.json
npm run check:agent-ready      # contract gate (needs registry build)
npm run typecheck
npm run test
```
