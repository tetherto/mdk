# Core

Core infrastructure packages for MDK. These packages form the coordination layer between consumers (UI, AI agents) and the device Workers.

## Packages

| Package | npm name | Description |
|---------|----------|-------------|
| [`kernel/`](./kernel/README.md) | `@tetherto/mdk-kernel` | Orchestration Kernel — DHT discovery, command dispatch, telemetry, health monitoring |
| [`mdk/`](./mdk/README.md) | `@tetherto/mdk-core` | Bootstrap utilities: `getKernel()`, `startGateway()`, `waitForDiscovery()` |
| [`mdk-worker/`](./mdk-worker/lib/worker-runtime.js) | `@tetherto/mdk-worker` | Worker Runtime: hosts a Worker Plugin's devices behind one HRPC channel to Kernel |
| [`gateway/`](./gateway/README.md) | `@tetherto/mdk-gateway` | HTTP server — fleet aggregation via plugins |
| [`mcp/`](./mcp/README.md) | `@tetherto/mdk-mcp` | Standalone MCP server — exposes Gateway plugin routes and native tools to AI agents |
| [`client/`](./client/README.md) | `@tetherto/mdk-client` | Client — connects Gateway to Kernel over HRPC |
| [`lib-stats/`](./lib-stats/README.md) | _(internal)_ | Telemetry aggregation operations (count, sum, avg, `groupBy`, …) |
| [`examples/`](../../examples/backend/README.md) | _(runnable demos)_ | End-to-end examples — single Worker, full site, DHT multi-process |

## Dependency graph

```text
@tetherto/mdk-gateway
  └── @tetherto/mdk-client   (HRPC to Kernel)
  └── @tetherto/mdk-core     (bootstrap helpers)
        └── @tetherto/mdk-kernel  (kernel)

@tetherto/mdk-mcp              (standalone MCP server — a separate process, not a Gateway dependency)
  └── @tetherto/mdk-gateway   (workers/lib/plugin-loader + plugin-gateway, to load a Gateway plugin's routes as tools)
  └── @tetherto/mdk-worker    (module-context, to isolate a plugin's own require()s)

@tetherto/mdk-worker          (Worker Runtime, hosts a plugin's devices behind one HRPC channel)
```

The Gateway itself has no MCP capability or dependency of its own — `@tetherto/mdk-mcp` depends on it, not the other way
around, so a Gateway plugin's routes can be read and converted into tools by the standalone MCP process (`mdk run mcp`)
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
