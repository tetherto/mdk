# Core

Core infrastructure packages for MDK. These packages form the coordination layer between consumers (UI, AI agents) and the device Workers.

## Packages

| Package | NPM name | Description |
|---------|----------|-------------|
| [`kernel/`](./kernel/README.md) | `@tetherto/mdk-kernel` | Orchestration Kernel — DHT discovery, command dispatch, telemetry, health monitoring |
| [`mdk/`](./mdk/README.md) | `@tetherto/mdk` | Bootstrap utilities — `getKernel()`, `startWorker()`, `startGateway()` |
| [`gateway/`](./gateway/README.md) | `@tetherto/mdk-gateway` | HTTP/WebSocket server — auth, RBAC, fleet aggregation, MCP endpoint |
| [`client/`](./client/README.md) | `@tetherto/mdk-client` | Client — connects Gateway to Kernel over HRPC |
| [`lib-stats/`](./lib-stats/README.md) | _(internal)_ | Telemetry aggregation operations (count, sum, avg, groupBy, …) |
| [`mock-control-service/`](./mock-control-service/README.md) | `@tetherto/mdk-mock-control-service` | Mock vendor APIs for development and testing |
| [`examples/`](../../examples/backend/README.md) | _(runnable demos)_ | End-to-end examples — single Worker, full site, DHT multi-process |

## Dependency graph

```
@tetherto/mdk-gateway
  └── @tetherto/mdk-client   (HRPC to Kernel)
  └── @tetherto/mdk          (bootstrap helpers)
        └── @tetherto/mdk-kernel  (kernel)
```

Workers are a separate dependency tree (`backend/workers/`). They do not import from `core/` directly except for the MDK Protocol constants 
shared through `@tetherto/mdk-kernel`.

## Shared conventions

All packages in `core/` follow these rules:

- `'use strict'` at the top of every file
- Logging via the `debug` module: `require('debug')('mdk:<package>:<module>')`
- Error constants in `SCREAMING_SNAKE_CASE` prefixed with `ERR_`
- Tests use the `brittle` framework — run with `npm test` (unit) or `npm run test:coverage` (full suite with `tests/**/*.test.js`)
- Linting with StandardJS (`npm run lint`)

## Running Tests

Each package has its own test suite. Run from the package root:

```bash
cd backend/core/kernel && npm test
cd backend/core/mdk && npm test
cd backend/core/client && npm test
cd backend/core/gateway && npm test
cd backend/core/mock-control-service && npm test
```
