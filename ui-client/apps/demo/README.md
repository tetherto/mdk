# @mdk/demo

Demo application showcasing the `@mdk/core` component library.

## Getting Started

```bash
# Install dependencies (from root)
pnpm install

# Run the demo app
pnpm --filter @mdk/demo dev
```

## Features

This demo showcases:

- Button variants and sizes
- Dialog components
- Checkboxes and switches
- Dropdown menus and tooltips
- Avatars
- Accordions
- Dashboard components (Active Incidents, Pool Details)
- Charts and data visualization
- And more!

## Development

```bash
# Type check
pnpm --filter @mdk/demo typecheck

# Lint
pnpm --filter @mdk/demo lint

# Build
pnpm --filter @mdk/demo build
```

## Build info

The production bundle is aggressively minified with Terser, which strips
all `console.*` calls (`drop_console: true` in `vite.config.ts`). To keep
build metadata available in deployed environments without weakening that
setting, build info is attached to the global `window` object and
appended to the document title at bootstrap.

### Inspecting a deployed build

Open the browser devtools console on any deployed page and run:

```js
window.__MDK_BUILD__
// → { version, branch, commit, commitDate, buildDate }

copy(window.__MDK_BUILD__)
// copies the full object to the clipboard for bug reports
```

The page title also carries the version suffix (for example,
`MDK Demo · v0.0.1`), so you can identify the running build at a glance
without opening devtools.

### Shape

`window.__MDK_BUILD__` matches the `__BUILD_INFO__` define injected by
Vite — see `vite.config.ts` for how each field is populated, and
`src/vite-env.d.ts` for the TypeScript declaration.
