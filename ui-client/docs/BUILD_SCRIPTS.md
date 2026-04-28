# Build Scripts & Watch Mode

Complete guide to building and developing with the MDK monorepo.

## Table of Contents

- [Quick Start](#quick-start)
- [Build Commands](#build-commands)
- [Development & Watch Mode](#development--watch-mode)
- [Package-Specific Scripts](#package-specific-scripts)
- [Turborepo Tasks](#turborepo-tasks)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development mode (all packages)
pnpm dev

# Start demo app with live reload
pnpm dev:demo
```

## Build Commands

### Root Level (Monorepo)

```bash
# Build everything (TypeScript + SCSS)
pnpm build

# Build only TypeScript
pnpm build:ts

# Build only SCSS
pnpm build:scss

# Clean all build artifacts
pnpm clean
```

### How It Works

- **Turborepo** orchestrates builds across all packages
- **Dependency order** is automatically resolved (`^build` in turbo.json)
- **Parallel execution** where possible for maximum speed
- **Caching** enabled for faster subsequent builds

### Build Output

```
packages/core/
├── dist/              # Built TypeScript + types
│   ├── index.js
│   ├── index.d.ts
│   └── styles.css     # Compiled, minified SCSS

packages/foundation/
├── dist/
│   └── styles.css     # Compiled SCSS
└── src/               # TypeScript source (exported directly)

packages/fonts/
└── dist/
    └── jetbrains-mono.css

apps/demo/
└── dist/              # Vite production build
```

## Development & Watch Mode

### Start All Packages in Watch Mode

```bash
# Watch TypeScript + SCSS for all packages
pnpm dev

# Alternative: explicit watch command
pnpm watch
```

This starts:
- TypeScript compiler in watch mode (`tsc --watch`)
- SCSS compiler in watch mode (`vite build --watch`)
- Demo app dev server (`vite`)

### Start Demo App Only

```bash
# Run demo app with hot module reload
pnpm dev:demo
```

This starts the Vite dev server at `http://localhost:5173` with:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- Live SCSS compilation

### Start Packages Only (No Demo)

```bash
# Watch all packages except demo
pnpm dev:packages
```

Useful when developing packages without running the demo app.

### Watch Specific File Types

```bash
# Watch only TypeScript files
pnpm watch:ts

# Watch only SCSS files
pnpm watch:scss
```

## Package-Specific Scripts

Each package has its own build and watch scripts.

### Core Package (`@tetherto/core`)

```bash
cd packages/core

# Build
pnpm build              # Build TS + SCSS
pnpm build:ts           # Build TypeScript only
pnpm build:scss         # Build SCSS only

# Development
pnpm dev                # Watch TS + SCSS (concurrent)
pnpm dev:ts             # Watch TypeScript only
pnpm dev:scss           # Watch SCSS only

# Aliases
pnpm watch              # Same as dev
pnpm watch:ts           # Same as dev:ts
pnpm watch:scss         # Same as dev:scss
```

### Foundation Package (`@tetherto/foundation`)

Same scripts as `@tetherto/core`:

```bash
cd packages/foundation

pnpm build              # Build TS + SCSS
pnpm dev                # Watch TS + SCSS
pnpm dev:ts             # Watch TypeScript
pnpm dev:scss           # Watch SCSS
```

### Fonts Package (`@tetherto/fonts`)

```bash
cd packages/fonts

pnpm build              # Build font CSS
pnpm dev                # Watch mode for fonts
```

### Demo App (`@tetherto/demo`)

```bash
cd apps/demo

pnpm dev                # Start Vite dev server
pnpm build              # Production build
pnpm preview            # Preview production build
```

## Turborepo Tasks

### Task Configuration

All tasks are defined in `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "src/styles.css"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^dev"]
    }
  }
}
```

### Task Dependencies

- `^build` - Run dependencies' `build` first
- `^dev` - Run dependencies' `dev` first
- `persistent: true` - Keep task running (watch mode)
- `cache: false` - Don't cache dev tasks

### Execution Order

```
@tetherto/core ───┐
                    ├──→ @tetherto/foundation ──→ @tetherto/demo
@tetherto/fonts ──┘
```

Turborepo automatically:
1. Builds `@tetherto/core` and `@tetherto/fonts` in parallel (independent)
2. Builds `@tetherto/foundation` after `@tetherto/core` completes
3. Builds `@tetherto/demo` after all dependencies complete
4. Caches results for faster rebuilds

## Best Practices

### 1. Use Root Commands

Always run commands from the root for proper dependency resolution:

```bash
# ✅ Good
pnpm dev

# ❌ Avoid (unless working on specific package)
cd packages/core && pnpm dev
```

### 2. Watch Mode During Development

Use watch mode to see changes instantly:

```bash
# Terminal 1: Watch packages
pnpm dev:packages

# Terminal 2: Run demo
pnpm dev:demo
```

### 3. Clean Builds

If you encounter build issues:

```bash
# Clean everything
pnpm clean

# Reinstall dependencies
pnpm install

# Fresh build
pnpm build
```

### 4. Selective Builds

Build specific packages using Turbo filters:

```bash
# Build only core package
turbo build --filter=@tetherto/core

# Build core and its dependents
turbo build --filter=@tetherto/core...

# Build everything except demo
turbo build --filter=!@tetherto/demo
```

### 5. Parallel Development

For maximum efficiency:

```bash
# Watch all packages + run demo
pnpm dev
```

This runs everything in parallel with proper dependency ordering.

## Concurrency

### How Concurrent Tasks Work

Packages with both TypeScript and SCSS use `concurrently`:

```json
{
  "scripts": {
    "dev": "concurrently -n ts,scss -c cyan,magenta \"pnpm dev:ts\" \"pnpm dev:scss\""
  }
}
```

Benefits:
- Both TypeScript and SCSS watch simultaneously
- Color-coded output (cyan for TS, magenta for SCSS)
- Named processes for easy identification
- Single command to start everything

### Output Format

```
[ts]   Starting TypeScript compiler...
[scss] Starting SCSS compiler...
[ts]   Found 0 errors. Watching for file changes.
[scss] ✓ built in 235ms
```

## Performance Tips

### 1. Incremental Builds

TypeScript uses incremental compilation:
- First build: ~2-3 seconds
- Subsequent builds: ~100-500ms

### 2. SCSS Watch Mode

Vite's SCSS compiler is extremely fast:
- Initial build: ~200-300ms
- Hot updates: ~50-100ms

### 3. Turborepo Caching

Turborepo caches build outputs:
- Cache hit: ~10-50ms
- Cache miss: Full build time

### 4. Parallel Execution

Turborepo runs independent tasks in parallel:
- Single package: ~2s
- All packages (parallel): ~3-4s
- All packages (sequential): ~15-20s

## Troubleshooting

### SCSS Not Compiling

```bash
# Check if Vite config exists
ls packages/core/vite.config.js

# Rebuild SCSS manually
pnpm build:scss
```

### TypeScript Errors

```bash
# Check TypeScript version
pnpm tsc --version

# Run typecheck
pnpm typecheck
```

### Watch Mode Not Working

```bash
# Kill all node processes
pkill -f "node.*watch"

# Restart watch mode
pnpm dev
```

### Cache Issues

```bash
# Clear Turborepo cache
turbo clean

# Clear all build artifacts
pnpm clean

# Fresh build
pnpm install && pnpm build
```

## Scripts Reference

### Root Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build all packages |
| `pnpm build:ts` | Build TypeScript only |
| `pnpm build:scss` | Build SCSS only |
| `pnpm dev` | Watch all packages + demo |
| `pnpm dev:demo` | Run demo app only |
| `pnpm dev:packages` | Watch packages (no demo) |
| `pnpm watch` | Alias for `dev` |
| `pnpm watch:ts` | Watch TypeScript only |
| `pnpm watch:scss` | Watch SCSS only |
| `pnpm clean` | Clean all artifacts |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |

### Package Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build TS + SCSS |
| `pnpm build:ts` | Build TypeScript |
| `pnpm build:scss` | Build SCSS |
| `pnpm dev` | Watch TS + SCSS |
| `pnpm dev:ts` | Watch TypeScript |
| `pnpm dev:scss` | Watch SCSS |
| `pnpm watch` | Alias for `dev` |
| `pnpm clean` | Clean package artifacts |
| `pnpm lint` | Lint package |
| `pnpm typecheck` | Type check package |

## Examples

### Develop New Component

```bash
# 1. Start watch mode
pnpm dev:packages

# 2. Create component in packages/core/src/components/

# 3. TypeScript and SCSS auto-compile

# 4. Test in demo app
pnpm dev:demo
```

### Build for Production

```bash
# 1. Clean previous builds
pnpm clean

# 2. Fresh install
pnpm install

# 3. Build everything
pnpm build

# 4. Verify output
ls -R packages/*/dist
ls packages/*/src/styles.css
```

### Debug Build Issues

```bash
# 1. Enable verbose output
turbo build --verbosity=2

# 2. Build specific package
turbo build --filter=@tetherto/core

# 3. Check logs
cat .turbo/turbo-*.log
```
