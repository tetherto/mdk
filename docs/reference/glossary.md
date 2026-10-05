---
title: Terminology
description: The vocabulary you need before running anything — Kernel, gateway, Worker, manager, thing, mock, and how they compose
docs@tether_slug: reference/glossary
---

This page provides explanations for terms that new users may not be familiar with.

- [Stack](#stack-and-hardware-terms)
- [HRPC](#hyperswarm-rpc)

## Stack and hardware terms

This section explains the terms you need to familiarize yourself with, using an Antminer rack as an example.

| Term | What it is | Lives at |
| --- | --- | --- |
| **Kernel** (Orchestration Kernel) | The pull-only kernel that owns the device registry, routes commands, and pulls telemetry on its own cadence — it performs no aggregation itself | [`backend/core/kernel/`][kernel-package] |
| **Gateway** | The developer-owned HTTP entry point between non-Node clients (UI) and Kernel. Required for browser and HTTP consumers; AI agents reach Kernel through the standalone MCP server instead. Not used in the in-process Antminer-rack example below | [`backend/core/gateway/`][gateway-package] |
| **Worker** | A device-family translator. Speaks the MDK Protocol upward to Kernel and the vendor's native API downward to one device family (one miner brand, one container type, one pool API). | [`backend/workers/`][worker-readme] |
| **Worker Plugin** | The executable device integration: [`mdk-contract.json`][contract-schema] plus its handler files, loaded from a package directory by `WorkerRuntimeV2` | [`backend/workers/miners/antminer/plugin/index.js`][antminer-plugin] |
| **Worker contract** | The declarative [`mdk-contract.json`][contract-schema] alone, as read, validated, published, rendered, or queried | [`backend/workers/miners/antminer/plugin/mdk-contract.json`][antminer-contract] |
| **Driver class** | The JavaScript class a Worker exports, one per device family (for example `Antminer`, `Whatsminer`), not one per model. Drives every device that Worker registers. | [`backend/workers/miners/antminer/lib/antminer.js`][antminer-worker] |
| **Thing** | One registered device instance. Created by sending a `registerThing` command to the Worker's provisioning service, not by calling a driver-class method directly. Identified by a generated `deviceId`. | [`backend/core/mdk/lib/services/provisioning.service.js`][provisioning-service] |
| **MCP** (Model Context Protocol) | The protocol AI agents use to discover and call tools. `@tetherto/mdk-mcp` runs as its own standalone process, deriving tools from a plugin's routes; the Gateway hosts no MCP itself | [`backend/core/mcp/`][mcp-package] |

### How they compose, for an Antminer rack

```mermaid
flowchart TB
    subgraph clientLayer ["Your code"]
        Client["your script (e.g., client.js)"]
    end

    subgraph kernel ["Kernel"]
        Kernel["Kernel<br/>device registry · command routing · telemetry pull"]
    end

    subgraph workerLayer ["Antminer Worker"]
        AntminerWorker["e.g., AM_S21PRO"]
    end

    subgraph devices ["Antminer devices (real or mock)"]
        Miners["Antminers (HTTP / digest auth)"]
    end

    Client -->|"HRPC"| Kernel
    Kernel -->|"HRPC"| AntminerWorker
    AntminerWorker --> Miners
```

The same shape repeats for every other device family (Whatsminer, container vendors, pool APIs). [Scalability][architecture-scaling] covers the
multi-Worker view, parallel Workers, and multi-site deployments.

## Hyperswarm RPC

MDK uses [`@hyperswarm/rpc`][hrpc-repo] as its runtime transport. Hyperswarm RPC (HRPC) is not an HTTP-based RPC system. It is an RPC layer
that rides on Hyperswarm peer-to-peer connectivity. The library is a simple RPC over the Hyperswarm DHT, backed by `Protomux`. Think of it as a peer-to-peer
remote function call system built on a DHT and an encrypted connection layer.

**Mental model** — Hyperswarm finds peers and establishes connections; `Protomux` divides the connection into named channels;
RPC defines the conversation — a caller names a method and receives a reply.

> [!NOTE]
> A useful analogy is a phone call between peers — Hyperswarm helps the phones find each other and connect; `Protomux` splits
> the line into channels; RPC defines how one side asks for a method and the other side responds.

**Practical implications:**

- You work with services, methods, requests, and responses — not URLs and routes
- The RPC-shaped API is identical across same-process, same-host, and distributed deployments; only the discovery
  mechanism changes (same-process registration, shared directory, or DHT topic)
- Peers discover and communicate without a central HTTP server

### HRPC on the same host

MDK uses HRPC as the single transport across all deployment shapes — same-process, same-host, and distributed.
Every component is addressed by its public key, not by a socket path or hostname. The Gateway, a standalone Node.js
script, and a remote service all connect the same way:

```js
createMdkClient({ kernelKey: key })
```

The Noise handshake that HRPC performs on every connection authenticates by key, so Kernel's allowlist works identically whether the caller is on the
same machine or a remote host.

This is consistent with the broader Holepunch ecosystem philosophy — everything is a peer addressed by public key. When the peer is on the same
machine it routes locally over the local network interface; the application code sees no difference.

## Next steps

- You are ready to run the example in [Run a mining site end to end][run-stack]
- Learn more about:
  - Multi-process discovery across machines: [Worker discovery][worker-discovery]
  - Gateway implementation details, including HTTP routing and plugin registration: [`backend/core/gateway/README.md`][gateway-package]
  - Building your own Worker for a new device family: [the build walkthrough][build-a-worker]
  - The install and run pattern every shipped Worker package follows: [`backend/workers/docs/install-pattern.md`][worker-install]
  - Per-device contract details (telemetry units, command shapes, error codes): those live in each Worker's `mdk-contract.json`, e.g. [`backend/workers/miners/antminer/plugin/mdk-contract.json`][antminer-contract]

## Links

[run-stack]: ../tutorials/run-a-site.md
<!-- docs@tether.io: run-stack → tutorials/run-a-site -->

[architecture-scaling]: ../concepts/scalability.md
<!-- docs@tether.io: architecture-scaling → concepts/scalability -->

[kernel-package]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-package → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[gateway-package]: ../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-package → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[mcp-package]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-package → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[worker-readme]: ../../backend/workers/README.md
<!-- docs@tether.io: worker-readme → reference/worker -->

[worker-install]: ../../backend/workers/docs/install-pattern.md
<!-- docs@tether.io: worker-install → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/install-pattern.md -->

[build-a-worker]: ../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[antminer-worker]: ../../backend/workers/miners/antminer/lib/antminer.js
<!-- docs@tether.io: antminer-worker → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/lib/antminer.js -->

[antminer-plugin]: ../../backend/workers/miners/antminer/plugin/index.js
<!-- docs@tether.io: antminer-plugin → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/plugin/index.js -->

[contract-schema]: ../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[provisioning-service]: ../../backend/core/mdk/lib/services/provisioning.service.js
<!-- docs@tether.io: provisioning-service → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/lib/services/provisioning.service.js -->

[worker-discovery]: ../../backend/workers/docs/architecture.md#discovery-model
<!-- docs@tether.io: worker-discovery → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[antminer-contract]: ../../backend/workers/miners/antminer/plugin/mdk-contract.json
<!-- docs@tether.io: antminer-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/antminer/plugin/mdk-contract.json -->

[hrpc-repo]: https://github.com/holepunchto/rpc
<!-- docs@tether.io: external link — preserve URL -->
