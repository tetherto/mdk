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
| Historical telemetry | Each Worker, in its own store | [Hyperbee][hyperbee] for a Worker whose contract turns the [telemetry collector][worker-telemetry] on, else [Worker-defined][integration-model] |
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
- Every telemetry read anywhere above Kernel (an app, a dashboard, an agent) reaches the owning Worker, never
  a Kernel-side cache: Kernel caches nothing on your behalf. A `metrics` or channel read is a live pull through
  to the device; a `snapshot` or `aggregate` read, on a Worker that runs the collector, is answered from the Worker's own stored series, which
  [the Worker Runtime's telemetry collector][worker-telemetry] keeps, so it costs no device call. No single store holds the fleet, so a
  question spanning many Workers is assembled per request: [Kernel fans the read out and merges the answers][fleet-reads-concept] without
  keeping any of it, and [the client's fleet reads][fleet-reads] are the calls that do it.

## Why this model?

MDK's storage choices favor **local-first, zero-external-dependency operation** over the query flexibility that
alternatives such as a dedicated time-series database or a managed cloud store would give you: there is no database server
to provision, back up, or pay for beyond the process itself. Storage needs no network, but connections between MDK processes
run over HyperDHT, which uses public bootstrap nodes unless you run a [private DHT][private-dht]; a fully offline site needs
one. The [cost][scalability] is that
there is no query language or index over the fleet: a cross-device read is a fan-out and a merge, either of the stored readings
themselves, which can span a time range, or of a fixed set of aggregation operations over each device's latest reading. A question
neither expresses, a fleet figure across a time window say, is [arithmetic you write in your own controller][write-a-controller].

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
| Worker telemetry series, the Worker Runtime's collector (`WorkerRuntime` and `WorkerRuntimeV2`) | One `{ data, ts }` point per device per sweep, thinned to one point per rollup bucket | Devices multiplied by poll rate, until `rawMs`; then by rollup bucket, until `keepMs` | Points older than `rawMs` roll up, points older than `keepMs` are deleted, and the runtime reclaims the blocks they unlinked when it owns the store | `telemetryRetention.rawMs`, 24 h; `rollupIntervalMs`, 5 min; `keepMs`, 30 d; `telemetryArchive` off, all set in [the contract or `spec.workers[].config`][worker-telemetry] | Size `keepMs` against the disk the Worker has, and turn `telemetryArchive` on only where the NDJSON day files are shipped or pruned |
| Worker seeds (`storeDir`) | The DHT and RPC seeds that fix the Worker's identity | Constant | Constant | None | Back up with the same care as a private key |
| Gateway store (`<root>/http`) | Identity seeds | Constant | Constant; response caches are in memory | None | Nothing to tune |
| App runtime store (`storeDir`) | The app's RPC and Kernel seeds under `identity/`, and whatever its controllers write to `data/` | One directory per app, plus app-defined data | App-defined | `createAppRuntime({ storeDir })`; `data/` reaches controllers as `config.dataDir` | Without a `storeDir` both keys are random per start and `config.dataDir` is `null` |

The legacy rows describe the thing and adapter surface (`createWorkerInfra`), which some in-repo Workers use (for
example, Antspace) and which is deprecated; a `WorkerRuntimeV2` Worker, for example the in-repo Avalon Worker, the external
Antminer Worker or any new Worker, owns its own storage and its own retention. The [capacity template][capacity-template] is where
measured growth per store goes.

## Can you swap the backend?

Not today. Kernel's stores are Hyperbee via `@tetherto/hp-svc-facs-store` with no alternate-backend interface: a
different storage engine is not a supported extension point the way a Worker Plugin or an app is.

## Getting data out

There is no streaming-to-a-warehouse path today. A Worker whose config sets `telemetryArchive` writes the raw
points retention rolls up to [NDJSON day files][worker-archive] an operator ships or prunes with ordinary tooling;
anything beyond that (a scheduled export, a mirror into another system) is code you write yourself against
[`@tetherto/mdk-client`][mdk-client], the same way [an app controller][gateway-apps] would.

## Failure

A full disk or an unreachable Worker degrades the specific read that touches it: `telemetryCollector.pull()`
answers `{ error }` for that device rather than blocking every other request. A Kernel restart replays its command WAL
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

[worker-telemetry]: ../../backend/core/mdk-worker/README.md#telemetry-collector
<!-- docs@tether.io: worker-telemetry → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#telemetry-collector -->

[worker-archive]: ../../backend/core/mdk-worker/README.md#archive
<!-- docs@tether.io: worker-archive → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#archive -->

[mdk-client]: ../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[fleet-reads]: ../../backend/core/client/README.md#client-methods
<!-- docs@tether.io: fleet-reads → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#client-methods -->

[fleet-reads-concept]: control-plane.md#fleet-reads
<!-- docs@tether.io: fleet-reads-concept → https://github.com/tetherto/mdk/blob/main/docs/concepts/control-plane.md#fleet-reads -->

[gateway-apps]: ../guides/gateway/apps.md
<!-- docs@tether.io: gateway-apps → guides/gateway/apps -->

[write-a-controller]: ../guides/gateway/apps.md#22-write-a-controller
<!-- docs@tether.io: write-a-controller → guides/gateway/apps#22-write-a-controller -->

[security-lifecycle]: ../guides/security/index.md#step-8-handle-secrets-stores-and-day-two-operations
<!-- docs@tether.io: security-lifecycle → guides/security#step-8-handle-secrets-stores-and-day-two-operations -->

[private-dht]: ../guides/deployment/private-dht.md
<!-- docs@tether.io: private-dht → guides/deployment/private-dht -->
