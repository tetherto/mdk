---
title: Gateway plugins
description: Use the default Gateway plugins, mount third-party plugins, and build your own using the mdk-plugin.json format
docs@tether_slug: guides/gateway/plugins
---

## Overview

The Gateway exposes HTTP routes through a declarative plugin system. Each plugin is a directory containing an
[`mdk-plugin.json`][plugins-manifest] manifest and one or more controller files. MDK ships a set of default plugins that load automatically; 
you can mount additional plugins for your own site logic.

> [!NOTE]
> Plugins call into the Kernel through `services.mdkClient`, an instance of [`@tetherto/mdk-client`][mdk-client-readme]. No knowledge of the MDK Protocol envelope or internal message shapes is required.

## Default plugins

MDK ships plugins that load automatically on Gateway startup:

- The `auth` plugin serves identity and token endpoints under `/auth`
- The `telemetry` plugin serves site metrics (hashrate, consumption, efficiency, temperature, and more) under `/auth/metrics`
- The `site-hashrate` plugin serves aggregated site hashrate history

The [plugin reference][plugins-readme] lists every default route, its method, and whether it needs a token — those tables are generated 
from each plugin's `mdk-plugin.json`. Plugins you mount yourself are documented by their own manifests.

<Steps>

<Step>

### Mount a plugin

Pass an `extraPluginDirs` array to `startGateway()` to load additional plugins at boot alongside the default plugins:

```js
const { startGateway } = require('@tetherto/mdk')

await startGateway({
  kernel,
  port: 3000,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/custom-metrics'),
    path.join(__dirname, 'plugins/alerts')
  ]
})
```

Each entry must be an absolute path to a directory containing an [`mdk-plugin.json`][plugins-manifest]. The plugin loader validates the
manifest and all handler files at startup — missing files or invalid manifests throw immediately before the server comes up.

</Step>

<Step>

### Build a plugin

A plugin is a directory with two things: a manifest and controllers.

#### 1.1 Create the manifest

[`mdk-plugin.json`][plugins-manifest] declares the plugin identity (`name`, `version`) and a `routes` array. Each route needs an `id`, a `handler` path, and an `http` 
block with a `method` and `path`. Rather than copy a synthetic example, start from a real manifest and trim it:

- [`examples/full-site/plugins/site/mdk-plugin.json`][full-site-manifest] — three routes including a `GET`, a `POST` with a `requestBody`, and 
path parameters
- [`backend/core/plugins/telemetry/mdk-plugin.json`][telemetry-manifest] — auth, caching, query parameters, and named-export handlers

Path parameters use `{param}` syntax — the loader normalises them to Fastify's `:param` format. For named exports use `"handler": 
"./controllers/foo.js#namedExport"`. The [plugin reference][plugins-readme] explains what each field means and what the loader requires.

#### 1.2 Write a controller

Every controller exports an `async function (req, services)`:

```js
// controllers/live.js — read live telemetry
module.exports = async function live (req, services) {
  const deviceId = req.query.deviceId
  const telemetry = await services.mdkClient.pullTelemetry(deviceId, 'metrics')
  return { deviceId, ...telemetry }
}
```

```js
// controllers/command.js — dispatch a command
module.exports = async function command (req, services) {
  const deviceId = req.params.deviceId
  const { mode } = req.body

  const result = await services.mdkClient.sendCommand(deviceId, 'setPowerMode', { mode })

  return {
    deviceId,
    commandId: result.commandId,
    status: result.status
  }
}
```

</Step>

</Steps>

### The `req` object

| Field | Type | Contains |
| --- | --- | --- |
| `req.params` | `object` | Path parameters (e.g. `{ deviceId: 'wm-001' }`) |
| `req.query` | `object` | Query string parameters |
| `req.body` | `object` | Parsed JSON request body |
| `req.headers` | `object` | HTTP headers |
| `req._info` | `object` | Internal request metadata (rarely needed) |

### The `services` object

| Field | Type | Use for |
| --- | --- | --- |
| `services.mdkClient` | `MdkClient` | Live reads and command dispatch — `sendCommand`, `pullTelemetry`, `getCapabilities`, `listWorkers` |
| `services.dataProxy` | `DataProxy` | Historical and aggregated data from Worker tail-logs — `requestData`, `requestDataMap` |
| `services.authLib` | `AuthLib` | JWT and session helpers (needed only for advanced auth flows) |
| `services.conf` | `object` | Gateway runtime config |

> [!IMPORTANT]
> Always guard `services.mdkClient` — it is `null` when the Gateway starts without a live Kernel connection:
> ```js
> if (!services.mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')
> ```
>
> Always guard `services.authLib` — it is `undefined` when the Gateway starts with `noAuth: true`. Any call to
> `authLib.tokenHasPerms()` or `authLib.getTokenPerms()` throws `Cannot read properties of undefined` in `noAuth` mode:
> ```js
> if (!services.authLib) throw new Error('ERR_AUTH_LIB_UNAVAILABLE')
> ```

### Read hardware data

For live device data use `mdkClient`:

```js
// Pull a live metrics snapshot
const tel = await services.mdkClient.pullTelemetry(deviceId, 'metrics')

// Pull the declared capabilities (from the Worker's mdk-contract.json)
const { capabilities } = await services.mdkClient.getCapabilities(deviceId)

// List all registered Workers
const { workers } = await services.mdkClient.listWorkers()
```

For historical or aggregated series from a Worker's persisted tail-log use `dataProxy`:

```js
const results = await services.dataProxy.requestData('tailLogRangeAggr', {
  type: 'miner',
  startDate: start,
  endDate: end,
  fields: { hashrate_sum: 1 }
})
```

The [default telemetry controllers][telemetry-controllers] show worked examples of both patterns.

### Send a command

`sendCommand` dispatches via the Kernel to the Worker that owns the device. The command must be declared in 
the Worker's `mdk-contract.json`. It returns:

| Field | Type | Description |
| --- | --- | --- |
| `commandId` | `string` | Correlation ID generated by Kernel. Echo this to the HTTP caller so they can track the operation. |
| `status` | `string` | `'SUCCESS'` or `'FAILED'` |
| `result` | `object` | Command-specific response payload (present when status is `'SUCCESS'`) |
| `error` | `string` | Error message (present when status is `'FAILED'`) |

```js
const result = await services.mdkClient.sendCommand(deviceId, 'reboot', {})
if (result.status === 'FAILED') throw new Error(result.error)
return { commandId: result.commandId, status: result.status }
```

### Auth, permissions, and caching

**Auth** — set `"auth": true` on a route to require a valid Bearer token. The adapter runs `authCheck` before the handler is called.

**Permissions** — add a `"permissions"` array to enforce RBAC:

```json
{
  "id": "site.miners.command",
  "auth": true,
  "permissions": ["actions:w"],
  "handler": "./controllers/command.js",
  "http": { "method": "POST", "path": "/site/miners/{deviceId}/command" }
}
```

**Caching** — add a `"cache"` array of dot-path strings to enable request-level caching. The cache key is composed 
from the route ID and the resolved values of each path:

```json
{
  "id": "telemetry.hashrate",
  "cache": ["query.start", "query.end", "query.groupBy"],
  ...
}
```

Pass `?overwriteCache=true` to any cached route to bypass and refresh.

### Manifest validation errors

The plugin loader validates every manifest and handler at startup and throws if anything is wrong:

| Error | Cause |
| --- | --- |
| `ERR_PLUGIN_MANIFEST_MISSING` | No `mdk-plugin.json` found in the plugin directory |
| `ERR_PLUGIN_MANIFEST_INVALID` | JSON parse error, or missing required field (`name`, `version`, or `routes`) |
| `ERR_PLUGIN_ROUTE_DUPLICATE_ID` | Two routes in the same manifest share the same `id` |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | The `handler` file path does not exist or failed to load |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | The handler file exports something other than a function |

## Troubleshooting

<details>
<summary>Migrate from v0.2 to v0.3</summary>
<div>

In v0.3, `metricsRoutes` and `devicesRoutes` were removed from `backend/core/gateway/workers/lib/server/index.js`. The auth and telemetry endpoints they registered are now delivered by the default plugins, which load automatically — no action needed for those.

If your v0.2 code patched or monkey-patched those registrations to inject custom logic:

1. Create a plugin directory with an [`mdk-plugin.json`][plugins-manifest] and controller files for the routes you were injecting.
2. Pass the directory to `startGateway()` via `extraPluginDirs`.

```js
// Before (v0.2 — no longer works)
const server = require('@tetherto/mdk-gateway/workers/lib/server')
server.metricsRoutes.push(myCustomRoute)

// After (v0.3+)
await startGateway({
  kernel,
  extraPluginDirs: [path.join(__dirname, 'plugins/my-metrics')]
})
```

</div>
</details>

## Next steps

- Try the [live site backend example][all-workers-guide] for a complete worked plugin with three routes: a live site overview,
  a historical series, and a command endpoint running under PM2 or Docker
- Build the [minimal dashboard tutorial][minimal-dashboard] — end-to-end worked example of the single-plugin + controller pattern
- Understand [how Workers declare their data][build-a-worker] via `mdk-contract.json` — what `mdkClient` reads and `sendCommand` dispatches
- See the full [manifest and services reference][plugins-readme]
- Review the [Gateway API and config][gateway-readme]

## Links

[telemetry-controllers]: ../../../backend/core/plugins/telemetry/controllers
<!-- docs@tether.io: telemetry-controllers → https://github.com/tetherto/mdk/tree/main/backend/core/plugins/telemetry/controllers -->

[all-workers-guide]: ../deployment/run-all-workers-site.md
<!-- docs@tether.io: all-workers-guide → guides/deployment/run-all-workers-site -->

[full-site-plugin]: ../../../examples/full-site/plugins/site
<!-- docs@tether.io: full-site-plugin → https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site -->

[full-site-manifest]: ../../../examples/full-site/plugins/site/mdk-plugin.json
<!-- docs@tether.io: full-site-manifest → https://github.com/tetherto/mdk/blob/main/examples/full-site/plugins/site/mdk-plugin.json -->

[telemetry-manifest]: ../../../backend/core/plugins/telemetry/mdk-plugin.json
<!-- docs@tether.io: telemetry-manifest → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/telemetry/mdk-plugin.json -->

[plugins-readme]: ../../../backend/core/plugins/README.md
<!-- docs@tether.io: plugins-readme → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md -->

[plugins-manifest]: ../../../backend/core/plugins/README.md#manifest-format
<!-- docs@tether.io: plugins-manifest → https://github.com/tetherto/mdk/blob/main/backend/core/plugins/README.md#manifest-format -->

[mdk-client-readme]: ../../../backend/core/client/README.md
<!-- docs@tether.io: mdk-client-readme → https://github.com/tetherto/mdk/blob/main/backend/core/client/README.md -->

[gateway-readme]: ../../../backend/core/gateway/README.md
<!-- docs@tether.io: gateway-readme → https://github.com/tetherto/mdk/blob/main/backend/core/gateway/README.md -->

[minimal-dashboard]: ../../tutorials/quickstart/build-a-dashboard.md
[build-a-worker]: ../workers/build-a-worker.md
[mcp-server]: ../../../examples/full-site/docs/mcp-server.md
