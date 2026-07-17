# MDK Client

> A developer-first toolkit providing pre-built components, a headless state
> core and ergonomic React bindings for building mining-operations
> applications in days instead of weeks.

> **For AI agents** (and humans onboarding to the repo): start with
> [`AGENTS.md`](AGENTS.md) — its "Start here" section is the ordered
> reading path (architecture tour, package layout, the export contract,
> and the `mdk-ui` CLI reference).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/tetherto/mdk/blob/main/LICENSE)

## Table of Contents

- [Overview](#overview)
- [Packages](#packages)
- [Getting Started](#getting-started)
- [Build and develop](#build-and-develop)
- [Documentation](#documentation)
- [Support](#support)
- [License](#license)

## Overview

The **MDK** UI is a comprehensive toolkit providing:

- **150–200+ production-tested components** (generic UI primitives + mining-domain components)
- **70+ custom React hooks** for common patterns
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

### `@tetherto/mdk-ui-foundation` (`packages/ui-foundation`)

Framework-agnostic headless package. Pure TypeScript, no React.

- Zustand vanilla stores: `authStore`, `devicesStore`, `notificationStore`,
  `timezoneStore`, `actionsStore`
- TanStack `QueryClient` factory (`createMdkQueryClient`)
- `queryKeys`: centralized key factories for all read endpoints,
  including Op Centre reads (site, racks, PDU layout, global data,
  `thingConfig`), Pool Manager, and `thing` comment mutations
- Query factories and pool factories: `{ queryKey, queryFn }` objects
  for mining read endpoints
- Query parameter builders: Op Centre, alert, dashboard, and pool
  builders (`buildExplorerListThingsParams`, `buildContainerDetailParams`,
  `buildContainerWidgetsListParams`, etc.)
- Container tab utilities: `CONTAINER_TAB_MATRIX`, `resolveContainerModelFamily`,
  `getSupportedContainerTabs`
- `flattenKernelEnvelope`: null-safe per-Kernel envelope flattener
- Telemetry primitives (subscription manager, stale detection, ring
  buffer)
- Command lifecycle state machine
- Shared API types (including Op Centre: `ListRacksParams`,
  `PduLayoutParams`, `GlobalDataParams`, `ThingConfigParams`,
  `ThingCommentBody`)

### `@tetherto/mdk-react-adapter` (`packages/react-adapter`)

React bindings for the headless core.

- `<MdkProvider>`: wraps `QueryClientProvider` and exposes the resolved
  API base URL.
- Store hooks: `useAuth`, `useDevices`, `useNotifications`, `useTimezone`,
  `useActions`.
- Re-exports of `useQuery` / `useMutation` / `useQueryClient` from
  `@tanstack/react-query` for convenience.

### `@tetherto/mdk-react-devkit` (`packages/react-devkit`)

The React UI library:

- `src/primitives/`: generic UI primitives built on Radix UI (Button, Dialog,
  Switch, Table, Charts, …). BEM class names, SCSS design tokens, CSS
  custom property theming.
- `src/domain/`: mining-domain components, hooks and a TanStack
  Query API stub.

### `@tetherto/mdk-fonts` (`packages/fonts`)

Font assets only (JetBrains Mono).

### Catalog app (`apps/catalog`)

Interactive showcase wrapped in `<MdkProvider>`. Runs via
`npm run dev:catalog`. Includes a `Guides` section with Getting Started,
Adapter Hooks, and Theming pages alongside per-component demos.

### Tooling — build and explore

### `@tetherto/mdk-ui-cli` (`packages/cli`)

The `mdk-ui` CLI supports scaffolding, registry discovery, and agent
workflows (`registry`, `docs`, `example`, `suggest`, `create`, `add page`,
…). It is **not** a runtime dependency of your app. See
[`packages/cli/README.md`](packages/cli/README.md) and [`AGENTS.md`](AGENTS.md).

📖 **See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency
graph.**

## Getting Started

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

### Quick start

```bash
npm run dev              # watch all packages + run catalog
npm run dev:catalog         # catalog app only (HMR)
npm run dev:packages     # packages only, no catalog

npm run build            # build all packages
npm run typecheck        # type-check all packages
npm run lint             # lint all packages
npm run lint:fix         # lint + auto-fix
npm run test             # full test suite
npm run fullcheck        # build + lint + typecheck + format + check:agent-ready + coverage
```

### Use the toolkit in your app

The fastest way is the MDK CLI, it scaffolds a full Vite+React+MDK app
and seeds the agent context files (`.mdk/context.md`, Cursor / Claude
rules) for you:

```bash
npx mdk-ui create my-app           # one-shot scaffold + install
cd my-app
npm run dev                         # http://localhost:5173

# Iterate from inside the app
npx mdk-ui add feature alerts       # full alerts page from a blueprint
npx mdk-ui add page Hashrate        # single-component page (auto-resolves)
npx mdk-ui remove page Hashrate     # undo a scaffolded page
```

For a full sign-in-gated operations dashboard against a real backend,
use the `mdk-ui-shell` template instead of `starter`:

```bash
npx mdk-ui create my-dashboard --template mdk-ui-shell
```

That template needs a local
[`mdk-gateway`](https://github.com/tetherto/mdk-prv/blob/release/0.5.0/backend/core/gateway/package.json)
running on `http://localhost:3000` and a Google OAuth client. See
[`docs/AGENT_FIRST.md`](docs/AGENT_FIRST.md#run-the-mdk-ui-shell-template-end-to-end)
for the end-to-end recipe.

If you'd rather wire MDK into an existing app manually, add the three
runtime packages to its `package.json`:

```json
{
  "dependencies": {
    "@tetherto/mdk-ui-foundation": "*",
    "@tetherto/mdk-react-adapter": "*",
    "@tetherto/mdk-react-devkit": "*"
  }
}
```

> Runtime apps need the three `@tetherto/mdk-*` packages above; install
> `@tetherto/mdk-ui-cli` separately when you want CLI or agent scaffolding.

Wrap your app in `<MdkProvider>` and import the stylesheet once:

```tsx
import "@tetherto/mdk-fonts/jetbrains-mono.css";
import "@tetherto/mdk-react-devkit/styles.css";
import "@tetherto/mdk-react-devkit/styles-domain.css"; // only if using domain (mining-domain) components
import { MdkProvider } from "@tetherto/mdk-react-adapter";

ReactDOM.createRoot(rootElement).render(
  <MdkProvider apiBaseUrl="https://gateway.example.com">
    <App />
  </MdkProvider>,
);
```

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
- **Agent** (LLM workflows, manifests, `mdk-ui` CLI) → [`AGENTS.md`](AGENTS.md) + [`docs/AGENT_FIRST.md`](docs/AGENT_FIRST.md)
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

### Agents and CLI

- **[AGENTS.md](AGENTS.md)**: agent contract overview and quick recipe.
- **[Agent-first](docs/AGENT_FIRST.md)**: plain-language tour, deeper architecture reference 
(manifests, blueprints, registry), and the
  end-to-end shell setup
- **[@tetherto/mdk-ui-cli](packages/cli/README.md)**: full CLI command reference (`create`, `add page`, 
`add feature`, `remove page`, `registry`, `hooks`, `stores`, `suggest`, …)

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
