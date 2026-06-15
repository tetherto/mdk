---
title: Worker discovery
description: How workers and ORK find each other over a Hyperswarm DHT topic
docs@tether_slug: concepts/worker-discovery
---

> [!NOTE]
> If ORK, worker, or thing are unfamiliar, read [terminology](terminology.md) first.

## Overview

Workers and ORK find each other over a shared Hyperswarm DHT topic — a 32-byte rendezvous key both sides join before any RPC takes place. No coordination server is required. Once a worker joins the topic, ORK detects the peer and runs the [discovery and registration sequence][architecture-discovery].

## Operating modes

A DHT round-trip is only needed when ORK and the worker run in separate processes:

| Mode | How worker connects | When to use |
| --- | --- | --- |
| **Same-process** | `startWorker(W, { ork })` registers directly with the in-memory ORK instance — no DHT join | Development, get-started tutorials, [single-process sites][single-how-to] |
| **Multi-process** | `startWorker(W)` joins the DHT topic; ORK detects it as a new peer | [Production microservices][multi-how-to], workers on separate hosts |

The [deployment topologies][deployment-topologies] page covers when to pick each packaging shape.

## Topic coordination

In multi-process mode, ORK and the worker must join the same topic. Two options:

**Auto-generated (default)** — `startWorker()` generates a random 32-byte hex topic, writes it to `/tmp/mdk/.dht-topic`, and joins the DHT; `getOrk()` reads the same file and joins the matching topic.

**Explicit topic** — pass the same value to both calls directly:

```js
const ork = await getOrk({ topic: '<32-byte-hex>' })
const { manager } = await startWorker(WorkerClass, { orkTopic: '<32-byte-hex>' })
```

> [!IMPORTANT]
> The worker must join the topic before ORK starts listening. Start the worker process first, then start ORK. `waitForDiscovery()` polls the registry until discovered workers reach `READY` state.

The multi-process pattern is demonstrated end-to-end in [`dht-worker.js`][dht-worker] and [`dht-ork.js`][dht-ork].

## Next steps

- Operators: Configure how often ORK polls discovered workers: [orchestrator cadences][orchestrator-cadences]
- Operators: Diagnose startup hangs when outbound network is restricted: [miner troubleshooting][troubleshooting]
- Integrators: see how workers register themselves on the DHT: [`MDKWorkerAdapter`][worker-adapter]

## Links

[architecture-discovery]: architecture.md#discovery-model
<!-- docs@tether.io: architecture-discovery → concepts/architecture#discovery-model -->

[deployment-topologies]: deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[single-how-to]: ../how-to/deployment/run-single-process-site.md
<!-- docs@tether.io: single-how-to → how-to/deployment/run-single-process-site -->

[multi-how-to]: ../how-to/deployment/run-microservices-site.md
<!-- docs@tether.io: multi-how-to → how-to/deployment/run-microservices-site -->

[dht-worker]: ../../../backend/core/examples/mdk-e2e/dht-worker.js
<!-- docs@tether.io: dht-worker → https://github.com/tetherto/mdk/blob/main/backend/core/examples/mdk-e2e/dht-worker.js -->

[dht-ork]: ../../../backend/core/examples/mdk-e2e/dht-ork.js
<!-- docs@tether.io: dht-ork → https://github.com/tetherto/mdk/blob/main/backend/core/examples/mdk-e2e/dht-ork.js -->

[worker-adapter]: ../../../backend/workers/base/lib/mdk-worker-adapter.js
<!-- docs@tether.io: worker-adapter → https://github.com/tetherto/mdk/blob/main/backend/workers/base/lib/mdk-worker-adapter.js -->

[orchestrator-cadences]: ../../../backend/workers/docs/orchestrator.md#configuration-cadences
<!-- docs@tether.io: orchestrator-cadences → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/orchestrator.md#configuration-cadences -->

[troubleshooting]: ../how-to/miners/troubleshooting.md
<!-- docs@tether.io: troubleshooting → how-to/miners/troubleshooting -->
