---
title: App Node
description: The App Node as a development canvas — extension model, data access, auth design, and ORK connection
docs@tether_slug: concepts/stack/app-node
todo: Gap — no dedicated RBAC how-to covering role assignment and available role strings
---

## Overview

This page introduces the [App Node][app-node-readme] surface. It explains what concerns it owns, how to extend it with plugins and routes,
how data flows from ORK to your controllers, and why authentication lives here rather than in the kernel.
Read this before building [plugins][plugins-how-to], auth flows, or aggregation routes on top of MDK.

> [!NOTE]
> The App Node is the backend layer of the [MDK App Toolkit][app-toolkit], which aligns the [plugin system][plugins-how-to]
> and [frontend packages][app-toolkit] into the supported development path for this monorepo.

## What the App Node owns

The App Node wraps [`@tetherto/mdk-client`][mdk-client] — the MDK protocol connector to ORK — and adds an authenticated HTTP,
WebSocket, and MCP interface on top. Consumers connect through the App Node; using `@tetherto/mdk-client` without the App Node
is not supported by this monorepo.

The App Node owns three concerns that ORK deliberately **does not** handle:

- Authentication and RBAC: JWT validation, session management, OAuth2 (Google and Microsoft built in), and role-based access before any request reaches ORK
- API surface: REST endpoints, WebSocket telemetry subscriptions, command dispatch, and the MCP endpoint for AI agents
- Fleet aggregation: cross-worker queries that compute site hashrate, average temperature, and cross-rack efficiency — resolved in controller code, not in ORK

[ORK][ork-concept] is a pass-through kernel. It routes commands to [Workers][workers-concept], collects telemetry, and maintains
the device registry. Everything above the kernel — authentication, business logic, API surface — is owned by the caller:
the App Node (which wraps [`@tetherto/mdk-client`][mdk-client] internally) when using the toolkit.

## Extension model

The App Node offers two ways to add routes, in order of preference.

### 1. Plugin system

The recommended path. A plugin is a directory with an `mdk-plugin.json` manifest and one or more controller files.
Pass the directory path to `startAppNode()` via `extraPluginDirs`.

Controllers receive a `services` bag on every request — `mdkClient`, `dataProxy`, `authLib`, and `conf` — with no protocol knowledge required.
The [default plugins][plugins-readme-defaults] (`auth`, `telemetry`, `site-hashrate`) load the same way as any plugin you write.

The [plugin authoring guide][plugins-how-to] covers the build process end to end.
The [plugin reference][plugins-readme] documents the manifest schema, controller contract, and loader errors.

### 2. Raw Fastify routes

For one-off handlers that do not need a manifest, pass `additionalRoutes` to `startAppNode()`. These are plain Fastify route objects —
no `services` injection, no manifest validation, no auth wiring. Use this path sparingly; a plugin is easier to test in isolation
and easier for a later maintainer to follow.

## Use an alternative gateway

If your use case does not need the App Node's HTTP surface, RBAC, or plugin system — for example, a background service that only
dispatches commands — you can use [`@tetherto/mdk-client`][mdk-client] directly against ORK without running the App Node at all.
This is the direct path. Such an approach is not directly supported by this monorepo, as most applications build on the App Node.

## Data access

Two services are available inside every plugin controller.

**`services.mdkClient`** gives access to live ORK data: pull a telemetry snapshot, dispatch a command, list registered workers.
It's `null` when the App Node starts without a live ORK connection, so guard it before use.

**`services.dataProxy`** reads from persisted worker tail-logs: time-series aggregation, historical hashrate, efficiency trends.
Use this for data that does not require a live ORK round-trip.

The split exists because the two sources have different latency and availability characteristics. `mdkClient` calls are network
operations that can fail if ORK is unreachable. `dataProxy` reads from local storage and remains available whether ORK is online or not.

## Authentication design

The App Node validates a JWT Bearer token before proxying any request to ORK. By design, ORK does not perform user-level authentication.
For IPC (same-host), the socket itself provides implicit trust and no key exchange is required.
For HRPC (remote ORK), [ORK maintains an allowlist][ork-transports]; pre v1.0 it is opt-in (the default `auth.whitelist` is empty and
admits any caller), but when configured the App Node's DHT public key must be added before the connection is accepted.
Either way, once the transport is established, ORK trusts all messages from the App Node without inspecting user identity.

User authentication and RBAC are entirely the App Node's responsibility. RBAC is enforced at the route level via the `permissions` 
field in `mdk-plugin.json`. Routes with `"auth": false` are public — no JWT is required. Routes with `"auth": true` but no `permissions` 
array are accessible to any authenticated user.
[A `permissions` array][plugins-permissions] restricts access further to users with matching roles.

## ORK connection

The App Node is the **active** side of this connection — it dials ORK. [ORK][ork-concept] is the passive listener; it does not
initiate contact with the App Node.

Two transports are available:

- **IPC** (default): App Node dials ORK over a Unix socket on the same host. Low-latency, implicit trust — no allowlisting required.
  The default for single-host deployments
- **HRPC**: App Node dials ORK over encrypted Hyperswarm streams. The App Node's DHT public key must be added to
  [ORK's `auth.whitelist`][ork-transports] before the connection is accepted. Used when ORK and the App Node run on separate hosts

> [!NOTE]
> Pre v1.0, the allowlist is opt-in. ORK's `auth.whitelist` defaults to empty, which admits any HRPC caller. When an allowlist
> is configured, the App Node's DHT public key must appear in it before ORK accepts the connection.

## Next steps

- [Run the App Node for the first time][run-how-to]
- [Add routes with the plugin system][plugins-how-to]
- Review the [full API and configuration reference][app-node-readme]
- Choose a [deployment shape][deployment-topologies]

## Links

[app-node-readme]: ../../../backend/core/app-node/README.md
<!-- docs@tether.io: app-node-readme → https://github.com/tetherto/mdk/blob/main/backend/core/app-node/README.md -->

[ork-readme]: ../../../backend/core/ork/README.md
<!-- docs@tether.io: ork-readme → https://github.com/tetherto/mdk/blob/main/backend/core/ork/README.md -->

[ork-transports]: ../../../backend/core/ork/README.md#transports
<!-- docs@tether.io: ork-transports → https://github.com/tetherto/mdk/blob/main/backend/core/ork/README.md#transports -->

[mdk-client]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[plugins-how-to]: ../../how-to/app-node/plugins.md
<!-- docs@tether.io: plugins-how-to → how-to/app-node/plugins -->

[plugins-readme]: ../../../backend/core/plugins/README.md
<!-- docs@tether.io: plugins-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md -->

[run-how-to]: ../../how-to/app-node/run.md
<!-- docs@tether.io: run-how-to → how-to/app-node/run -->

[deployment-topologies]: ../deployment-topologies.md
<!-- docs@tether.io: deployment-topologies → concepts/deployment-topologies -->

[ork-concept]: ork.md
<!-- docs@tether.io: ork-concept → concepts/stack/ork -->

[workers-concept]: ../architecture.md#workers
<!-- docs@tether.io: workers-concept → concepts/architecture#workers -->

[plugins-readme-defaults]: ../../../backend/core/plugins/README.md#default-plugins
<!-- docs@tether.io: plugins-readme-defaults → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#default-plugins -->

[plugins-permissions]: ../../how-to/app-node/plugins.md#auth-permissions-and-caching
<!-- docs@tether.io: plugins-permissions → how-to/app-node/plugins#auth-permissions-and-caching -->

[app-toolkit]: app-toolkit.md
<!-- docs@tether.io: app-toolkit → concepts/stack/app-toolkit -->
