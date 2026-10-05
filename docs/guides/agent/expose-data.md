---
title: Expose data to the agent
description: Turn a Gateway plugin's HTTP routes into MCP tools the operator agent can call, with no separate MCP manifest.
docs@tether_slug: guides/agent/expose-data
---

## Overview

The operator agent calls fleet data and actions as MCP tools. A Gateway plugin's routes become those tools with no separate
MCP manifest to author and keep in sync: the standalone MCP server reads the plugin's own `mdk-plugin.json` contract — the
same file the Gateway loads — and converts each route into a tool.

The MCP server is its own process. The Gateway hosts no MCP code and needs no MCP configuration; the two share nothing but
the plugin directories they each read.

This page shows the `mdk.yaml` shape that wires this up, the same way [mounting a plugin][gateway-plugins] does. It's an addition
to your own site config, not a fixture to boot as written: the Kernel, Gateway, and plugin directory are whatever your app
already has. Nothing MCP-related goes in your `startGateway()` call — the standalone `mdk run mcp` process reads the same
`spec.gateway.plugins` list the Gateway loads.

## Prerequisites

- A [Gateway plugin][gateway-plugins] declared in `spec.gateway.plugins`
- The Kernel is running — a standalone MCP server dials it by key, so `mdk run kernel` comes first. [Kernel's caller allowlist][mcp-allowlist] governs whether that MCP connection is admitted

<Steps>

<Step>

### Serve a plugin's routes as tools

Nothing is added to the plugin. Declare it in `mdk.yaml` as usual and start the MCP server:

```yaml
spec:
  gateway:
    port: 3000
    plugins:
      - package: ./plugins/custom-metrics
  mcp:
    port: 3100   # optional — defaults to gateway.port + 100
```

```bash
mdk run kernel   # first, in its own terminal
mdk run mcp      # then, in another
```

`mdk run mcp` reads the same `spec.gateway.plugins` list the Gateway loads, so a plugin's routes are reachable over HTTP and
over MCP without being declared twice. Each route becomes a tool named after its `id` (dots and other non-alphanumeric
characters become underscores), with the description, safety hint, and input schema derived from the route's `http` block.
Path, query, and header parameters and the `requestBody`'s top-level properties become the tool's input fields, and the same
route handler serves both interfaces — each plugin builds its own `mdkClient` from the ambient config, so it behaves
identically whichever process loaded it.

`mcp` is never part of the default `all` target; it is always started explicitly.

</Step>

<Step>

### Write tools by hand instead

A plugin that needs a different tool granularity, richer descriptions, or direct `mdkClient` calls can author an
`mcp-plugin.json` by hand. A [standalone MCP server][mcp-server] serves both kinds at once — hand-authored tool plugins
alongside Gateway-plugin-derived ones — so a curated tool set and auto-derived routes can live on one endpoint. Tool ids must
be unique across both sources; a collision is a startup error, not a silent override.

Serving hand-authored tools this way means embedding the standalone server through `createMcpServer()`, as the
[`@tetherto/mdk-mcp` README][mcp-server] shows. `mdk run mcp` reads no `spec.mcp.plugins` list yet, so from `mdk.yaml` alone it
serves only the Gateway-plugin-derived tools above.

</Step>

</Steps>

## Next steps

- [Build the plugin whose routes you want to expose][gateway-plugins]
- [Enable the operator agent][gateway-deployment] to call the tools this produces
- [Understand the agent as a stack component][agent-concept]

## Links

[gateway-plugins]: ../gateway/plugins.md
<!-- docs@tether.io: gateway-plugins → guides/gateway/plugins -->

[gateway-deployment]: gateway-deployment.md
<!-- docs@tether.io: gateway-deployment → guides/agent/gateway-deployment -->

[agent-concept]: ../../../backend/core/agent/README.md
<!-- docs@tether.io: agent-concept → https://github.com/tetherto/mdk/blob/main/backend/core/agent/README.md -->

[mcp-server]: ../../../examples/full-site/docs/mcp-server.md

[mcp-allowlist]: ../security/index.md#step-2-admit-the-gateway-to-kernel
<!-- docs@tether.io: mcp-allowlist → guides/security#step-2-admit-the-gateway-to-kernel -->
<!-- docs@tether.io: mcp-server → https://github.com/tetherto/mdk/blob/main/examples/full-site/docs/mcp-server.md -->
