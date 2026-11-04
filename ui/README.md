# MDK client

> A developer-first toolkit providing pre-built components, a headless state
> core and ergonomic React bindings for building mining-operations
> applications in days instead of weeks.

> **For AI agents** (and humans onboarding to the repo): start with
> [`AGENTS.md`](AGENTS.md) — its "Start here" section is the ordered
> reading path (architecture tour, package layout, and the export contract).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

## Table of contents

- [Overview](#overview)
- [Packages](#packages)
- [Getting Started](#getting-started)
- [Build and develop](#build-and-develop)
- [Documentation](#documentation)
- [Support](#support)
- [License](#license)

## Overview

The **MDK** UI is a comprehensive toolkit providing:

- **About 160 production-tested components**: 69 generic UI primitives plus mining-domain components, all props-driven
- **Store, auth and utility hooks**; MDK ships no endpoint-specific data hooks, so apps wrap their own Gateway routes with `useQuery`
- **Headless state management** built on Zustand vanilla stores, consumed through framework-specific adapters
- **TanStack Query** integration scaffolding (`@tetherto/mdk-react-adapter` wires up `QueryClientProvider`)
- **Modern tech stack**: React 19, Radix UI, React Hook Form, Zod, SCSS design tokens with `@layer mdk`
cascade ordering

### Key benefits

- Faster development: build dashboards in days, not weeks
- Consistent UX: uniform design patterns across all applications
- Framework-flexible: the headless core is plain TypeScript so non-React adapters can be added later
- Battle-tested: extracted from real operational dashboards
- Zero runtime CSS-in-JS: small bundles, instant theming via CSS custom properties

## Packages

The monorepo ships **runtime packages** (what React apps depend on), **assets**, a **demo**, and
**tooling** (how you build and explore — not imported by production UI code).

### Product — runtime packages and assets

### `@tetherto/mdk-ui-foundation` ([`packages/ui-foundation`](./packages/ui-foundation/README.md))

Framework-agnostic headless package. Pure TypeScript, no React.

- Zustand vanilla stores: `authStore`, `devicesStore`, `notificationStore`,
  `timezoneStore`
- TanStack `QueryClient` factory (`createMdkQueryClient`)
- The client's base URL and auth-aware fetcher (`getApiBaseUrl`, `getFetcher`)
- Auth providers: `noAuth`, `bearerTokenAuth`, `gatewayRedirectAuth`
- Device type / tag helpers (`isMiner`, `isContainer`, `appendIdToTag`, …)
- Shared API types (telemetry rows, layouts, auth)

### `@tetherto/mdk-react-adapter` ([`packages/react-adapter`](./packages/react-adapter/README.md))

React bindings for the headless core.

- `<MdkProvider>`: wraps `QueryClientProvider` and exposes the resolved
  API base URL.
- Store hooks: `useAuth`, `useDevices`, `useNotifications`, `useTimezone`.
- Re-exports of `useQuery` / `useMutation` / `useQueryClient` from
  `@tanstack/react-query` for convenience.

### `@tetherto/mdk-react-devkit` ([`packages/react-devkit`](./packages/react-devkit/README.md))

The React UI library:

- [`src/primitives/`](./packages/react-devkit/src/primitives/): generic UI primitives built on Radix UI (Button, Dialog,
  Switch, Table, Charts, …). BEM class names, SCSS design tokens, CSS
  custom property theming.
- [`src/domain/`](./packages/react-devkit/src/domain/): mining-domain components, with their constants, types and
  utils.

### Catalog app ([`apps/catalog`](./apps/catalog/README.md))

Interactive showcase wrapped in `<MdkProvider>`. Runs via
`npm run dev:catalog`. Includes a `Guides` section with Getting Started,
Adapter Hooks, and Theming pages alongside per-component demos.

### Tooling — build and explore

The machine-readable manifests each package emits under `dist/`
(`registry.json`, `hooks.json`, `stores.json`) are the
discovery surface for humans and agents alike. See [`AGENTS.md`](AGENTS.md).

📖 **See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency
graph.**

## Getting started

### Prerequisites

- **Node.js** >=24 (LTS)
- **npm** 11+

### Installation

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk

npm install
npm run build
```

### Quickstart

```bash
npm run dev              # watch all packages + run catalog
npm run dev:catalog         # catalog app only (HMR)
npm run dev:packages     # packages only, no catalog

npm run build            # build all packages
npm run typecheck        # type-check all packages
npm run lint             # lint all packages
npm run lint:fix         # lint + auto-fix
npm run test             # full test suite
npm run fullcheck        # build + lint + typecheck + format + check:agent-ready + check:api-surface + test:coverage
```

### Use the toolkit in your app

The fastest way is [`mdk create dashboard`](../packages/cli/README.md)
(`@tetherto/mdk-cli`), which stands up a full sign-in-gated operations
dashboard — the `mdk-ui-shell` template — alongside a running stack:

```bash
npx @tetherto/mdk-cli create dashboard my-dashboard   # scaffolds apps/my-dashboard in the current stack
cd apps/my-dashboard
npm run dev                         # http://localhost:3030
```

You can also copy [`examples/mdk-ui-shell-template/`](../examples/mdk-ui-shell-template/README.md)
directly and run it in place — it is a real Vite app, not a scaffold-only
tree. Its README covers adding pages.

Scaffolded by `mdk create dashboard`, the template signs in with a user name and password against the stack's Gateway
(`mdk user add` creates the user); no Google OAuth client is needed. Run in place from the MDK repo, it starts with a dev-only
auth bypass against a local [`mdk-gateway`](../backend/core/gateway/README.md) on `http://localhost:3000`. The
[end-to-end recipe](docs/AGENT_FIRST.md#run-the-mdk-ui-shell-template-end-to-end) covers both, plus Google sign-in.

If you'd rather wire MDK into an existing app manually, add the three
runtime packages to its [`package.json`](./package.json):

```json
{
  "dependencies": {
    "@tetherto/mdk-ui-foundation": "*",
    "@tetherto/mdk-react-adapter": "*",
    "@tetherto/mdk-react-devkit": "*"
  }
}
```

> Runtime apps need only the three `@tetherto/mdk-*` packages above. Devkit's monospace text asks for JetBrains Mono and falls back to the
> system monospace stack; to ship the font, add `@fontsource-variable/jetbrains-mono` and declare it the way
> [`apps/catalog/src/fonts.css`](./apps/catalog/src/fonts.css) does.

Wrap your app in `<MdkProvider>`, give it a session, and import the stylesheet once:

```tsx
import ReactDOM from "react-dom/client";
import { MdkProvider } from "@tetherto/mdk-react-adapter";
import { passwordAuth } from "@tetherto/mdk-ui-foundation";
import "@tetherto/mdk-react-devkit/styles.css";
import "@tetherto/mdk-react-devkit/styles-domain.css"; // only if using domain (mining-domain) components
import App from "./App";

// User name and password against the Gateway; the provider's default is an
// OAuth-redirect flow an MDK Gateway does not serve.
const auth = passwordAuth();

void auth.restore().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <MdkProvider apiBaseUrl="" auth={auth} fetcher={auth.fetcher}>
      <App />
    </MdkProvider>,
  );
});
```

`apiBaseUrl=""` keeps every request same-origin, which is the only arrangement a browser can use: the Gateway has no
CORS support and the refresh cookie is `SameSite=Strict`. In production the Gateway serves the built UI; in `npm run dev`
proxy `/auth` and your app's route prefixes to the Gateway in `vite.config.ts`, as
[`examples/mvp-site/ui/vite.config.ts`](../examples/mvp-site/ui/vite.config.ts) does.

Use components and hooks:

```tsx
import { Button, Dialog } from "@tetherto/mdk-react-devkit/primitives";
import { useAuth, useDevices } from "@tetherto/mdk-react-adapter";

const Toolbar = () => {
  const { permissions } = useAuth();
  const { selectedDevices } = useDevices();
  return <Button>Refresh ({selectedDevices.length})</Button>;
};
```

See [`packages/react-devkit/README.md`](packages/react-devkit/README.md)
for the full API surface and
[`docs/STYLING.md`](docs/STYLING.md)
for the cascade-layer theming model.

## Build and develop

### Build commands

```bash
npm run build            # build everything (TS + SCSS)
npm run build:ts         # only TypeScript
npm run build:scss       # only SCSS
npm run clean            # remove all build artifacts
```

### Watch mode

```bash
npm run dev              # watch all packages + catalog
npm run dev:packages     # packages only
npm run watch:ts         # TS only
npm run watch:scss       # SCSS only
```

For details:

- [Build Scripts & Watch Mode](docs/BUILD.md)
- [Build System Overview](docs/BUILD.md)

## Documentation

**Pick your role:**

- **Contributor** (monorepo changes, agent-ready exports) → [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) +
[`AGENT_READY.md`](packages/react-devkit/AGENT_READY.md)
- **Agent** (LLM workflows, manifests) → [`AGENTS.md`](AGENTS.md) + [`docs/AGENT_FIRST.md`](docs/AGENT_FIRST.md)
- **Engineer** (integrating MDK into an app) → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) + the package READMEs below

### Core

- **[Architecture](docs/ARCHITECTURE.md)**: package structure, dependency
  graph, per-package map, and technology stack
- **[Contributing](docs/CONTRIBUTING.md)**: contribution guidelines,
  workflow, coding standards, and test coverage

### Build and development

- **[Build](docs/BUILD.md)**: scripts, watch mode, Turborepo pipeline, and config
- **[Styling](docs/STYLING.md)**: theming model + SCSS build setup
- **[Test coverage](docs/CONTRIBUTING.md#coverage)**: thresholds and reports

### Agents

- **[AGENTS.md](AGENTS.md)**: agent contract overview and quick recipe.
- **[Agent-first](docs/AGENT_FIRST.md)**: plain-language tour, deeper architecture reference
(manifests and registry), and the
  end-to-end shell setup

### Package documentation

- **[@tetherto/mdk-ui-foundation](packages/ui-foundation/README.md)**: headless core
- **[@tetherto/mdk-react-adapter](packages/react-adapter/README.md)**: React bindings
- **[@tetherto/mdk-react-devkit](packages/react-devkit/README.md)**: React UI library
- **[Styling guide](docs/STYLING.md)**: cascade layers, tokens, class overrides, SCSS setup

### Catalog app

- **[Catalog App](apps/catalog/README.md)**: interactive component showcase

## Support

- **Issues**: [GitHub Issues](https://github.com/tetherto/mdk/issues)

## License

Apache 2.0, see [LICENSE](https://github.com/tetherto/mdk/blob/main/LICENSE)
for details.

## Acknowledgments

Built with contributions from the mining operations team.
