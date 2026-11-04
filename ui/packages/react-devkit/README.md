# @tetherto/mdk-react-devkit

The React UI layer of the MDK toolkit. It bundles the generic UI
primitives and the mining-domain components into a single package whose
internal layout keeps the two layers clearly separated:

> **Contributing or extending the devkit?** Read
> [`AGENT_READY.md`](AGENT_READY.md) first — it's the contract every public
> export must satisfy (JSDoc tags, tier system, `USAGE.md` + example
> requirements). `npm run check:agent-ready` enforces it.

> **Building features in a consuming app?** Read the machine-readable
> manifests — `registry.json` here,
> `@tetherto/mdk-react-adapter/hooks.json` and
> `@tetherto/mdk-ui-foundation/stores.json` next door. See
> [`AGENTS.md`](../../AGENTS.md) for how to navigate them.

- [`src/primitives/`](./src/primitives/index.ts) — framework-agnostic-ish UI primitives built on Radix UI,
  design tokens, formatting utilities and types.
- [`src/domain/`](./src/domain/index.ts) — mining-domain components, presentation
  hooks (under `utils/`), constants, and types. Zustand stores live in
  `@tetherto/mdk-ui-foundation`; store hooks and `MdkProvider` live in
  `@tetherto/mdk-react-adapter`.

## Install

```bash
npm install @tetherto/mdk-react-devkit
```

> [!IMPORTANT]
> `react` and `react-dom` 19 are peer dependencies, as are `react-hook-form` `^7.55.0` and `zod` `^4.6.6`.
> An app that writes its own form schemas also installs `@hookform/resolvers` itself. The devkit carries it as an internal
> dependency for its own modals, so it is not installed into the app the way a peer is.

## Usage

### Subpath imports (preferred — better tree-shaking)

```tsx
import { Button, Dialog } from "@tetherto/mdk-react-devkit/primitives";
import { useNotification } from "@tetherto/mdk-react-devkit/domain";
// Store hooks and Query client — not separate devkit subpaths:
import { devicesStore } from "@tetherto/mdk-ui-foundation";
import { useDevices, useTimezone } from "@tetherto/mdk-react-adapter";
```

Presentation hooks ship on `./domain` (or the top-level barrel), not
`@tetherto/mdk-react-devkit/hooks` — that subpath is not in [`package.json`](./package.json)
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

### Fonts

Monospace text asks for **JetBrains Mono** through the `--font-mono` token, but the
package ships no `@font-face` — nothing is downloaded, and the token falls back to the
system monospace stack (`ui-monospace`, `SF Mono`, `Menlo`, `Consolas`, …). The devkit
renders correctly without the font; shipping it is opt-in.

To ship the face, add the Fontsource package to your app:

```bash
npm install @fontsource-variable/jetbrains-mono
```

and declare it under the family name the token asks for — Fontsource's own stylesheet
registers `JetBrains Mono Variable`, which `--font-mono` does not match, so import this
instead of `@fontsource-variable/jetbrains-mono/index.css`:

```css
/* fonts.css — imported before @tetherto/mdk-react-devkit/styles.css */
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 100 800;
  font-display: optional;
  src: url('@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

One variable file covers every weight (100–800); the browser downloads it only when the
page renders a character in its `unicode-range`. Add the `latin-ext` file the same way if
you need it. `font-display: optional` avoids a font swap after first paint.

To use a different monospace face instead, leave the `@font-face` out and set the token:

```css
:root {
  --font-mono: 'Your Mono', ui-monospace, monospace;
}
```

## Subpath exports

| Subpath | Resolves to | Purpose |
| --- | --- | --- |
| `.` | `dist/index.{js,d.ts}` | Top-level barrel (`primitives` + `domain`) |
| `./primitives` | `dist/primitives/index.{js,d.ts}` | Generic UI primitives |
| `./domain` | `dist/domain/index.{js,d.ts}` | Mining-domain layer: components, presentation hooks, constants, types |
| `./registry.json` | [`dist/registry.json`](./dist/registry.json) | Machine-readable component + hook registry |
| `./styles.css` | [`dist/styles.css`](./dist/styles.css) | Design tokens + core primitives (~18 KB gz) |
| `./styles-domain.css` | [`dist/styles-domain.css`](./dist/styles-domain.css) | Mining-domain component styles (~70 KB gz); import after `styles.css` |
| `./styles` | [`src/primitives/styles/_mixins.scss`](./src/primitives/styles/_mixins.scss) | SCSS mixins (`@use`) |
| [`./tokens.scss`](./src/primitives/components/dropdown-menu/tokens.scss) | [`src/primitives/styles/_colors.scss`](./src/primitives/styles/_colors.scss) | Design-token CSS variables (`@use`) |
| `./src/styles/index.scss` | [`src/domain/styles/index.scss`](./src/domain/styles/index.scss) | Domain SCSS entry (advanced) |

For reading `registry.json`, `USAGE.md` files, and examples, see
[`AGENTS.md`](../../AGENTS.md). Adapter hook and store manifests:
`@tetherto/mdk-react-adapter/hooks.json`, `@tetherto/mdk-ui-foundation/stores.json`.

### Hooks and data (not separate devkit subpaths)

| Need | Import from |
| --- | --- |
| Store hooks (`useAuth`, `useDevices`, `useTimezone`, …) | `@tetherto/mdk-react-adapter` |
| Zustand stores outside React | `@tetherto/mdk-ui-foundation` |
| Presentation hooks (`useNotification`, …) | `@tetherto/mdk-react-devkit/domain` or `.` |
| TanStack `QueryClient` factory | `@tetherto/mdk-ui-foundation` (`createMdkQueryClient`) |

There is no `./hooks` or `./api` export today; those capabilities are reached
through `./domain`, the adapter, or the foundation package.

### Formatting and unit scaling

Value formatters are pure functions exported from `./primitives` and the top-level barrel, so a hook can shape the
strings and leave the component to place them.

| Need | Use |
| --- | --- |
| A value in the unit it reads best in | `scaleToUnit(value, POWER_W_SCALES)`, which returns `{ value, unit }` |
| One unit for a whole series, from its largest value | `pickUnitScale(HASHRATE_TH_S_SCALES, max)`, then divide by its `factor` |
| A bitcoin amount, in BTC or whole sats | `formatBitcoin(btc)` or `formatBitcoin(btc, 'sats')` |

`HASHRATE_TH_S_SCALES` and `POWER_W_SCALES` are the scale lists the package ships. Both helpers take a
`UnitScale[]`, so a measure with its own units supplies its own list. Source:
[`src/primitives/utils/format.ts`](./src/primitives/utils/format.ts).

## Charts: which engine

The devkit ships two charting engines, each for a different kind of data:

| Data | Use | Engine |
| --- | --- | --- |
| A time series: values over time, zoomable, with a time-range selector | `LineChart`, `LineChartCard`, `ThresholdLineChart` | `lightweight-charts` |
| Categories or parts of a whole: per site, per period, shares | `BarChart`, `AreaChart`, `DoughnutChart`, `AverageDowntimeChart`, `OperationsEnergyCostChart` | Chart.js (`react-chartjs-2`) |
| A single value against a range | `GaugeChart` | SVG, no chart engine |
| A grid of cells coloured by value | `Heatmap` | DOM, no chart engine |

Wrap any of them in `ChartContainer` for the title, legend, range selector and loading / empty states; `LineChartCard`
already does. Both engines are code-split into async chunks that load when a chart first renders, so an app that uses only
one never downloads the other.

## Build strategy

- **TypeScript** — `tsc -p tsconfig.build.json` emits ESM JS + `.d.ts`
  into `dist/`. A small post-process ([`scripts/strip-style-imports.mjs`](./scripts/strip-style-imports.mjs))
  removes the side-effect `.scss` / `.css` imports from emitted JS
  because styles are in the Vite-built [`dist/styles.css`](./dist/styles.css) and
  [`dist/styles-domain.css`](./dist/styles-domain.css), not in the TS output.
- **CSS** — Vite compiles two SCSS entry points into [`dist/styles.css`](./dist/styles.css) (design tokens + core primitives) and [`dist/styles-domain.css`](./dist/styles-domain.css) (mining-domain components). PostCSS ([`postcss-mdk-layer.mjs`](./postcss-mdk-layer.mjs)) wraps top-level rules in `@layer mdk` and prepends `@layer base, mdk, app;`.
- **Registry** — `npm run build:registry` emits [`dist/registry.json`](./dist/registry.json). Run `npm run check:agent-ready` before changing
  public exports (also runs in root `npm run fullcheck`).
- **SCSS source** — [`_mixins.scss`](./src/primitives/styles/_mixins.scss) and [`_colors.scss`](./src/primitives/styles/_colors.scss) stay exposed as
  subpath exports so downstream apps can `@use` them from their own SCSS.

## Development

```bash
npm run dev                    # watch CSS + TS
npm run build                  # build:ts + build:scss + build:registry
npm run build:ts               # TypeScript only
npm run build:scss             # Vite → dist/styles.css + dist/styles-domain.css
npm run build:registry         # dist/registry.json
npm run check:agent-ready      # contract gate (needs registry build)
npm run typecheck
npm run test
```
