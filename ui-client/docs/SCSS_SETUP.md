# SCSS/SASS Setup Guide

This monorepo uses **SCSS** with **Vite** and **Turborepo** for styling, replacing CSS-in-JS for better performance and zero runtime overhead.

## Tech Stack

- **Build Tool**: Turborepo (orchestration) + Vite (bundling)
- **SCSS Compiler**: Dart Sass (via Vite)
- **PostCSS**: Autoprefixer for vendor prefixes
- **Module Resolution**: Vite aliases for `@tetherto/*` workspace packages

## Why This Stack?

### Turborepo
✅ Already in use for the monorepo  
✅ Intelligent caching and parallel builds  
✅ Dependency graph management  
✅ Perfect for monorepos with multiple packages  

### Vite + Rollup
✅ Fast builds with esbuild  
✅ Built-in SCSS support  
✅ Modern, well-maintained  
✅ Easy configuration  
✅ HMR support for development  

### vs Alternatives

| Tool | Pros | Cons |
|------|------|------|
| **Vite** (Current) | Fast, modern, built-in SCSS | - |
| Webpack | Mature, flexible | Slow, complex config |
| Rollup | Small bundles | Requires more plugins |
| Custom Script | Full control | Maintenance burden |
| Nx | Powerful | Overkill for this use case |
| Bazel | Enterprise-grade | Too complex |

## Architecture

```
┌─────────────────────────────────────┐
│ Turborepo (Orchestration)           │
│ - Manages build order               │
│ - Caches build outputs              │
│ - Runs tasks in parallel            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Vite (Build Tool)                   │
│ - Compiles SCSS to CSS              │
│ - Resolves @tetherto/* imports           │
│ - Applies PostCSS transforms        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Output: styles.css                  │
│ - Minified, optimized               │
│ - Autoprefixed                      │
│ - Ready for production              │
└─────────────────────────────────────┘
```

## Package Structure

### Packages with SCSS

1. **@tetherto/mdk-core-ui** - Core components with base styles and design tokens
2. **@tetherto/mdk-foundation-ui** - Foundation components and feature styles
3. **@tetherto/mdk-fonts-ui** - Font assets (JetBrains Mono)

Packages with SCSS build:
- `@tetherto/mdk-core-ui`
  - `src/styles/` - Source SCSS files
  - `dist/styles.css` - Compiled, minified CSS
  - `vite.config.js` - Vite configuration for SCSS compilation

- `@tetherto/mdk-foundation-ui`
  - `src/styles/` - Source SCSS files
  - `dist/styles.css` - Compiled CSS
  - `vite.config.js` - Vite configuration

- `@tetherto/mdk-fonts-ui`
  - `src/` - Font files and CSS
  - `dist/jetbrains-mono.css` - Built font CSS
  - `vite.config.js` - Vite configuration

## Configuration Files

### Per-Package: `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/styles.scss'),
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'src'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: 'styles.css',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        loadPaths: [resolve(__dirname, '../')],
      },
    },
  },
  resolve: {
    alias: {
      '@tetherto/mdk-core-ui': resolve(__dirname, '../core/src'),
      '@tetherto/theme': resolve(__dirname, '../theme/src'),
    },
  },
})
```

### Root: `turbo.json`

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "src/styles.css"]
    },
    "build:scss": {
      "dependsOn": ["^build:scss"],
      "outputs": ["src/styles.css"]
    }
  }
}
```

## Using SCSS in Your Package

### 1. Create SCSS File

```scss
// packages/my-package/src/styles/index.scss

/**
 * @tetherto/my-package styles
 */

// Import from other workspace packages (core exports SCSS mixins)
@use '@tetherto/mdk-core-ui/styles' as core;

// Your styles using CSS variables
.my-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 1rem;
  
  // Use core mixins if available
  // @include core.flex-center;
}
```

### 2. Create Vite Config

```javascript
// packages/my-package/vite.config.js
import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/styles/index.scss'),
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: 'styles.css',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        loadPaths: [resolve(__dirname, '../')],
      },
    },
  },
  resolve: {
    alias: {
      '@tetherto/mdk-core-ui': resolve(__dirname, '../core/src'),
      '@tetherto/mdk-foundation-ui': resolve(__dirname, '../foundation/src'),
    },
  },
})
```

### 3. Add Build Scripts

Update `package.json`:

```json
{
  "scripts": {
    "build": "pnpm build:ts && pnpm build:scss",
    "build:scss": "vite build",
    "build:ts": "tsc"
  }
}
```

### 4. Export CSS

Update `package.json` exports:

```json
{
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./styles.css": "./src/styles.css"
  }
}
```

## Build Commands

### Build All Packages (Turborepo)

```bash
# Build everything (TypeScript + SCSS)
pnpm build

# Build only SCSS across all packages
pnpm build:scss

# Build specific package
pnpm --filter @tetherto/mdk-core-ui build
pnpm --filter @tetherto/mdk-core-ui build:scss
```

### Turborepo Features

```bash
# Build with cache
pnpm build
# → Uses cached results if nothing changed

# Force rebuild (no cache)
pnpm build --force

# Build with dependencies
pnpm --filter @tetherto/components-foundation... build
# → Builds foundation + all its dependencies

# Parallel builds
# → Turborepo automatically parallelizes independent builds
```

## Importing Styles in Applications

### Import Compiled CSS

```tsx
// In your app entry point (e.g., apps/demo/src/main.tsx)
import '@tetherto/mdk-core-ui/styles.css'
import '@tetherto/mdk-foundation-ui/styles.css'
import '@tetherto/mdk-fonts-ui/jetbrains-mono.css'
```

**Note:** Always import compiled CSS files (`.css`), not SCSS source files. The SCSS is pre-compiled during the build process.

## Workspace Package Resolution

Vite resolves `@tetherto/*` imports using aliases:

```scss
// This works! ✅
@use '@tetherto/mdk-core-ui/styles' as core;

// No need for relative paths ❌
@use '../../core/src/styles/_mixins.scss' as core;
```

### How It Works

1. **Vite Alias**: Maps `@tetherto/mdk-core-ui` to `../core/src`
2. **SCSS Load Paths**: Adds `../` to SCSS resolution
3. **Modern SCSS API**: Uses Dart Sass modern compiler

## SCSS Features

### Variables

```scss
// Example: packages/core/src/styles/_variables.scss (if exists)
$spacing-unit: 0.25rem;
$border-radius-base: 0.5rem;

// Usage in other SCSS files
.card {
  padding: $spacing-unit * 4; // 1rem
  border-radius: $border-radius-base;
}

// Better: Use CSS variables for runtime theming
.card {
  padding: 1rem;
  border-radius: var(--radius);
}
```

### Mixins

```scss
// Example mixin (if defined in core)
@mixin theme-colors($mode: 'light') {
  @if $mode == 'light' {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  } @else {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

// Usage in your SCSS
:root {
  @include theme-colors('light');
}

.dark {
  @include theme-colors('dark');
}
```

### Nesting

```scss
.card {
  padding: 1rem;
  
  &-header {
    font-weight: bold;
  }
  
  &-body {
    margin-top: 0.5rem;
  }
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}
```

## Performance Benefits

### Turborepo Caching

```bash
# First build
pnpm build
# → Takes ~5s

# Second build (no changes)
pnpm build
# → Takes ~0.1s (cached!)

# Change one package
pnpm build
# → Only rebuilds changed package + dependents
```

### CSS-in-JS vs SCSS

| Feature | CSS-in-JS | SCSS + Vite |
|---------|-----------|-------------|
| Runtime overhead | ❌ ~5-10kb | ✅ Zero |
| Build time | ⚠️ Moderate | ✅ Fast (Vite) |
| Bundle size | ❌ Larger | ✅ Smaller |
| Caching | ❌ Harder | ✅ Turborepo |
| HMR | ✅ Good | ✅ Excellent |
| SSR | ❌ Complex | ✅ Simple |

## Troubleshooting

### Import Not Found

**Error**: `Can't find stylesheet to import`

**Solution**: Check Vite alias configuration:

```javascript
resolve: {
  alias: {
    '@tetherto/mdk-core-ui': resolve(__dirname, '../core/src'),
  },
}
```

### Build Fails

**Error**: `Cannot find module 'vite'`

**Solution**: Install dependencies:

```bash
pnpm install
```

### Cache Issues

**Error**: Stale build output

**Solution**: Clear Turborepo cache:

```bash
pnpm clean
pnpm build --force
```

## Best Practices

### 1. Use CSS Variables for Theming

```scss
// ✅ Good - Uses CSS variables
.button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

// ❌ Bad - Hardcoded colors
.button {
  background: #1a1a1a;
  color: #ffffff;
}
```

### 2. Namespace Imports

```scss
// ✅ Good - Namespaced
@use '@tetherto/mdk-core-ui/styles' as core;

.my-component {
  // Use core mixins if available
  // @include core.flex-center;
}

// ❌ Bad - Global namespace pollution
@use '@tetherto/mdk-core-ui/styles' as *;
```

### 3. Leverage Turborepo

```bash
# ✅ Good - Let Turborepo handle dependencies
pnpm build

# ❌ Bad - Manual dependency management
pnpm --filter @tetherto/mdk-core-ui build
pnpm --filter @tetherto/mdk-foundation-ui build
pnpm --filter @tetherto/mdk-fonts-ui build
```

### 4. Keep Specificity Low

```scss
// ✅ Good - Low specificity
.card {
  padding: 1rem;
}

// ❌ Bad - High specificity
div.container .card-wrapper .card {
  padding: 1rem;
}
```

## Comparison with Other Tools

### Why Not Nx?

- **Turborepo**: Simpler, faster for most use cases
- **Nx**: More features, but more complex
- **Our Choice**: Turborepo is sufficient and already in use

### Why Not Bazel?

- **Bazel**: Enterprise-grade, very complex
- **Turborepo**: Easier to learn and maintain
- **Our Choice**: Turborepo provides 80% of benefits with 20% of complexity

### Why Not Custom Script?

- **Custom**: Full control, maintenance burden
- **Vite**: Battle-tested, community support
- **Our Choice**: Vite is standard and well-maintained

## Future Enhancements

- [ ] Add CSS minification for production
- [ ] Generate TypeScript types for CSS modules
- [ ] Add SCSS linting rules
- [ ] Implement watch mode for development
- [ ] Add source maps for debugging
