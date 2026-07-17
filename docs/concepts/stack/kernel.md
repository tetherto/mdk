---
title: Kernel
description: The Kernel — what it owns, the pull-only model, transports, and what it deliberately does not handle
docs@tether_slug: concepts/stack/kernel
---

## Overview

[`@tetherto/mdk-kernel`][kernel-readme] is the trusted coordination kernel at the heart of MDK. It routes commands, monitors device
health, registers Workers, and pulls telemetry — without performing user authentication, business logic, or aggregation.

Kernel is a pass-through kernel: it receives commands from any caller using [`@tetherto/mdk-client`][mdk-client] — most commonly
the [Gateway][gateway-concept] — and dispatches them to [Workers][workers-concept]; it pulls telemetry from Workers and routes
it back to callers. Everything else is the caller's responsibility. 

## What Kernel owns

Kernel is decomposed into six single-responsibility modules. Modules communicate only through their declared interfaces.

**`WorkerRegistry`**: maps `deviceId → workerId → RPC channel`. Source of truth for Worker-to-device routing. Workers progress
through a state machine as Kernel discovers and registers them — Unregistered → Discovered → IdentitySaved → Ready → Terminated.

**`CommandDispatcher`**: validates incoming command envelopes, resolves the owning Worker from the registry, checks that the
command exists in the Worker's declared capabilities, then passes it to the state machine. Scope resolution (`COMMAND_SCOPES`:
`device` | `worker` | `rack`) expands a single command to one or more target devices; a `MAX_TARGETS` cap (1024) is enforced
before any state is written.

**`CommandStateMachine`**: tracks every command's full execution lifecycle. Backed by a Write-Ahead Log (WAL) in Hyperbee —
every state transition is persisted before it takes effect. On restart, `recover()` sweeps non-terminal states and retries or
fails them — QUEUED → DISPATCHED → EXECUTING → SUCCESS (or FAILED / TIMEOUT).

**`TelemetryCollector`**: stateless proxy. Routes `telemetry.pull` queries to the appropriate Worker and passes the response
back to the caller. Workers own all aggregation and storage — Kernel is a thin router.

**`Scheduler`**: system metronome. Runs non-overlapping interval jobs for telemetry pulls, health pings, and state pulls on
configurable cadences. Jobs are idempotent — safe to restart with no state loss.

**`HealthMonitor`**: ping-based liveness checker. Sends `health.ping` to every registered Worker on a configurable cadence
and updates the registry — UNKNOWN → HEALTHY → SICK → DEAD (with reconnect path back to HEALTHY).

## The pull-only model

Kernel never receives unsolicited data from Workers. It always initiates — pulling telemetry, pinging health, and pulling state on
cadences set in `opts.cadences`. Workers become reachable and wait; Kernel reaches out on its own schedule.

This is what prevents the kernel from being overwhelmed by upstream pressure and is why Workers are described as passive.
Callers — typically the [Gateway][gateway-kernel-connection] — do send command requests to Kernel (Kernel is the receiver for those),
but Kernel then dispatches each command to the owning Worker via its own initiated call.

## Transport

Kernel is the **passive listener** — the [caller always initiates the connection][gateway-kernel-connection], over
[Hyperswarm RPC (HRPC)][hrpc-glossary] — an encrypted peer-to-peer transport addressed by Kernel's public key.

> [!TIP]
> The [deployment topologies connection model][deployment-topologies-connection] details the active/passive components.

- **Same host (zero-config default)**: Kernel publishes its HRPC public key as hex to a well-known key file
  (`<tmpdir>/mdk/.kernel-key`) on start; the caller/Gateway reads it from there automatically. The file is not deleted on
  shutdown — the key is stable across restarts because the HRPC seed persists in the kernel store
- **Remote or multi-host**: the operator shares the key (`kernel.getPublicKey()`) with the caller/Gateway out-of-band. Kernel can
  maintain an allowlist — when configured, the caller/Gateway's DHT public key must be added to `opts.auth.whitelist` before the
  connection is accepted

> [!TIP]
> The [Kernel transport reference][kernel-readme-transports] covers the allowlist key exchange and configuration options.

## What Kernel does not own

Kernel deliberately excludes these concerns and delegates them to other layers:

- **User authentication and RBAC**: JWT validation, session management, and role-based access are the Gateway's responsibility.
  Kernel trusts all messages from any established [`@tetherto/mdk-client`][mdk-client] connection without inspecting user identity.
  The Gateway is the only caller that enforces RBAC before reaching Kernel; using `@tetherto/mdk-client` without the Gateway
  carries no access control layer
- **Business logic and aggregation**: cross-Worker queries, fleet statistics, and site-level aggregation belong in Gateway
  controllers, not in the kernel
- **UI and consumer interfaces**: Kernel has no HTTP surface. Consumers connect through the Gateway's REST, WebSocket, or MCP
  endpoints

## Next steps

- Understand the [Gateway's role as Kernel's consumer][gateway-concept]
- Understand [Workers as Kernel's downstream][workers-concept]
- Choose a [deployment shape][deployment-topologies]
- Start Kernel via the [`@tetherto/mdk` bootstrap API][mdk-readme]
- Configure Kernel directly using the [`createKernel()` option surface][kernel-readme]

## Links

[kernel-readme]: ../../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-readme → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[mdk-readme]: ../../../backend/core/mdk/README.md
<!-- docs@tether.io: mdk-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mdk/README.md -->

[kernel-readme-transports]: ../../../backend/core/kernel/README.md#transports
<!-- docs@tether.io: kernel-readme-transports → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#transports -->

[mdk-client]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[gateway-concept]: gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[gateway-kernel-connection]: gateway.md#kernel-connection
<!-- docs@tether.io: gateway-kernel-connection → concepts/stack/gateway#kernel-connection -->

[workers-concept]: workers.md
<!-- docs@tether.io: workers-concept → concepts/stack/workers -->

[deployment-topologies]: ../deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[deployment-topologies-connection]: ../deployment-topologies.md#connection-model
<!-- docs@tether.io: deployment-topologies-connection → concepts/deployment-topologies#connection-model -->

[hrpc-glossary]: ../../reference/glossary.md#hyperswarm-rpc
<!-- docs@tether.io: hrpc-glossary → reference/glossary#hyperswarm-rpc -->
