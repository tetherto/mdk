---
title: About MDK
description: Open, modular infrastructure for Bitcoin mining at any scale
docs@tether_slug: concepts/about/
---

## Introducing MDK

MDK, the Mining Development Kit, is an [open-source platform][licensing] that delivers a modern, transparent, and modular infrastructure for 
Bitcoin mining operations. MDK enables Bitcoin mining operations to start small, scale smoothly, and remain in full control, without lock-in, 
rewrites, or hidden complexity.

## The problem

The Bitcoin mining industry has long been constrained by closed systems, proprietary tooling, and vendor lock-in. MDK changes that.

## The solution

MDK delivers a modular mining stack that empowers operators and developers to build, monitor, control, and scale mining operations with full ownership: 
from a single device to gigawatt-scale facilities — without architectural rewrites.

MDK ships three packages:

1. [Orchestration kernel (Kernel)][kernel-section].
2. [Universal SDK][universal-sdk-section].
3. [MDK App Toolkit][mdk-app-toolkit-section].

All three communicate through the **MDK protocol**. Clients — browsers and [AI agents][ai-agents-section] alike — reach the kernel exclusively through 
the Gateway, the secure entry point your team builds with the SDK. Tying everything together is a **single contract per device type**: the same 
[`mdk-contract.json`][capability-contract] serves the UI (data labels), the orchestrator (validation rules), and AI agents (reasoning context). 
One file, three audiences, no drift.

### The orchestration kernel

[Kernel][kernel-concept], the Orchestration Kernel, is distributed as [`@tetherto/mdk-kernel`][architecture-kernel]. It's the central coordination engine of MDK 
and serves as a controller: it knows which devices are online, routes commands to the right place, monitors health, and collects performance data.

`@tetherto/mdk-kernel` communicates with devices through a standardized language called the **MDK Protocol**, a common set of messages that every device 
in the system understands, regardless of manufacturer or model. Adding a new device type never impacts `@tetherto/mdk-kernel` thanks to the Worker, a 
device-specific translator that sits between the kernel and your hardware: it speaks the MDK Protocol upward, and the device's native API downward.

The kernel is **pull-only**, **device-agnostic**, and **self-healing**.

Learn more about the [internal modules, recovery flows, and protocol specs][kernel-modules] that back those guarantees.

### The universal SDK

`@tetherto/mdk-client` is the universal SDK, a connection library that applications use to talk to `@tetherto/mdk-kernel`. It serves as a universal adapter: 
handling all the connection details so developers can focus on building their application.

- **Multi-language support**: available for Node.js, Python, Go, and more; use whatever language your team prefers
- **Automatic connection handling**: manages reconnection, retries, and transport selection behind the scenes
- **No lock-in**: developers bring their own stack and connect via the SDK. No framework requirements.

### MDK App Toolkit

For teams that want to ship fast, the [**MDK App Toolkit**][app-toolkit] is the optional, batteries-included application 
layer that sits on top of `@tetherto/mdk-kernel`. It ships in three parts:

- **Frontend tools**: a headless state brain ([`@tetherto/mdk-ui-foundation`][ui-foundation]), framework adapters 
([`@tetherto/mdk-react-adapter`][react-get-started] for React today), and a production-tested React UI Kit 
([`@tetherto/mdk-react-devkit`][react-get-started]) for dashboards.
- **Backend tools**: a plug-and-play library that drops into Fastify or Express to handle JWT auth, RBAC, and
 command proxying, with hooks for custom routes and aggregations.
- **Plugins**: drop-in modules that pair a frontend tools widget with a backend tools route, so third parties 
can ship whole features without forking the Gateway.

Using [`@tetherto/mdk-client`][mdk-client] without the Gateway is technically possible but not supported by this monorepo — most applications build on the Gateway.

## Who MDK is for

MDK is built for everyone involved in mining Bitcoin:

- **Mining operators**: monitor and control fleets with real-time dashboards. Get fleet-wide summaries (total 
hashrate, power usage, temperature alerts) across all your sites.
- **Hardware manufacturers**: integrate new devices by building a Worker and writing one 
[`mdk-contract.json`][capability-contract]. No involvement from MDK maintainers needed.
- **Software developers**: build custom mining applications in any language, or leverage the 
[MDK App Toolkit][app-toolkit]'s frontend and backend tools for rapid development.
- **AI/Automation teams**: [connect intelligent agents][ai-agents-section] that can monitor, diagnose, 
and act on device issues autonomously

## Architecture overview

`@tetherto/mdk-kernel` is [the kernel][architecture-kernel]. [`@tetherto/mdk-client`][mdk-client] is the protocol connector every caller uses
to reach it. Above those two layers, the supported development path builds in two levels:

- **Gateway**: the [Gateway][gateway-concept] wraps `@tetherto/mdk-client` and adds [authentication][authentication],
  [RBAC][rbac], fleet aggregation, and an HTTP/WebSocket/MCP interface. AI agents drive the fleet through its MCP endpoint
- **MDK App Toolkit**: sits on top of the Gateway. Adds a plugin system for declarative route extensions and frontend
  packages ([`@tetherto/mdk-ui-foundation`][ui-foundation], React adapter, React UI kit) for teams building operator dashboards

Below the kernel, **devices are the source of truth**. The actual hardware state is reported by the Worker 
to `@tetherto/mdk-kernel`, which orchestrates a synchronized view across the fleet.

For the full layer-by-layer view with transports and discovery flows, see the [MDK stack][mdk-stack] on the 
Architecture page.

## AI-ready with unified intelligence

MDK is designed from the ground up for [AI-driven operations][ai-agents-docs]. Rather than bolting AI on as an afterthought, 
intelligence is woven directly into the device definition itself.

In addition to the technical schemas, every device's contract file ([`mdk-contract.json`][capability-contract]) contains:

- **Safety rules**: for example, "Outlet temperature > 85°C requires immediate intervention"
- **Operational constraints**: limits on command frequency, power thresholds, cooling requirements
- **Troubleshooting guides**: if/then recovery steps that AI agents can follow autonomously

This means an AI agent connecting to MDK doesn't need a separate knowledge base or custom prompts per device. 
The intelligence travels with the device; the same contract that validates commands and generates dashboards also determines 
how AI reasons about that hardware.

## What you can build

- Operational dashboards (hashrate, power, temperature)
- Multisite fleet management with centralized oversight
- Alerts and notifications for critical device events
- Overheating detection and automated remediation
- AI-driven autonomous monitoring and control
- Custom analytics and reporting pipelines
- White-labeled hosted mining platforms
- Third-party device integrations and plugins

## Scaling

MDK [scales][scaling] naturally without architectural changes:

- **More devices?** Add more Workers. Each Worker owns a specific set of devices, and `@tetherto/mdk-kernel` routes commands to 
the right one automatically.
- **More sites?** Each physical site runs its own `@tetherto/mdk-kernel` instance. A single Gateway connects to all of them, 
giving you one view across your entire operation.
- **Site isolation**: `@tetherto/mdk-kernel` instances are fully independent. A problem at one site has zero impact on any other.

## Next steps

Learn more about:

- [Architecture][architecture]
- [MDK App Toolkit][app-toolkit]
- [Connecting intelligent agents][ai-agents-docs]

## Links

[licensing]: ../../LICENSE
<!-- docs@tether.io: licensing → support/community/contributing#licensing -->

[kernel-section]: #the-orchestration-kernel
[universal-sdk-section]: #the-universal-sdk
[mdk-app-toolkit-section]: #mdk-app-toolkit
[ai-agents-section]: #ai-ready-with-unified-intelligence

[mdk-client]: ../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[kernel-concept]: stack/kernel.md
<!-- docs@tether.io: kernel-concept → concepts/stack/kernel -->

[gateway-concept]: stack/gateway.md
<!-- docs@tether.io: gateway-concept → concepts/stack/gateway -->

[capability-contract]: stack/workers.md#capability-contract
<!-- docs@tether.io: capability-contract → concepts/stack/workers#capability-contract -->

[architecture-kernel]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: architecture-kernel → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[kernel-modules]: ../../backend/core/kernel/README.md#architecture
<!-- docs@tether.io: kernel-modules → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#architecture -->

[app-toolkit]: ../../ui/docs/ARCHITECTURE.md
<!-- docs@tether.io: app-toolkit → concepts/stack/app-toolkit -->
<!-- mdk-monorepo: temp — ARCHITECTURE.md is a stub until ui/ is populated -->

[ui-foundation]: ../../ui/packages/ui-foundation/README.md
<!-- docs@tether.io: ui-foundation → reference/app-toolkit/ui-foundation -->

[react-get-started]: ../../ui/README.md
<!-- docs@tether.io: react-get-started → tutorials/ui/react -->

[authentication]: ../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: authentication → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[rbac]: ../../backend/core/gateway/README.md#security-model
<!-- docs@tether.io: rbac → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md#security-model -->

[mdk-stack]: architecture.md#mdk-stack
<!-- docs@tether.io: mdk-stack → concepts/architecture#mdk-stack -->

[ai-agents-docs]: architecture.md#ai-agents-and-the-mcp-server
<!-- docs@tether.io: ai-agents-docs → concepts/architecture#ai-agents-and-the-mcp-server -->

[scaling]: architecture.md#scaling
<!-- docs@tether.io: scaling → concepts/architecture#scaling -->

[architecture]: architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->
