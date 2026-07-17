---
title: Workers
description: Workers as integration components — discovery model, capability contract, and adding hardware
docs@tether_slug: concepts/stack/workers
---

## Overview

This page introduces the [Worker][worker-readme] as a development component. It explains what a Worker owns, how Kernel discovers it,
what the capability contract is, and how to build a Worker for new hardware.
Read this before integrating new hardware, configuring discovery, or building on top of the Worker protocol.

## What a Worker owns

A Worker wraps a device library and exposes it to Kernel via the MDK Protocol. Workers are the integration handlers between physical
hardware and `@tetherto/mdk-kernel`, and the unyielding source of truth for that hardware. `@tetherto/mdk-kernel` operates purely as
a synchronized state machine over Worker-reported state — it never reads hardware directly.

Workers are **passive**: they become a reachable endpoint and wait. The Kernel initiates every call; Workers only ever respond.

> [!NOTE]
> [Deployment topologies connection model][deployment-topologies-connection] details how this directionality shapes transport choices.

For [approval-gated writes][approval-gated-writes], Workers answer `write.calls.request` while the Kernel resolves candidate writes, then execute the 
approved write as a normal `command.request`. 

## Discovery model

How Kernel finds a Worker depends on whether they share a machine.

Each Worker package supplies its own boot function that constructs [`WorkerRuntime`][mdk-worker-runtime] internally (for
example `startWhatsminerWorker`, or `startVendorWorker` if you're [building your own][build-a-worker]) — there is no
single generic `startWorker(WorkerClass, opts)` entry point. The code samples below use `startYourWorker` as a
stand-in for whichever boot function your Worker package exports.

> [!NOTE]
> In all cases, the post-discovery sequence is identical — [Kernel requests identity, registers the Worker, then queries its capabilities][kernel-what-it-owns].

| Mode | How Kernel finds the Worker | When to use |
| --- | --- | --- |
| **DHT** | The Worker's host process passes `kernelTopic` to `WorkerRuntime`; Kernel listens on the same topic and connects automatically | [Production microservices][multi-how-to], Workers on separate hosts or networks |
| **Local** | The Worker's host process publishes the runtime's RPC key to a shared directory; Kernel watches the directory: no DHT needed | All components on one machine, restricted outbound networking |
| **Same-process** | The Worker's host process calls `kernel.registerWorker(runtime.getPublicKey())` directly: no network lookup | [Getting started][get-started-run], [single-process sites][single-how-to] |

> [!NOTE]
> Discovery is a startup concern only — it determines how Kernel obtains the Worker's RPC public key, nothing more. Once connected,
> all three modes use the same HyperswarmRPC transport and the same MDK Protocol envelope (`command.request`, `telemetry.pull`, and so on).
> Local and same-process modes route traffic over the local network interface; DHT mode routes over the public internet.
> The available commands, telemetry, and operations are identical in all three. After a Worker reaches `READY`, the
> [Kernel Scheduler][kernel-scheduler] initiates telemetry pulls and health checks over HRPC; the Worker remains passive.

### DHT mode

In multi-process DHT mode, Kernel and the Worker must join the same Hyperswarm topic. Generate a random 32-byte hex
topic in whichever process starts first, persist it somewhere the other process can read it, and pass the same value
to both sides:

```js
const kernel = await getKernel({ topic: '<32-byte-hex>' })
const worker = await startYourWorker({ kernelTopic: '<32-byte-hex>', ...opts })
```

> [!IMPORTANT]
> The Worker must join the topic before Kernel starts listening. Start the Worker process first, then start Kernel.
> `waitForDiscovery()` polls the registry until discovered Workers reach `READY` state.

The DHT pattern is demonstrated end-to-end in [`dht-worker.js`][dht-worker] and [`dht-kernel.js`][dht-kernel].

### Local mode

In local mode, Kernel and Workers coordinate through a shared directory on the same machine (default `<root>/.worker-keys/`).
No Hyperswarm topic is joined and no outbound internet connection is required.

**Worker side**: after `runtime.start()`, publish the runtime's RPC key to the shared directory with
[`publishWorkerKey`][local-discovery-impl] from `@tetherto/mdk`'s local-discovery helpers. The entry is stable across
restarts (the key is seed-derived), so restarting a Worker is a no-op from Kernel's perspective.

```js
const { keysDir, publishWorkerKey } = require('@tetherto/mdk/backend/core/mdk/lib/local-discovery')

const worker = await startYourWorker(opts)
publishWorkerKey(keysDir(root), workerId, worker.runtime.getPublicKey().toString('hex'))
```

**Kernel side**: `getKernel` watches the directory with `fs.watch` and runs a full scan every four seconds. Each entry found triggers
the normal [discovery listener][local-discovery-impl] (Identity → Capability → Ready), the same sequence used in DHT mode.

```js
const kernel = await getKernel({ discovery: { mode: 'local' } })
```

A custom directory can be passed when the default path is not suitable:

```js
const kernel = await getKernel({ discovery: { mode: 'local', dir: '/shared/mdk-keys' } })
publishWorkerKey('/shared/mdk-keys', workerId, worker.runtime.getPublicKey().toString('hex'))
```

Keys persist across restarts and the directory is read again each time Kernel starts, so Workers and Kernel can start in any order
without coordination.

> [!IMPORTANT]
> All processes must share the same filesystem path. Local mode requires every component to run on the same machine — use DHT
> mode for Workers on separate hosts.

The [full-site example][full-site-local-discovery] demonstrates local mode as its default multi-process setup — `up --discovery local`
starts all Workers in local mode, and `up --discovery dht` switches to DHT without any other code change.

### Same-process mode

Same-process mode skips all network discovery. Register the runtime's public key directly with the live Kernel
instance — no topic, no directory, no network lookup:

```js
const kernel = await getKernel(opts)
const worker = await startYourWorker(opts)
await kernel.registerWorker(worker.runtime.getPublicKey())
```

Two behaviors differ from DHT and local mode:

- **Registration**: the host module calls `kernel.registerWorker()` directly with the runtime's public key. The Worker reaches `READY`
  synchronously — no `waitForDiscovery()` required
- **Lifecycle**: registration alone does not couple the Worker's shutdown to Kernel's — the host process that constructed `WorkerRuntime`
  owns its lifecycle in every mode. Push the Worker's `stop()` onto Kernel's `_cleanup` queue yourself if Kernel shutdown should cascade
  to it (see [`bootWorker`][full-site-local-discovery] for the pattern), or manage it directly in your own shutdown handler

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

External integrators add new hardware by building a Worker Plugin that conforms to the strict Device-Lib Contract:

1. Reference [`mdk-contract.schema.json`][capability-contract-schema] to author the [`mdk-contract.json`][capability-contract-example], validating strict data schemas while injecting
   explanations, constraints, and troubleshooting directly into the relevant nodes.
2. Build a Worker Plugin: the object `{ contract, dir, connect, disconnect? }`, where `connect`/`disconnect` translate `command.request` and
   `telemetry.pull` calls into device I/O. Pass it to `new WorkerRuntime(plugin, opts)` from [`@tetherto/mdk-worker`][mdk-worker-runtime] —
   `WorkerRuntime` hosts every device behind one HRPC channel to Kernel, invoking each handler as `(ctx, params)` and wrapping the result in
   the MDK Protocol envelope itself, so handlers never see transport.
3. Boot the Worker instance, connect to devices, and register with `@tetherto/mdk-kernel` using the appropriate
   [discovery mode](#discovery-model). `@tetherto/mdk-kernel` detects the peer and pulls its identity and capabilities.

<details>
<summary>Migrating from MDKWorkerAdapter / ThingManager (pre-0.5.0)</summary>

`WorkerRuntime` generalizes the former `MDKWorkerAdapter` (persistent seeds, single HRPC respond loop, DHT topic announce carried over)
and replaces `ThingManager` delegation with per-device handler dispatch. See [Worker Runtime legacy services][worker-runtime-legacy]
for the full migration history and the optional built-in services surface.

</details>

> [!TIP]
> See the [full build walkthrough][build-a-worker] for a step-by-step guide, or [`whatsminer/plugin/index.js`][whatsminer-worker-example]
> for a reference plugin implementing `connect`/`disconnect` against a real device.

## Next steps

- [Configure how often Kernel polls discovered Workers][kernel-worker-poll]
- [Diagnose startup hangs when outbound network is restricted][miner-troubleshooting]
- Read the [full build walkthrough][build-a-worker] for a step-by-step guide to building a new Worker Plugin

## Links

[worker-readme]: ../../../backend/workers/README.md
<!-- docs@tether.io: worker-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md -->

[mdk-worker-runtime]: ../../../backend/core/mdk-worker/lib/worker-runtime.js
<!-- docs@tether.io: mdk-worker-runtime → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/lib/worker-runtime.js -->

[build-a-worker]: ../../guides/workers/build-a-worker.md
<!-- docs@tether.io: build-a-worker → guides/workers/build-a-worker -->

[worker-runtime-legacy]: ../../reference/maintainers/worker-runtime-legacy-services.md
<!-- docs@tether.io: worker-runtime-legacy → https://github.com/tetherto/mdk/blob/main/docs/reference/maintainers/worker-runtime-legacy-services.md -->

[whatsminer-worker-example]: ../../../backend/workers/miners/whatsminer/plugin/index.js
<!-- docs@tether.io: whatsminer-worker-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/plugin/index.js -->

[capability-contract-example]: ../../../backend/workers/miners/whatsminer/plugin/mdk-contract.json
<!-- docs@tether.io: capability-contract-example → https://github.com/tetherto/mdk/blob/main/backend/workers/miners/whatsminer/plugin/mdk-contract.json -->

[capability-contract-schema]: ../../../backend/core/mdk-worker/mdk-contract.schema.json
<!-- docs@tether.io: capability-contract-schema → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/mdk-contract.schema.json -->

[kernel-what-it-owns]: kernel.md#what-kernel-owns
<!-- docs@tether.io: kernel-what-it-owns → concepts/stack/kernel#what-kernel-owns -->

[approval-gated-writes]: ../control-plane.md#approval-gated-writes
<!-- docs@tether.io: approval-gated-writes → concepts/control-plane#approval-gated-writes -->

[get-started-run]: ../../tutorials/get-started/run.md
<!-- docs@tether.io: get-started-run → tutorials/backend-stack/run -->

[deployment-topologies-connection]: ../deployment-topologies.md#connection-model
<!-- docs@tether.io: deployment-topologies-connection → concepts/deployment-topologies#connection-model -->

[single-how-to]: ../../guides/deployment/run-single-process-site.md
<!-- docs@tether.io: single-how-to → guides/deployment/run-single-process-site -->

[multi-how-to]: ../../guides/deployment/run-microservices-site.md
<!-- docs@tether.io: multi-how-to → guides/deployment/run-microservices-site -->

[dht-worker]: ../../../examples/backend/mdk-e2e/dht-worker.js
<!-- docs@tether.io: dht-worker → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-worker.js -->

[dht-kernel]: ../../../examples/backend/mdk-e2e/dht-kernel.js
<!-- docs@tether.io: dht-kernel → https://github.com/tetherto/mdk/blob/main/examples/backend/mdk-e2e/dht-kernel.js -->

[local-discovery-impl]: ../../../backend/core/mdk/lib/local-discovery.js
<!-- docs@tether.io: no parity link -->

[full-site-local-discovery]: ../../../examples/full-site/README.md#how-out-of-process-workers-find-the-kernel
<!-- docs@tether.io: full-site-local-discovery → https://github.com/tetherto/mdk/blob/main/examples/full-site/README.md#how-out-of-process-workers-find-the-kernel -->

[kernel-scheduler]: ../../../backend/core/kernel/README.md#scheduler
<!-- docs@tether.io: kernel-scheduler → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#scheduler -->

[kernel-worker-poll]: ../../../backend/core/kernel/README.md#api
<!-- docs@tether.io: kernel-worker-poll → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#api -->

[miner-troubleshooting]: ../../guides/miners/troubleshooting.md
<!-- docs@tether.io: troubleshooting → guides/miners/troubleshooting -->
