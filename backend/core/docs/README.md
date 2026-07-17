## MDK Core

See the [architecture overview](../../../docs/concepts/architecture.md) to understand Core's part in the MDK. Core ships five packages:

| Package | What it does | Where |
|---|---|---|
| `@tetherto/mdk-kernel` | Kernel | [`backend/core/kernel/`](../kernel/index.js) |
| `@tetherto/mdk-gateway` | Gateway Node.js server | [`backend/core/gateway/`](../gateway/worker.js) |
| `@tetherto/mdk` | Bootstrap utilities and SDK entry | [`backend/core/mdk/`](../mdk/index.js) |
| `@tetherto/mdk-client` | Client / protocol transport | [`backend/core/client/`](../client/index.js) |
| `@tetherto/mdk-mock-control-service` | Mock vendor API service for tests | [`backend/core/mock-control-service/`](../mock-control-service/mock-control-agent.js) |

Each is detailed below.

## Kernel

Lives in [`backend/core/kernel/`](../kernel/index.js). Discovers and registers Workers, dispatches commands through a crash-recoverable state machine,
 and pulls telemetry on a fixed schedule. The [Workers discovery model](../../../docs/concepts/stack/workers.md#discovery-model) covers local, same-process, 
 and DHT modes.

Kernel is **pull-only and passive** — it never pushes to your app. You query it over HRPC using its public key, published to a key file 
(`<tmpdir>/mdk/.kernel-key`) on start. It fans the query out to online Workers and aggregates the response.

[Kernel](../kernel/README.md#architecture) is organized into sub-systems instantiated by modules:

|Sub system | Responsibility |
|-----------|-------------------------------------------------------------------------------------------------|
| Discovery | Finds and registers Workers across DHT, local, and same-process modes |
| Transport | Accepts caller connections over HRPC and calls Workers |
| Coordination | The modules that do the work: command dispatch, telemetry, health, and write-action approval |
| Storage | Persists the registry, capabilities, command Write-Ahead Logs (WAL), and action state |
| Protocol | The MDK envelope and action set that Workers and Kernel speak |

## Gateway

Lives in [`backend/core/gateway/`](../gateway/worker.js). The Gateway is where your business logic is defined. It's your Node.js server that connects to 
Kernel over HRPC, sends typed queries and receives aggregated responses. You decide what happens to your telemetry data.

```js
// connect using the key the Kernel publishes to its key file
const client = createMdkClient({ hrpc: { key: fs.readFileSync(DEFAULT_KEY_FILE, 'utf8').trim() } })

// list devices + telemetry
await client.pullTelemetry(deviceId, { type: 'metrics' })

// what can this device do?
await client.getCapabilities(deviceId)
```

## MDK (`@tetherto/mdk`)

Lives in [`backend/core/mdk/`](../mdk/index.js). Bootstrap utilities and the SDK entry point. Exposes [`startWorker(ManagerClass, opts)`](../mdk/index.js) and 
the service bootstrap helpers used by every Worker and example.

## Client (`@tetherto/mdk-client`)

Lives in [`backend/core/client/`](../client/index.js). The protocol client that encodes MDK Protocol envelopes and shuttles `ACTIONS.*` requests/responses over 
HRPC (by the Kernel's public key). Gateways embed it to talk to Kernel.

## Mock control service (`@tetherto/mdk-mock-control-service`)

Lives in [`backend/core/mock-control-service/`](../mock-control-service/mock-control-agent.js). Fastify-based mock layer that stands in for real vendor APIs 
during examples and tests. Key files: [`mock-control-agent.js`](../mock-control-service/mock-control-agent.js) and [`routes.js`](../mock-control-service/routes.js).

## Connection and deployment model

Core uses Hyperswarm RPC (HRPC) for runtime MDK Protocol traffic. The [deployment topologies](../../../docs/concepts/deployment-topologies.md)
explain the supported process layouts, while the [Worker discovery model](../../../docs/concepts/stack/workers.md#discovery-model)
explains how Kernel obtains Worker public keys in DHT, local, and same-process modes.

Package-specific APIs and configuration live with each package:

- [Kernel architecture and configuration](../kernel/README.md)
- [Gateway configuration and Kernel connection](../gateway/README.md)
- [Bootstrap SDK](../mdk/README.md)
- [Client API and HRPC transport](../client/README.md)

## Next steps

- Learn more about the [developer model](../../../docs/concepts/stack/kernel.md)
- Discover the [HTTP and React hook surface](../../../docs/guides/gateway/write-actions.md)
- Learn about write actions that [require approval](../../../docs/concepts/control-plane.md#approval-gated-writes)

