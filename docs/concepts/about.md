---
title: About MDK
description: Open, modular infrastructure for Bitcoin mining at any scale
docs@tether_slug: concepts/
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

MDK ships three conceptual layers, each containing one or more packages:

1. [Orchestration kernel (Kernel)][kernel-section].
2. [Universal SDK][universal-sdk-section].
3. [MDK App Toolkit][mdk-app-toolkit-section].

All three communicate through the **MDK protocol**. Browsers reach the Kernel through the Gateway, the consumer-facing integration boundary your team builds with the SDK;
[AI agents][ai-agents-section] reach it instead through the standalone MCP server. MDK ships no authentication of its own at any tier: your team
supplies it in the Gateway plugin controllers you write (native MCP tools authenticate at the MCP endpoint instead, not through those controllers). Tying everything together is a **single contract per device type**: the same
[`mdk-contract.json`][capability-contract] is designed to serve the UI (data labels), the orchestrator (validation rules), and AI agents (reasoning
context) — today, only the orchestrator's validation rules are actually wired to it; UI and agent tooling don't read it yet.
One file, one intended source of truth for three audiences.

### The orchestration kernel

[Kernel][kernel-concept], the Orchestration Kernel, is distributed as [`@tetherto/mdk-kernel`][architecture-kernel]. It's the central coordination engine of MDK
and serves as a controller: it knows which devices are online, routes commands to the right place, monitors health, and collects performance data.

`@tetherto/mdk-kernel` communicates with Workers, never devices directly, through a standardized language called the **MDK Protocol**, a common set
of messages every Worker in the system understands, regardless of the device manufacturer or model behind it. Adding a new device type never impacts
`@tetherto/mdk-kernel` thanks to the Worker, a
device-specific translator that sits between the Kernel and your hardware: it speaks the MDK Protocol upward, and the device's native API downward.

The Kernel is **pull-only**, **device-agnostic**, and **self-healing**.

Learn more about the [internal modules, recovery flows, and protocol specs][kernel-modules] that back those guarantees.

### The universal SDK

`@tetherto/mdk-client` is the universal SDK, a connection library that applications use to talk to `@tetherto/mdk-kernel`. It serves as a universal adapter:
handling all the connection details so developers can focus on building their application.

- **Node.js today**: `@tetherto/mdk-client` ships as a Node.js package. The transport and protocol are designed to allow
  future clients in other languages (Python, Go, and others) without changes to Kernel or the protocol itself
- **Lazy connection handling**: connects on first use and reconnects on the next call after a failure, with bounded retries on
  `getStatus()` and an optional connect warm-up. There is no background reconnect loop, and HRPC is the only transport
- **No lock-in**: developers bring their own stack and connect via the SDK. No framework requirements

### MDK app toolkit

For teams that want to ship fast, the [**MDK App toolkit**][app-toolkit] is the optional, batteries-included application
layer that sits on top of `@tetherto/mdk-kernel`. It ships in three parts:

- **Frontend tools**: a headless state brain ([`@tetherto/mdk-ui-foundation`][ui-foundation]), framework adapters
([`@tetherto/mdk-react-adapter`][react-get-started] for React today), and a production-tested React UI Kit
([`@tetherto/mdk-react-devkit`][react-get-started]) for dashboards.
- **Backend tools**: the Gateway itself, a Fastify-specific library handling command proxying and request-level
  caching, with hooks for custom routes and aggregations. There is no Express adapter today.
- **Plugins**: a Gateway plugin's `mdk-plugin.json` declares its own routes; pairing one with a specific frontend
  tools widget is application code you write, not a manifest mechanism the Toolkit provides for you today. Third parties
can ship whole features without forking the Gateway.

The Gateway is the recommended integration path for applications — it adds HTTP routing, request caching, and a plugin system for extending routes.
Nothing above the Gateway is required, though: for lightweight tools, standalone scripts, or CI/CD integrations, [`@tetherto/mdk-client`][mdk-client]
can talk to Kernel directly. Some Worker-scoped operations (device provisioning, historical log/stat aggregation) go through a direct Worker
connection instead of the usual Kernel round-trip; [when to use which][client-paths] is covered by the client's own guide.

## Who MDK is for

MDK is built for everyone involved in mining Bitcoin:

- **Mining operators**: monitor and control fleets with real-time dashboards. Get fleet-wide summaries (total
hashrate, power usage, temperature alerts) across all your sites.
- **Hardware manufacturers**: integrate new devices by building a Worker and writing one
[`mdk-contract.json`][capability-contract]. No involvement from MDK maintainers needed.
- **Software developers**: build custom mining applications in any language, or leverage the
[MDK App Toolkit][app-toolkit]'s frontend and backend tools for rapid development.
- **AI/Automation teams**: [connect intelligent agents][ai-agents-section] that can monitor and diagnose device
issues autonomously, then act on them once an operator approves the write

## Architecture overview

`@tetherto/mdk-kernel` is [the Kernel][architecture-kernel]. [`@tetherto/mdk-client`][mdk-client] is the protocol connector every caller uses
to reach it. Above those two layers, the supported development path builds in two levels:

- **Gateway**: the [Gateway][gateway-concept] hosts plugins and adds request-level caching and an HTTP interface; each plugin
  builds its own `@tetherto/mdk-client` and does its own fleet aggregation. Authenticating callers is left to the plugin
  controllers you write. AI agents can drive the fleet over MCP — a standalone [`@tetherto/mdk-mcp`][mcp-readme] process that
  derives tools from a plugin's routes.
- **MDK App Toolkit**: sits on top of the Gateway. Adds a plugin system for declarative route extensions and frontend
  packages ([`@tetherto/mdk-ui-foundation`][ui-foundation], React adapter, React UI kit) for teams building operator dashboards

Below the Kernel, **devices are the source of truth**. The actual hardware state is reported by the Worker
to `@tetherto/mdk-kernel`, which orchestrates a synchronized view across the fleet.

Each layer names its canonical doc in [the MDK stack][mdk-stack]. The [round trip][round-trip] traces one command end to end, and the
[Workers discovery model][discovery-model] covers how Kernel finds Workers across local, same-process, and DHT modes.

## AI-ready with unified intelligence

MDK is designed from the ground up for [AI-driven operations][ai-agents-docs]. Rather than bolting AI on as an afterthought,
intelligence is woven directly into the device definition itself.

In addition to the technical schemas, every device's contract file ([`mdk-contract.json`][capability-contract]) contains:

- **Safety rules**: for example, "Outlet temperature > 85°C requires immediate intervention"
- **Operational constraints**: limits on command frequency, power thresholds, cooling requirements
- **Troubleshooting guides**: if/then recovery steps an AI agent can diagnose against autonomously; the recovery
  action itself still waits for operator approval, the same as any other write

The intent is that an AI agent connecting to MDK wouldn't need a separate knowledge base or custom prompts per device: the
same contract that Kernel already validates commands against would also determine how AI reasons about that hardware. That
wiring is not built yet: MCP tools today come from a hand-authored manifest or a Gateway plugin's routes, not from a Worker's contract (see
[Connecting intelligent agents][ai-agents-docs]).

## What you can build

- Operational dashboards (hashrate, power, temperature)
- Multisite fleet management with centralized oversight
- Alerts and notifications for critical device events
- Overheating detection and automated remediation
- AI-driven autonomous monitoring, with human-approved control actions
- Custom analytics and reporting pipelines
- White-labeled hosted mining platforms
- Third-party device integrations and plugins

## Scaling

MDK [scales][scaling] naturally without architectural changes:

- **More devices?** Add more Workers. Each Worker owns a specific set of devices, and `@tetherto/mdk-kernel` routes commands to
the right one automatically.
- **More sites?** Each physical site runs its own `@tetherto/mdk-kernel` instance, each behind its own Gateway. No MDK component
aggregates across sites: that view is your own application code calling each site's Gateway and merging the results.
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

[client-paths]: ../../backend/core/client/README.md#when-to-use-which-client-path
<!-- docs@tether.io: client-paths → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md#when-to-use-which-client-path -->

[kernel-concept]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: kernel-concept → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[gateway-concept]: ../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-concept → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[capability-contract]: ../../backend/workers/README.md#3-mdk-contractjson
<!-- docs@tether.io: capability-contract → https://github.com/tetherto/mdk/blob/main/backend/workers/README.md#3-mdk-contractjson -->

[architecture-kernel]: ../../backend/core/kernel/README.md
<!-- docs@tether.io: architecture-kernel → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md -->

[kernel-modules]: ../../backend/core/kernel/README.md#architecture
<!-- docs@tether.io: kernel-modules → https://github.com/tetherto/mdk/blob/main/backend/core/kernel/README.md#architecture -->

[app-toolkit]: app-toolkit.md
<!-- docs@tether.io: app-toolkit → https://github.com/tetherto/mdk/blob/main/docs/concepts/app-toolkit.md -->

[ui-foundation]: ../../ui/packages/ui-foundation/README.md
<!-- docs@tether.io: ui-foundation → reference/ui -->

[mcp-readme]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-readme → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[react-get-started]: ../../ui/README.md
<!-- docs@tether.io: react-get-started → https://github.com/tetherto/mdk/blob/main/ui/README.md -->
<!-- mdk-monorepo: tutorials/ui/react parked on the docs site; restore the slug rewrite when it is unparked -->

[mdk-stack]: architecture.md#the-stack
<!-- docs@tether.io: mdk-stack → concepts/architecture#the-stack -->

[round-trip]: architecture.md#the-round-trip
<!-- docs@tether.io: round-trip → concepts/architecture#the-round-trip -->

[discovery-model]: ../../backend/workers/docs/architecture.md#discovery-model
<!-- docs@tether.io: discovery-model → https://github.com/tetherto/mdk/blob/main/backend/workers/docs/architecture.md#discovery-model -->

[ai-agents-docs]: ../../backend/core/mcp/README.md
<!-- docs@tether.io: ai-agents-docs → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[scaling]: scalability.md
<!-- docs@tether.io: scaling → concepts/scalability -->

[architecture]: architecture.md
<!-- docs@tether.io: architecture → concepts/architecture -->
