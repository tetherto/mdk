---
title: MDK App Toolkit
description: The three-layer MDK development toolkit — Gateway backend, plugin system, and frontend packages
docs@tether_slug: concepts/stack/app-toolkit
---

## Overview

The MDK App Toolkit is the recommended development path for teams building MDK-powered applications. It is composed of
three coordinated layers:

- Gateway backend
- Plugin system
- Frontend packages

Not every layer is required for every consumer type.

MDK supports two primary consumer patterns:

- **Human operator UI**: a frontend application connects to the Gateway's [REST][gateway-http-api] and
  [WebSocket][gateway-websocket] APIs. The full three-layer toolkit applies — Gateway, plugin system, and frontend packages
- **AI agent / headless consumer**: an AI agent connects to the Gateway's MCP endpoint and subscribes to telemetry feeds
  directly. The frontend packages are not required; the Gateway and plugin system alone are sufficient

> [!NOTE]
> Status: MCP is in progress. The HTTP and WebSocket consumer paths are available today.

## Gateway layer

`@tetherto/mdk-gateway` is the backend component of the toolkit. It wraps [`@tetherto/mdk-client`][mdk-client] — the Kernel protocol connector —
and delivers an authenticated HTTP, WebSocket, and MCP interface for consumers that need those capabilities. Read the
[Gateway concept page][gateway-concept] for the full developer model: extension patterns, data access, auth design, and Kernel connection.

As a toolkit component, the Gateway provides out of the box:

- Fastify-based HTTP server and WebSocket endpoint
- JWT authentication, session management, and OAuth2 (Google and Microsoft)
- RBAC enforcement at the route level
- Command proxying and telemetry subscriptions to Kernel via `@tetherto/mdk-client`
- MCP endpoint for AI agents

> [!NOTE]
> Using [`@tetherto/mdk-client`][mdk-client] without the Gateway runtime is technically possible — you write your own auth,
> routing, and middleware — but it is not supported by this monorepo. Most applications build on the Gateway.

## Plugin system

`@tetherto/mdk-plugins` is the extension mechanism. A plugin is a directory containing an [`mdk-plugin.json`][plugins-manifest] manifest and one or
more controller files. The Gateway discovers and loads plugins from directories passed via [`extraPluginDirs`][plugins-mounting].

The toolkit ships defaults plugins, e.g., `auth` (user authentication routes), `telemetry` (hashrate, efficiency, temperature
metrics), and `site-hashrate` (aggregated site history). Any plugin you write loads identically.

> [!TIP]
> - [Plugin authoring guide][plugins-how-to] — build process, manifest schema, controller contract
> - [Plugin reference][plugins-readme] — manifest schema, default routes, loader errors

## Frontend packages

These packages are for the **human operator UI** pattern — the application layer that connects to the Gateway's REST and
WebSocket APIs. If your consumer is an AI agent connecting via the MCP endpoint, this layer is not required.

> [!NOTE]
> Early versions of MDK ship three layered workspace packages within the monorepo. 
> npm packages will be published as the tooling matures.

Consuming applications add the workspace dependencies directly. Consuming the whole chain is the recommended path for operator UIs.

> [!TIP]
> The [UI architecture reference][ui-architecture] covers the full dependency graph, build strategy, and package internals.

**[`@tetherto/mdk-ui-foundation`][ui-foundation]**: framework-agnostic headless core. No React imports. Provides Zustand vanilla stores
(`authStore`, `devicesStore`, `notificationStore`, `timezoneStore`, `actionsStore`), a TanStack `QueryClient` factory with
environment-aware base URL resolution, centralised `queryKeys` and query factories for all read endpoints (including Op Centre reads —
site, racks, PDU layout, global data, `thingConfig` — and Pool Manager), Op Centre query parameter builders, the per-model container
detail-tab matrix, a null-safe envelope flattener (`flattenKernelEnvelope`), and the Gateway API type contracts.

**[`@tetherto/mdk-react-adapter`][react-adapter]**: React bindings for the core. Provides `<MdkProvider apiBaseUrl={...}>`
(required at the app root) and store hooks (`useAuth`, `useDevices`, `useTimezone`, `useNotifications`, `useActions`).

**[`@tetherto/mdk-react-devkit`][react-devkit]**: React UI library. `src/primitives/` ships generic UI primitives built on Radix UI
(Button, Dialog, Switch, Select, Data Table, Charts). `src/domain/` ships mining-domain components, features, and presentation hooks.

### Developer entry points

The toolkit can be adopted at any of the following entry points, from most batteries-included to least.

| Entry point | Package | What ships | What you write | When to choose |
|---|---|---|---|---|
| UI Kit | `@tetherto/mdk-react-devkit` (`/primitives` + `/domain` entrypoints) | Pre-built React components, shell layout, ready-made ops dashboard | Data wiring, optional theming | You want a dashboard up fast |
| Framework adapter | `@tetherto/mdk-react-adapter` (React today; Vue/Svelte/WC planned) | `<MdkProvider>`, store hooks, TanStack Query re-exports | Your own components and layout | You have a design system already |
| UI Foundation | [`@tetherto/mdk-ui-foundation`][ui-foundation-ref] | Zustand vanilla stores, `QueryClient` factory, `queryKeys`, query factories, Op Centre query builders, container tab matrix, API types | Framework bindings or headless utilities | You need store access outside React or are building a new adapter |
| Raw SDK | `@tetherto/mdk-client` | MDK Protocol client, connection management, reconnection | Everything above the wire: state, framework, UI | You are building a non-UI consumer (CLI, agent, backend service) |

## Architecture overview

```mermaid
flowchart TD
    subgraph frontend ["Frontend packages"]
        direction TB
        UI_FOUNDATION["@tetherto/mdk-ui-foundation (headless stores)"]
        FRAMEWORKS["@tetherto/mdk-react-adapter (React bindings)"]
        UI_COMPS["@tetherto/mdk-react-devkit (UI Kit)"]

        UI_COMPS -->|consumes adapter hooks| FRAMEWORKS
        FRAMEWORKS -->|binds headless stores| UI_FOUNDATION
    end

    subgraph backend ["Gateway + plugins (server)"]
        direction TB
        PLUGINS["@tetherto/mdk-plugins (default + custom routes)"]
        ROUTER["@tetherto/mdk-gateway (HTTP / WS / MCP)"]
        CLIENT["@tetherto/mdk-client (protocol connector)"]

        PLUGINS -->|registers routes into| ROUTER
        ROUTER -->|proxies to Kernel via| CLIENT
    end

    UI_FOUNDATION <-->|"HTTP / WebSocket"| ROUTER
    CLIENT -->|"MDK Protocol"| Kernel["@tetherto/mdk-kernel (kernel)"]

    style frontend fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
    style backend fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
```

## Next steps

- Understand the [Gateway surface][gateway-concept]
- [Build or extend with the plugin system][plugins-how-to]
- Explore the [frontend package architecture][ui-architecture]

## Links

[gateway-concept]: gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[gateway-http-api]: ../../../backend/core/gateway/README.md#http-api-overview
<!-- docs@tether.io: gateway-http-api → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#http-api-overview -->

[gateway-websocket]: ../../../backend/core/gateway/README.md#websocket-subscriptions
<!-- docs@tether.io: gateway-websocket → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#websocket-subscriptions -->

[plugins-readme]: ../../../backend/core/plugins/README.md
<!-- docs@tether.io: plugins-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md -->

[plugins-manifest]: ../../../backend/core/plugins/README.md#manifest-format
<!-- docs@tether.io: plugins-manifest → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#manifest-format -->

[plugins-mounting]: ../../../backend/core/plugins/README.md#mounting-plugins
<!-- docs@tether.io: plugins-mounting → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#mounting-plugins -->

[plugins-how-to]: ../../guides/gateway/plugins.md
<!-- docs@tether.io: plugins-how-to → guides/gateway/plugins -->

[ui-architecture]: ../../../ui/docs/ARCHITECTURE.md
<!-- docs@tether.io: ui-architecture → https://github.com/tetherto/mdk/blob/main/ui/docs/ARCHITECTURE.md -->

[ui-foundation]: ../../../ui/packages/ui-foundation/README.md
<!-- docs@tether.io: ui-foundation → https://github.com/tetherto/mdk/blob/main/ui/packages/ui-foundation/README.md -->

[ui-foundation-ref]: ../../../ui/packages/ui-foundation/README.md
<!-- docs@tether.io: ui-foundation-ref → reference/app-toolkit/ui-foundation -->

[react-adapter]: ../../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: react-adapter → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md -->

[react-devkit]: ../../../ui/packages/react-devkit/README.md
<!-- docs@tether.io: react-devkit → https://github.com/tetherto/mdk/blob/main/ui/packages/react-devkit/README.md -->

[mdk-client]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->
