---
title: Expose data to the agent
description: Turn an app's HTTP routes into MCP tools the operator agent can call, with no separate MCP manifest.
docs@tether_slug: guides/agent/expose-data
---

## Overview

The operator agent calls fleet data and actions as MCP tools. An app's routes become those tools with no separate
MCP manifest to author and keep in sync: the standalone MCP server reads the app's own `mdk-plugin.json` route table — the
same file the Gateway reads — and converts each route into a tool.

The MCP server is its own process. The Gateway hosts no MCP code and needs no MCP configuration. Neither runs app code:
both read the app's route table and forward each call to the app's runtime, so the app runs once, in its own process.

This page shows the `mdk.yaml` shape that wires this up, the same way [declaring an app][apps] does. It's an addition
to your own site config, not a fixture to boot as written: the Kernel, Gateway, and apps are whatever your site
already has. Nothing MCP-related goes in your `startGateway()` call — the standalone `mdk run mcp` process reads the same
`spec.apps` list the Gateway serves.

## Prerequisites

- An [app][apps] declared in `spec.apps`
- The stack is running — `mdk run` starts the Kernel and the app runtimes the MCP server forwards to. [Kernel's caller allowlist][mcp-allowlist] governs whether the MCP server's connection to the Kernel is admitted

<Steps>

<Step>

### Serve an app's routes as tools

Nothing is added to the app. Declare it in `mdk.yaml` as usual and start the MCP server:

```yaml
spec:
  gateway:
    port: 3000
  apps:
    - name: custom-metrics
      package: ./apps/custom-metrics
  mcp:
    port: 3100   # optional — defaults to gateway.port + 100
```

```bash
mdk run          # first, in its own terminal
mdk run mcp      # then, in another
```

`mdk run mcp` reads the same `spec.apps` list the Gateway serves, so an app's routes are reachable over HTTP and
over MCP without being declared twice. Each route becomes a tool named after its `id` (dots and other non-alphanumeric
characters become underscores), with the description, safety hint, and input schema derived from the route's `http` block.
Path, query, and header parameters and the `requestBody`'s top-level properties become the tool's input fields. A tool call
reaches the same controller, in the same app runtime, as an HTTP request to the route, with the agent that called it as the
caller. Until `mdk run` has started the app, its tools return `ERR_APP_RUNTIME_UNAVAILABLE`.

Only routes marked `"safety": "read-only"` become tools by default. Every other route is withheld as a write unless the
server is started with `--allow-write` (or `spec.mcp.allowWrite`), or the tool is named in `spec.mcp.allowTools`.

> [!IMPORTANT]
> Serving a tool is not the same as the operator agent calling it. `@tetherto/mdk-agent` runs with `strictToolGating` on by
> default and admits only tools that carry an agent contract (`_meta["x-mdk-agent"]` with `enabled: true`). Tools generated
> from app routes carry none, so the agent skips them as `not agent-enabled`. Other MCP clients still see them. To let the
> operator agent call them, set `strictToolGating: false` with `capability: mid` or higher under `agent` in the Gateway
> app's config, or in the config you pass to `createAgent()`. The standalone `mdk-agent` CLI always runs with strict gating.

`mcp` is never part of the default `all` target; it is always started explicitly.

</Step>

<Step>

### Write tools by hand instead

An app that needs a different tool granularity, richer descriptions, or direct `mdkClient` calls can author an
`mcp-plugin.json` by hand. A [standalone MCP server][mcp-server] serves both kinds at once — hand-authored tool plugins
alongside app-derived ones — so a curated tool set and auto-derived routes can live on one endpoint. Tool ids must
be unique across both sources; a collision is a startup error, not a silent override.

Serving hand-authored tools this way means embedding the standalone server through `createMcpServer()`, as the
[`@tetherto/mdk-mcp` README][mcp-server] shows. `mdk run mcp` reads no `spec.mcp.plugins` list yet, so from `mdk.yaml` alone it
serves only the app-derived tools above.

</Step>

</Steps>

## Next steps

- [Build the app whose routes you want to expose][apps]
- [Enable the operator agent][gateway-deployment] to call the tools this produces
- [Connect an AI agent of your own][connect-over-mcp] with its own service account and token
- [Understand the agent as a stack component][agent-concept]

## Links

[apps]: ../gateway/apps.md
<!-- docs@tether.io: apps → guides/gateway/apps -->

[gateway-deployment]: gateway-deployment.md
<!-- docs@tether.io: gateway-deployment → guides/agent/gateway-deployment -->

[connect-over-mcp]: connect-over-mcp.md
<!-- docs@tether.io: connect-over-mcp → guides/agent/connect-over-mcp -->

[agent-concept]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-concept → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[mcp-server]: ../../../backend/core/mcp/README.md
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/backend/core/mcp/README.md -->

[mcp-allowlist]: ../security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->
