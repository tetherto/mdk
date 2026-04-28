# Watch Mode Guide

Complete guide to using watch mode for efficient development in the MDK monorepo.

## Quick Start

```bash
# Watch all packages (TypeScript + SCSS)
pnpm dev

# Watch specific package
cd packages/core && pnpm dev

# Watch only TypeScript
pnpm watch:ts

# Watch only SCSS
pnpm watch:scss
```

## Watch Mode Overview

Watch mode automatically recompiles files when they change, providing instant feedback during development.

### What Gets Watched

| Package | TypeScript | SCSS | Output |
|---------|-----------|------|--------|
| `@tetherto/mdk-core-ui` | ✅ | ✅ | `dist/` (built JS + types + CSS) |
| `@tetherto/mdk-foundation-ui` | ✅ | ✅ | `dist/styles.css` (TS source exported) |
| `@tetherto/mdk-fonts-ui` | ❌ | ✅ | `dist/jetbrains-mono.css` |
| `@tetherto/mdk-demo-ui` | ✅ | ✅ | HMR (no build output) |

## Development Workflows

### Workflow 1: Full Stack Development

Develop packages and demo app simultaneously:

```bash
# Terminal 1: Watch all packages
pnpm dev
```

This starts:
- TypeScript watch for all packages
- SCSS watch for packages with styles
- Demo app dev server with HMR

**Output:**
```
[ts]   Starting TypeScript compiler...
[scss] Starting SCSS compiler...
[demo] Vite dev server running at http://localhost:5173
```

### Workflow 2: Package Development Only

Develop packages without running demo:

```bash
pnpm dev:packages
```

This watches all packages except the demo app.

### Workflow 3: Demo App Only

Work on demo app with pre-built packages:

```bash
# Build packages once
pnpm build

# Run demo with HMR
pnpm dev:demo
```

### Workflow 4: Single Package Development

Focus on one package:

```bash
cd packages/core
pnpm dev
```

**Output:**
```
[ts]   Starting compilation in watch mode...
[scss] vite v6.4.1 building for production...
[ts]   Found 0 errors. Watching for file changes.
[scss] watching for file changes...
```

## Watch Mode Features

### TypeScript Watch (`tsc --watch`)

**Features:**
- Incremental compilation
- Fast rebuilds (~100-500ms)
- Type checking on save
- Error reporting in terminal

**Example Output:**
```
[ts] Starting compilation in watch mode...
[ts] Found 0 errors. Watching for file changes.
[ts] File change detected. Starting incremental compilation...
[ts] Found 0 errors.
```

### SCSS Watch (`vite build --watch`)

**Features:**
- Auto-recompilation on SCSS changes
- CSS minification
- PostCSS processing (autoprefixer)
- Output to `src/styles.css`

**Example Output:**
```
[scss] vite v6.4.1 building for production...
[scss] watching for file changes...
[scss] ✓ Copied styles.css to src/
[scss] dist-css/styles.css  5.64 kB │ gzip: 1.49 kB
[scss] ✓ built in 237ms
```

### Demo App HMR (Vite Dev Server)

**Features:**
- Hot Module Replacement
- Fast Refresh for React
- Instant updates (no page reload)
- SCSS hot reload

**Example Output:**
```
VITE v6.4.1  ready in 423 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

## Concurrent Execution

Packages with both TypeScript and SCSS use `concurrently` to run both watchers simultaneously.

### Configuration

```json
{
  "scripts": {
    "dev": "concurrently -n ts,scss -c cyan,magenta \"pnpm dev:ts\" \"pnpm dev:scss\""
  }
}
```

### Benefits

- **Parallel execution**: Both watchers run at the same time
- **Color-coded output**: Easy to distinguish between TS and SCSS
- **Named processes**: Clear identification in logs
- **Single command**: Start everything with one command

### Output Format

```
[ts]   Starting TypeScript compiler...
[scss] Starting SCSS compiler...
[ts]   Found 0 errors. Watching for file changes.
[scss] watching for file changes...
```

## Turborepo Integration

### Task Dependencies

Watch mode respects package dependencies:

```
@tetherto/mdk-core-ui (watches TS + SCSS)
    ↓
@tetherto/mdk-foundation-ui (watches TS + SCSS)
    ↓
@tetherto/mdk-demo-ui (Vite dev server)
```

### Persistent Tasks

Watch tasks are marked as `persistent` in `turbo.json`:

```json
{
  "dev": {
    "cache": false,
    "persistent": true,
    "dependsOn": ["^dev"]
  }
}
```

This means:
- Tasks keep running (don't exit)
- No caching (always fresh)
- Dependencies start first

## File Change Detection

### What Triggers Recompilation

**TypeScript:**
- `.ts`, `.tsx` files in `src/`
- `tsconfig.json` changes
- Type definition files (`.d.ts`)

**SCSS:**
- `.scss` files in `src/`
- Imported SCSS files (via `@use`, `@import`)
- `vite.config.js` changes (requires restart)

**Demo App:**
- `.tsx`, `.ts` files
- `.scss` files
- `index.html`
- `vite.config.ts`

### Ignored Files

The following are ignored by watch mode:
- `node_modules/`
- `dist/`
- `dist-css/`
- `.turbo/`
- Generated CSS files

## Performance

### TypeScript Watch Performance

| Scenario | Time |
|----------|------|
| Initial compilation | 2-3s |
| Incremental update | 100-500ms |
| Type error check | 50-200ms |

### SCSS Watch Performance

| Scenario | Time |
|----------|------|
| Initial compilation | 200-300ms |
| File change | 50-150ms |
| Import change | 100-200ms |

### Demo App HMR Performance

| Scenario | Time |
|----------|------|
| Initial load | 400-600ms |
| Hot update | 10-50ms |
| Full reload | 200-400ms |

## Troubleshooting

### Watch Mode Not Detecting Changes

**Solution 1: Check file watchers limit (Linux)**
```bash
# Increase file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Solution 2: Restart watch mode**
```bash
# Kill all node processes
pkill -f "node.*watch"

# Restart
pnpm dev
```

### SCSS Not Recompiling

**Solution 1: Check Vite config**
```bash
# Verify config exists
ls packages/core/vite.config.js

# Check for syntax errors
node packages/core/vite.config.js
```

**Solution 2: Manual rebuild**
```bash
# Rebuild SCSS
pnpm build:scss

# Restart watch
pnpm dev:scss
```

### TypeScript Errors Not Showing

**Solution 1: Check TypeScript version**
```bash
pnpm tsc --version
```

**Solution 2: Clear TypeScript cache**
```bash
# Remove build info
rm -rf packages/*/tsconfig.tsbuildinfo

# Restart watch
pnpm dev:ts
```

### Demo App Not Hot Reloading

**Solution 1: Check Vite server**
```bash
# Ensure server is running
curl http://localhost:5173
```

**Solution 2: Clear Vite cache**
```bash
# Remove cache
rm -rf apps/demo/node_modules/.vite

# Restart dev server
pnpm dev:demo
```

### Multiple Instances Running

**Solution: Kill all processes**
```bash
# Find processes
ps aux | grep "tsc --watch"
ps aux | grep "vite"

# Kill all
pkill -f "tsc --watch"
pkill -f "vite"

# Restart clean
pnpm dev
```

## Best Practices

### 1. Use Root Commands

Always run watch mode from the root:

```bash
# ✅ Good
pnpm dev

# ❌ Avoid
cd packages/core && pnpm dev
```

### 2. Watch Only What You Need

Don't run unnecessary watchers:

```bash
# Working on styles only?
pnpm watch:scss

# Working on types only?
pnpm watch:ts
```

### 3. Monitor Output

Watch for errors in the terminal:

```bash
# TypeScript errors
[ts] error TS2304: Cannot find name 'Foo'.

# SCSS errors
[scss] Error: Undefined variable.
```

### 4. Use Separate Terminals

For better visibility:

```bash
# Terminal 1: Packages
pnpm dev:packages

# Terminal 2: Demo
pnpm dev:demo

# Terminal 3: Logs/commands
```

### 5. Restart on Config Changes

Watch mode doesn't detect config changes:

```bash
# After changing tsconfig.json or vite.config.js
# Stop watch mode (Ctrl+C)
pnpm dev
```

## Advanced Usage

### Watch Specific Packages

```bash
# Watch only core
turbo dev --filter=@tetherto/mdk-core-ui

# Watch core and foundation
turbo dev --filter=@tetherto/mdk-core-ui --filter=@tetherto/mdk-foundation-ui

# Watch everything except demo
turbo dev --filter=!@tetherto/mdk-demo-ui
```

### Custom Watch Scripts

Add custom watch scripts to `package.json`:

```json
{
  "scripts": {
    "watch:components": "turbo dev --filter=@tetherto/components-*",
    "watch:libs": "turbo dev --filter=!@tetherto/mdk-demo-ui"
  }
}
```

### Debug Watch Mode

Enable verbose logging:

```bash
# TypeScript verbose
tsc --watch --verbose

# Vite debug
DEBUG=vite:* pnpm dev:scss

# Turborepo verbose
turbo dev --verbosity=2
```

## Keyboard Shortcuts

### TypeScript Watch

- `Ctrl+C` - Stop watch mode
- `Enter` - Force recompilation

### Vite Dev Server

- `r` - Restart server
- `u` - Show server URL
- `o` - Open in browser
- `c` - Clear console
- `q` - Quit

### Concurrently

- `Ctrl+C` - Stop all processes
- `Ctrl+Z` - Suspend (use `fg` to resume)

## Summary

Watch mode is essential for efficient development:

✅ **Use `pnpm dev`** for full-stack development  
✅ **Use `pnpm dev:packages`** for package-only development  
✅ **Use `pnpm dev:demo`** for demo app development  
✅ **Monitor terminal output** for errors  
✅ **Restart on config changes**  

Happy coding! 🚀
