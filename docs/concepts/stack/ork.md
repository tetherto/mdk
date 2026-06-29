---
title: ORK
description: The ORK kernel — what it owns, the pull-only model, transports, and what it deliberately does not handle
docs@tether_slug: concepts/stack/ork
---

## Overview

[`@tetherto/mdk-ork`][ork-readme] is the trusted coordination kernel at the heart of MDK. It routes commands, monitors device
health, registers Workers, and pulls telemetry — without performing user authentication, business logic, or aggregation.

ORK is a pass-through kernel: it receives commands from any caller using [`@tetherto/mdk-client`][mdk-client] — most commonly
the [App Node][app-node-concept] — and dispatches them to [Workers][workers-concept]; it pulls telemetry from Workers and routes
it back to callers. Everything else is the caller's responsibility. 

## What ORK owns

ORK is decomposed into six single-responsibility modules. Modules communicate only through their declared interfaces.

**`WorkerRegistry`**: maps `deviceId → workerId → RPC channel`. Source of truth for worker-to-device routing. Workers progress
through a state machine as ORK discovers and registers them — Unregistered → Discovered → IdentitySaved → Ready → Terminated.

**`CommandDispatcher`**: validates incoming command envelopes, resolves the owning worker from the registry, checks that the
command exists in the worker's declared capabilities, then passes it to the state machine.

**`CommandStateMachine`**: tracks every command's full execution lifecycle. Backed by a Write-Ahead Log (WAL) in Hyperbee —
every state transition is persisted before it takes effect. On restart, `recover()` sweeps non-terminal states and retries or
fails them — QUEUED → DISPATCHED → EXECUTING → SUCCESS (or FAILED / TIMEOUT).

**`TelemetryCollector`**: stateless proxy. Routes `telemetry.pull` queries to the appropriate worker and passes the response
back to the caller. Workers own all aggregation and storage — ORK is a thin router.

**`Scheduler`**: system metronome. Runs non-overlapping interval jobs for telemetry pulls, health pings, and state pulls on
configurable cadences. Jobs are idempotent — safe to restart with no state loss.

**`HealthMonitor`**: ping-based liveness checker. Sends `health.ping` to every registered worker on a configurable cadence
and updates the registry — UNKNOWN → HEALTHY → SICK → DEAD (with reconnect path back to HEALTHY).

## The pull-only model

ORK never receives unsolicited data from Workers. It always initiates — pulling telemetry, pinging health, and pulling state on
cadences set in `opts.cadences`. Workers become reachable and wait; ORK reaches out on its own schedule.

This is what prevents the kernel from being overwhelmed by upstream pressure and is why Workers are described as passive.
Callers — typically the [App Node][app-node-ork-connection] — do send command requests to ORK (ORK is the receiver for those),
but ORK then dispatches each command to the owning Worker via its own initiated call.

## Transports

ORK is the **passive listener** on both transports — the [caller always initiates the connection][app-node-ork-connection].

> [!TIP]
> The [deployment topologies connection model][deployment-topologies-connection] details the active/passive components.

- **IPC** (default): the caller/App Node dials ORK over a Unix socket on the same host. Implicit trust — no allowlist required.
  The default for single-host and development deployments
- **HRPC**: the caller/App Node dials ORK over encrypted Hyperswarm Noise streams. ORK maintains an allowlist — the caller/App Node's DHT
  public key must be added to `opts.auth.whitelist` before the connection is accepted. Used for remote or multi-host deployments

> [!TIP]
> The [ORK transport reference][ork-readme-transports] covers the allowlist key exchange and configuration options.

## What ORK does not own

ORK deliberately excludes these concerns and delegates them to other layers:

- **User authentication and RBAC**: JWT validation, session management, and role-based access are the App Node's responsibility.
  ORK trusts all messages from any established [`@tetherto/mdk-client`][mdk-client] connection without inspecting user identity.
  The App Node is the only caller that enforces RBAC before reaching ORK; using `@tetherto/mdk-client` without the App Node
  carries no access control layer
- **Business logic and aggregation**: cross-worker queries, fleet statistics, and site-level aggregation belong in App Node
  controllers, not in the kernel
- **UI and consumer interfaces**: ORK has no HTTP surface. Consumers connect through the App Node's REST, WebSocket, or MCP
  endpoints

## Next steps

- Understand the [App Node's role as ORK's consumer][app-node-concept]
- Understand [Workers as ORK's downstream][workers-concept]
- Choose a [deployment shape][deployment-topologies]
- Review the full [ORK API and configuration][ork-readme]

## Links

[ork-readme]: ../../../backend/core/ork/README.md
<!-- docs@tether.io: ork-readme → https://github.com/tetherto/mdk/blob/main/backend/core/ork/README.md -->

[ork-readme-transports]: ../../../backend/core/ork/README.md#transports
<!-- docs@tether.io: ork-readme-transports → https://github.com/tetherto/mdk/blob/main/backend/core/ork/README.md#transports -->

[mdk-client]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[app-node-concept]: app-node.md
<!-- docs@tether.io: app-node-concept → concepts/stack/app-node -->

[app-node-ork-connection]: app-node.md#ork-connection
<!-- docs@tether.io: app-node-ork-connection → concepts/stack/app-node#ork-connection -->

[workers-concept]: workers.md
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[deployment-topologies]: ../deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[deployment-topologies-connection]: ../deployment-topologies.md#connection-model
<!-- docs@tether.io: deployment-topologies-connection → concepts/deployment-topologies#connection-model -->
