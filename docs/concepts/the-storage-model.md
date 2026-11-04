---
title: The storage model
description: Where MDK data actually lives, what's authoritative versus cached, and what that means as you grow
docs@tether_slug: concepts/the-storage-model
---

## Where data lives

Workers own their own telemetry storage. Kernel's store holds no telemetry, but it does hold secrets:

- The Worker/device registry and published capabilities
- The command WAL and the write-command log
- The `spec.rbac` policy in force and every applied version
- Users, password hashes, service accounts, signing keys and sessions (`kernel-identity`)
- Pending and executed approval-gated actions, with their voters and params (`action-approver`)
- The Kernel's own identity seeds, which fix its HRPC keys (`storeConf`)

Treat the Kernel's data directory as a secret: anyone who copies it can mint access tokens and take over the Kernel's identity.
[Kernel's storage reference][kernel-storage] describes the stores.

| Data | Lives where | Engine |
| --- | --- | --- |
| Live device state | The device itself | None |
| Worker registry, device capabilities, command log, policy, identities, approvals, Kernel key seeds | Kernel's own store | [Hyperbee][hyperbee], via `@tetherto/hp-svc-facs-store` |
| Historical telemetry | Each Worker, in its own store | [Worker-defined][integration-model] |
| Credentials and per-device config | Wherever the Worker plugin author put them |  [Worker-defined][integration-model] |

## What's authoritative, and what's cached

The physical device is the one source of truth, and no Kernel state stands in for it ([Worker health is not device liveness][worker-health]).
Everything above it is a view:

- A **Worker** is the authoritative record of its own device's state
- **Kernel's registry** is authoritative for *routing* (which Worker owns which device), not for device state itself
- **Kernel's command log** is authoritative for write-command lifecycle: every state transition (`QUEUED` →
  `DISPATCHED` → `EXECUTING` → `SUCCESS`/`FAILED`/`TIMEOUT`) is written to a write-ahead log (WAL) before it takes effect,
  so a command interrupted by a clean stop or a crash the store survives resumes from its last recorded state on restart.
  This WAL guarantee is scoped to that one component: the registry and capability stores next to it are plain Hyperbee,
  not WAL-backed, and a `SIGKILL` can leave the store itself unusable, as the
  [security blueprint's process-lifecycle options][security-lifecycle] warn.
- Every telemetry read anywhere above Kernel (an app, a dashboard, an agent) is a live pull through the
  chain back to the Worker, never a read from a Kernel-side cache. Kernel caches nothing on your behalf.

## Why this model?

MDK's storage choices favor **local-first, zero-external-dependency operation** over the query flexibility that
alternatives such as a dedicated time-series database or a managed cloud store would give you: there is no database server
to provision, back up, or pay for beyond the process itself. Storage needs no network, but connections between MDK processes
run over HyperDHT, which uses public bootstrap nodes unless you run a [private DHT][private-dht]; a fully offline site needs
one. The [cost][scalability] is that
cross-device queries (a time range across every miner on a site) are the caller's job, not a stored-procedure or index
the platform gives you for free.

## Retention

Each store grows for a different reason. Expiring a readable result and reclaiming disk space are separate operations:
a deleted key can disappear from the current database view while its backing log retains historical blocks.
The settings column names runtime defaults; the last column identifies what an operator should configure or measure.

| Store | Holds | Grows with | Bounded by | Setting and default | Start with |
| --- | --- | --- | --- | --- | --- |
| Kernel `kernel-registry`, `ork-capabilities` | Worker identities, device to contract mappings | Number of Workers and devices | Rewritten only when a device list changes; `terminate()` deletes the entry | None | Nothing to tune |
| Kernel `kernel-command-wal` | Every command's lifecycle and terminal result | Command volume | TTL pruning removes terminal keys from the current view on recovery and at most hourly while new commands arrive; it does not establish a disk bound | Manager configuration `kernel.commandResultTtlMs`, 24 h; not forwarded by the factories | Measure physical disk growth separately from the number of readable results |
| Worker time logs, legacy surface (`thing-5m-<deviceId>`, `stat-<tf>`, `thing-alerts`, `thing-history-log`) | One snapshot per device per interval, per-timeframe stats, alerts, provisioning history | Devices multiplied by snapshot rate | Rotation requires an explicit length threshold; retention cleanup unlinks older segments | `logRotateMaxLength` unset (rotation off); `logKeepCount`, 3; `storeSnapItvMs`, 5 min | Explicitly configure rotation through the [Worker boot options][worker-retention] and measure retained disk usage |
| Worker storage, `WorkerRuntimeV2` | Whatever the Worker Plugin persists | Plugin-defined | Plugin-defined | Plugin-defined | Read the Worker's own README |
| Worker seeds (`storeDir`) | The DHT and RPC seeds that fix the Worker's identity | Constant | Constant | None | Back up with the same care as a private key |
| Gateway store (`<root>/http`) | Identity seeds | Constant | Constant; response caches are in memory | None | Nothing to tune |
| App runtime store (`storeDir`) | The app's RPC and Kernel seeds under `identity/`, and whatever its controllers write to `data/` | One directory per app, plus app-defined data | App-defined | `createAppRuntime({ storeDir })`; `data/` reaches controllers as `config.dataDir` | Without a `storeDir` both keys are random per start and `config.dataDir` is `null` |

The legacy rows describe the thing and adapter surface (`createWorkerInfra`), which every in-repo Worker uses and which is deprecated;
a `WorkerRuntimeV2` Worker, such as the external Antminer Worker and every new Worker, owns its own storage and its own retention. The [capacity template][capacity-template] is where measured growth per store goes.

## Can you swap the backend?

Not today. Kernel's stores are Hyperbee via `@tetherto/hp-svc-facs-store` with no alternate-backend interface: a
different storage engine is not a supported extension point the way a Worker Plugin or an app is.

## Getting data out

There is no built-in export or streaming-to-a-warehouse path today. Anything you need outside of a live pull
through an app (a scheduled export, a mirror into another system) is code you write yourself against
`@tetherto/mdk-client`, the same way an app controller would.

## Failure

A full disk or an unreachable Worker degrades the specific read that touches it: `telemetryCollector.pull()`
returns nothing for that device rather than blocking every other request. A Kernel restart replays its command WAL
(`recover()` sweeps non-terminal command states) but does not need to reconstruct device state, since it never
owned it.

Each Kernel instance keeps its own separate store: there is no shared or federated storage across multiple
Kernels. A [multi-site deployment][scalability] means multiple independent stores, one per site,
with no cross-site consistency to reason about.

## Next steps

- Understand [the integration model][integration-model]: what a Worker Plugin decides to persist, and how
- Understand [architecture][architecture]: the round trip a read or write actually takes
- Understand [scalability][scalability]: what changes about storage as a fleet grows

## Links

[hyperbee]: https://github.com/holepunchto/hyperbee
<!-- docs@tether.io: external link — preserve URL -->

[integration-model]: the-integration-model.md
<!-- docs@tether.io: integration-model → concepts/the-integration-model -->

[architecture]: architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->

[scalability]: scalability.md
<!-- docs@tether.io: scalability → concepts/scalability -->

[worker-health]: control-plane.md#worker-health-is-not-device-liveness
<!-- docs@tether.io: worker-health → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md#worker-health-is-not-device-liveness -->

[capacity-template]: ../guides/deployment/capacity-metrics-template.md#storage-breakdown
<!-- docs@tether.io: capacity-template → guides/deployment/capacity-metrics-template#storage-breakdown -->

[worker-retention]: ../../backend/core/mdk/README.md#start-a-worker
<!-- docs@tether.io: worker-retention → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md#start-a-worker -->

[kernel-storage]: ../../backend/core/kernel/README.md#storage
<!-- docs@tether.io: kernel-storage → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#storage -->

[security-lifecycle]: ../guides/security/index.md#step-8-handle-secrets-stores-and-day-two-operations
<!-- docs@tether.io: security-lifecycle → guides/security#step-8-handle-secrets-stores-and-day-two-operations -->

[private-dht]: ../guides/deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->
