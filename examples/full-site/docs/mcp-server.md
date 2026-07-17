# MDK MCP server

The full-site example ships an MCP server component that connects directly to the Kernel
via HRPC and exposes the site's device registry, telemetry, and command dispatch as MCP
tools. AI agents connect to it over HTTP; the service does not require the Gateway.

## Contents

- [Tools](#tools)
- [Prerequisites](#prerequisites)
- [Starting](#starting)
- [Claude Desktop](#claude-desktop)
- [Programmatic access](#programmatic-access)
- [Test with curl](#test-with-curl)
- [Example prompts](#example-prompts)
- [Reference](#reference)

## Tools

| Tool | Type | Description |
|---|---|---|
| `get_status` | read | All registered Workers — state, health, device count, RPC key |
| `get_capabilities` | read | Command schema for a device (what `send_command` accepts) |
| `pull_telemetry` | read | Latest telemetry metrics from a device |
| `pull_state` | read | Current state snapshot (live readings, config) from a device |
| `send_command` | **write** | Dispatch a command to a device via the Kernel |

### Tool parameters

**`get_capabilities`**
```
deviceId  string  required
```

**`pull_telemetry`**
```
deviceId  string  required
query     string  optional — telemetry query type, default "metrics"
```

**`pull_state`**
```
deviceId  string  required
```

**`send_command`**
```
deviceId  string  required
command   string  required
params    object  optional — command-specific parameters, default {}
```

## Tool usage flow

The inputs for the various tools can be obtained as follows

### 1. `get_status`

**Description:** Get current status of all Workers and device counts.

**Inputs:** None — takes no parameters.

**How inputs are obtained:** N/A. It calls `client.getStatus()` with no arguments.

### 2. `get_capabilities`

**Description:** Get the capabilities (command schema) for a device.

| Input      | Type     | How to obtain                                                                       |
| ---------- | -------- | ----------------------------------------------------------------------------------- |
| `deviceId` | `string` | From the device ID you want to query — typically discovered first via `get_status`. |

### 3. `pull_telemetry`

**Description:** Pull telemetry metrics for a device.

| Input      | Type                            | How to obtain                                                                                                                                         |
| ---------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deviceId` | `string`                        | From a prior `get_status` call listing available devices.                                                                                             |
| `query`    | `string` (default: `"metrics"`) | The telemetry query type — defaults to `"metrics"` if omitted. Other values depend on what the device supports (discoverable via `get_capabilities`). |

### 4. `pull_state`

**Description:** Pull current state snapshot for a device.

| Input      | Type     | How to obtain                   |
| ---------- | -------- | ------------------------------- |
| `deviceId` | `string` | From a prior `get_status` call. |

### 5. `send_command`

**Description:** Send a command to a device (e.g. `reboot`, `set_power_mode`).

| Input      | Type                                      | How to obtain                                                                                                            |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `deviceId` | `string`                                  | From a prior `get_status` call.                                                                                          |
| `command`  | `string`                                  | The command name — valid commands are discoverable via `get_capabilities` for the target device.                         |
| `params`   | `Record<string, unknown>` (default: `{}`) | Command-specific parameters — their shape is defined in the device's capabilities schema returned by `get_capabilities`. |

**Typical agent workflow:** call `get_status` first to enumerate devices, then `get_capabilities` on a device to learn what commands/telemetry it supports, then use `pull_telemetry`, `pull_state`, or `send_command` as needed.

## Prerequisites

The MCP server only needs **kernel** running. At least one Worker and the mocks should
be up so there are live devices to query.

```
$ cd examples/full-site
$ npm install
$ node cli.js
```

From the CLI prompt, bring up the minimum set:

```
mdk> start mocks
mdk> start kernel
mdk> start worker whatsminer
```

Or boot everything except mcp-server at once (use a small fleet for speed):

```
mdk> up --miners 5
mdk> start mcp-server
```

## Starting

With kernel running, start the MCP server:

```
mdk> start mcp-server
```

The ProcessManager waits for the `MDK_READY` token before returning. Once the prompt
reappears the server is accepting requests at `http://localhost:3008/mcp`.

**Check it is running:**

```
mdk> ps
mdk> logs mcp-server
```

**Stop it:**

```
mdk> stop mcp-server
```

### Port

Default port is `3008`. Override before launching the CLI:

```
MDK_MCP_PORT=4000 node cli.js
```

## Claude Desktop

Claude Desktop requires an HTTP proxy wrapper to reach a `Streamable HTTP` MCP server.
Add the following to its config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mdk-site": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-proxy"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3008/mcp"
      }
    }
  }
}
```

Restart Claude Desktop. The **mdk-site** tools will appear in the tool picker for any
new conversation.

> **Note:** Claude Desktop connects once on startup. If you restart the MCP server
> process, reload Claude Desktop (⌘R or restart the app) to reconnect.

## Programmatic access

Use the official MCP SDK to call tools from your own agent or script.

```
npm install @modelcontextprotocol/sdk
```

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:3008/mcp')
)

const client = new Client({ name: 'my-agent', version: '1.0.0' })
await client.connect(transport)

// List all Workers
const status = await client.callTool({ name: 'get_status', arguments: {} })
console.log(JSON.parse(status.content[0].text))

// Pull telemetry for a device
const telemetry = await client.callTool({
  name: 'pull_telemetry',
  arguments: { deviceId: 'wm001', query: 'metrics' }
})

// Inspect what commands a device supports
const caps = await client.callTool({
  name: 'get_capabilities',
  arguments: { deviceId: 'wm001' }
})

// Send a command
const result = await client.callTool({
  name: 'send_command',
  arguments: { deviceId: 'wm001', command: 'reboot', params: {} }
})

await client.close()
```

## Test with curl

The endpoint speaks JSON-RPC 2.0 over plain HTTP POST, so curl is enough to
smoke-test it without a full client.

**Initialize:**

```sh
curl -sX POST http://localhost:3008/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "curl", "version": "0.0.1" }
    }
  }'
```

**Call `get_status`:**

```sh
curl -sX POST http://localhost:3008/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": { "name": "get_status", "arguments": {} }
  }' | jq .
```

**Call `pull_telemetry`:**

```sh
curl -sX POST http://localhost:3008/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "pull_telemetry",
      "arguments": { "deviceId": "wm001" }
    }
  }' | jq .
```

**Call `send_command`:**

```sh
curl -sX POST http://localhost:3008/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "send_command",
      "arguments": { "deviceId": "wm001", "command": "reboot", "params": {} }
    }
  }' | jq .
```

## Example prompts

When connected through Claude Desktop or another MCP client, try these prompts to
exercise the tools:

- *"How many miners are currently online? Break it down by Worker."*
- *"Pull the latest telemetry for wm001 and flag anything abnormal."*
- *"What commands does the Whatsminer Worker support?"*
- *"Reboot wm003 and confirm the result."*
- *"Check the health state of every registered Worker. Flag anything that is not READY."*
- *"Get the current state of av001 and summarize its power consumption."*

> **Tip:** Ask the agent to call `get_capabilities` first on an unfamiliar device. It
> returns the full command schema, so the agent knows exactly what `send_command`
> accepts for that device type before sending anything.

## Reference

| Item | Value |
|---|---|
| Endpoint | `POST http://localhost:3008/mcp` |
| Port env var | `MDK_MCP_PORT` |
| Start command | `start mcp-server` (in CLI) |
| Process log | `logs mcp-server` (in CLI) |
| Kernel dependency | Required — reads `.kernel-key` on start |
| Transport | Streamable HTTP, stateless per request |
| MCP protocol version | `2024-11-05` |
| SDK package | `@modelcontextprotocol/sdk` |

## Next steps

- Run the [full-site example][full-site]: the complete stack this MCP server is part of
- [Build a minimal dashboard][minimal-dashboard]: single-Worker + Gateway pattern the MCP server extends
- [AI agents and the MCP server][ai-agents-concept]: Gateway MCP for production deployments with auth/RBAC
- [Gateway plugins][gateway-plugins]: add custom HTTP routes alongside the MCP endpoint

## Links

[full-site]: ../README.md
[minimal-dashboard]: ../../../docs/tutorials/quickstart/build-a-dashboard.md
[ai-agents-concept]: ../../../docs/concepts/architecture.md#ai-agents-and-the-mcp-server
[gateway-plugins]: ../../../docs/guides/gateway/plugins.md
