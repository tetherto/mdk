---
title: Workers
description: Workers as integration components — discovery model, capability contract, and adding hardware
docs@tether_slug: concepts/stack/workers
---

## Overview

This page introduces the [Worker][worker-base] as a development component. It explains what a Worker owns, how ORK discovers it,
what the capability contract is, and how to build a Worker for new hardware.
Read this before integrating new hardware, configuring discovery, or building on top of the Worker protocol.

## What a worker owns

A Worker wraps a device library and exposes it to ORK via the MDK Protocol. Workers are the integration handlers between physical
hardware and `@tetherto/mdk-ork`, and the unyielding source of truth for that hardware. `@tetherto/mdk-ork` operates purely as
a synchronized state machine over Worker-reported state — it never reads hardware directly.

Workers are **passive**: they become a reachable endpoint and wait. ORK initiates every RPC call; Workers only ever respond.
See the [deployment topologies connection model][deployment-topologies-connection] for how this directionality shapes transport choices.

## Discovery model

How ORK finds a Worker depends on whether they share a machine.

> [!NOTE]
> In all cases, the post-discovery sequence is identical — ORK requests identity, registers the Worker, then queries its
> capabilities. The full sequence and state machine are described in the [ORK — What ORK owns][ork-what-it-owns] section.

| Mode | How ORK finds the worker | When to use |
| --- | --- | --- |
| **DHT** | Worker joins a Hyperswarm DHT topic; ORK listens on the same topic and connects automatically | [Production microservices][multi-how-to], workers on separate hosts or networks |
| **Local** | Worker publishes itself to a shared directory; ORK watches the directory: no DHT needed | All components on one machine, restricted outbound networking |
| **Same-process** | `startWorker(W, { ork })` passes the ORK instance directly: no network lookup | [Getting started][get-started-run], [single-process sites][single-how-to] |

> [!NOTE]
> Discovery is a startup concern only — it determines how ORK obtains the worker's RPC public key, nothing more. Once connected,
> all three modes use the same HyperswarmRPC transport and the same MDK Protocol envelope (`command.request`, `telemetry.pull`, and so on).
> Local and same-process modes route traffic over the local network interface; DHT mode routes over the public internet.
> The available commands, telemetry, and operations are identical in all three.

### DHT mode

In multi-process DHT mode, ORK and the worker must join the same Hyperswarm topic. Two options:

**Auto-generated (default)** — `startWorker()` generates a random 32-byte hex topic, writes it to `os.tmpdir()/mdk/.dht-topic`,
and joins the DHT; `getOrk()` reads the same file and joins the matching topic.

> [!IMPORTANT]
> The auto-generated topic file is local to the machine or container that writes it. When ORK and the worker run in separate
> containers or on separate hosts they cannot share this file and discovery stops responding. Use an explicit topic in any
> multi-host or multi-container setup.

**Explicit topic** — pass the same value to both calls directly:

```js
const ork = await getOrk({ topic: '<32-byte-hex>' })
const { manager } = await startWorker(WorkerClass, { orkTopic: '<32-byte-hex>' })
```

> [!IMPORTANT]
> The worker must join the topic before ORK starts listening. Start the worker process first, then start ORK.
> `waitForDiscovery()` polls the registry until discovered workers reach `READY` state.

The DHT pattern is demonstrated end-to-end in [`dht-worker.js`][dht-worker] and [`dht-ork.js`][dht-ork].

### Local mode

In local mode, ORK and workers coordinate through a shared directory on the same machine (default `<root>/.worker-keys/`).
No Hyperswarm topic is joined and no outbound internet connection is required.

**Worker side**: on startup, `startWorker` publishes the worker's identity to the shared directory. The entry is stable across
restarts, so restarting a worker is a no-op from ORK's perspective.

**ORK side**: `getOrk` watches the directory with `fs.watch` and runs a full scan every four seconds. Each entry found triggers
the normal [discovery listener][local-discovery-impl] (Identity → Capability → Ready), the same sequence used in DHT mode.

```js
const ork = await getOrk({ discovery: { mode: 'local' } })
const { manager } = await startWorker(WorkerClass, { discovery: { mode: 'local' } })
```

A custom directory can be passed when the default path is not suitable:

```js
const ork = await getOrk({ discovery: { mode: 'local', dir: '/shared/mdk-keys' } })
const { manager } = await startWorker(WorkerClass, { discovery: { mode: 'local', dir: '/shared/mdk-keys' } })
```

Keys persist across restarts and the directory is read again each time ORK starts, so workers and ORK can start in any order
without coordination.

> [!IMPORTANT]
> All processes must share the same filesystem path. Local mode requires every component to run on the same machine — use DHT
> mode for workers on separate hosts.

The [full-site example][full-site-local-discovery] demonstrates local mode as its default multi-process setup — `up --discovery local`
starts all workers in local mode, and `up --discovery dht` switches to DHT without any other code change.

### Same-process mode

Same-process mode skips all network discovery. Pass the live ORK instance to `startWorker()` and registration happens as a
direct in-process call — no topic, no directory, no network lookup:

```js
const ork = await getOrk(opts)
const { manager } = await startWorker(WorkerClass, { ork })
```

Two behaviors differ from DHT and local mode:

- **Registration**: `startWorker` calls `ork.registerWorker()` directly with the adapter's public key. The worker reaches `READY`
  synchronously before `startWorker` returns — no `waitForDiscovery()` required
- **Lifecycle coupling**: the worker's stop handler is pushed onto ORK's internal `_cleanup` queue. When ORK shuts down, it stops
  the worker automatically. In DHT and local modes you own the worker's shutdown via your process signal handlers

Use the same-process mode for the [get-started tutorial][get-started-run] and [single-process deployments][single-how-to].
For multi-process, use DHT or local mode instead.

## Capability contract

[`mdk-contract.json`][capability-contract-example] is the canonical source of truth for a Worker's programmatic capabilities **and** its AI context. MDK
deliberately merges formal validation and semantic guidance into a single JSON contract:

- `description` does double duty as the human UI label and AI edge-case rule (for example, *"Outlet temperature > 85C requires intervention"*)
- `constraints` governs orchestration limits
- `troubleshooting` provides if/then recovery behaviors alongside the payload it evaluates

The exhaustive JSON Schema is `mdk-contract.schema.json`, with a [reference instance at `mdk-contract.json`][capability-contract-example].

## Add hardware

External integrators add new hardware by building a Worker package that conforms to the strict Device-Lib Contract:

1. Reference [`mdk-contract.schema.json`][capability-contract-schema] to author the [`mdk-contract.json`][capability-contract-example], validating strict data schemas while injecting
   explanations, constraints, and troubleshooting directly into the relevant nodes.
2. Subclass [`@tetherto/worker-base`][worker-base] and implement the two translation hooks, `onTelemetryPull` and `onCommand`,
   in `src/hardware.js`. All HRPC plumbing is inherited from [the base class][worker-adapter].
3. Boot the Worker instance, connect to devices, and register with `@tetherto/mdk-ork` using the appropriate
   [discovery mode](#discovery-model). `@tetherto/mdk-ork` detects the peer and pulls its identity and capabilities.

> [!TIP]
> (See [`mdk-whatsminer-worker.js`][worker-example] for a reference subclass implementing both hooks against a real device.)

## Next steps

- [Configure how often ORK polls discovered workers][orchestrator-cadences]
- [Diagnose startup hangs when outbound network is restricted][miner-troubleshooting]
- Review how workers [publish their RPC key and register with ORK][worker-adapter]

## Links

[worker-base]: ../../../backend/workers/base/README.md
<!-- docs@tether.io: worker-base → https://github.com/tetherto/mdk/blob/main/backend/workers/base/README.md -->

[worker-adapter]: ../../../backend/workers/base/README.md#mdkworkeradapter
<!-- docs@tether.io: worker-adapter → https://github.com/tetherto/mdk/blob/main/backend/workers/base/README.md#mdkworkeradapter -->

[worker-example]: ../../../backend/workers/miners/whatsminer/lib/mdk-whatsminer-worker.js
<!-- docs@tether.io: worker-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/lib/mdk-whatsminer-worker.js -->

[capability-contract-example]: ../../../backend/workers/miners/whatsminer/mdk-contract.json
<!-- docs@tether.io: capability-contract-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/mdk-contract.json -->

[capability-contract-schema]: ../../../backend/workers/base/mdk-contract.schema.json
<!-- docs@tether.io: capability-contract-schema → https://github.com/tetherto/mdk/blob/main/backend/workers/base/mdk-contract.schema.json -->

[ork-what-it-owns]: ork.md#what-ork-owns
<!-- docs@tether.io: ork-what-it-owns → concepts/stack/ork#what-ork-owns -->

[get-started-run]: ../../tutorials/get-started/run.md
<!-- docs@tether.io: get-started-run → tutorials/backend-stack/run -->

[deployment-topologies-connection]: ../deployment-topologies.md#connection-model
<!-- docs@tether.io: deployment-topologies-connection → concepts/deployment-topologies#connection-model -->

[single-how-to]: ../../how-to/deployment/run-single-process-site.md
<!-- docs@tether.io: single-how-to → how-to/deployment/run-single-process-site -->

[multi-how-to]: ../../how-to/deployment/run-microservices-site.md
<!-- docs@tether.io: multi-how-to → how-to/deployment/run-microservices-site -->

[dht-worker]: ../../../examples/backend/mdk-e2e/dht-worker.js
<!-- docs@tether.io: dht-worker → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-worker.js -->

[dht-ork]: ../../../examples/backend/mdk-e2e/dht-ork.js
<!-- docs@tether.io: dht-ork → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-ork.js -->

[local-discovery-impl]: ../../../backend/core/mdk/lib/local-discovery.js
<!-- docs@tether.io: no parity link -->

[full-site-local-discovery]: ../../../examples/full-site/README.md#how-out-of-process-workers-find-the-ork
<!-- docs@tether.io: full-site-local-discovery → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md#how-out-of-process-workers-find-the-ork -->

[orchestrator-cadences]: ../../../backend/workers/docs/orchestrator.md#configuration-cadences
<!-- docs@tether.io: orchestrator-cadences → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/orchestrator.md#configuration-cadences -->

[miner-troubleshooting]: ../../how-to/miners/troubleshooting.md
<!-- docs@tether.io: troubleshooting → how-to/miners/troubleshooting -->
