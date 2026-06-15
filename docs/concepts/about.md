---
title: About MDK
description: Open, modular infrastructure for Bitcoin mining at any scale
docs@tether_slug: concepts/about/
---

## Introducing MDK

MDK, the Mining Development Kit, is an [open-source platform][licensing] that delivers a modern, transparent, and modular infrastructure for Bitcoin mining operations. MDK enables Bitcoin mining operations to start small, scale smoothly, and remain in full control, without lock-in, rewrites, or hidden complexity.

## The problem

The Bitcoin mining industry has long been constrained by closed systems, proprietary tooling, and vendor lock-in. MDK changes that.

## The solution

MDK delivers a modular mining stack that empowers operators and developers to build, monitor, control, and scale mining operations with full ownership: from a single device to gigawatt-scale facilities — without architectural rewrites.

MDK ships three packages:

1. [Orchestration kernel (ORK)][ork-section].
2. [Universal SDK][universal-sdk-section].
3. [MDK App Toolkit][mdk-app-toolkit-section].

All three communicate through the **MDK Protocol**. Clients — browsers and [AI agents][ai-agents-section] alike — reach the kernel exclusively through the App Node, the secure gateway your team builds with the SDK. Tying everything together is a **single contract per device type**: the same [`mdk-contract.json`][capability-contract] serves the UI (data labels), the orchestrator (validation rules), and AI agents (reasoning context). One file, three audiences, no drift.

### The orchestration kernel

ORK, the Orchestration Kernel, is distributed as [`@tetherto/mdk-ork`][architecture-ork]. It's the central coordination engine of MDK and serves as a controller: it knows which devices are online, routes commands to the right place, monitors health, and collects performance data.

`@tetherto/mdk-ork` communicates with devices through a standardized language called the **MDK Protocol**, a common set of messages that every device in the system understands, regardless of manufacturer or model. Adding a new device type never impacts `@tetherto/mdk-ork` thanks to the Worker, a device-specific translator that sits between the kernel and your hardware: it speaks the MDK Protocol upward, and the device's native API downward.

The kernel is **pull-only**, **device-agnostic**, and **self-healing**.

Learn more about the [internal modules, recovery flows, and protocol specs][ork-modules] that back those guarantees.

### The universal SDK

`@tetherto/mdk-client` is the universal SDK, a connection library that applications use to talk to `@tetherto/mdk-ork`. It serves as a universal adapter: handling all the connection details so developers can focus on building their application.

- **Multi-language support**: available for Node.js, Python, Go, and more; use whatever language your team prefers
- **Automatic connection handling**: manages reconnection, retries, and transport selection behind the scenes
- **No lock-in**: developers bring their own stack and connect via the SDK. No framework requirements.

### MDK App Toolkit

For teams that want to ship fast, the [**MDK App Toolkit**][app-toolkit] is the optional, batteries-included application layer that sits on top of `@tetherto/mdk-ork`. It ships in three parts:

- **Frontend tools**: a headless state brain ([`@tetherto/mdk-ui-core`][ui-core]), framework adapters ([`@tetherto/mdk-react-adapter`][react-get-started] for React today), and a production-tested React UI Kit ([`@tetherto/mdk-react-devkit`][react-get-started]) for dashboards.
- **Backend tools**: a plug-and-play library that drops into Fastify or Express to handle JWT auth, RBAC, and command proxying, with hooks for custom routes and aggregations.
- **Plugins**: drop-in modules that pair a frontend tools widget with a backend tools route, so third parties can ship whole features without forking the App Node.

The toolkit is fully optional: teams can write directly against `@tetherto/mdk-client` instead. See [MDK App Toolkit][app-toolkit] for the full breakdown.

## Who MDK is for

MDK is built for everyone involved in mining Bitcoin:

- **Mining operators**: monitor and control fleets with real-time dashboards. Get fleet-wide summaries (total hashrate, power usage, temperature alerts) across all your sites.
- **Hardware manufacturers**: integrate new devices by building a Worker and writing one [`mdk-contract.json`][capability-contract]. No involvement from MDK maintainers needed.
- **Software developers**: build custom mining applications in any language, or leverage the [MDK App Toolkit][app-toolkit]'s frontend and backend tools for rapid development.
- **AI/Automation teams**: [connect intelligent agents][ai-agents-section] that can monitor, diagnose, and act on device issues autonomously

## Architecture overview

`@tetherto/mdk-ork` is [the kernel][architecture-ork]. Above it, you build dashboards and business logic; AI agents drive the fleet through an **MCP endpoint** MDK provides on the App Node. **The App Node** is your secure gateway above the kernel: all [user authentication][authentication], [role-based access control (RBAC)][rbac], and fleet-wide aggregation happen there, keeping `@tetherto/mdk-ork` secure and focused on orchestration. Within the App Node you have two build paths: write custom business logic directly using `@tetherto/mdk-client`, or adopt the [MDK App Toolkit][app-toolkit], which ships **frontend tools** for the dashboard and **backend tools** for custom routes.

Below the kernel, **devices are the source of truth**. The actual hardware state is reported by the Worker to `@tetherto/mdk-ork`, which orchestrates a synchronized view across the fleet.

For the full layer-by-layer view with transports and discovery flows, see the [MDK stack][mdk-stack] on the Architecture page.

## AI-ready with unified intelligence

MDK is designed from the ground up for [AI-driven operations][ai-agents-docs]. Rather than bolting AI on as an afterthought, intelligence is woven directly into the device definition itself.

In addition to the technical schemas, every device's contract file ([`mdk-contract.json`][capability-contract]) contains:

- **Safety rules**: for example, "Outlet temperature > 85°C requires immediate intervention"
- **Operational constraints**: limits on command frequency, power thresholds, cooling requirements
- **Troubleshooting guides**: if/then recovery steps that AI agents can follow autonomously

This means an AI agent connecting to MDK doesn't need a separate knowledge base or custom prompts per device. The intelligence travels with the device; the same contract that validates commands and generates dashboards also determines how AI reasons about that hardware.

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

- **More devices?** Add more Workers. Each Worker owns a specific set of devices, and `@tetherto/mdk-ork` routes commands to the right one automatically.
- **More sites?** Each physical site runs its own `@tetherto/mdk-ork` instance. A single App Node connects to all of them, giving you one view across your entire operation.
- **Site isolation**: `@tetherto/mdk-ork` instances are fully independent. A problem at one site has zero impact on any other.

Learn more about:

- [Architecture][architecture]
- [MDK App Toolkit][app-toolkit]
- [Connecting intelligent agents][ai-agents-docs]

## Links

[licensing]: ../../LICENSE
<!-- docs@tether.io: licensing → community/contributing#licensing -->

[ork-section]: #the-orchestration-kernel
[universal-sdk-section]: #the-universal-sdk
[mdk-app-toolkit-section]: #mdk-app-toolkit
[ai-agents-section]: #ai-ready-with-unified-intelligence

[capability-contract]: architecture.md#responsibilities-and-the-capability-contract
<!-- docs@tether.io: capability-contract → concepts/architecture#responsibilities-and-the-capability-contract -->

[architecture-ork]: ../../backend/core/ork/index.js
<!-- docs@tether.io: architecture-ork → https://github.com/tetherto/mdk/blob/main/backend/core/ork/index.js -->

[ork-modules]: ../../backend/core/ork/lib/ork.manager.js
<!-- docs@tether.io: ork-modules → https://github.com/tetherto/mdk/blob/main/backend/core/ork/lib/ork.manager.js -->

[app-toolkit]: ../../ui/docs/ARCHITECTURE.md
<!-- docs@tether.io: app-toolkit → concepts/architecture/app-toolkit -->
<!-- mdk-monorepo: temp — ARCHITECTURE.md is a stub until ui/ is populated -->

[ui-core]: ../../ui/AGENTS.md
<!-- docs@tether.io: ui-core → reference/app-toolkit/ui-core -->
<!-- mdk-monorepo: temp — repoint to package-level AGENTS.md until ui/docs/AGENT_READY.md is populated -->

[react-get-started]: ../../ui/README.md
<!-- docs@tether.io: react-get-started → ui/react/get-started -->

[authentication]: ../../backend/core/app-node/worker.js
<!-- docs@tether.io: authentication → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/worker.js -->

[rbac]: ../../backend/core/app-node/worker.js
<!-- docs@tether.io: rbac → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/worker.js -->

[mdk-stack]: architecture.md#mdk-stack
<!-- docs@tether.io: mdk-stack → concepts/architecture#mdk-stack -->

[ai-agents-docs]: architecture.md#ai-agents-and-the-mcp-server
<!-- docs@tether.io: ai-agents-docs → concepts/architecture#ai-agents-and-the-mcp-server -->

[scaling]: architecture.md#scaling
<!-- docs@tether.io: scaling → concepts/architecture#scaling -->

[architecture]: architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->
