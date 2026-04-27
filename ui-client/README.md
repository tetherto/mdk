# MDK Client

> A developer-first toolkit providing pre-built components and seamless backend integration for building mining operations applications in days instead of weeks.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Packages](#packages)
- [Getting Started](#getting-started)
- [Build & Development](#build--development)
- [Documentation](#documentation)
- [Examples](#examples)
- [Support](#support)
- [License](#license)

---

## Overview

The **MDK** is a comprehensive toolkit providing:

- **150-200+ production-tested components** (foundation + domain-specific)
- **87+ API integration hooks** (RTK Query-based)
- **70+ custom React hooks** for common patterns
- **Complete state management** (Redux Toolkit)
- **Modern tech stack** (React 19, shadcn/ui, React Hook Form, Zod)
- **5x faster forms** compared to legacy solutions

### Key Benefits

- 🚀 **10x faster development** - Build dashboards in days, not weeks
- 🎨 **Consistent UX** - Uniform design patterns across all applications
- 🔌 **Seamless integration** - Type-safe API client with intelligent caching
- 🎯 **Battle-tested** - Extracted from production app codebase
- 📦 **Zero CSS-in-JS runtime** - Better performance, smaller bundles

---

## Packages

This monorepo contains 2 main packages in a simplified architecture:

### `@mdk/core`

Core UI components, utilities, types, and theme system. This package includes:

- Radix UI primitives (Button, Dialog, Switch, etc.)
- Core utilities (cn, formatters, validators)
- Type definitions
- Theme system with design tokens
- SCSS-based styling

### `@mdk/foundation`

Complete foundation with features, state management, and utilities. This package includes:

- Domain-specific components (mining operations)
- Feature components (complete features)
- Custom React hooks (70+ hooks)
- API client (RTK Query integration)
- State management (Redux Toolkit)
- Test utilities

### Demo App

Interactive demo showcasing all components.

- **Location**: `apps/demo`
- **Run**: `pnpm --filter @mdk/demo dev`

📖 **See [docs/STRUCTURE.md](docs/STRUCTURE.md) for complete package details and dependency graph.**

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS)
- **pnpm** 10+ (package manager)

### Setup pnpm

This project uses pnpm as the package manager. Enable it using corepack (built into Node.js):

```bash
# Enable corepack (comes with Node.js)
corepack enable

# Verify pnpm is available
pnpm --version
```

Alternatively, you can use `npx pnpm` for all commands if you prefer not to enable corepack.

### Installation

```bash
# Clone the repository
git clone https://github.com/tetherto/miningos-ui-kit.git
cd miningos-ui-kit

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Quick Start

```bash
# Development mode (watch all packages)
pnpm dev

# Run the demo app
pnpm dev:demo

# Build all packages
pnpm build

# Build specific package
pnpm --filter @mdk/core build

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Lint and fix
pnpm lint:fix
```

### Using @mdk/core in Your App

1. Add the dependency to your app's `package.json`:

```json
{
  "dependencies": {
    "@mdk/core": "workspace:*"
  }
}
```

2. Import and use components:

```tsx
import { Button, Dialog, Switch } from '@mdk/core'
import '@mdk/core/styles.css'

const App = () => {
  return <Button variant="secondary">Click me</Button>
}
```

See [packages/core/USAGE.md](packages/core/USAGE.md) for detailed usage examples.

---

## Build & Development

### Build Commands

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

### Watch Mode

```bash
# Watch all packages (TypeScript + SCSS)
pnpm dev

# Watch packages only (no demo)
pnpm dev:packages

# Watch only TypeScript
pnpm watch:ts

# Watch only SCSS
pnpm watch:scss
```

### Development Workflows

**Full Stack Development:**

```bash
pnpm dev  # Watches all packages + runs demo
```

**Package Development:**

```bash
pnpm dev:packages  # Watches packages without demo
```

**Demo App Only:**

```bash
pnpm dev:demo  # Runs demo with HMR
```

For detailed information, see:

- [Build Scripts Guide](docs/BUILD_SCRIPTS.md) - Commands and workflows
- [Watch Mode Guide](docs/WATCH_MODE_GUIDE.md) - Development with auto-reload
- [Build System Overview](docs/BUILD_SYSTEM.md) - Turborepo architecture
- [SCSS Setup](docs/SCSS_SETUP.md) - Styling system

---

## Documentation

### Core Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System architecture, package structure, and technology stack
- **[Structure](docs/STRUCTURE.md)** - Complete package structure and dependency graph
- **[Contributing](docs/CONTRIBUTING.md)** - Contribution guidelines, development workflow, and coding standards

### Build & Development

- **[Build Scripts](docs/BUILD_SCRIPTS.md)** - Build commands and development workflows
- **[Build System](docs/BUILD_SYSTEM.md)** - Turborepo architecture and configuration
- **[Watch Mode](docs/WATCH_MODE_GUIDE.md)** - Development with auto-reload
- **[SCSS Setup](docs/SCSS_SETUP.md)** - Styling system and compilation

### Package Documentation

- **[@mdk/core](packages/core/README.md)** - Core components, utilities, and theme ([Usage Guide](packages/core/USAGE.md))
- **[@mdk/foundation](packages/foundation/README.md)** - Complete foundation with features, state, API, and utilities

### Demo App

- **[Demo App](apps/demo/README.md)** - Interactive component showcase

---

## Examples

- **Minimal App**: [examples/minimal-app](examples/minimal-app)
- **Dashboard App**: [examples/dashboard-app](examples/dashboard-app)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/tetherto/miningos-ui-kit/issues)

---

## License

Apache 2.0 - See [LICENSE](https://github.com/tetherto/miningos-app-ui/blob/staging/LICENSE) for details.

---

## Acknowledgments

Built with contributions from the mining operations team.
