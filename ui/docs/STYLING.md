# Styling `@tetherto/mdk-react-devkit`

This guide covers both halves of the styling story:

- **Theming** — the supported ways a consuming app customizes the look and
  feel of MDK components.
- **SCSS build setup** — the internal pipeline that authors SCSS and ships two
  layer-wrapped CSS files (`styles.css` and `styles-domain.css`).

For the overarching repository conventions (BEM naming, CVA variant props,
no inline styles), see the styling section of `CLAUDE.md` at the repo root.

## Theming model

The model is intentionally narrow:

1. Override design **tokens** (CSS custom properties) — the recommended way to
   reskin the entire devkit.
2. Override individual **component classes** — escape hatch for one-off
   tweaks, made safe by the cascade layer model.
3. Pass component-specific `className` / `classNames` props — for purely local
   adjustments that should not bleed into other instances.

## Cascade layers (`@layer`)

The compiled `dist/styles.css` declares the following layer order at the top:

```css
@layer base, mdk, app;
```

| Layer  | Contents                                                              |
| ------ | --------------------------------------------------------------------- |
| `base` | Resets, design tokens (`:root { --mdk-* … }`), font-face declarations |
| `mdk`  | All component rules (`.mdk-button`, `.mdk-card`, …)                   |
| `app`  | _Yours._ Anything you write that is **not** inside an `@layer`        |

Because of the declared order, **any** style outside the `base` / `mdk` layers
wins against MDK component styles, regardless of selector specificity. This
means you don't need to use `!important` or specificity hacks to override the
devkit; you write CSS in your own stylesheet and it takes
precedence.

```css
/* Your app stylesheet, after importing the devkit styles. */
.mdk-button--variant-primary {
  background-color: rebeccapurple; /* wins over devkit's primary color */
}
```

If you also want to opt your own component styles into the cascade ordering
(recommended for design-system authors), wrap them in `@layer app`:

```css
@layer app {
  .my-card {
    /* … */
  }
}
```

## Design tokens

All design tokens are declared as CSS custom properties under `:root` inside
`@layer base`. The source of truth lives in
[`packages/react-devkit/src/primitives/styles/_colors.scss`](../packages/react-devkit/src/primitives/styles/_colors.scss)
and is also exposed as a subpath import:

```scss
// Build-time consumers can @use the SCSS source:
@use "@tetherto/mdk-react-devkit/tokens.scss";
```

Overriding tokens in your app:

```css
/* app.css — imported after @tetherto/mdk-react-devkit/styles.css */
:root {
  --mdk-color-primary: #5b8cff;
  --mdk-color-primary-button-hover: #7fa3ff;
  --mdk-button-primary-text: #ffffff;
  --mdk-radius: 6px;
}
```

You can also scope overrides to a region:

```css
.dashboard {
  --mdk-color-primary: #0ea5e9;
}
```

The most common knobs:

| Token                            | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `--mdk-color-primary`            | Brand / accent color                |
| `--mdk-color-surface`            | Default surface background           |
| `--mdk-color-text-secondary`     | Body text on dark surfaces           |
| `--mdk-radius`                   | Default control corner radius        |
| `--mdk-font-size`                | Default control font size            |
| `--mdk-shadow-sm` / `-md` / `-lg`| Elevation tokens                     |
| `--mdk-button-primary-bg`        | Primary button background            |
| `--mdk-table-header-bg`          | Data table header background         |

See the source file for the full list, every variable prefixed with `--mdk-`
is part of the public theming surface.

## Per-component class overrides

Every component renders a stable, BEM-style root class (`mdk-<component>`)
and uses modifier classes for variants and sizes (`mdk-button--variant-primary`,
`mdk-card--clickable`, …). These class names are part of the public API and are not
renamed without a major version bump.

```css
@layer app {
  .mdk-card {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .mdk-data-table__row--selected {
    background: var(--accent-soft);
  }
}
```

## Component `className` prop

Every devkit component accepts a `className` prop on its root element. Use
this for purely local adjustments that should not leak elsewhere:

```tsx
<Button className="primary-cta">Save changes</Button>
```

```css
@layer app {
  .primary-cta {
    width: 100%;
    letter-spacing: 0.05em;
  }
}
```

For components with multiple stylable slots (data tables, dialogs, sidebars),
a `classNames` slot map is the planned next step. Until then, target slot
classes directly via the cascade-layer escape hatch above.

## Core and foundation stylesheets

The devkit ships its CSS as two files so apps pay only for what they use:

| Import | Contains | Compressed size |
| --- | --- | --- |
| `@tetherto/mdk-react-devkit/styles.css` | Design tokens + core primitives (Button, Card, Input, charts, …) | ~18 KB |
| `@tetherto/mdk-react-devkit/styles-domain.css` | Mining-domain components (explorer, containers, pool-manager, reporting-tool, settings, …) | ~70 KB |

Import `styles.css` **first** (it defines the tokens the foundation styles
reference). Add `styles-domain.css` only if you use foundation components —
a core-primitives-only app skips it and ships ~70 KB less CSS.

```ts
import "@tetherto/mdk-react-devkit/styles.css"
import "@tetherto/mdk-react-devkit/styles-domain.css" // only if using foundation components
```

## Quick checklist

- [ ] Import `@tetherto/mdk-react-devkit/styles.css` once at your app root (plus
      `styles-domain.css` if you use mining-domain components).
- [ ] Define your overrides in `@layer app` (or simply leave them unlayered
      — both win over `@layer mdk` thanks to the declared order).
- [ ] Prefer overriding tokens (`--mdk-*`) before reaching for class
      overrides.
- [ ] Use `className` props for one-off styling concerns rather than global
      class overrides when possible.

## SCSS build setup

This monorepo uses **SCSS** compiled by **Vite** under the **Turborepo**
task graph. No CSS-in-JS runs at runtime — every stylesheet is
authored as SCSS and shipped as two layer-wrapped CSS files.

### Tech stack

- **Build orchestrator**: Turborepo.
- **CSS bundler**: Vite (modern Sass compiler API).
- **PostCSS**: a custom `postcss-mdk-layer` plugin
  (`packages/react-devkit/postcss-mdk-layer.mjs`) that wraps top-level
  rules in `@layer mdk` and prepends `@layer base, mdk, app;`.
- **Module resolution**: native npm-workspace package names —
  `@use '@tetherto/mdk-react-devkit/styles'` and friends just work because
  the consuming workspace declares the dep.

### Packages that build CSS

| Package                        | Source                                  | Output                              |
| ------------------------------ | --------------------------------------- | ----------------------------------- |
| `@tetherto/mdk-react-devkit`   | `src/styles.scss`                       | `dist/styles.css` (core)            |
| `@tetherto/mdk-react-devkit`   | `src/styles-domain.scss`                | `dist/styles-domain.css`            |
| `@tetherto/mdk-fonts`          | `src/jetbrains-mono.scss`               | `dist/jetbrains-mono.css`           |

The other two TypeScript packages (`mdk-ui-foundation` and
`mdk-react-adapter`) have no styles.

### Configuration: devkit `vite.config.js`

```js
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

import mdkLayer from "./postcss-mdk-layer.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    lib: {
      // Two entry points → two separate CSS outputs.
      entry: {
        styles: resolve(__dirname, "src/styles.scss"),
        "styles-domain": resolve(__dirname, "src/styles-domain.scss"),
      },
      formats: ["es"],
    },
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false,
    cssCodeSplit: true, // required to keep the two CSS outputs separate
    sourcemap: mode === "development",
    rollupOptions: {
      output: { assetFileNames: "[name].css" }, // → styles.css / styles-domain.css
    },
  },
  css: {
    devSourcemap: true,
    postcss: { plugins: [mdkLayer()] },
    preprocessorOptions: {
      scss: { api: "modern-compiler", silenceDeprecations: ["import"] },
    },
  },
}))
```

### `postcss-mdk-layer`

Every stylesheet that flows through this PostCSS plugin gets the
following treatment:

1. `@layer base, mdk, app;` is prepended so consumers can override us
   without bumping specificity.
2. Existing `@layer base { … }` blocks are preserved as-is (used for
   `:root` design tokens that must not lose specificity).
3. Everything else at the top level is wrapped in `@layer mdk { … }`.

Tests for the plugin live at
`packages/react-devkit/src/primitives/styles/specs/postcss-mdk-layer.test.ts`.

### Turborepo wiring

```json
{
  "tasks": {
    "build":      { "dependsOn": ["^build"],     "outputs": ["dist/**"] },
    "build:scss": { "dependsOn": ["^build:scss"], "outputs": ["dist/**"] }
  }
}
```

`npm run build:scss` runs Vite across every workspace that defines that
script (currently the devkit and fonts packages).

### Authoring SCSS

#### Import shared mixins from the devkit

The devkit exposes `_mixins.scss` and `_colors.scss` via its public
exports:

```jsonc
// packages/react-devkit/package.json
{
  "exports": {
    "./styles":      "./src/primitives/styles/_mixins.scss",
    "./tokens.scss": "./src/primitives/styles/_colors.scss"
  }
}
```

Use them with `@use`:

```scss
@use "@tetherto/mdk-react-devkit/styles" as *;

.my-component {
  padding: spacing(2);
  color:   var(--mdk-color-text-primary);
}
```

#### Author component CSS at the top level

Top-level rules are wrapped in `@layer mdk` automatically, so the
authoring style is unchanged compared to a non-layered codebase:

```scss
.mdk-button {
  border-radius: var(--mdk-radius-md);

  &--variant-primary {
    background: var(--mdk-color-action-primary);
  }
}
```

Putting design-token declarations inside `@layer base { :root { … } }`
keeps them outside the wrap so their specificity stays normal.

### Consuming the compiled CSS

```ts
// apps/catalog/src/main.tsx
import "@tetherto/mdk-react-devkit/styles.css"
import "@tetherto/mdk-fonts/jetbrains-mono.css"
```

Always import the **compiled** `.css` file — the SCSS source is not
shipped to runtime.

### Build commands

```bash
npm run build           # all packages, including SCSS
npm run build:scss      # only SCSS, across the monorepo
npm run --workspace @tetherto/mdk-react-devkit build:scss
```

Turborepo caches outputs; warm rebuilds are sub-second.

### Best practices

1. **Use CSS custom properties for theming**, not Sass `$variables`. The
   devkit exposes them under the `--mdk-*` namespace; consumers override
   them in `@layer app`.

   ```scss
   .button {
     background: var(--mdk-color-action-primary);
     color:      var(--mdk-color-text-on-action);
   }
   ```

2. **Namespace `@use` imports** (`@use '@tetherto/mdk-react-devkit/styles' as devkit`)
   to keep things self-documenting. Global imports (`as *`) are fine for
   the well-known core mixin module.

3. **Keep selectors flat**. Cascade layers already give us a deterministic
   override story; long descendant chains undermine that.

4. **Let Turborepo handle dependency order** — don't build CSS packages
   one at a time unless you're debugging.

### Troubleshooting

| Symptom                                  | Fix                                                |
| ---------------------------------------- | -------------------------------------------------- |
| `Can't find stylesheet to import`        | Confirm the dep is declared in `package.json`.     |
| Devkit CSS missing the `@layer` wrap     | Confirm `postcss-mdk-layer` is registered in vite. |
| Tokens applying with too much specificity| Make sure they live inside `@layer base { :root { … } }`. |
| Stale `dist/styles.css`                  | `turbo clean && npm run build:scss`.              |
