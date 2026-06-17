# Build system, scripts and watch mode

Complete guide to building and developing inside the MDK monorepo —
the Turborepo pipeline, configuration files, the full script surface,
and how to drive it all.

## Quick start

```bash
corepack enable    # if not already enabled
npm install
npm run build      # required at least once on a fresh clone
npm run dev        # watch everything and start the catalog app
```

## Stack

- **Monorepo tool**: Turborepo
- **Package manager**: npm >=11 workspaces (no pnpm, no yarn)
- **Build tools**:
  - TypeScript compiler (`tsc`) for `.ts/.tsx`. All three TypeScript
    packages are **pre-built** — `tsc` emits ESM JS + `.d.ts`
    declarations under `dist/` and every `exports` map resolves there,
    so external NPM consumers never compile our source.
  - Vite for SCSS compilation in `@tetherto/mdk-react-devkit` and
    `@tetherto/mdk-fonts`.
  - A small custom PostCSS plugin
    (`packages/react-devkit/postcss-mdk-layer.mjs`) that wraps top-level
    rules in `@layer mdk` and prepends `@layer base, mdk, app;`.
  - `packages/react-devkit/scripts/strip-style-imports.mjs` — a small
    post-`tsc` step that removes side-effect `.scss` / `.css` imports
    from the emitted JS (the bundled `dist/styles.css` already contains
    every component's styles).

### Why Turborepo?

- Already in use, no new tools to learn.
- Intelligent caching — builds are reused across runs.
- Parallel execution of independent tasks.
- Automatic dependency-graph ordering.
- Simple configuration in a single `turbo.json`.

## Build pipeline

```
npm run build
   │
   ▼
Turborepo
   ├── @tetherto/mdk-ui-core           (build:ts: tsc → dist/ ESM + d.ts)
   ├── @tetherto/mdk-react-adapter     (build:ts: tsc → dist/ ESM + d.ts)
   ├── @tetherto/mdk-react-devkit      (build:ts: tsc → dist/ ESM + d.ts, then build:scss: vite → dist/styles.css)
   ├── @tetherto/mdk-fonts             (build:scss: vite → dist/jetbrains-mono.css)
   └── apps/catalog                    (build: vite → dist/, consumes all packages from their dist/)
```

When you run a full build, Turborepo will:

1. Build `@tetherto/mdk-ui-core` first (no workspace deps).
2. Build `@tetherto/mdk-react-adapter` after the core (depends on it).
3. Build `@tetherto/mdk-fonts` in parallel (no workspace deps).
4. Build `@tetherto/mdk-react-devkit` after its workspace deps complete.
5. Build `apps/catalog` last.

Every TypeScript package ships a pre-built `dist/`. The devkit's SCSS
is built once into a single layer-wrapped stylesheet shipped as
`./styles.css`; the SCSS source files (`_mixins.scss`, `_colors.scss`)
are also exposed as subpath exports for consumers authoring their own
SCSS. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the package layering
and [`STYLING.md`](STYLING.md) for the cascade-layer details.

## Configuration files

### Root: `turbo.json`

Defines the task graph used by every workspace:

```json
{
  "tasks": {
    "build":         { "dependsOn": ["^build"],      "outputs": ["dist/**", ".next/**"] },
    "build:ts":      { "dependsOn": ["^build:ts"],   "outputs": ["dist/**"] },
    "build:scss":    { "dependsOn": ["^build:scss"], "outputs": ["dist/**"] },
    "dev":           { "cache": false, "persistent": true },
    "lint":          { "dependsOn": ["^build"] },
    "typecheck":     { "dependsOn": ["^build"] },
    "test":          { "dependsOn": ["^test"] },
    "test:coverage": { "outputs": ["coverage/**"] },
    "clean":         { "cache": false }
  }
}
```

### Per-package: `package.json` scripts

A typical pre-built package (`mdk-ui-core`, `mdk-react-adapter`):

```json
{
  "scripts": {
    "build": "npm run build:ts",
    "build:ts": "tsc -p tsconfig.build.json",
    "dev:ts": "tsc --watch"
  }
}
```

The devkit (pre-built TS + Vite-built CSS):

```json
{
  "scripts": {
    "build": "rimraf dist tsconfig.tsbuildinfo tsconfig.build.tsbuildinfo && npm run build:ts && npm run build:scss",
    "build:ts": "tsc -p tsconfig.build.json && node scripts/strip-style-imports.mjs dist",
    "build:scss": "vite build",
    "dev:ts": "tsc --watch",
    "dev:scss": "vite build --watch"
  }
}
```

### Per-package: `vite.config.js`

CSS-only packages.

The devkit vite config registers `postcssMdkLayer()` so every emitted CSS
file declares `@layer base, mdk, app;` and wraps unlayered rules in
`@layer mdk`:

```js
import postcssMdkLayer from "./postcss-mdk-layer.mjs"

export default defineConfig({
  css: {
    postcss: { plugins: [postcssMdkLayer()] },
  },
  build: {
    lib: { entry: "src/styles/index.scss", formats: ["es"] },
    outDir: "dist",
    cssCodeSplit: false,
  },
})
```

## Root scripts

All root scripts proxy to Turborepo, which fans out across workspaces.

| Script                 | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run build`        | Build every workspace (`turbo build`)                   |
| `npm run build:ts`     | TypeScript-only build (`turbo build:ts`)                |
| `npm run build:scss`   | SCSS-only build (`turbo build:scss`)                    |
| `npm run build:catalog`| Production build of `apps/catalog` with `/mdk` base path |
| `npm run dev`          | Watch every workspace + start the catalog app           |
| `npm run dev:catalog`  | Start `apps/catalog` only (HMR)                         |
| `npm run dev:packages` | Watch every workspace except the catalog app            |
| `npm run watch`        | Alias for `dev`                                         |
| `npm run watch:ts`     | Watch only TypeScript across workspaces                 |
| `npm run watch:scss`   | Watch only SCSS across workspaces                       |
| `npm run preview:catalog` | Preview the catalog app's production build           |
| `npm run lint`         | ESLint across workspaces                                |
| `npm run lint:fix`     | ESLint with `--fix`                                     |
| `npm run format`       | ESLint `--fix` (same config; we use ESLint stylistic)   |
| `npm run typecheck`    | `tsc --noEmit` across workspaces                        |
| `npm run test`         | Vitest once across workspaces                           |
| `npm run test:watch`   | Vitest in watch mode                                    |
| `npm run test:coverage`| Vitest with coverage (writes to `coverage/`)            |
| `npm run check`        | `turbo check` (lint + format + typecheck)               |
| `npm run fullcheck`    | `build` + `lint` + `typecheck` + `format` + coverage    |
| `npm run size`         | Bundle-size report via `scripts/bundle-size.mjs`        |
| `npm run generate:shell` | Regenerate `apps/mdk-ui-shell` from the CLI template (`rimraf` + `mdk-ui create`) |
| `npm run clean`        | Remove `dist/` and `node_modules/` across workspaces    |

> **`generate:shell` runs the _built_ CLI** (`node packages/cli/dist/bin.js`),
> not the TypeScript source. If you've edited the CLI (`packages/cli/src/**`)
> **or the template** (`packages/cli/templates/mdk-ui-shell/**`), rebuild the
> CLI first or you'll scaffold from a stale `dist/`:
>
> ```bash
> npm run build --workspace @tetherto/mdk-ui-cli   # recompile + copy templates
> npm run generate:shell                            # regenerate apps/mdk-ui-shell
> ```
>
> `apps/mdk-ui-shell` is git-ignored generated output — the template under
> `packages/cli/templates/mdk-ui-shell/` is the source of truth. After
> regenerating, verify the result: `typecheck` + `lint` + `build` on the
> `@tetherto/mdk-ui-shell` workspace.

## Per-package scripts

Every workspace exposes the same script names where applicable, so the
Turborepo fan-out is uniform.

### `@tetherto/mdk-ui-core`

Framework-agnostic state + utilities. Pre-built to JS + d.ts.

```bash
npm run --workspace @tetherto/mdk-ui-core build      # tsc → dist/
npm run --workspace @tetherto/mdk-ui-core dev:ts     # tsc --watch
npm run --workspace @tetherto/mdk-ui-core typecheck  # tsc --noEmit
npm run --workspace @tetherto/mdk-ui-core test       # vitest run
```

### `@tetherto/mdk-react-adapter`

React bindings for `mdk-ui-core`. Pre-built to ESM JS + `.d.ts` under
`dist/`; the package `exports` map resolves there.

```bash
npm run --workspace @tetherto/mdk-react-adapter build
npm run --workspace @tetherto/mdk-react-adapter dev:ts
npm run --workspace @tetherto/mdk-react-adapter typecheck
npm run --workspace @tetherto/mdk-react-adapter test
```

### `@tetherto/mdk-react-devkit`

Generic UI primitives (`src/core`) + mining-domain components
(`src/foundation`). Pre-built to ESM JS + `.d.ts` under `dist/` (with a
post-`tsc` step that strips side-effect SCSS imports) plus a Vite-built
`dist/styles.css`.

```bash
npm run --workspace @tetherto/mdk-react-devkit build       # tsc → dist/ + strip-style-imports + vite → dist/styles.css
npm run --workspace @tetherto/mdk-react-devkit build:ts    # tsc + strip-style-imports
npm run --workspace @tetherto/mdk-react-devkit build:scss  # vite build → dist/styles.css
npm run --workspace @tetherto/mdk-react-devkit dev         # concurrent tsc + vite watch
npm run --workspace @tetherto/mdk-react-devkit dev:ts      # tsc --watch
npm run --workspace @tetherto/mdk-react-devkit dev:scss    # vite build --watch
npm run --workspace @tetherto/mdk-react-devkit test
```

### `@tetherto/mdk-fonts`

Font assets only.

```bash
npm run --workspace @tetherto/mdk-fonts build
npm run --workspace @tetherto/mdk-fonts dev
```

### `apps/catalog` (`@tetherto/mdk-catalog-ui`)

```bash
npm run --workspace @tetherto/mdk-catalog-ui dev        # Vite dev server
npm run --workspace @tetherto/mdk-catalog-ui build      # Production build
npm run --workspace @tetherto/mdk-catalog-ui preview    # Preview built site
```

## Concurrent watch mode (devkit)

The devkit's `dev` script runs `tsc --watch` and `vite build --watch`
through `concurrently` so both layers stay live:

```jsonc
{ "dev": "concurrently -n ts,scss -c cyan,magenta \"npm run dev:ts\" \"npm run dev:scss\"" }
```

Output looks like:

```
[ts]   Found 0 errors. Watching for file changes.
[scss] ✓ built in 235ms
```

## Filtering with Turborepo directly

```bash
turbo build --filter=@tetherto/mdk-ui-core         # only the core
turbo build --filter=@tetherto/mdk-ui-core...      # core + everything that depends on it
turbo build --filter=!@tetherto/mdk-catalog-ui     # everything except the catalog app
turbo dev   --filter=@tetherto/mdk-react-devkit    # watch only the devkit
```

### Cache behavior

```bash
npm run build              # cold build
npm run build              # ~instant warm build (all cached)
npm run build -- --force   # ignore cache
npm run clean              # delete dist/ across all packages
```

## Dependency graph

```
@tetherto/mdk-ui-core              (built JS + d.ts)
  └── @tetherto/mdk-react-adapter  (built JS + d.ts)
        └── @tetherto/mdk-react-devkit ─┐  (built JS + d.ts + CSS)
                                        ├──→ @tetherto/mdk-catalog-ui
@tetherto/mdk-fonts ────────────────────┘  (CSS only, no JS deps)
```

Turborepo guarantees the correct order and parallelizes independent
tasks:

- `mdk-ui-core` builds before `mdk-react-adapter`.
- `mdk-react-adapter` builds before `mdk-react-devkit`.
- `mdk-fonts` builds in parallel with the React stack.
- The catalog build sees up-to-date `dist/` for every workspace
  dependency.

Outputs are cached between runs.

## Performance

| Scenario                  | Approx. time | Cache   |
| ------------------------- | ------------ | ------- |
| Cold build (first time)   | ~6–8s        | no      |
| Warm build, no changes    | ~0.1s        | yes     |
| Single-file source change | ~1–2s        | partial |
| `npm run test:coverage`   | dominated by Vitest, not Turborepo | — |

## Best practices

1. **Run from the root**: `npm run dev`, `npm run build`. Turborepo
   orders and caches dependencies correctly; per-package invocations are
   only useful when isolating a failure.
2. **Trust the cache**: Turborepo's cache is keyed off inputs. Never use
   `--force` unless you suspect cache corruption — the cache is normally
   correct.
3. **Run `npm run build` before `npm run dev` on a fresh clone** — the
   pre-built packages (`mdk-ui-core`, `mdk-react-adapter`) need their
   `dist/` populated before the devkit consumes them.
4. **Keep `turbo.json` simple**; per-package nuance belongs in that
   package's own `package.json` scripts.
5. **Keep script names consistent** across workspaces (`build`,
   `build:ts`, `build:scss`, `dev`, `dev:ts`, `dev:scss`, `lint`,
   `test`, `typecheck`) so the root-level `turbo <script>` invocations
   work everywhere.
6. **Use `npm run fullcheck` before pushing** when in doubt — it runs
   build, lint, typecheck, format and coverage in one shot.

## Troubleshooting

### SCSS not regenerating

```bash
npm run --workspace @tetherto/mdk-react-devkit build:scss
```

### TypeScript errors that look stale

```bash
npm run --workspace @tetherto/mdk-ui-core build
npm run --workspace @tetherto/mdk-react-adapter build
npm run typecheck
```

### Watch mode behaving oddly

```bash
pkill -f "tsc --watch" 2>/dev/null
pkill -f "vite"        2>/dev/null
npm run dev
```

### Isolating a build failure

```bash
npm run build --verbose                                 # verbose output
npm run --workspace @tetherto/mdk-react-devkit build    # per-package build
```

### Cache feels wrong

```bash
turbo clean
npm run clean
rm -rf node_modules
npm install
npm run build
```
