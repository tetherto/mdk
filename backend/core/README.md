# Core

Core infrastructure packages for MDK. These packages form the coordination layer between consumers (UI, AI agents) and the device Workers.

## Packages

| Package | npm name | Description |
|---------|----------|-------------|
| [`kernel/`](./kernel/README.md) | `@tetherto/mdk-kernel` | Orchestration Kernel — DHT discovery, command dispatch, telemetry, health monitoring, and the token issuer |
| [`mdk/`](./mdk/README.md) | `@tetherto/mdk-core` | Bootstrap utilities: `getKernel()`, `startGateway()`, `waitForDiscovery()`, plus the injectable services runtime-hosted Workers use |
| [`mdk-worker/`](./mdk-worker/README.md) | `@tetherto/mdk-worker` | Worker Runtime: hosts a Worker Plugin's devices behind one HRPC channel to Kernel |
| [`gateway/`](./gateway/README.md) | `@tetherto/mdk-gateway` | HTTP router — signs callers in, checks each app route against `spec.rbac`, forwards to the app's runtime |
| [`app-runtime/`](./app-runtime/README.md) | `@tetherto/mdk-app-runtime` | Runs one app's controllers in its own process and serves them to the Gateway over HRPC |
| [`mcp/`](./mcp/README.md) | `@tetherto/mdk-mcp` | Standalone MCP server that exposes app routes and native tools to AI agents |
| [`client/`](./client/README.md) | `@tetherto/mdk-client` | Protocol client — the HRPC transport apps, the Gateway and the MCP server use to reach Kernel |
| [`identity/`](./identity/README.md) | `@tetherto/mdk-identity` | Token issuer and JWT verification: users, service accounts, rotating refresh tokens |
| [`rbac/`](./rbac/README.md) | `@tetherto/mdk-rbac` | Policy library: validates `spec.rbac` from `mdk.yaml` and judges callers at the Gateway, MCP server and Kernel |
| [`agent/`](./agent/README.md) | `@tetherto/mdk-agent` | Operator agent: a headless loop over a local model, using MDK tools over MCP (workspace-private) |

The end-to-end runnable example is [`examples/mvp-site/`](../../examples/mvp-site/README.md) at the repository root.

## Dependency graph

```text
@tetherto/mdk-gateway
  └── @tetherto/mdk-client   (HRPC to Kernel)
  └── @tetherto/mdk-core     (bootstrap helpers)
        └── @tetherto/mdk-kernel  (kernel)
  └── @tetherto/mdk-app-runtime  (forwarding client, plugin loader)

@tetherto/mdk-app-runtime     (runs one app's handlers; no Gateway dependency)
  └── @tetherto/mdk-worker    (module-context, to isolate an app's own require()s)

@tetherto/mdk-mcp              (standalone MCP server — a separate process, not a Gateway dependency)
  └── @tetherto/mdk-gateway   (workers/lib/plugin-loader + plugin-gateway, to load an app's routes as tools)
  └── @tetherto/mdk-worker    (module-context, to isolate a plugin's own require()s)

@tetherto/mdk-worker          (Worker Runtime, hosts a plugin's devices behind one HRPC channel)
```

The Gateway itself has no MCP capability or dependency of its own — `@tetherto/mdk-mcp` depends on it, not the other way
around, so an app's routes can be read and converted into tools by the standalone MCP process (`mdk run mcp`)
without the Gateway knowing MCP exists.

Workers are a separate dependency tree ([`backend/workers/`](../workers/README.md)). They import `@tetherto/mdk-worker` for the runtime and do not import
from `core/` directly otherwise, except for the MDK Protocol constants shared through `@tetherto/mdk-kernel`.

## Shared conventions

All packages in `core/` follow these rules:

- `'use strict'` at the top of every file
- Logging via the `debug` module: `require('debug')('mdk:<package>:<module>')`
- Error constants in `SCREAMING_SNAKE_CASE` prefixed with `ERR_`
- Tests use the `brittle` framework — run with `npm test` (unit) or `npm run test:coverage` (full suite with `tests/**/*.test.js`)
- Linting with StandardJS (`npm run lint`)

## Running tests

> [!NOTE]
> Needs npm 11 [(< 12)](../../docs/reference/environment.md#why-npm-stays-below-12); `npm install` from the repo root
> installs every package.

Each package has its own test suite. Run from the package root:

```bash
cd backend/core/kernel && npm test
cd backend/core/mdk && npm test
cd backend/core/client && npm test
cd backend/core/gateway && npm test
cd backend/core/mcp && npm test
```
