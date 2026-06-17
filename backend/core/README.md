# backend/core

Core infrastructure packages for MDK. These packages form the coordination layer between consumers (UI, AI agents) and the device workers.

## Packages

| Package | NPM name | Description |
|---------|----------|-------------|
| [`ork/`](./ork/README.md) | `@tetherto/mdk-ork` | Orchestration Kernel — DHT discovery, command dispatch, telemetry, health monitoring |
| [`mdk/`](./mdk/README.md) | `@tetherto/mdk` | Bootstrap utilities — `getOrk()`, `startWorker()`, `startAppNode()` |
| [`app-node/`](./app-node/README.md) | `@tetherto/mdk-app-node` | HTTP/WebSocket server — auth, RBAC, fleet aggregation, MCP endpoint |
| [`client/`](./client/README.md) | `@tetherto/mdk-client` | IPC client — connects App Node to ORK over Unix socket |
| [`lib-stats/`](./lib-stats/README.md) | _(internal)_ | Telemetry aggregation operations (count, sum, avg, groupBy, …) |
| [`mock-control-service/`](./mock-control-service/README.md) | `@tetherto/mdk-mock-control-service` | Mock vendor APIs for development and testing |
| [`examples/`](../../examples/backend/README.md) | _(runnable demos)_ | End-to-end examples — single worker, full site, DHT multi-process |

## Dependency Graph

```
@tetherto/mdk-app-node
  └── @tetherto/mdk-client   (IPC to ORK)
  └── @tetherto/mdk          (bootstrap helpers)
        └── @tetherto/mdk-ork  (kernel)
```

Workers are a separate dependency tree (`backend/workers/`). They do not import from `core/` directly except for the MDK Protocol constants shared through `@tetherto/mdk-ork`.

## Shared Conventions

All packages in `core/` follow these rules:

- `'use strict'` at the top of every file
- Logging via the `debug` module: `require('debug')('mdk:<package>:<module>')`
- Error constants in `SCREAMING_SNAKE_CASE` prefixed with `ERR_`
- Tests use the `brittle` framework — run with `npx brittle tests/unit/<name>.js`
- Linting with StandardJS (`npm run lint`)

## Running Tests

Each package has its own test suite. Run from the package root:

```bash
cd backend/core/ork && npm test
cd backend/core/mdk && npm test
cd backend/core/client && npm test
cd backend/core/app-node && npm test
cd backend/core/mock-control-service && npm test
```
