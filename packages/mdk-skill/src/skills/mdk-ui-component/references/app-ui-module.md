# An MDK App's UI module

## Overview

An MDK App ships its UI as one ES module, `ui/index.js`, built from `ui-src/`. The dashboard imports it at runtime,
mounts its pages under `/app/<name>/`, and renders its panels on the dashboard's own pages. This page describes the
module contract, the layout `mdk create app` scaffolds, the build, and what the dashboard lends the app.

## Layout

`mdk create app <name>` writes this starter UI, one page and one Home panel, and builds it once:

```text
<app>/
├── ui-src/                    # build input, not published
│   ├── index.tsx              # the module: defineMdkApp({ id, displayName, routes, panels, sections })
│   ├── data/<thing>.ts        # response type, query key, mdkFetch request (no React)
│   ├── hooks/use-<thing>.ts   # useQuery + toQueryView, shaped into a view union
│   ├── components/<thing>-panel.tsx  # renders each state with devkit components
│   ├── pages/<page>-page.tsx  # thin: the hook into the component
│   ├── styles.css             # built to ui/style.css
│   ├── vite.config.ts         # library build to ../ui, MDK packages external
│   └── package.json           # the UI's own build dependencies
└── ui/                        # built output: index.js and style.css, published and committed
```

The app's `package.json` gets `build:ui`, `dev:ui` and `typecheck:ui` scripts that run in `ui-src/`, and its `files`
publish `ui/`, never `ui-src/`. The CLI's [starter UI](../../../../../cli/templates/app-ui/ui-src/index.tsx) is the
smallest working example of every layer.

## The module contract

`ui-src/index.tsx` default-exports `defineMdkApp({ ... })` from `@tetherto/mdk-react-adapter`. The dashboard checks
the module when it loads it and skips an app whose module breaks the contract, without affecting the other apps.

| Field         | Type              | Rule                                                                                   |
| ------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `id`          | `string`          | Equals `id` in `mdk-app.yaml`; the dashboard refuses a mismatch                        |
| `displayName` | `string`          | Not empty. Names the app's sidebar group and, by default, its panels                   |
| `routes`      | `MdkAppRoute[]`   | The app's pages                                                                        |
| `panels`      | `MdkAppPanel[]`   | Components on pages the dashboard owns. `[]` for none                                  |
| `sections`    | `MdkAppSection[]` | Optional. An icon for a route `section`; a section works without an entry              |

### Routes

| Field       | Type            | Meaning                                                                                    |
| ----------- | --------------- | ------------------------------------------------------------------------------------------ |
| `path`      | `string`        | Relative to the app's mount: `''` is its landing page, `'drift/:minerId'` a deep link      |
| `label`     | `string`        | Sidebar label. Defaults to `displayName` for the landing page                              |
| `section`   | `string`        | Sidebar group inside the app's group, e.g. `'Operations'`                                  |
| `hidden`    | `boolean`       | Routed but kept out of the sidebar, for a page reached from another page                   |
| `component` | `ComponentType` | The page, rendered inside the app's provider and an error boundary                         |

Pages link to each other with relative paths (`<Link to="../thing">`), never with the installed name, and read their
params and query with `react-router`'s hooks.

### Panels and sections

| Type            | Fields                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `MdkAppPanel`   | `id` (unique in the app), `slot` (`MDK_APP_PANEL_SLOT.HOME` for the landing page), `title`, `component` |
| `MdkAppSection` | `label` (the routes' `section`), `icon` (a component rendered with no props, e.g. `OperationsNavIcon`) |

Never add a `sections` entry with an empty or duplicate `label`. A dashboard created before sidebar sections shipped
lists the pages flat; recreate it with `mdk create dashboard`.

## Reaching the app's own routes

Every page and panel renders inside the app's provider, so `useMdkApp()` from `@tetherto/mdk-react-adapter` knows the
app it belongs to.

| Field         | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| `apiUrl`      | `(path) => string`: the absolute URL of one of the app's routes, `apiUrl('/api/<name>/thing')` |
| `apiBase`     | The app's mount, e.g. `/apps/<name>`                                                       |
| `name`        | The installed name: the operator's choice, not fixed by the app                            |
| `id`, `version`, `displayName` | From the installed app                                                    |

The Gateway serves an app's routes under `/apps/<installed name>` unless its `spec.apps` entry sets `mount: /`, and
the operator chooses the installed name. `apiUrl` resolves both, so a hardcoded `/apps/<name>/...` breaks as soon as
someone installs the app under another name.

## Build

```ts
// ui-src/vite.config.ts
import { MDK_APP_SHARED_MODULES } from '@tetherto/mdk-ui-foundation/app-shared-modules'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: '../ui',
    emptyOutDir: true,
    lib: { entry: 'index.tsx', formats: ['es'], fileName: () => 'index.js', cssFileName: 'style' },
    rollupOptions: { external: [...MDK_APP_SHARED_MODULES] },
  },
})
```

The dashboard lends every app its own copies of these modules through an import map, so the app bundles none of them:

| Shared module                 | Import from it                                                     |
| ----------------------------- | ------------------------------------------------------------------ |
| `react`, `react-dom`          | Hooks and components                                               |
| `react-router`                | `Link`, `useNavigate`, `useParams`, `useSearchParams`              |
| `@tanstack/react-query`       | Nothing directly: use the re-exports in `@tetherto/mdk-react-adapter` |
| `@tetherto/mdk-ui-foundation` | `mdkFetch`, `toCsv`, `downloadCsv`, `authStore`                    |
| `@tetherto/mdk-react-adapter` | `defineMdkApp`, `useMdkApp`, `useQuery`, `toQueryView`, `usePeriod` |
| `@tetherto/mdk-react-devkit`  | Components, icons, chart options, formatting                      |

Only these root specifiers are shared. A subpath import such as `@tetherto/mdk-react-devkit/primitives` is not
external, so it bundles a second copy of the package, with its own React context, into the app. The devkit's own
header recommends its subpaths for tree-shaking; that holds for a dashboard, which bundles the devkit itself, not for
an app. Anything else the app imports (zod, say) is bundled, which is expected.

> [!IMPORTANT]
> Run `npm run build:ui` after every change under `ui-src/` and commit `ui/`. `mdk add app github:<owner>/<repo>#<tag>`
> installs the package as it is and runs no build, so a stale `ui/` ships stale code.

## Styles

`ui-src/styles.css` is built to `ui/style.css`, which the dashboard adds to the page with the app. Prefix every class
with the app's own name so two apps never collide, style devkit components through your own class names, and reuse
the `--mdk-color-*` variables for colour.
