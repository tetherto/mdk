---
title: Control plane
description: How Gateway, Kernel, and Workers communicate, and which layer owns each control-plane responsibility
---

## Overview

This page covers authenticated requests, live reads, command dispatch, and approval-gated writes. It spans
the Gateway, Kernel, and Workers, but each layer owns a different responsibility.

Use this page to understand which layer receives a request, which layer validates it, and when a write becomes a command.

> [!NOTE]
> For package-level APIs and configuration, use the [Gateway README][gateway-readme], [Kernel README][kernel-readme], and [Worker README][worker-readme].

## Responsibility boundaries

**Gateway** owns the consumer-facing surface, including HTTP and plugins. It is also where authentication belongs, though it implements none:
that logic lives in the plugin controllers you write. Browser UIs enter MDK through the Gateway (they do not talk to Kernel
directly). Agents can also reach MDK over MCP — a standalone [`@tetherto/mdk-mcp`][mcp-readme] process that derives tools from
a plugin's routes.

**Kernel** owns coordination: Worker registry, telemetry routing, health checks, command dispatch, command state, and the
write-action approval modules. Kernel trusts established callers; it does not validate user identity.

**Workers** own hardware integration. They declare capabilities, answer Kernel-initiated telemetry and state pulls, resolve candidate
write calls for approval-gated actions, and execute final commands against devices.

## Connection direction

The direction of each connection is intentional:

- Dashboards and UIs call the Gateway over HTTP; agents call the standalone MCP server over MCP
- The Gateway and the MCP server each dial Kernel over [Hyperswarm RPC (HRPC)][hrpc-glossary] through their own `@tetherto/mdk-client` — each a distinct Kernel caller, subject to [Kernel's allowlist][mcp-allowlist]
- Kernel discovers Workers, then initiates every Worker RPC
- Workers never initiate upstream calls to Kernel or the Gateway

The [deployment topologies][deployment-topologies] and [Workers discovery model][workers-discovery] pages cover how this changes
across single-process, local, and distributed deployments.

## Transport identity and admission

HRPC uses encrypted Noise connections with public-key identities. Kernel's HRPC public key identifies and addresses the
Kernel listener. Each caller has a separate public key that the listener receives during connection setup.

Kernel compares the caller's key with the allowlist. An empty allowlist admits any HRPC caller; a configured allowlist
admits the approved callers. This transport-level check works the same way whether the processes share a host or
when they communicate across a network.

Transport identity is not user identity. The HRPC allowlist controls which backend processes may connect to Kernel, and it says nothing about the
person or agent behind a request. Establishing that is the job of the plugin controllers serving people, browser applications, and agents.

## Request paths

### Read requests

Reads usually start in a Gateway route or plugin controller, pass through the plugin's own `mdkClient`, and reach Kernel as registry,
capability, telemetry, or state queries. Kernel routes Worker-owned reads down to the relevant Worker and returns the result to the
Gateway. There is no separate Gateway-side store: a controller that wants a historical or aggregated series fans that same
`mdkClient` out across every registered Worker and reads it from the Worker's own persisted tail-log.

> [!NOTE]
> For plugin controller mechanics, use the [Gateway plugins guide][plugins-how-to].

### Direct commands

Direct commands are immediate writes that do not require approval. The plugin controller performs whatever validation you have written into it, then
sends a `command.request` to Kernel. Kernel resolves the owning Worker, validates the command against the Worker's capabilities,
and hands the command to the crash-recoverable command state machine.

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

The Gateway may expose an HTTP actions surface through plugins. Any access control on that surface is written into the controllers, since the plugin
runtime enforces none. Kernel owns `ActionManager`, `ActionCaller`, and target permission checks at the protocol layer. Those Kernel checks use the
target Worker's device family, such as `miner:w` or `container:w`, read from the `authPerms` array the caller sends, before resolving or approving
writes. Workers answer
`write.calls.request` while Kernel resolves candidate writes, then execute the final `command.request` after the configured vote
thresholds are met.

The two stages fail differently, which matters when you are handling errors in a controller. A vote whose `authPerms` lack a
required family write perm throws `ERR_ACTION_DENIED`. A push does not: `ActionCaller` skips every Worker the caller has no
write perm for, so an unpermitted push resolves no callable targets and comes back as `ERR_KERNEL_ACTION_CALLS_EMPTY` —
indistinguishable, from the error alone, from a query that simply matched no Workers.

Direct command dispatch carries no permission check at all. Kernel validates the envelope, resolves the owning Worker, and
checks the command against that Worker's declared capabilities; nothing on that path reads `authPerms`.

> [!NOTE]
> For implementation steps, use the [write-actions how-to][write-actions-how-to]. For React hook names and exports, use the [React adapter README][react-adapter-readme].

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

The Gateway hosts no MCP itself: the MCP server here is a standalone [`@tetherto/mdk-mcp`][mcp-readme] process that derives its tools from a plugin's routes, and the path below the MCP server is the same as for a direct HTTP call.

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
| React / UI | [`@tetherto/mdk-react-adapter`][react-adapter-readme] | `useSubmitSingleAction`, `useSubmitPendingActions`, `useVoteOnAction`, `useCancelAction`, `usePendingActions`, `useLiveActions`, `useDeviceAction`: call Gateway HTTP routes (plugin-provided) |
| Backend / Node.js | [`@tetherto/mdk-client`][client-readme] | Methods: `pushAction`, `pushActionsBatch`, `voteAction`, `cancelActionsBatch`, `getAction`, `getActionsBatch`, `queryActions` — send MDK Protocol envelopes directly to Kernel |

> [!IMPORTANT]
> The React hooks go through the Gateway, so whatever validation your plugin controllers perform applies to them. The `mdk-client` methods connect
> directly to Kernel and bypass that layer entirely. Neither path gets user-level control for free: the Gateway ships no authentication, and Kernel
> admits backend processes according to its HRPC transport policy, where an empty allowlist admits any caller and a configured allowlist admits
> matching caller keys.

## Next steps

- Build Gateway routes with the [plugin guide][plugins-how-to]
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
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[workers-discovery]: ../../backend/workers/docs/architecture.md#discovery-model
<!-- docs@tether.io: workers-discovery → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[plugins-how-to]: ../guides/gateway/plugins.md
<!-- docs@tether.io: plugins-how-to → guides/gateway/plugins -->

[mcp-readme]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[write-actions-how-to]: ../guides/gateway/write-actions.md
<!-- docs@tether.io: write-actions-guides → guides/gateway/write-actions -->

[client-readme]: ../../backend/core/client/README.md
<!-- docs@tether.io: client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[hrpc-glossary]: ../reference/glossary.md#hyperswarm-rpc

[mcp-allowlist]: ../guides/security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->
<!-- docs@tether.io: hrpc-glossary → reference/glossary#hyperswarm-rpc -->
