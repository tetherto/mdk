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
| `@tetherto/mdk-app-runtime` | Runs one app in its own process and serves its routes to the Gateway over HRPC | [`backend/core/app-runtime/`](../app-runtime/README.md) |
| `@tetherto/mdk-identity` | Token issuer and verification, shared by Kernel, Gateway, and MCP server | [`backend/core/identity/`](../identity/README.md) |
| `@tetherto/mdk-rbac` | Policy library: validates `spec.rbac` and judges every caller | [`backend/core/rbac/`](../rbac/README.md) |
| `@tetherto/mdk-agent` | Conversational operator agent, on a local model and MDK tools over MCP | [`backend/core/agent/`](../agent/README.md) |

Each is detailed below.

## Kernel

Lives in [`backend/core/kernel/`](../kernel/index.js). Discovers and registers Workers, dispatches commands through a crash-recoverable state machine,
 and pulls telemetry on a fixed schedule. The [Workers discovery model](../../workers/docs/architecture.md#discovery-model) covers local, same-process,
 and DHT modes.

Kernel is **pull-only and passive** — it never pushes to your app. You query it over HRPC using its public key, published to a key file
(`<tmpdir>/mdk/.kernel-key`) on start. It fans the query out to online Workers and aggregates the response. Every request past sign-in
carries an access token, and Kernel judges the caller behind it against the `spec.rbac` policy in `mdk.yaml`.

[Kernel](../kernel/README.md#architecture) is organized into sub-systems instantiated by modules:

|Sub system | Responsibility |
|-----------|-------------------------------------------------------------------------------------------------|
| Discovery | Finds and registers Workers across DHT, local, and same-process modes |
| Transport | Accepts caller connections over HRPC and calls Workers |
| Coordination | The modules that do the work: command dispatch, telemetry, health, and write-action approval |
| Storage | Persists the registry, capabilities, command Write-Ahead Logs (WAL), and action state |
| Protocol | The MDK envelope and action set that Workers and Kernel speak |

## Gateway

Lives in [`backend/core/gateway/`](../gateway/worker.js). The Gateway is the HTTP front door: it signs callers in, checks every app
route against `spec.rbac`, and forwards the request to the app that declared the route. Business logic lives in those apps, each in
its own [runtime process](../app-runtime/README.md); the Gateway runs no app code of its own.

A controller reaches Kernel through `req.mdk`, the per-request client the runtime hands it, signed in as the app's service
account and carrying the operator's token beside it when the Gateway forwarded a signed-in user:

```js
// one controller module per route: async (req) => result
module.exports = async function metrics (req) {
  const { deviceId } = req.params

  // what can this device do, and what is it reporting?
  const capabilities = await req.mdk.getCapabilities(deviceId)
  const telemetry = await req.mdk.pullTelemetry(deviceId, { type: 'metrics' })

  return { capabilities, telemetry }
}
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
HRPC (by the Kernel's public key). Apps, the Gateway, and the MCP server each embed it to talk to Kernel, signed in as their own
service account.

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

- Follow the [shared conventions](../README.md#shared-conventions) every core package keeps: strict mode, `debug` logging, `ERR_*` constants, `brittle` tests, StandardJS
- See [how the packages depend on each other](../README.md#dependency-graph) before adding an import between them
- Read [what an agent can rely on](AGENT_READY.md) when building against core: exports maps, error codes, and the shared protocol
- Learn [which layer owns which responsibility](../../../docs/concepts/control-plane.md#responsibility-boundaries)
- Discover the [HTTP and React hook surface](../../../docs/guides/gateway/write-actions.md)
- Learn about write actions that [require approval](../../../docs/concepts/control-plane.md#approval-gated-writes)

