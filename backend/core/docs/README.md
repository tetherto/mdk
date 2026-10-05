## MDK core

See the [architecture overview](../../../docs/concepts/architecture.md) to understand Core's part in the MDK. Core ships the following packages:

| Package | What it does | Where |
|---|---|---|
| `@tetherto/mdk-kernel` | Kernel | [`backend/core/kernel/`](../kernel/index.js) |
| `@tetherto/mdk-gateway` | Gateway Node.js server | [`backend/core/gateway/`](../gateway/worker.js) |
| `@tetherto/mdk-core` | Bootstrap utilities and SDK entry | [`backend/core/mdk/`](../mdk/index.js) |
| `@tetherto/mdk-worker` | Worker Runtime: hosts a Worker Plugin's devices behind one HRPC channel to Kernel | [`backend/core/mdk-worker/`](../mdk-worker/lib/worker-runtime.js) |
| `@tetherto/mdk-client` | Client / protocol transport | [`backend/core/client/`](../client/index.js) |
| `@tetherto/mdk-mcp` | MCP server: exposes MDK data/actions to AI agents as tools | [`backend/core/mcp/`](../mcp/README.md) |

Each is detailed below.

## Kernel

Lives in [`backend/core/kernel/`](../kernel/index.js). Discovers and registers Workers, dispatches commands through a crash-recoverable state machine,
 and pulls telemetry on a fixed schedule. The [Workers discovery model](../../workers/docs/architecture.md#discovery-model) covers local, same-process,
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
Kernel over HRPC, sends typed queries, and receives aggregated responses. You decide what happens to your telemetry data.

```js
// connect using the key the Kernel publishes to its key file
const client = createMdkClient({ kernelKey: fs.readFileSync(DEFAULT_KEY_FILE, 'utf8').trim() })

// list devices + telemetry
await client.pullTelemetry(deviceId, { type: 'metrics' })

// what can this device do?
await client.getCapabilities(deviceId)
```

## MDK (`@tetherto/mdk-core`)

Lives in [`backend/core/mdk/`](../mdk/index.js). Bootstrap utilities and the SDK entry point. Exposes [`getKernel()`, `startGateway()`,
and `waitForDiscovery()`](../mdk/index.js). Worker boot itself is per-package: each Worker exports its own boot function
around [`WorkerRuntime`](../mdk-worker/lib/worker-runtime.js), and there is no single generic `startWorker`.

## Worker runtime (`@tetherto/mdk-worker`)

Lives in [`backend/core/mdk-worker/`](../mdk-worker/lib/worker-runtime.js). Hosts a Worker Plugin's devices behind one HRPC channel to
Kernel. Every Worker package (miners, containers, power meters, …) constructs a `WorkerRuntime` from its own boot function.

## Client (`@tetherto/mdk-client`)

Lives in [`backend/core/client/`](../client/index.js). The protocol client that encodes MDK Protocol envelopes and shuttles `ACTIONS.*` requests/responses over
HRPC (by the Kernel's public key). Gateways embed it to talk to Kernel.

## MCP server (`@tetherto/mdk-mcp`)

Lives in [`backend/core/mcp/`](../mcp/README.md). Exposes MDK data and actions to AI agents as declarative tools, using the
same `@tetherto/mdk-client` connection to Kernel that the Gateway uses. Always runs as its own standalone server — a
separate process from the Gateway, which has no MCP code of its own — and can derive tools directly from a Gateway
plugin's own manifest, in addition to hand-authored `mcp-plugin.json` tool directories (see
[Expose Gateway data to an agent](../../../docs/guides/agent/expose-data.md)).

## Connection and deployment model

Core uses Hyperswarm RPC (HRPC) for runtime MDK Protocol traffic. The [deployment topologies](../../../docs/concepts/deployment-topologies.md)
explain the supported process layouts, while the [Worker discovery model](../../workers/docs/architecture.md#discovery-model)
explains how Kernel obtains Worker public keys in DHT, local, and same-process modes.

Package-specific APIs and configuration live with each package:

- [Kernel architecture and configuration](../kernel/README.md)
- [Gateway configuration and Kernel connection](../gateway/README.md)
- [Bootstrap SDK](../mdk/README.md)
- [Worker Runtime](../mdk-worker/lib/worker-runtime.js)
- [Client API and HRPC transport](../client/README.md)

## Next steps

- Learn [which layer owns which responsibility](../../../docs/concepts/control-plane.md#responsibility-boundaries)
- Discover the [HTTP and React hook surface](../../../docs/guides/gateway/write-actions.md)
- Learn about write actions that [require approval](../../../docs/concepts/control-plane.md#approval-gated-writes)

