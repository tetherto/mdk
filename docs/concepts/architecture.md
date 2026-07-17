---
title: Architecture
description: How @tetherto/mdk-kernel works, the MDK Protocol, kernel modules, Workers, and the @tetherto/mdk-client SDK
docs@tether_slug: concepts/architecture/index
notes: This page was synced with the upstream **MDK HLD v0.4.0** on 2026-04-26 and has been edited since
---

> [!NOTE]
> Status: 🚧 MDK is in active development. This page describes the target architecture and may evolve as real-world implementations land.

## How MDK works

MDK is built around a small kernel with one job: route validated commands to whichever Worker owns a device, and pull telemetry
back. Everything else (authentication, business logic, UI, AI agents) sits outside the kernel as composable layers: keeping the kernel
small and the application surface open.

To prevent unbound flexibility from manifesting as system rigidity, the architecture draws a hard line between what is
standardized and what is delegated. It's:

- **Opinionated where needed**: strict transport envelopes, unified JSON schema, unidirectional flows
- **Flexible where it matters**: isolated Workers handle translation logic, enabling integrations without polluting the core
infrastructure

Five layers compose the stack, with strict, unidirectional flows between them. The kernel itself is **Kernel**, the
Orchestration Kernel, distributed as `@tetherto/mdk-kernel`.

## MDK stack

```mermaid
graph TB
    subgraph consumers ["Layer 1: Consumers"]
        UI["UI / Frontend"]
        AI["AI Agent"]
    end

    subgraph gateway ["Layer 2: Gateway"]
        WebApp["HTTP / API Router"]
        MCPServer["MCP Server Endpoint"]
    end

    subgraph kernelLayer ["Layer 3: <code>@tetherto/mdk-kernel</code>"]
        Kernel["<b>Kernel</b><br/>• Command routing<br/>• Health monitoring<br/>• Device registry<br/>• Telemetry collection"]
    end

    subgraph workers ["Layer 4: Workers"]
        Workers["WORKERS"]
    end

    subgraph devices ["Layer 5: Physical Devices"]
        Devices["<b>Physical devices</b><br/>• Miners<br/>• Containers<br/>• Sensors"]
    end

    UI -->|"HTTP / WebSocket"| WebApp
    AI -->|"MCP Protocol"| MCPServer
    WebApp -->|"MDK Protocol via @tetherto/mdk-client / HRPC"| Kernel
    MCPServer -->|"MDK Protocol via @tetherto/mdk-client / HRPC"| Kernel
    Workers -.->|"join known DHT topic"| Kernel
    Kernel -->|"MDK Protocol: pull (identity / schema / telemetry) + command"| Workers
    Workers -->|"device libs"| Devices

    style consumers fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
    style gateway fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
    style kernelLayer fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
    style workers fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
    style devices fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
```

The MDK components that compose those layers:

| Component | What it does |
|---|---|
| [`@tetherto/mdk-kernel`][kernel-section] | Central coordination: routes commands, collects telemetry, monitors health |
| [`@tetherto/mdk-client`][sdk-section] | Universal SDK applications use to talk to `@tetherto/mdk-kernel` |
| [MDK Protocol][protocol-section] | Standardized message envelope every layer speaks |
| [MDK App Toolkit][app-toolkit] | Optional frontend tools, backend tools, and plugins on top of `@tetherto/mdk-kernel` |

## Storage

[Hypercore][hypercore]-backed stores (such as
[Hyperbee][hyperbee]) are recommended across the `@tetherto/mdk-kernel`, Worker, and Gateway layers.
This choice satisfies all storage requirements without the operational baggage of a centralized database.

## The MDK protocol

The MDK protocol is the contract that crosses every layer of the stack. Workers become reachable — via a 
[DHT topic][worker-discovery-dht] or [same-machine discovery][worker-discovery-local], and `@tetherto/mdk-kernel` 
initiates every RPC call. Workers issue no callbacks, emit no fan-out events, and make no exceptions to the direction of flow. 

> [!NOTE]
> For the full [envelope schema][envelope-impl], [action catalogue][actions-catalogue], and 
> [base command set][schemas-impl], see the [Protocol reference][protocol-reference].

### Design principles

- **Transport-agnostic**: identical messages whether routed [in-process][envelope-router], over [Hyperswarm RPC (HRPC)][hrpc-listener], 
or via API calls
- **Strictly unidirectional**: [Workers][workers-concept] never initiate RPC calls to `@tetherto/mdk-kernel`; `@tetherto/mdk-kernel`
discovers their presence and initiates all subsequent communication downwards (identity, capabilities, telemetry, commands)
- **Generic interface**: the accepted interface is defined dynamically at the Worker level via a self-describing capabilities
schema containing both structure and semantic context for AI agents

### Governance

To maintain structural integrity and contract stability across `@tetherto/mdk-kernel`, Gateway, and Workers, MDK protocol messages are
governed and strictly validated using [Hyperschema][hyperschema]. Hyperschema also aligns
natively with the system's underlying Hyperbee storage.

### Discovery, telemetry, and command flows

```mermaid
sequenceDiagram
    participant W as Worker
    participant DHT as DHT Topic (Hyperswarm)
    participant O as @tetherto/mdk-kernel
    participant G as Gateway (HTTP / MCP)

    Note over W,O: Worker discovery and registration
    W->>DHT: Joins known topic
    O-->>DHT: Detects new peer connection
    O->>W: identity.request
    W-->>O: identity.response (devices)
    O->>O: Save Worker to registry
    O->>W: capability.request
    W-->>O: capability.response (schema)

    Note over O,W: Telemetry pull loop
    O->>W: telemetry.pull
    W-->>O: metrics and pending commands

    Note over G,W: Command execution
    G->>O: MDK Protocol HRPC envelope
    O->>W: command.request (routed by deviceId)
    W-->>O: command.result
    O-->>G: result
```

## The Kernel

[Kernel][kernel-concept], [`@tetherto/mdk-kernel`][kernel-package], is the trusted coordination layer at the heart of MDK. It [routes commands][command-dispatcher],
[monitors device health][health-monitor], [registers Workers][worker-registry], and [pulls telemetry][telemetry-collector] — all on a
[pull-only model][scheduler-module], so the kernel cannot be overwhelmed by upstream pressure.

When a command arrives, callers only need to provide a `deviceId`; `@tetherto/mdk-kernel` resolves the owning Worker internally via
the [`CommandDispatcher`][command-dispatcher] and dispatches the `command.request`.

## Workers
[Workers][workers-concept] wrap a device library and expose it via the MDK protocol. They are the integration handlers between physical hardware
and `@tetherto/mdk-kernel`, and the unyielding source of truth for that hardware: `@tetherto/mdk-kernel` itself operates purely as a synchronized state
machine over Worker-reported state.

Workers are passive — Kernel initiates every RPC call; Workers only ever respond. Kernel discovers Workers according to the
[discovery model][workers-discovery-model], then requests identity and capabilities.

## The SDK

The [`@tetherto/mdk-client`][client-package] SDK is the transport abstraction layer used to connect to `@tetherto/mdk-kernel` reliably. 
It is the essential glue between the kernel and any consumer layer developers choose to build on top.

**Responsibility**: connects the MDK Protocol over the native HRPC transport seamlessly, offering:

- **Transport abstraction**: handles MDK Protocol message construction and reconnection logic with exponential backoff.
- **Key-based addressing**: the SDK connects over encrypted Hyperswarm streams, addressed by the kernel's HRPC public key.
The same transport serves remote server-to-server production and same-host development alike — for the local zero-config case,
the kernel publishes its key to a well-known key file that clients read at startup.
- **Major language support**: `@tetherto/mdk-client` is intended to support all major languages (Node.js, Python, Go, and others), allowing
developers to dispatch commands, subscribe to live streams, or pull status snapshots from any stack.

## Gateway

The [Gateway][gateway-package] wraps `@tetherto/mdk-client` — the MDK protocol connector to Kernel — to add an authenticated
HTTP, WebSocket, and MCP interface on top. Consumers that need those capabilities connect through the Gateway.

The supported development path is the [MDK App Toolkit][app-toolkit], which ships backend middleware (JWT auth, RBAC, and command
proxying), frontend tools, and an `mdk-plugin.json`-based plugin system for declarative HTTP route extensions
([plugin guide][gateway-plugins]).

For the full developer model — extension patterns, data access, auth design, and Kernel connection — read the [Gateway concept page][gateway-concept].

## AI agents and the MCP server

The supported application path connects AI agents through an **MCP endpoint** on the Gateway. This keeps agents inside the same
security envelope as other consumers: they are authenticated clients subject to the same JWT validation, rate limits, and RBAC
as a human user. This is intentional because Kernel does not perform user-level [authentication][authentication-section].

What makes the integration distinctive is **[runtime tool derivation][agent-ready-contract]**. The tools exposed to an agent (for example,
`get_device_telemetry` or `reboot_device`) are not hardcoded; they are parsed at runtime from each registered Worker's
[`mdk-contract.json`][capability-contract-section]. When a new device type joins the network, the agent gains
the ability to query and control it without any change to the Gateway.

## End-to-end data flows

Two scenarios show the full request path from consumer to device and back: a [human user clicking through the UI][human-ui-scenario], and an [AI
agent executing a multi-step prompt][ai-agent-scenario].

### AI agent scenario

A user instructs the AI Agent: *"Keep the fleet healthy."* The agent monitors continuously, catches `wm002` overheating, reboots it, and notifies the user.

```mermaid
sequenceDiagram
    actor User
    participant AI as AI Agent
    participant Node as Gateway (MCP)
    participant Kernel as @tetherto/mdk-kernel
    participant Worker as Generic Worker

    User->>AI: "Keep the fleet healthy."

    Note over AI,Kernel: Step 1: Fleet discovery (read)
    AI->>Node: Call MCP tool get_fleet_alerts (token auth)
    Node->>Node: Validate agent token and RBAC
    Node->>Kernel: HRPC query (via @tetherto/mdk-client)
    Kernel-->>Node: Metrics
    Node-->>AI: Tool result (wm002 is overheating)

    Note over AI,Kernel: Step 2: Execution (write)
    AI->>Node: Call MCP tool reboot_device (deviceId wm002)
    Node->>Node: Validate token and device:write RBAC
    Node->>Kernel: dispatch generic protocol message
    Kernel->>Kernel: Resolve deviceId
    Kernel->>Worker: command.request (HRPC)
    Worker-->>Kernel: command.result
    Kernel-->>Node: result OK
    Node-->>AI: Tool result (Success)

    AI-->>User: "wm002 was overheating and has been rebooted."
```
### Human UI scenario

A user clicks "Reboot" on device `wm001` in the UI.

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant Node as Gateway
    participant Kernel as @tetherto/mdk-kernel
    participant Worker as Generic Worker

    User->>UI: Click "Reboot" on wm001
    UI->>Node: POST { `deviceId`, action, payload }

    Note over Node,Kernel: Delegation
    Node->>Kernel: dispatch generic protocol message
    Kernel->>Kernel: Verify against capabilities
    Kernel->>Kernel: Resolve Worker for `deviceId`

    Note over Kernel,Worker: Execution
    Kernel->>Worker: command.request (HRPC)
    Worker-->>Kernel: Ack start
    Worker->>Worker: Hardware-specific translation
    Worker-->>Kernel: command.result

    Kernel-->>Node: result OK
    Node-->>UI: HTTP 200

    Note over Worker,Kernel: State reflection
    Kernel->>Worker: telemetry.pull (tick)
    Worker-->>Kernel: Updated status (rebooting)
```

> [!NOTE]
> The Gateway, Kernel, and Workers, [control plane includes approval-gated writes][control-plane].

## Scaling

As MDK deployments scale to large mining sites (5,000+ devices), the system must explicitly manage parallel Workers and parallel
`@tetherto/mdk-kernel` instances. The kernel is only an execution layer; it does not perform application-level aggregation or
cross-regional business logic.

> [!NOTE]
> Scaling here means *how many* Workers and kernels you run. That is independent of [deployment topology][deployment-topologies], 
> *how those processes are packaged* on a host (one process vs. many).

### Parallel Workers

Multiple Workers of the same type (for example, `whatsminer-worker`) can be active concurrently and connected to the same
`@tetherto/mdk-kernel` kernel.

```mermaid
flowchart TD
    subgraph kernel ["Single @tetherto/mdk-kernel instance"]
        Kernel["Kernel"]
    end

    W1["Worker 1"]
    W2["Worker 2"]
    D1["Devices wm001 to wm500"]
    D2["Devices wm501 to wm999"]

    Kernel -->|Routes commands| W1
    Kernel -->|Routes commands| W2
    W1 --- D1
    W2 --- D2

    style kernel fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
```

**Device-level routing and ownership**: Workers never share devices. When a Worker connects, its `identity.register` payload
explicitly lists the `deviceId`s it exclusively manages. The Worker registry maintains this strict mapping and deterministically
routes arriving commands to the designated Worker.

### Multi-site deployments

A deployment may need to manage multiple massive physical boundaries (for example, a Texas Site and an Iceland Site). Each
location runs its own dedicated site-level `@tetherto/mdk-kernel` kernel, but all are overseen globally by a single Gateway and AI Agent.

```mermaid
flowchart TD
    Global["Global Gateway / AI Agent"]

    subgraph texas ["Texas site"]
        KERNEL_TX["@tetherto/mdk-kernel"]
        W1_TX["Whatsminer Worker"]
        W2_TX["Antminer Worker"]
        D1_TX["Whatsminers"]
        D2_TX["Antminers"]
        KERNEL_TX -->|Routes| W1_TX
        KERNEL_TX -->|Routes| W2_TX
        W1_TX --- D1_TX
        W2_TX --- D2_TX
    end

    subgraph iceland ["Iceland site"]
        KERNEL_IC["@tetherto/mdk-kernel"]
        W1_IC["Whatsminer Worker"]
        W2_IC["Avalon Worker"]
        D1_IC["Whatsminers"]
        D2_IC["Avalons"]
        KERNEL_IC -->|Routes| W1_IC
        KERNEL_IC -->|Routes| W2_IC
        W1_IC --- D1_IC
        W2_IC --- D2_IC
    end

    Global <-->|MDK Protocol via HRPC| KERNEL_TX
    Global <-->|MDK Protocol via HRPC| KERNEL_IC

    style texas fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
    style iceland fill:#F7931A,stroke:#1A1A1A,color:#1A1A1A
```

The single Gateway and AI Agent connect globally to all distributed `@tetherto/mdk-kernel` kernels via the native HRPC mesh (Hyperswarm).
Parallel `@tetherto/mdk-kernel` instances remain entirely isolated from one another: they do not federate registries, share queues, or
synchronize state. A crash at one site has zero impact on any other.

Cross-site aggregation is handled purely at the Gateway layer, where routes query multiple Workers via `@tetherto/mdk-kernel` and merge
the responses before returning them to the UI or Agent.

## Next steps

- Understand the [Kernel][kernel-concept] — what it owns, the pull-only model, and transports
- Understand the [Gateway][gateway-concept] — authentication, RBAC, plugins, and Kernel connection
- Understand [Workers][workers-concept] — discovery model, capability contract, and adding hardware
- Understand the [control plane][control-plane] — how Gateway, Kernel, and Workers communicate and which layer owns each responsibility
- Choose a [deployment topology][deployment-topologies] — single-process, local, or distributed

## Links

[kernel-section]: #the-kernel
[sdk-section]: #the-sdk
[protocol-section]: #the-mdk-protocol
[authentication-section]: stack/gateway.md#authentication-design
<!-- docs@tether.io: authentication-section → concepts/stack/gateway#authentication-design -->
[capability-contract-section]: stack/workers.md#capability-contract
<!-- docs@tether.io: capability-contract-section → concepts/stack/workers#capability-contract -->
[human-ui-scenario]: #human-ui-scenario
[ai-agent-scenario]: #ai-agent-scenario

[deployment-topologies]: deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[worker-discovery]: stack/workers.md
<!-- docs@tether.io: worker-discovery → concepts/stack/workers -->

[worker-discovery-dht]: stack/workers.md#dht-mode
<!-- docs@tether.io: worker-discovery-dht → concepts/stack/workers#dht-mode -->

[worker-discovery-local]: stack/workers.md#local-mode
<!-- docs@tether.io: worker-discovery-local → concepts/stack/workers#local-mode -->

[workers-concept]: stack/workers.md
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[workers-discovery-model]: stack/workers.md#discovery-model
<!-- docs@tether.io: workers-discovery-model → concepts/stack/workers#discovery-model -->

[hypercore]: https://github.com/holepunchto/hypercore
<!-- docs@tether.io: external link — preserve URL -->

[hyperbee]: https://github.com/holepunchto/hyperbee
<!-- docs@tether.io: external link — preserve URL -->

[hyperschema]: https://github.com/holepunchto/hyperschema
<!-- docs@tether.io: external link — preserve URL -->

[hyperswarm]: https://github.com/holepunchto/hyperswarm
<!-- docs@tether.io: external link — preserve URL -->

[app-toolkit]: ../../ui/docs/ARCHITECTURE.md
<!-- docs@tether.io: app-toolkit → concepts/stack/app-toolkit -->
<!-- mdk-monorepo: temp — ARCHITECTURE.md is a stub until ui/ is populated -->

[gateway-plugins]: ../guides/gateway/plugins.md
<!-- docs@tether.io: gateway-plugins → guides/gateway/plugins -->

[control-plane]: control-plane.md
<!-- docs@tether.io: control-plane → concepts/control-plane -->

[protocol-reference]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: protocol-reference → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[kernel-package]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[kernel-concept]: stack/kernel.md
<!-- docs@tether.io: kernel-concept → concepts/stack/kernel -->

[worker-readme]: ../../backend/workers/README.md
<!-- docs@tether.io: worker-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md -->

[gateway-package]: ../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-package → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[gateway-concept]: stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[client-package]: ../../backend/core/client/README.md
<!-- docs@tether.io: client-package → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

<!-- Engineer / maintainer deep links (public repo targets) -->

[envelope-impl]: ../../backend/core/kernel/lib/protocol/envelope.js
<!-- docs@tether.io: envelope-impl → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/lib/protocol/envelope.js -->

[actions-catalogue]: ../../backend/core/kernel/lib/protocol/actions.js
<!-- docs@tether.io: actions-catalogue → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/lib/protocol/actions.js -->

[schemas-impl]: ../../backend/core/kernel/lib/protocol/schemas.js
<!-- docs@tether.io: schemas-impl → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/lib/protocol/schemas.js -->

[hrpc-listener]: ../../backend/core/kernel/lib/transport/hrpc-listener.js
<!-- docs@tether.io: hrpc-listener → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/lib/transport/hrpc-listener.js -->

[envelope-router]: ../../backend/core/kernel/lib/transport/envelope-router.js
<!-- docs@tether.io: envelope-router → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/lib/transport/envelope-router.js -->

[dht-listener]: ../../backend/core/kernel/lib/discovery/dht-listener.js
<!-- docs@tether.io: dht-listener → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/lib/discovery/dht-listener.js -->

[command-dispatcher]: ../../backend/core/kernel/README.md#commanddispatcher
<!-- docs@tether.io: command-dispatcher → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#commanddispatcher -->

[health-monitor]: ../../backend/core/kernel/README.md#healthmonitor
<!-- docs@tether.io: health-monitor → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#healthmonitor -->

[worker-registry]: ../../backend/core/kernel/README.md#workerregistry
<!-- docs@tether.io: worker-registry → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#workerregistry -->

[telemetry-collector]: ../../backend/core/kernel/README.md#telemetrycollector
<!-- docs@tether.io: telemetry-collector → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#telemetrycollector -->

[scheduler-module]: ../../backend/core/kernel/README.md#scheduler
<!-- docs@tether.io: scheduler-module → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#scheduler -->

[whatsminer-worker-example]: ../../backend/workers/miners/whatsminer/plugin/index.js
<!-- docs@tether.io: whatsminer-worker-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/plugin/index.js -->

[capability-contract-example]: ../../backend/workers/miners/whatsminer/plugin/mdk-contract.json
<!-- docs@tether.io: capability-contract-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/plugin/mdk-contract.json -->

[gateway-http-worker]: ../../backend/core/gateway/README.md#http-api-overview
<!-- docs@tether.io: gateway-http-worker → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#http-api-overview -->

[gateway-auth]: ../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: gateway-auth → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[agent-ready-contract]: ../reference/maintainers/agent-ready-sdk.md
<!-- docs@tether.io: agent-ready-contract → https://github.com/tetherto/mdk/blob/main/docs/reference/maintainers/agent-ready-sdk.md -->

[standalone-mcp-example]: ../../examples/full-site/docs/mcp-server.md
<!-- docs@tether.io: standalone-mcp-example → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
