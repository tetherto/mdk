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

- `src/primitives/` — framework-agnostic-ish UI primitives built on Radix UI,
  design tokens, formatting utilities and types.
- `src/domain/` — mining-domain components, features, presentation
  hooks (under `utils/`), constants, and types. Zustand stores live in
  `@tetherto/mdk-ui-foundation`; store hooks and `MdkProvider` live in
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
import { Button, Dialog } from "@tetherto/mdk-react-devkit/primitives";
import { useNotification } from "@tetherto/mdk-react-devkit/domain";
// Store hooks and Query client — not separate devkit subpaths:
import { actionsStore, devicesStore } from "@tetherto/mdk-ui-foundation";
import { useActions, useDevices, useTimezone } from "@tetherto/mdk-react-adapter";
```

Presentation hooks ship on `./domain` (or the top-level barrel), not
`@tetherto/mdk-react-devkit/hooks` — that subpath is not in `package.json`
`exports`.

### Top-level barrel

```tsx
import { Button, useNotification } from "@tetherto/mdk-react-devkit";
```

### Styles

```tsx
import "@tetherto/mdk-react-devkit/styles.css";
import "@tetherto/mdk-react-devkit/styles-domain.css"; // only if using domain (mining-domain) components
```

Import `styles.css` **first** — it defines the design tokens the domain styles reference.
Apps that only use primitives (`./primitives`) can omit `styles-domain.css` and ship ~70 KB less CSS.

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
| `.` | `dist/index.{js,d.ts}` | Top-level barrel (`primitives` + `domain`) |
| `./primitives` | `dist/primitives/index.{js,d.ts}` | Generic UI primitives |
| `./domain` | `dist/domain/index.{js,d.ts}` | Mining-domain layer: components, features, presentation hooks, constants, types |
| `./registry.json` | `dist/registry.json` | Machine-readable component + hook registry |
| `./blueprints.json` | `dist/blueprints.json` | Intent → recipe index |
| `./styles.css` | `dist/styles.css` | Design tokens + core primitives (~18 KB gz) |
| `./styles-domain.css` | `dist/styles-domain.css` | Mining-domain component styles (~70 KB gz); import after `styles.css` |
| `./styles` | `src/primitives/styles/_mixins.scss` | SCSS mixins (`@use`) |
| `./tokens.scss` | `src/primitives/styles/_colors.scss` | Design-token CSS variables (`@use`) |
| `./src/styles/index.scss` | `src/domain/styles/index.scss` | Domain SCSS entry (advanced) |

For `mdk-ui registry`, `docs`, and `example`, see [`AGENTS.md`](../../AGENTS.md) and
[`../cli/README.md`](../cli/README.md). Adapter hook and store manifests:
`@tetherto/mdk-react-adapter/hooks.json`, `@tetherto/mdk-ui-foundation/stores.json`.

### Hooks and data (not separate devkit subpaths)

| Need | Import from |
| --- | --- |
| Store hooks (`useAuth`, `useDevices`, `useTimezone`, …) | `@tetherto/mdk-react-adapter` |
| Zustand stores outside React | `@tetherto/mdk-ui-foundation` |
| Presentation hooks (`useNotification`, `useListViewFilters`, …) | `@tetherto/mdk-react-devkit/domain` or `.` |
| TanStack `QueryClient` factory | `@tetherto/mdk-ui-foundation` (`createMdkQueryClient`) |

There is no `./hooks` or `./api` export today; those capabilities are reached
through `./domain`, the adapter, or the foundation package.

## Build strategy

- **TypeScript** — `tsc -p tsconfig.build.json` emits ESM JS + `.d.ts`
  into `dist/`. A small post-process (`scripts/strip-style-imports.mjs`)
  removes the side-effect `.scss` / `.css` imports from emitted JS
  because styles are in the Vite-built `dist/styles.css` and
  `dist/styles-domain.css`, not in the TS output.
- **CSS** — Vite compiles two SCSS entry points into `dist/styles.css` (design tokens + core primitives) and `dist/styles-domain.css` (mining-domain components). PostCSS (`postcss-mdk-layer.mjs`) wraps top-level rules in `@layer mdk` and prepends `@layer base, mdk, app;`.
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
npm run build:scss             # Vite → dist/styles.css + dist/styles-domain.css
npm run build:registry         # dist/registry.json + dist/blueprints.json
npm run check:agent-ready      # contract gate (needs registry build)
npm run typecheck
npm run test
```
