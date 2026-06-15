## MDK Core

See the [architecture overview](../../../docs/concepts/architecture.md) to understand Core's part in the MDK. Core ships five packages:

| Package | What it does | Where |
|---|---|---|
| `@tetherto/mdk-ork` | Orchestration Kernel | [`backend/core/ork/`](../ork/index.js) |
| `@tetherto/mdk-app-node` | App-node Node.js server | [`backend/core/app-node/`](../app-node/worker.js) |
| `@tetherto/mdk` | Bootstrap utilities and SDK entry | [`backend/core/mdk/`](../mdk/index.js) |
| `@tetherto/mdk-client` | IPC client / protocol transport | [`backend/core/client/`](../client/index.js) |
| `@tetherto/mdk-mock-control-service` | Mock vendor API service for tests | [`backend/core/mock-control-service/`](../mock-control-service/mock-control-agent.js) |

Each is detailed below.

## ORK (orchestration kernel)

Lives in [`backend/core/ork/`](../ork/index.js). Discovers Workers via [Hyperswarm DHT](https://github.com/holepunchto/hyperswarm) and pulls data from them on a fixed schedule.

| Module | What it does |
|---|---|
| `discovery` | Joins Hyperswarm DHT, finds workers by topic key |
| `transport` | Opens [HRPC](https://github.com/holepunchto/hrpc) channels to each discovered worker |
| `modules` | Device registry, telemetry store, health state |
| `storage` | Persists the registry to disk between restarts |
| `protocol` | Message envelope format for IPC and HRPC |

ORK is **pull-only and passive** — it never pushes to your app. You query it over a UNIX socket (`ork.sock`). It fans the query out to online workers 
and aggregates the response.

## App-node

Lives in [`backend/core/app-node/`](../app-node/worker.js). The App-node is where your business logic is defined. It's your Node.js server that connects to ORK over the UNIX socket sends typed queries and receives aggregated responses. You decide what happens to your telemetry data.

```js
// list devices + telemetry
ipc(SOCK, ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, deviceId)

// what can this device do?
ipc(SOCK, ACTIONS.DEVICE_CAPABILITIES, {}, deviceId)
```

## MDK (`@tetherto/mdk`)

Lives in [`backend/core/mdk/`](../mdk/index.js). Bootstrap utilities and the SDK entry point. Exposes [`startWorker(ManagerClass, opts)`](../mdk/index.js) and the service bootstrap helpers used by every worker and example.

## MDK client (`@tetherto/mdk-client`)

Lives in [`backend/core/client/`](../client/index.js). The protocol client that encodes MDK Protocol envelopes and shuttles `ACTIONS.*` requests/responses over the UNIX socket. App-nodes embed it to talk to ORK.

## Mock control service (`@tetherto/mdk-mock-control-service`)

Lives in [`backend/core/mock-control-service/`](../mock-control-service/mock-control-agent.js). Fastify-based mock layer that stands in for real vendor APIs during examples and tests. Key files: [`mock-control-agent.js`](../mock-control-service/mock-control-agent.js) and [`routes.js`](../mock-control-service/routes.js).
