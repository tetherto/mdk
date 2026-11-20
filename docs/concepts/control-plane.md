---
title: Control plane
description: How Gateway, Kernel, and Workers communicate, and which layer owns each control-plane responsibility
---

## Overview

This page covers authenticated requests, live reads, command dispatch, and approval-gated writes. It spans
the Gateway, Kernel, and Workers, but each layer owns a different responsibility.

Use this page to understand which layer receives a request, which layer validates it, and when a write becomes a command.

> [!NOTE]
> For package-level APIs and configuration, use the [Gateway README][gateway-readme], [Kernel README][kernel-readme], and
> [Worker README][worker-readme].

## Responsibility boundaries

**Gateway** owns the consumer-facing surface: it routes HTTP to the apps its stack declares, each in its own runtime process. It also owns
sign-in, serving the
Kernel's token issuer over `/auth/*` and checking [every app route][app-auth] against `spec.rbac`. Browser UIs enter MDK
through the Gateway (they do not talk to Kernel directly). Agents can also reach MDK over MCP, a standalone
[`@tetherto/mdk-mcp`][mcp-readme] process that derives tools from an app's routes.

**Kernel** owns coordination: Worker registry, telemetry routing, health checks, command dispatch, command state, and the
write-action approval modules. Kernel verifies the access token on every request past sign-in and judges the caller against `spec.rbac`.

**Workers** own hardware integration. They declare capabilities, answer Kernel-initiated telemetry and state pulls, resolve candidate
write calls for approval-gated actions, and execute final commands against devices.

### Worker health is not device liveness

Two Kernel-side states describe a Worker, and neither one says anything about the hardware behind it.

| State | Set when | Means | Does not mean |
| --- | --- | --- | --- |
| `READY` | Kernel received the Worker's capability response | Kernel can route to this Worker's devices | Any device answered |
| `HEALTHY` / `SICK` / `DEAD` | The Worker process answered, or failed to answer, `health.ping` over HRPC | The Worker process is reachable | Any device is powered, hashing or reachable |

The health ping never contacts a device: the Worker answers it from memory with a constant `OK`. Kernel sends it every 5 seconds to
every `READY` Worker with a 3 second timeout; one or two misses mark the Worker `SICK`, three mark it `DEAD`, and one reply restores
`HEALTHY`. A `DEAD` Worker stays `READY` in the registry; Kernel stops routing commands to it and keeps pulling its telemetry.
`waitForWorkers` and `waitForDiscovery` test `READY` only. A Worker with every miner behind it unplugged is `READY` and `HEALTHY`.

Device-level truth lives in the telemetry channel, not in these states: each device's `status` and each channel's `{ error }` in a
telemetry pull, and for a command, `verification.state` (`VERIFIED` is the only Kernel-side proof the device reached the requested
state). Kernel keeps no per-device staleness or last-seen signal, `mdk status` reports component state only, and the built-in
`health` telemetry channel on `WorkerRuntimeV2` is a per-device identifier query unrelated to `health.ping`.

## Connection direction

The direction of each connection is intentional:

- Dashboards and UIs call the Gateway over HTTP; agents call the standalone MCP server over MCP
- App runtimes and the MCP server dial Kernel over [Hyperswarm RPC (HRPC)][hrpc-glossary] through their own `@tetherto/mdk-client`,
  app runtimes for device traffic and the MCP server for tool calls. The Gateway does the same for identity and policy only when
  its Kernel is in another process, as its own service account; started with an in-process Kernel it uses that Kernel directly.
  Each remote caller is distinct, subject to [Kernel's allowlist][mcp-allowlist]
- Kernel discovers Workers, then initiates every Worker RPC
- Workers never initiate upstream calls to Kernel or the Gateway

The [deployment topologies][deployment-topologies] and [Workers discovery model][workers-discovery] pages cover how this changes
across single-process, local, and distributed deployments.

## Transport identity and admission

HRPC uses encrypted Noise connections with public-key identities. Kernel's HRPC public key identifies and addresses the
Kernel listener. Each caller has a separate public key that the listener receives during connection setup.

Kernel compares the caller's key with the allowlist and is fail-closed: an empty allowlist admits nobody. Admission only
lets a key connect; it grants nothing. What a caller may do is decided per request: every request but sign-in carries an
access token from the Kernel's token issuer, and Kernel checks it against `spec.rbac` in `mdk.yaml` as the action's resource
and verb, once per device the request touches ([caller admission and authorization][kernel-admission]). Both checks work the
same way whether the processes share a host or communicate across a network.

The Gateway dials with one persistent key, derived from a seed kept in its store and published as `status.rpcClientKey` in its
status file (`<root>/status/wrk-node-http-<port>.json`). That is the [value to allowlist][mcp-allowlist], and it survives restarts.

Transport identity is not user identity. The HRPC allowlist controls which backend processes may connect to Kernel, and it says nothing about the
person or agent behind a request. That arrives as the request's access token, issued by the Kernel's token issuer when the caller signs in and checked
against [the rules `spec.rbac` grants them][app-auth].

## Request paths

### Read requests

Reads usually start in [an app controller][write-a-controller], pass through [the app's own `mdkClient`][client-in-app], and reach
[Kernel][kernel-readme] as queries against the registry, capabilities, telemetry, or state. Kernel routes Worker-owned reads down to the
relevant Worker and returns the result to the Gateway. An app does have a writable directory of its own, the `data/` subdirectory of its
runtime's `storeDir`, reaching controllers as `config.dataDir`.

> [!NOTE]
> For app controller mechanics, use the [app authoring guide][app-authoring].

### Fleet reads

A question about the whole site, total hashrate across every miner say, is one request rather than one request per Worker. The caller names
the Workers it wants and Kernel does the fan-out: it asks each of them, collects the answers, and returns a single result. A Worker that is
unreachable or refuses the read is reported alongside that result rather than failing the call, so an unreachable Worker costs you its own
devices and not the whole answer.

Kernel stores none of this. It is a router and a merge point, and every reading still comes from the Worker that owns the device, out of
[the series a polling Worker keeps][worker-telemetry-collector]. A Worker that does not poll holds no store: it answers
`ERR_TELEMETRY_STORE_DISABLED` and is reported under `errors`. That leaves a choice of what to ask for:

| What you want            | Call            | What comes back                                                            |
| ------------------------ | --------------- | -------------------------------------------------------------------------- |
| The readings themselves  | `pullSnapshot`  | Each device's stored readings, for a moment or across a range              |
| One number for the fleet | `pullAggregate` | The merged result per operation, and how many devices had a stored reading |

Reach for `pullSnapshot` when you are charting the readings, listing them, or computing something the aggregation operations cannot
express. Reach for `pullAggregate` when the answer is a single total or average: each Worker computes over its own devices and Kernel folds
the partial answers, so a reducing op such as `sum` or `avg` sends a running total rather than the readings behind it. `arr_concat`
returns the readings themselves, and `group` and `group_multiple_stats` return one value per group key, which is per device only when the
group is `deviceId`.

> [!NOTE]
> One `pullAggregate` call over every Worker returns the fleet's overall average: each Worker contributes a running accumulator, Kernel folds
> them, and the division happens once, so every device counts once wherever it lives. A simple average of per-Worker or per-group averages
> answers a different question, one where a Worker holding three devices weighs as much as one holding three hundred. Compose that
> deliberately. For a grouping a device carries as an `info` label, a container say, take the per-group figures from a `group_avg` op and mean
> those. Weighting each Worker equally needs the other route, reading each Worker on its own, because a Worker is not a source an op can group
> on. Nothing in the answer says which of the two you asked for, so pick the one the question needs.
> `deviceCount` is the number of devices whose latest stored point holds a reading, not how many fed a given operation, so it is not a
> weighting to lean on.

[The client's fleet reads][fleet-reads] define both calls and their return shapes, and [reading hardware data in a
controller][app-fleet-reads] works a fleet read through end to end.

### Direct commands

Direct commands are immediate writes that do not require approval. [The app controller][write-a-controller] performs whatever validation
you have written into it, then sends a [`command.request`][command-request] to Kernel. Kernel resolves the owning Worker, validates the
command against the Worker's capabilities, and hands the command to the crash-recoverable command state machine.

> [!NOTE]
> For command-dispatch module details, use the [Kernel README][kernel-readme].

### Approval-gated writes

Some writes are staged for approval before they become commands. This keeps direct commands available while adding a separate
review path for fleet-changing actions that need operator approval.

```mermaid
flowchart TB
  directCommand["Direct command"] --> commandRequest["command.request"]
  commandRequest --> dispatcher["CommandDispatcher"]
  dispatcher --> stateMachine["CommandStateMachine"]
  stateMachine --> worker["Worker write"]

  writeAction["Approval-gated write action"] --> actionPush["action.push"]
  actionPush --> actionManager["ActionManager"]
  actionManager --> actionApprover["ActionApprover / voting store"]
  actionApprover --> approved{"Approved?"}
  approved -->|"yes"| actionCaller["ActionCaller"]
  approved -->|"no"| stopped["Rejected or cancelled"]
  actionCaller --> commandRequest
```

An app a stack declares may put an HTTP actions surface in front of this. The Gateway checks the user's token against the route's
`spec.rbac` rule and forwards the request to the app's own runtime process; the app then calls Kernel as its own service account
(`app:<name>`), carrying the signed-in user's token beside its own, so Kernel allows the call only where `spec.rbac` grants both. Kernel
owns [`ActionManager`][action-manager], [`ActionCaller`][action-caller], and the target
checks at the protocol layer: a push needs
`actions: write` and `devices: write` on every device it resolves to, and a vote needs `actions: vote` and `devices: write`
on every device of the stored action. Workers answer
`write.calls.request` while Kernel resolves candidate writes, then execute the final `command.request` after the configured vote
thresholds are met.

A refused push or vote comes back as `ERR_KERNEL_ACTION_FORBIDDEN: may not write <device ids>`, naming the devices the
caller's rules do not cover; a push that matched no Workers is `ERR_KERNEL_ACTION_CALLS_EMPTY`. The voter is the caller's own
identity unless a rule grants `actions: delegate` (an app voting for the user it authenticated).

Direct command dispatch is checked the same way: `command.request` needs `devices: write` on the target device, or on every
device of the Worker for a Worker-scoped command, before Kernel checks the command against the Worker's declared
capabilities. Every attempt, refused ones included, goes to the write-command log.

> [!NOTE]
> For implementation steps, use the [write-actions how-to][write-actions-how-to]. For React hook names and exports, use the
> [React adapter README][react-adapter-readme].

## End-to-end scenarios

Two walkthroughs of the paths above, from the consumer down to the device and back: an AI agent driving the fleet over MCP,
and a human clicking a button in a dashboard.

### AI agent scenario

A user instructs the AI agent: *"Keep the fleet healthy."* The agent monitors continuously, catches `wm002` overheating, reboots it,
and notifies the user.

```mermaid
sequenceDiagram
    actor User
    participant AI as AI Agent
    participant Node as MCP server
    participant Kernel as Kernel
    participant Worker as Generic Worker

    User->>AI: "Keep the fleet healthy."

    Note over AI,Kernel: Step 1: Fleet discovery (read)
    AI->>Node: Call MCP tool get_fleet_alerts
    Node->>Node: Your validation, if the tool handler implements any
    Node->>Kernel: HRPC query (via @tetherto/mdk-client)
    Kernel-->>Node: Metrics
    Node-->>AI: Tool result (wm002 is overheating)

    Note over AI,Kernel: Step 2: Execution (write)
    AI->>Node: Call MCP tool reboot_device (deviceId wm002)
    Node->>Node: Your validation, if the tool handler implements any
    Node->>Kernel: dispatch generic protocol message
    Kernel->>Kernel: Resolve deviceId
    Kernel->>Worker: command.request (HRPC)
    Worker-->>Kernel: command.result
    Kernel-->>Node: result OK
    Node-->>AI: Tool result (Success)

    AI-->>User: "wm002 was overheating and has been rebooted."
```

The Gateway hosts no MCP itself: the MCP server here is a standalone [`@tetherto/mdk-mcp`][mcp-readme] process that derives its tools from
an app's routes, and the path below the MCP server is the same as for a direct HTTP call.

### Human UI scenario

A user clicks "Reboot" on device `wm001` in the UI.

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant Node as Gateway
    participant Kernel as Kernel
    participant Worker as Generic Worker

    User->>UI: Click "Reboot" on wm001
    UI->>Node: POST { `deviceId`, action, payload }

    Note over Node,Kernel: Delegation
    Node->>Kernel: dispatch generic protocol message
    Kernel->>Kernel: Resolve Worker for `deviceId`
    Kernel->>Kernel: Verify against capabilities

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

Both scenarios take the [direct command](#direct-commands) path: neither reboot is staged for approval, so no vote is involved.

## Developer surfaces

The write-action flow is reachable from two different layers depending on where you are building.

| Layer | Package | How you call it |
|---|---|---|
| React / UI | [`@tetherto/mdk-react-adapter`][react-adapter-readme] | `useMutation` / `useQuery` against the HTTP routes your app exposes for actions; MDK ships no action hooks |
| Backend / Node.js | [`@tetherto/mdk-client`][client-readme] | Methods: `pushAction`, `pushActionsBatch`, `voteAction`, `cancelActionsBatch`, `getAction`, `getActionsBatch`, `queryActions` — send MDK Protocol envelopes directly to Kernel |

> [!IMPORTANT]
> The React hooks go through the Gateway, which checks the signed-in user against each route's `spec.rbac` rule. The `mdk-client` methods
> connect directly to Kernel and skip the Gateway, but not the policy: Kernel admits only allowlisted caller keys (an empty allowlist admits
> nobody) and checks every request's token against `spec.rbac`, so a backend client may do exactly what its service account is bound to.

## Next steps

- Build Gateway routes with the [app authoring guide][app-authoring]
- Secure a production site with the [security blueprint][security-blueprint]
- Submit and approve write actions with the [write-actions how-to][write-actions-how-to]
- Review the [Kernel modules][kernel-readme]
- Review Worker capabilities in the [Worker README][worker-readme]

## Links

[gateway-readme]: ../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[kernel-readme]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-readme → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[worker-readme]: ../../backend/workers/README.md
<!-- docs@tether.io: worker-readme → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md -->

[react-adapter-readme]: ../../ui/packages/react-adapter/README.md
<!-- docs@tether.io: react-adapter-readme → https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md -->

[deployment-topologies]: deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → https://github.com/tetherto/mdk/blob/main/docs/concepts/deployment-topologies.md -->

[workers-discovery]: ../../backend/workers/docs/architecture.md#discovery-model
<!-- docs@tether.io: workers-discovery → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[action-manager]: ../../backend/core/kernel/README.md#actionmanager
<!-- docs@tether.io: action-manager → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actionmanager -->

[action-caller]: ../../backend/core/kernel/README.md#actioncaller
<!-- docs@tether.io: action-caller → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#actioncaller -->

[command-request]: ../reference/protocol/messages.md#envelope
<!-- docs@tether.io: command-request → reference/protocol/messages#envelope -->

[write-a-controller]: ../guides/gateway/apps.md#22-write-a-controller
<!-- docs@tether.io: write-a-controller → guides/gateway/apps#22-write-a-controller -->

[client-in-app]: ../../backend/core/client/README.md#use-in-an-app
<!-- docs@tether.io: client-in-app → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#use-in-an-app -->

[app-auth]: ../guides/gateway/apps.md#auth-and-permissions
<!-- docs@tether.io: app-auth → guides/gateway/apps#auth-and-permissions -->

[app-authoring]: ../guides/gateway/apps.md
<!-- docs@tether.io: app-authoring → guides/gateway/apps -->

[mcp-readme]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[write-actions-how-to]: ../guides/gateway/write-actions.md
<!-- docs@tether.io: write-actions-guides → guides/gateway/write-actions -->

[client-readme]: ../../backend/core/client/README.md
<!-- docs@tether.io: client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[fleet-reads]: ../../backend/core/client/README.md#client-methods
<!-- docs@tether.io: fleet-reads → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#client-methods -->

[worker-telemetry-collector]: ../../backend/core/mdk-worker/README.md#telemetry-collector
<!-- docs@tether.io: worker-telemetry-collector → https://github.com/tetherto/mdk/blob/main/backend/core/mdk-worker/README.md#telemetry-collector -->

[app-fleet-reads]: ../guides/gateway/apps.md#read-hardware-data
<!-- docs@tether.io: app-fleet-reads → guides/gateway/apps#read-hardware-data -->

[hrpc-glossary]: ../reference/glossary.md#hyperswarm-rpc

[kernel-admission]: ../../backend/core/kernel/README.md#caller-admission-and-authorization
<!-- docs@tether.io: kernel-admission → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#caller-admission-and-authorization -->

[mcp-allowlist]: ../guides/security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->

[security-blueprint]: ../guides/security/index.md
<!-- docs@tether.io: security-blueprint → guides/security -->
<!-- docs@tether.io: hrpc-glossary → reference/glossary#hyperswarm-rpc -->
