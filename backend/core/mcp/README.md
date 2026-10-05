# @tetherto/mdk-mcp

## Overview

MCP (Model Context Protocol) server for MDK. Exposes MDK data and actions to AI agents as declarative tools over a
`StreamableHTTPServerTransport`. `createMcpServer` below runs it as a standalone server — a separate process from the
[Gateway](../gateway/README.md), not a Gateway plugin — that talks to Kernel the same way the Gateway does, over
[`@tetherto/mdk-client`](../client/README.md). The Gateway itself has no MCP capability of its own: it knows nothing about
MCP, and this package is the only place a Gateway plugin's routes get turned into tools (see `gatewayPluginDirs` below).

## AI agents and the MCP server

An AI agent reaches fleet data through this server, not through the [Gateway](../gateway/README.md)'s HTTP surface — a
standalone process started by `createMcpServer` below. MDK's own operator agent, [`@tetherto/mdk-agent`](../agent/README.md),
is one such client and uses the same path any third-party agent would. (Separately,
[`@tetherto/mdk-plugin-agent`](../../plugins/agent/README.md) mounts a chat API on the Gateway so a human operator can talk
to that agent — a different surface from the MCP endpoint described here.)

Agents sit in the same security envelope as every other consumer of this server: whatever checks front it apply equally to a
human caller and an agent, and an unprotected endpoint is open to both. Establishing that envelope is your work, since
neither Kernel nor this server performs user-level authentication on its own.

> [!WARNING]
> The MCP server's only built-in protection is its bind address: it listens on `127.0.0.1` and answers `POST /mcp`. Anything
> that can reach that port can drive the fleet, so an agent's tool calls carry whatever authority the loopback interface
> grants. Exposing the port beyond localhost means putting your own authentication in front of it.

This server gets its tools from two independent sources, merged into one tool set:

1. **Static, author-written tools** — an `mcp-plugin.json` manifest per directory
   ([`lib/plugin-loader.js`](./lib/plugin-loader.js), `pluginDirs` below). You write the manifest and handler files by hand.
2. **A Gateway plugin's own contract** — its `mdk-plugin.json` manifest and HTTP routes, read directly off disk and converted
   into MCP tools ([`lib/from-gateway-plugin.js`](./lib/from-gateway-plugin.js), `gatewayPluginDirs` below). This is how a
   Gateway plugin's routes become agent-callable tools without the Gateway itself knowing anything about MCP.

The intended further extension is **runtime tool derivation** from each registered Worker's `mdk-contract.json` — so a new
device type would give an agent new tools with no MCP server code change. That path is not wired up today: neither of the
two sources above reads a Worker's contract.

## `createMcpServer(root, port, config, pluginDirs, gatewayPluginDirs)`

```js
const { createMcpServer } = require('@tetherto/mdk-mcp')

await createMcpServer(root, port, { kernelKey, kernelBootstrap }, pluginDirs, gatewayPluginDirs)
```

| Param    | Status   | Type     | Description                                                                        |
| -------- | -------- | -------- | ---------------------------------------------------------------------------------- |
| `root`   | Required | `string` | Working directory for this server instance. Throws `ERR_INVALID_MCP_ROOT` if falsy |
| `port`   | Required | `number` | Port to listen on (`127.0.0.1` only). Throws `ERR_INVALID_MCP_PORT` if falsy       |
| `config` | Optional | `object` | `{ kernelKey, kernelBootstrap }` (or any other config a tool needs). Frozen and handed to every plugin directory as the `config` in its context — the server builds no client of its own; each tool plugin builds its own [`@tetherto/mdk-client`](../client/README.md) from it |
| `pluginDirs` | Optional | `string[]` | Directories to load [native `mcp-plugin.json` tools](#plugin-format) from. Empty/omitted starts a server with no tools from this source |
| `gatewayPluginDirs` | Optional | `(string \| { dir: string, config: object })[]` | Gateway plugin directories (an `mdk-plugin.json` + routes) whose routes are converted into MCP tools via [`lib/from-gateway-plugin.js`](./lib/from-gateway-plugin.js). Each entry is either a plain directory path, or `{ dir, config }` to override/extend the shared `config` for that one plugin — mirroring the shape the Gateway itself accepts for `extraPluginDirs`. The ambient context handed to each plugin (`require('@tetherto/mdk-gateway/plugin')`) mirrors the Gateway's own `buildPluginContext` precedence, so a plugin's route handler behaves the same whether it's mounted in the real Gateway or read here. Optional: omit it (or pass `[]`/`undefined`) to load no Gateway-plugin-derived tools |

Tool ids must be unique across the **combined** set from both sources; a collision throws
`` ERR_PLUGIN_TOOL_DUPLICATE_ID: <source> and <source>: duplicate tool id "<id>" ``, naming both plugin directories that
declared it.

The server answers `POST /mcp` only; everything else gets a `404`. It builds a fresh `McpServer` per request (stateless
transport, no session id). `SIGINT`/`SIGTERM` are handled for you: they stop the HTTP server — there is no client of the
server's own to close.

This is also what powers the CLI's `mdk run mcp` command: it boots this server and points `gatewayPluginDirs` at the Gateway
plugins declared in the stack's `mdk.yaml`.

## Plugin format

A plugin is a directory with an `mcp-plugin.json` manifest and one or more handler files — the same discovery pattern as
[a Gateway plugin](../plugins/README.md), but with `tools` instead of `routes`.

```json
{
  "name": "@your-scope/your-plugin",
  "version": "1.0.0",
  "tools": [
    { "id": "get_status", "handler": "./tools/get-status.js", "description": "Reports fleet status" }
  ]
}
```

Each handler file exports a `handler` function and an optional `schema` (a Zod shape — validated by the MCP SDK before your
handler runs). The handler takes only its tool args: build a client once from the
plugin's context (`require('@tetherto/mdk-mcp/plugin')` resolves to that plugin's frozen `{ config, logger }`) and
`require` it from every handler in the plugin, [the same pattern a Gateway plugin uses](../gateway/README.md#extend-the-gateway):

```js
const { z } = require('zod')
const mdkClient = require('../lib/client')

module.exports = {
  schema: { deviceId: z.string() },
  handler: async ({ deviceId }) => {
    const telemetry = await mdkClient.pullTelemetry(deviceId, 'metrics')
    return { content: [{ type: 'text', text: JSON.stringify(telemetry) }] }
  }
}
```

[`lib/client.js`](../../../examples/mvp-site/backend/mcp-plugins/site/lib/client.js) and
[`tools/get-device.js`](../../../examples/mvp-site/backend/mcp-plugins/site/tools/get-device.js) ship the production version
of this pattern.

[`loadPlugin()`](./lib/plugin-loader.js) validates the manifest and every handler at load time, throwing on the first
problem; the [error codes](#errors) name each.

## Errors

| Code                   | Fires when                                                           | Fix                         |
|------------------------|----------------------------------------------------------------------|-----------------------------|
| `ERR_INVALID_MCP_ROOT` | `createMcpServer` is called with no working directory (`root` falsy) | Pass a valid path as `root` |
| `ERR_INVALID_MCP_PORT` | `createMcpServer` is called with no port (`port` falsy)              | Pass a valid port as `port` |
| `ERR_PLUGIN_MANIFEST_MISSING` | [`loadPlugin()`](./lib/plugin-loader.js) can't resolve a plugin directory's `mcp-plugin.json` — it doesn't exist | Add the manifest, or drop the directory from `pluginDirs` |
| `ERR_PLUGIN_MANIFEST_INVALID` | The manifest isn't a JSON object, is missing `name`/`version`, `tools` isn't a non-empty array, or a tool is missing `id`/`handler`/`description` | Fix the field the error message names |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | A tool's `handler` file, named in the manifest, can't be resolved by [`loadPlugin()`](./lib/plugin-loader.js) | Fix the `handler` path for that tool |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | A tool's resolved handler module (or named export) has no `handler` property that's a function | Export a `handler` function from the file |
| `ERR_PLUGIN_TOOL_DUPLICATE_ID` | Two tools share an `id`; [`loadPlugin()`](./lib/plugin-loader.js) only checks within one plugin's own `tools` array, not across separate `pluginDirs`; `createMcpServer()` catches the cross-source case and names both plugin directories | Rename one of the duplicate tool ids |
| `ERR_NO_PLUGIN_CONTEXT` | [`@tetherto/mdk-mcp/plugin`](./plugin.js) was required outside a loaded plugin, e.g. a tool module required directly in a test | Load the plugin through `createMcpServer()` or `loadPlugin(dir, context)` instead |

## Real usage

[`examples/mvp-site/deploy/run-process.js`](../../../examples/mvp-site/deploy/run-process.js) runs this as its own PM2-supervised process
(`--role mcp`): it resolves the Kernel key using the same `.kernel-key` discovery the Gateway uses, then calls
`createMcpServer(root, port, { kernelKey }, MCP_PLUGIN_DIRS, PLUGIN_DIRS)` — the hand-authored MCP tool dirs plus the Gateway plugin dirs whose routes are derived into tools.

## Testing

`npm test` runs `standard` lint, unit tests ([`tests/unit/`](./tests/unit/)), and integration tests ([`tests/integration/`](./tests/integration/)) — the latter cover
schema enforcement, multi-plugin-dir merging, thrown-handler-error propagation, and the shutdown handlers.
