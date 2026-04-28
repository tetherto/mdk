# MDK Dev Kit - Project Structure

Complete monorepo structure with all packages and their relationships.

## 📁 Directory Structure

```
@tetherto/ui-dev-kit/
├── packages/
│   ├── core/                    # Core UI components, utilities, types, and theme system
│   ├── foundation/              # All-in-one foundation package (domain, feature, hooks, api, state, test-utils)
│   └── fonts/                   # Font assets (JetBrains Mono)
├── apps/
│   ├── demo/                    # Interactive demo application
│   └── cli/                     # CLI tools (placeholder)
├── docs/                        # Documentation files
│   ├── ARCHITECTURE.md
│   ├── BUILD_SCRIPTS.md
│   ├── BUILD_SYSTEM.md
│   ├── CONTRIBUTING.md
│   ├── SCSS_SETUP.md
│   ├── STRUCTURE.md
│   └── WATCH_MODE_GUIDE.md
└── scripts/                     # Build and utility scripts
```

## 📦 Package Details

### `@tetherto/mdk-core-ui`

**Purpose:** Core UI components, utilities, types, and theme system built on Radix UI primitives

**Location:** `packages/core`

**Exports:**
- Core types (Status, Pagination, ApiResponse, ComponentProps, etc.)
- Utility functions (cn, formatNumber, formatDate, validation)
- Radix UI-based components (Button, Dialog, Switch, Accordion, Alert Dialog, Avatar, Checkbox, etc.)
- Chart components (Chart.js, Lightweight Charts integration)
- Table components (TanStack Table integration)
- Form components with React Hook Form integration
- Theme utilities and CSS variables

**Key Dependencies:** 
- Radix UI primitives (@radix-ui/react-*)
- TanStack Table (@tanstack/react-table)
- Chart.js (chart.js, react-chartjs-2, chartjs-plugin-*)
- Lightweight Charts
- Class Variance Authority (cva)
- clsx, date-fns

**Exports Structure:**
- `.` → Built JavaScript (dist/index.js) with types (dist/index.d.ts)
- `./styles.css` → Compiled CSS (dist/styles.css)
- `./styles` → SCSS mixins for consumers (src/styles/_mixins.scss)

**Note:** Core exports built files (requires `pnpm build` before use)

**Usage:**
```tsx
import { Button, Dialog, cn, formatDate } from '@tetherto/mdk-core-ui'
import '@tetherto/mdk-core-ui/styles.css'
```

---

### `@tetherto/mdk-foundation-ui`

**Purpose:** All-in-one foundation package containing domain components, features, hooks, API client, state management, and test utilities

**Location:** `packages/foundation`

**Internal Structure:**
- `src/components/domain/` - Mining-specific business components
- `src/components/feature/` - Complete feature compositions
- `src/hooks/` - Custom React hooks
- `src/api/` - API client integration
- `src/state/` - Redux state management
- `src/test-utils/` - Testing utilities
- `src/constants/` - Shared constants
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions

**Exports Structure:**
- `.` → Main exports (TypeScript source: src/index.ts)
- `./domain` → Domain-specific components (src/components/domain/index.ts)
- `./feature` → Feature compositions (src/components/feature/index.ts)
- `./hooks` → Custom React hooks (src/hooks/index.ts)
- `./api` → API client and queries (src/api/index.ts)
- `./state` → Redux store and slices (src/state/index.ts)
- `./test-utils` → Testing helpers (src/test-utils/index.ts)
- `./styles.css` → Compiled CSS (dist/styles.css)

**Note:** Foundation exports TypeScript source files directly (no build step needed for workspace dependencies)

**Key Dependencies:**
- `@tetherto/mdk-core-ui` (workspace)
- Redux Toolkit (@reduxjs/toolkit)
- React Redux (react-redux)
- Testing Library (@testing-library/react)
- Vitest
- Lodash, date-fns

**Usage Examples:**

```tsx
// Main exports
import { SomeComponent } from '@tetherto/mdk-foundation-ui'

// Domain components
import { MinerCard, PoolStats } from '@tetherto/mdk-foundation-ui/domain'

// Feature compositions
import { Dashboard } from '@tetherto/mdk-foundation-ui/feature'

// Hooks
import { useLocalStorage, useDebounce } from '@tetherto/mdk-foundation-ui/hooks'

// API client
import { useGetMinersQuery } from '@tetherto/mdk-foundation-ui/api'

// State management
import { store, useAppSelector } from '@tetherto/mdk-foundation-ui/state'

// Testing utilities
import { render, mockMiner } from '@tetherto/mdk-foundation-ui/test-utils'

// Styles
import '@tetherto/mdk-foundation-ui/styles.css'
```

---

### `@tetherto/mdk-fonts-ui`

**Purpose:** Font assets for the MDK

**Location:** `packages/fonts`

**Exports:**
- JetBrains Mono font files and CSS

**Exports Structure:**
- `./jetbrains-mono.css` → Font face definitions and files

**Usage:**
```tsx
import '@tetherto/mdk-fonts-ui/jetbrains-mono.css'
```

---

## 🔗 Dependency Graph

```
┌──────────────────────────────────────────────┐
│ @tetherto/mdk-core-ui                             │
│ • Components (Radix UI-based)                │
│ • Types & Utilities                          │
│ • Theme & Styles                             │
│ • Charts & Tables                            │
└────────────────┬─────────────────────────────┘
                 │
                 │ workspace:*
                 │
┌────────────────▼─────────────────────────────┐
│ @tetherto/mdk-foundation-ui                       │
│ • Domain Components   (./domain)             │
│ • Feature Compositions (./feature)           │
│ • Custom Hooks        (./hooks)              │
│ • API Client          (./api)                │
│ • State Management    (./state)              │
│ • Test Utilities      (./test-utils)         │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ @tetherto/mdk-fonts-ui                            │
│ • JetBrains Mono font assets                 │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Apps                                         │
│                                              │
│ @tetherto/mdk-demo-ui                             │
│ ├─ depends on: @tetherto/mdk-core-ui              │
│ ├─ depends on: @tetherto/mdk-foundation-ui        │
│ └─ depends on: @tetherto/mdk-fonts-ui             │
└──────────────────────────────────────────────┘
```

**Key Points:**
- Simple two-layer architecture: `core` → `foundation`
- Foundation package uses internal folder structure but exports via multiple entry points
- All packages use TypeScript source exports (no build step for workspace dependencies)
- Demo app consumes all three packages

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 10.0.0

### Install Dependencies

```bash
# Enable pnpm via corepack (if not already enabled)
corepack enable

# Install all workspace packages
pnpm install
```

### Development Workflows

#### Run Demo App (Recommended for Development)

```bash
# Run only the demo app in dev mode
pnpm dev:demo
```

#### Develop Packages in Watch Mode

```bash
# Run all packages in watch mode
pnpm dev

# Or run packages only (excluding demo)
pnpm dev:packages
```

#### Build Commands

```bash
# Build all packages
pnpm build

# Build with verbose output
pnpm build:verbose

# Build only demo
pnpm build:demo

# Build only SCSS
pnpm build:scss

# Build only TypeScript
pnpm build:ts
```

#### Quality Checks

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Code formatting
pnpm format

# Run all checks (lint + typecheck + format + build)
pnpm fullcheck

# Run tests
pnpm test
pnpm test:watch
```

#### Bundle Analysis

```bash
# Analyze bundle sizes
pnpm size
```

#### Watch Mode (Alternative to dev)

```bash
# Watch all packages
pnpm watch

# Watch SCSS only
pnpm watch:scss

# Watch TypeScript only  
pnpm watch:ts
```

### Preview Production Build

```bash
# Build and preview the demo app
pnpm build:demo
pnpm preview:demo
```

## ⚡ Monorepo Tooling

### Turborepo

The project uses **Turborepo** for orchestrating builds and tasks across the monorepo:

**Key Features:**
- **Intelligent caching** - Skips tasks that haven't changed
- **Parallel execution** - Runs independent tasks concurrently
- **Task dependencies** - Ensures build order is correct
- **Remote caching** - Share cache across team (optional)

**Configuration:** `turbo.json`

**Task Pipeline:**
```json
{
  "build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**"]
  },
  "dev": {
    "cache": false,
    "persistent": true
  }
}
```

### PNPM Workspaces

**Configuration:** `pnpm-workspace.yaml`

**Workspace structure:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Filter Commands:**
```bash
# Run command in specific package
pnpm --filter @tetherto/mdk-core-ui build

# Run command in all packages
pnpm -r build

# Run command in package and its dependencies
pnpm --filter @tetherto/mdk-demo-ui... build
```

## 📝 Adding New Features

### Adding to Existing Packages

The project uses a **consolidated package structure**. Instead of creating new packages, add features to existing ones:

#### Adding to `@tetherto/mdk-core-ui`
For new core components, utilities, or types:

```bash
# Create component directory
mkdir -p packages/core/src/components/my-component

# Create component files
touch packages/core/src/components/my-component/index.tsx
touch packages/core/src/components/my-component/styles.scss
```

Then export from `packages/core/src/index.ts`:
```ts
export * from './components/my-component'
```

#### Adding to `@tetherto/mdk-foundation-ui`

Foundation uses **export paths** for organization:

1. **Domain components** → `src/components/domain/`
   - Export via `./domain` path
   
2. **Feature compositions** → `src/components/feature/`
   - Export via `./feature` path
   
3. **Hooks** → `src/hooks/`
   - Export via `./hooks` path
   
4. **API** → `src/api/`
   - Export via `./api` path
   
5. **State** → `src/state/`
   - Export via `./state` path

**Example: Adding a new domain component**

```bash
# Create component
mkdir -p packages/foundation/src/components/domain/my-component
touch packages/foundation/src/components/domain/my-component/index.tsx
```

Export in `packages/foundation/src/components/domain/index.ts`:
```ts
export * from './my-component'
```

### Creating a New Package (Rare)

Only create new packages for major new concerns (e.g., new rendering engine, completely separate design system):

1. Create package structure:
```bash
mkdir -p packages/my-package/src
```

2. Create `package.json` following the existing pattern:
```json
{
  "name": "@tetherto/my-package",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "clean": "rimraf dist node_modules .turbo"
  },
  "dependencies": {
    "@tetherto/mdk-core-ui": "workspace:*"
  }
}
```

3. Create `tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declarationDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

4. Create `src/index.ts`:
```ts
export * from './my-feature'
```

5. Install dependencies:
```bash
pnpm install
```

## 🎯 Best Practices

### Package Dependencies

- **Always use `workspace:*`** for internal package dependencies
- **Use peer dependencies** for React, Redux, and other shared libraries
- **Keep dependencies minimal** - only add what's truly needed
- **Use `catalog:`** for shared dependency versions (defined in pnpm-workspace.yaml)

#### PNPM Catalog Feature

The project uses pnpm's **catalog** feature to manage shared dependency versions across all packages:

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^18.3.1
  '@radix-ui/react-dialog': ^1.1.4
  # ... more shared versions
```

In package.json files, reference catalog versions:
```json
{
  "dependencies": {
    "react": "catalog:",
    "@radix-ui/react-dialog": "catalog:"
  }
}
```

**Benefits:**
- Single source of truth for dependency versions
- Easier to update versions across all packages
- Prevents version conflicts in the monorepo

### Exports Strategy

- **TypeScript source exports** - Packages export `.ts` files directly for fast dev iteration
- **Multiple entry points** - Use subpath exports for logical grouping (e.g., `./domain`, `./hooks`)
- **Use named exports** - Avoid default exports for better tree-shaking
- **Single index per module** - Each feature/component has one `index.ts`

### Project Organization

- **Consolidate related code** - Keep related features in the same package
- **Use folder structure for organization** - Leverage internal folders and export paths
- **Only create new packages for major concerns** - Avoid package proliferation

### TypeScript

- **Extend base config** - All packages use `tsconfig.base.json`
- **Enable strict mode** - Catch errors early with strict type checking
- **Export all types** - Make types available to consumers
- **Use composite projects** - Enable faster builds with project references

### Styling

- **SCSS for source** - Write styles in SCSS, build to CSS
- **CSS modules or BEM** - Scope styles to avoid conflicts
- **Export compiled CSS** - Packages expose `./styles.css`
- **Shared mixins** - Core exports SCSS mixins via `./styles` path

### Testing

- **Use foundation test-utils** - Import from `@tetherto/mdk-foundation-ui/test-utils`
- **Test in isolation** - Mock external dependencies
- **Vitest for unit tests** - Fast, ESM-native testing
- **React Testing Library** - Test components like users interact with them

## 🏗️ Architecture Philosophy

### Consolidated Package Structure

The project uses a **two-layer architecture** instead of many micro-packages:

1. **Core Layer** (`@tetherto/mdk-core-ui`)
   - Radix UI-based components
   - Type definitions and utilities
   - Theme and styling system
   - Chart and table integrations

2. **Foundation Layer** (`@tetherto/mdk-foundation-ui`)
   - Domain-specific components
   - Feature compositions
   - State management
   - API client
   - Hooks and utilities

**Why this approach?**
- **Simpler dependency management** - No complex dependency trees
- **Faster development** - Less package overhead, clearer structure
- **Better DX** - Single import path per concern, not per component
- **Easier refactoring** - Move code between folders, not packages
- **Type safety** - No circular dependency issues

### Export Paths Strategy

Instead of creating separate packages, we use **subpath exports**:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./domain": "./src/components/domain/index.ts",
    "./hooks": "./src/hooks/index.ts"
  }
}
```

**Benefits:**
- Logical code organization
- Tree-shakeable imports
- Clear API boundaries
- No package.json overhead

### Hybrid Export Strategy

The project uses a **mixed approach** for package exports:

#### Core Package - Built Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

**Why built files for Core?**
- Heavy dependencies (Radix UI, Chart.js, TanStack Table)
- Complex TypeScript transformations
- Needs optimizations (minification, tree-shaking)
- More stable API surface

#### Foundation Package - TypeScript Source Exports

```json
{
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

**Why source files for Foundation?**
- **Instant feedback** - No build step needed for workspace dependencies
- **Faster iteration** - Changes reflected immediately in demo app
- **Better debugging** - Original source in stack traces
- **Simpler workflow** - Less build orchestration needed

**Trade-off:**
- Foundation consumers must be able to compile TypeScript
- Not suitable for publishing to npm without pre-build step

### Styling Architecture

**Source → Build → Consume:**

1. **Write in SCSS** - `src/styles/*.scss`
2. **Build to CSS** - `dist/styles.css` (via Vite)
3. **Export CSS** - `./styles.css` export path
4. **Consume in apps** - `import '@tetherto/mdk-core-ui/styles.css'`

**Why separate CSS?**
- Control over when styles are loaded
- Easier to customize or override
- Better for CSS-in-JS migration path
- Clear separation of concerns

## 📚 Documentation

- [README](../README.md) - Project overview and quick start
- [ARCHITECTURE](ARCHITECTURE.md) - System architecture and design decisions
- [BUILD_SYSTEM](BUILD_SYSTEM.md) - Build system and tooling
- [BUILD_SCRIPTS](BUILD_SCRIPTS.md) - Build scripts documentation
- [SCSS_SETUP](SCSS_SETUP.md) - SCSS/styling setup and guidelines
- [WATCH_MODE_GUIDE](WATCH_MODE_GUIDE.md) - Development watch mode guide
- [CONTRIBUTING](CONTRIBUTING.md) - How to contribute to the project

## 🔧 Troubleshooting

### Build Errors

```bash
# Clean all packages and turbo cache
pnpm clean

# Clean just turbo cache
rm -rf .turbo

# Reinstall dependencies from scratch
pnpm clean
rm -rf pnpm-lock.yaml
pnpm install

# Rebuild everything
pnpm build

# Rebuild with verbose output to see errors
pnpm build:verbose
```

### Type Errors

```bash
# Type check all packages
pnpm typecheck

# Type check specific package
pnpm --filter @tetherto/mdk-core-ui typecheck

# Clean TypeScript build info
find . -name "tsconfig.tsbuildinfo" -delete
pnpm typecheck
```

### Lint Errors

```bash
# Auto-fix all packages
pnpm lint:fix

# Lint specific package
pnpm --filter @tetherto/mdk-core-ui lint
pnpm --filter @tetherto/mdk-core-ui lint:fix

# Format code
pnpm format
```

### SCSS/Style Errors

```bash
# Rebuild SCSS only
pnpm build:scss

# Watch SCSS for changes
pnpm watch:scss

# Check for SCSS syntax errors
pnpm --filter @tetherto/mdk-core-ui build:scss
```

### Development Server Issues

```bash
# Kill any processes on port 5173 (Vite default)
lsof -ti:5173 | xargs kill -9

# Restart dev server
pnpm dev:demo

# Clear Vite cache
rm -rf apps/demo/node_modules/.vite
pnpm dev:demo
```

### Dependency Issues

```bash
# Verify workspace dependencies are linked
pnpm ls -r

# Check for phantom dependencies
pnpm audit

# Update all catalog dependencies
# Edit pnpm-workspace.yaml, then:
pnpm install

# Dedupe dependencies
pnpm dedupe
```

### Cache Issues

```bash
# Clear all caches
rm -rf .turbo
rm -rf **/node_modules/.vite
rm -rf **/node_modules/.cache
rm -rf **/dist

# Rebuild from scratch
pnpm install
pnpm build
```

### Common Issues

**Issue: "Cannot find module '@tetherto/mdk-core-ui'"**
- Ensure packages are built: `pnpm build`
- Check workspace is properly linked: `pnpm install`

**Issue: "Styles not updating"**
- SCSS needs to be rebuilt: `pnpm build:scss` or `pnpm watch:scss`
- Clear Vite cache: `rm -rf apps/demo/node_modules/.vite`

**Issue: "Type errors in IDE but not in CLI"**
- Restart TypeScript server in your IDE
- Delete `tsconfig.tsbuildinfo` files: `find . -name "*.tsbuildinfo" -delete`

**Issue: "Changes not reflected in demo app"**
- Ensure watch mode is running: `pnpm dev` or `pnpm watch`
- Check that source exports are configured (not built dist/)
