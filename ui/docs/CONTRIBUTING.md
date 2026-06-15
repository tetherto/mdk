# Contributing

Welcome! This document describes the day-to-day workflow inside the MDK
monorepo.

## Contribution workflow

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Make your changes.
4. If you touched public exports in `@tetherto/mdk-react-devkit`, run
   `npm run check:agent-ready --workspace @tetherto/mdk-react-devkit`
   (see [Component and hook documentation tiers](#component-and-hook-documentation-tiers)).
5. Run checks: `npm run check` (lint + format + typecheck).
6. Run tests: `npm run test` (or `npm run test:coverage` if you touched
   logic-heavy code).
7. Commit: `git commit -m "feat(scope): add my feature"`.
8. Push: `git push origin feat/my-feature`.
9. Open a Pull Request.

For a full verification before pushing, `npm run fullcheck` runs build,
lint, typecheck, format, `check:agent-ready` on the devkit, and
`test:coverage` in one go.

## Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

**Examples**:

```
feat(react-devkit): add MinerCard component
fix(ui-core): correct removeMultipleSelectedSockets filter logic
docs(readme): refresh the architecture overview
refactor(react-adapter): simplify useTelemetry implementation
test(react-devkit): add tests for DataTable column ordering
chore(deps): bump zustand to v5
```

## Code style

- **Formatting**: ESLint via `@antfu/eslint-config`.
- **Quotes**: double.
- **Semicolons**: required.
- **Indentation**: 2 spaces.
- **Line length**: 120 characters (soft).

Pre-commit hooks (Husky + lint-staged) run `eslint --fix` and
`prettier --write` on staged files automatically.

## Daily commands

```bash
# Development
npm run dev                              # watch every package + run the catalog
npm run dev:packages                     # packages only, no catalog
npm run dev:catalog                      # catalog with HMR (requires built packages)
turbo dev --filter @tetherto/mdk-ui-core # focus a single workspace

# Build
npm run build                            # everything
turbo build --filter '@tetherto/*'       # named filter

# Test
npm run test                             # vitest run across workspaces
npm run test:watch                       # vitest watch
npm run test:coverage                    # vitest run --coverage

# Lint / typecheck
npm run lint                             # eslint
npm run lint:fix
npm run typecheck                        # tsc --noEmit
npm run check                            # lint + format + typecheck
npm run fullcheck                        # build + lint + typecheck + format + check:agent-ready + coverage
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit  # devkit contract only

# Clean
npm run clean                            # remove dist/ and node_modules/ across workspaces
```

## Adding dependencies

See [`CLAUDE.md`](../CLAUDE.md#adding-dependencies) for the canonical
workspace-vs-root install commands and the centrally-managed version policy.

## Creating a new package

The toolkit follows a **framework-first** naming convention:

- Framework-agnostic: `@tetherto/mdk-ui-<thing>`.
- Framework-specific: `@tetherto/mdk-<framework>-<thing>` (today only
  `react-` exists).

1. Create the package directory under `packages/<framework>-<name>/`
   (e.g. `packages/react-state/`).
2. Add `package.json`:

   ```json
   {
     "name": "@tetherto/mdk-react-state",
     "version": "0.0.1",
     "type": "module",
     "private": true,
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "default": "./src/index.ts"
       }
     },
     "scripts": {
       "build": "tsc -p tsconfig.build.json",
       "dev:ts": "tsc --watch",
       "typecheck": "tsc --noEmit",
       "lint": "eslint .",
       "test": "vitest run"
     },
     "peerDependencies": {
       "react": "^19.0.0"
     }
   }
   ```

3. Add `tsconfig.json` extending `tsconfig.base.json`:

   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
     "include": ["src"]
   }
   ```

4. Add `src/index.ts` and start writing code.
5. Run `npm install` at the repo root to wire the new workspace.
6. Update `docs/ARCHITECTURE.md`, `README.md`, and (where applicable)
   `CLAUDE.md` and [`AGENTS.md`](../AGENTS.md) so the new package is discoverable.

## State, theming, and styling rules

These are enforced architectural decisions — please follow them:

- **State** lives in Zustand vanilla stores inside
  `@tetherto/mdk-ui-core`. React components consume them via the hooks in
  `@tetherto/mdk-react-adapter`. **Do not** reintroduce Redux, MobX or
  any alternative state library.
- **Data fetching** is TanStack Query. The headless client lives in the
  core package, the React adapter wraps it with `MdkProvider`.
- **Styling** uses SCSS with cascade layers. The devkit's compiled CSS
  emits `@layer base, mdk, app;` followed by `@layer mdk { … }`. Tokens
  live under `--mdk-*` CSS custom properties — see
  `docs/STYLING.md`.
- **No inline styles** in components. Use BEM class names
  (`mdk-<block>__<element>--<modifier>`) and override with
  `@layer app` in consuming apps.

### Tracking tech debt

The separation-of-concerns rule is documented in
[`CLAUDE.md`](../CLAUDE.md#separation-of-concerns-load-bearing-rule) and
[`ARCHITECTURE.md`](ARCHITECTURE.md). If a fix is small enough to land in
your current change, just do it — the goal is fewer violations, not better
bookkeeping. When you spot a layering or pattern violation you can't fix
right then (a component calling `useQuery`/`fetch`, a page doing unit
conversions or building chart/table payloads inline, a tag or
aggregate-field string leaking past the data layer), file a GitHub issue
labelled `techdebt` naming the file and a one-sentence "why it violates" so
the next cleanup pass can pick it up.

## Testing guidelines

- Use Vitest with `@testing-library/react` for DOM-bound tests, or the
  `node` environment for pure logic.
- Interact with Zustand stores directly via `store.getState()` and
  `vi.spyOn`. There is **no** Redux Provider to mock.
- Reset stores in `beforeEach` (`store.getState().reset()`) so tests are
  isolated.

**Component test**:

```ts
import { render, screen } from "@testing-library/react"
import { Button } from "./button"

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })
})
```

**Store test**:

```ts
import { authStore } from "@tetherto/mdk-ui-core"

describe("authStore", () => {
  beforeEach(() => authStore.getState().reset())

  it("sets permissions", () => {
    authStore.getState().setPermissions(["read"])
    expect(authStore.getState().permissions).toEqual(["read"])
  })
})
```

### Coverage

The monorepo uses Vitest with the v8 coverage provider. Coverage is
configured per package (each owns its `vitest.config.js`) and enforced both
locally (`npm run test:coverage`) and in CI.

**Thresholds** — the authoritative values; when adjusting them, update both
this document and the relevant `vitest.config.js`:

| Package | Lines / Functions / Statements | Branches | Notes |
|---------|--------------------------------|----------|-------|
| `@tetherto/mdk-ui-core` | 85% | 80% | Headless state + utilities, Node env. |
| `@tetherto/mdk-react-adapter` | 80% | 80% | React bindings, `happy-dom` env. |
| `@tetherto/mdk-react-devkit` | 80% | 80% | UI library, three Vitest projects (`node`, `core-dom`, `foundation-dom`). |
| `@tetherto/mdk-fonts` | — | — | Asset-only; no tests, no coverage. |

**Exclusions** — common to all: barrel `index.{ts,tsx}` files, `*.d.ts`, and
test files / test utilities. Additionally: `src/types/**` (ui-core);
`src/**/icons/**`, `src/core/components/logs/**`,
`src/core/components/labeled-card/**`, `src/core/types/**`,
`src/**/*.stories.{ts,tsx}` (react-devkit). All packages report
`["text-summary", "html", "lcov", "json"]` with `reportOnFailure: true`.

**Running coverage:**

```bash
npm run test:coverage                                          # all workspaces
npm run --workspace @tetherto/mdk-ui-core       test:coverage
npm run --workspace @tetherto/mdk-react-adapter test:coverage
npm run --workspace @tetherto/mdk-react-devkit  test:coverage
```

CI enforces coverage on push to `main` / `develop` / `staging` and on PRs
targeting those branches; the pipeline fails if any package drops below its
thresholds or any test fails.

**Reports** — after `npm run test:coverage`, HTML reports land under
`<package>/coverage/index.html` (e.g.
`open packages/react-devkit/coverage/index.html`). The LCOV report is also
emitted and CI uploads it as an artefact for the coverage dashboards.

**Workflow** — write tests alongside new code and aim for the thresholds on
new code (CI refuses regressions). For a bug fix, add a failing test that
reproduces it first, then fix and confirm coverage has not regressed. Raise
the targets in `vitest.config.js` as packages mature.

**Troubleshooting:**

| Symptom | Fix |
|---------|-----|
| Coverage report missing | `npm install` (ensures `@vitest/coverage-v8`). |
| Thresholds blow up after a refactor | Adjust them in the package's `vitest.config.js` if the drop is intentional, otherwise add the missing test. |
| Tests pass locally, fail on CI | `rm -rf node_modules && npm ci`; verify Node version matches. |
| Vitest sees stale source | `turbo clean && npm run build && npm run test:coverage`. |

## Documentation guidelines

When you change behaviour, update the matching docs:

- `README.md` — top-level summary.
- [`AGENTS.md`](../AGENTS.md) — repo-level guide for AI agents: manifests,
  `mdk-ui` CLI, contributor quick recipes (keep in sync when agent surfaces change).
- [`docs/AGENT_FIRST.md`](AGENT_FIRST.md) — plain-language tour, local test
  checklist, and the end-to-end shell setup for the agent-first system.
- `CLAUDE.md` — Claude Code guidance in this repo (keep in sync with `AGENTS.md`
  and the rules below).
- `docs/ARCHITECTURE.md` — package boundaries, dependency graph, directory
  tree, and per-package responsibilities.
- `docs/BUILD.md` — anything that affects build tasks or scripts.
- `docs/STYLING.md` — styling changes.

### Component and hook documentation tiers

Every public export in `@tetherto/mdk-react-devkit` must declare its
audience via a `@tier` JSDoc tag. There are three tiers — pick the right
one and add what it requires:

| Tier | Use when… | Must add |
|------|-----------|----------|
| `agent-ready` | An LLM or non-expert will pick this directly to build a page | JSDoc + `@category` + `@domain` + `@tier` + `USAGE.md` + `*.example.tsx` (+ `@orkCapability` when `@domain ≠ generic`) |
| `advanced` | A downstream engineer composes or extends with this | JSDoc + `@category` + `@domain` + `@tier` |
| `internal` | Implementation detail, never part of the public API | `@tier internal` only |

**Decision rule** — ask yourself one question: *"Will an LLM or a
non-expert pick this directly when building a page?"*
- Yes → `agent-ready`
- No, but exported for engineers → `advanced`
- No, truly private → `internal`

#### JSDoc minimum (all tiers except `internal`)

```tsx
/**
 * One-sentence description of what this renders / does.
 *
 * @category cards
 * @domain mining-operations
 * @tier advanced
 */
export const MyComponent = (…) => { … };
```

The first paragraph becomes the registry description — keep it ≤ 200 chars.
Longer prose belongs in `USAGE.md`.

#### Extra files required for `agent-ready`

Place these next to the component's `index.tsx`:

```
my-component/
  index.tsx
  my-component.example.tsx   ← runnable, imports only from "@tetherto/mdk-react-devkit"
  USAGE.md                   ← summary + props table + minimal example + notes
```

`USAGE.md` skeleton:

```markdown
# MyComponent

One-paragraph summary.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `foo` | `string` | yes | — | The primary thing. |

## Minimal example

```tsx
<MyComponent foo="hello" />
```

## Notes

- Anything non-obvious about composition, accessibility, or performance.
```

#### Blueprints — only when adding a new user intent

Blueprints live in `packages/react-devkit/blueprints/` and map a high-level
goal ("build a mining dashboard") to a concrete set of components. You do
**not** write a blueprint per component. Write one only when there is a new
category of user intent that isn't covered by the existing four blueprints
(`mining-operations-dashboard`, `reporting`, `device-management`,
`custom-feature`).

#### Validation

```bash
# Check locally before pushing
npm run check:agent-ready --workspace @tetherto/mdk-react-devkit

# Runs automatically as part of the full suite
npm run fullcheck
```

The gate compares against a baseline — new violations fail the build.
See [`packages/react-devkit/AGENT_READY.md`](../packages/react-devkit/AGENT_READY.md)
for the full contract, allowed values for `@tier` / `@category` / `@domain` /
`@orkCapability`, paste-ready templates, and the error catalogue.

## Pull request guidelines

**PR title** uses the Conventional Commits format:
`feat(react-devkit): add MinerCard component`.

**PR description** template:

```markdown
## Description

Brief description of the change.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] `npm run fullcheck` passes (includes `check:agent-ready` on the devkit)
- [ ] `check:agent-ready` passes if you changed devkit public exports
- [ ] No new warnings

## Related Issues

Closes #123
```

## Review process

1. CI must be green: `security`, then parallel `quality` (lint, typecheck,
   format, **`check:agent-ready`**), `test`, `coverage`, `build`, then `summary`.
2. At least one maintainer reviews the change.
3. The reviewer pulls the branch locally if behaviour changes UI.
4. Maintainer approves and merges with squash.

## Publishing

We follow [Semantic Versioning](https://semver.org/):

- **Major** — breaking changes.
- **Minor** — backward-compatible features.
- **Patch** — backward-compatible bug fixes.

Releases are driven by Conventional Commits; the changelog is generated
from the commit history.
