---
todo: "see docs/reference/maintainers/ia.md — check:plugin-reference-fresh and check:plugin-manifest"
---

# @tetherto/mdk-plugins

Default [App Node](../app-node/README.md) plugins and the declarative plugin format for extending the MDK App Node with 
custom HTTP routes.

## Overview

A plugin is a directory containing:

- `mdk-plugin.json`: manifest declaring route identity, HTTP surface, auth requirements, and caching
- One or more controller files — each exports `async function (req, services)`

The App Node loads its default plugins automatically and accepts additional plugin directories via 
`startAppNode({ extraPluginDirs: [...] })`.

> [!TIP]
> New to the plugin system? Read the [App Node plugins how-to guide](../../../docs/how-to/app-node/plugins.md) for a step-by-step walkthrough.
> For the broader toolkit context, see the [MDK App Toolkit concept page](../../../docs/concepts/stack/app-toolkit.md).

## Manifest format

Read a real manifest rather than a field table — every supported field is exercised across the shipping manifests, and they are validated at startup 
so they cannot drift:

- [telemetry manifest](telemetry/mdk-plugin.json): `auth`, `cache`, query `parameters`, `responses`, `constraints`, `errors`, and
named-export handlers (`./controllers/power-mode.js#timeline`)
- [site-plugin manifest](../../../examples/full-site/plugins/site/mdk-plugin.json): a public route
(`auth: false`), a `POST` with a `requestBody`, path `parameters`, and `safety`

What is required and what is rejected is defined by `_validateManifest` in [`plugin-loader.js`](../app-node/workers/lib/plugin-loader.js): `name`, 
`version`, and a non-empty `routes` array, plus per route an `id`, a `handler`, an allowed `http.method` (`GET`/`POST`/`PUT`/`DELETE`/`PATCH`), an 
`http.path`, and unique route ids. Path parameters in `{param}` form are normalized to Fastify's `:param`.

`auth`, `permissions`, and `cache` are consumed at registration in [`plugin-adapter.js`](../app-node/workers/lib/plugin-adapter.js): `auth: true` 
requires a Bearer token, `permissions` is an RBAC array enforced by `capCheck` after auth, and `cache` is an array of dot-paths composed into the 
cache key (pass `?overwriteCache=true` to bypass).

`description`, `constraints`, `errors`, and `safety` are annotations — no code reads them. They record intent for humans and agents; the manifests 
above show how they are used.

## Controllers

A controller exports `async function (req, services)` and returns a value that is serialized as a `200` JSON response. Use `"handler": 
"./file.js#namedExport"` for a non-default export. Any shipping controller shows the shape — for example,
[`hashrate.js`](telemetry/controllers/hashrate.js).

- `req` (`params`, `query`, `body`, `headers`, `_info`) is assembled in [`plugin-adapter.js`](../app-node/workers/lib/plugin-adapter.js)
- `services` (`mdkClient`, `dataProxy`, `authLib`, `conf`) is defined by the `_pluginServices` getter in [`http.node.wrk.js`](../app-node/workers/http.node.wrk.js) — guard `services.mdkClient`, which is `null` when ORK is not connected

The [plugin authoring guide](../../../docs/how-to/app-node/plugins.md) walks through building a controller, including when to use `mdkClient` versus `dataProxy`.

## Default plugins

These plugins ship with MDK and load automatically on App Node startup. The tables below are generated from each default plugin's `mdk-plugin.json` by 
[`docs/scripts/generate-plugin-reference.js`](../../../docs/scripts/generate-plugin-reference.js) and document only these default plugins — routes
you add through `extraPluginDirs` are owned by their own manifests and are not listed here. In the `Auth` column, `Required` means the route needs a
valid Bearer token.

<!-- BEGIN GENERATED: default-plugins. DO NOT EDIT. Regenerate with `npm run generate:plugin-reference`. Source: backend/core/plugins/*/mdk-plugin.json -->

### `auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/auth/userinfo` | Required | Returns the authenticated user's profile from the validated JWT. |
| `POST` | `/auth/token` | Required | Issues a new JWT from an existing valid token, optionally scoping TTL and roles. |
| `GET` | `/auth/permissions` | Required | Returns the permission set encoded in the current token. |
| `GET` | `/auth/ext-data` | Required | Proxies an external data request to the ORK network by type and optional query filter. |

### `site-hashrate`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/site/hashrate-history` | Required | Fans out telemetry.pull to every registered worker and returns site-level hashrate history aggregated by timestamp. Defaults to last 7 days when start/end are omitted. |

### `telemetry`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/auth/metrics/hashrate` | Required | Returns daily hashrate history and summary for the site. Optionally groups by miner type or container. |
| `GET` | `/auth/metrics/consumption` | Required | Returns daily power consumption (W and MWh) history and summary for the site. |
| `GET` | `/auth/metrics/efficiency` | Required | Returns daily mining efficiency (W/TH) history and summary for the site. |
| `GET` | `/auth/metrics/miner-status` | Required | Returns daily online/offline/sleep/maintenance miner counts and averages. |
| `GET` | `/auth/metrics/power-mode` | Required | Returns miner count by power mode category (low/normal/high/sleep/offline) over time. |
| `GET` | `/auth/metrics/power-mode/timeline` | Required | Returns per-miner power mode segments over a time range, optionally filtered by container. |
| `GET` | `/auth/metrics/temperature` | Required | Returns max and average temperature per container over time, with site-level aggregates. |
| `GET` | `/auth/metrics/containers/{id}` | Required | Returns latest telemetry snapshot and miner list for a specific container. |
| `GET` | `/auth/metrics/containers/{id}/history` | Required | Returns historical telemetry log for a specific container. |

<!-- END GENERATED: default-plugins -->

## Mounting plugins

```js
const { startAppNode } = require('@tetherto/mdk')

await startAppNode({
  ork,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

The loader validates every manifest and handler at startup and throws an `ERR_PLUGIN_*` error on the first problem — a missing or unparsable manifest, 
a missing required field, a duplicate route `id`, a handler file that can't be found, or a handler that isn't a function. The codes and the 
checks behind them live in [`plugin-loader.js`](../app-node/workers/lib/plugin-loader.js).

## Directory layout

```
plugins/
├── auth/
│   ├── mdk-plugin.json
│   └── controllers/
│       ├── userinfo.js
│       ├── token.js
│       ├── permissions.js
│       └── ext-data.js
├── telemetry/
│   ├── mdk-plugin.json
│   └── controllers/
│       ├── hashrate.js
│       ├── consumption.js
│       ├── efficiency.js
│       ├── miner-status.js
│       ├── power-mode.js
│       ├── temperature.js
│       └── containers.js
├── site-hashrate/
│   ├── mdk-plugin.json
│   └── controllers/
│       └── hashrate-history.js
├── lib/
│   ├── constants.js
│   ├── metrics.utils.js
│   ├── period.utils.js
│   └── utils.js
└── package.json
```

## Regenerating the default-plugin tables

The default-plugin route tables under [Default plugins](#default-plugins) are generated from the manifests. Regenerate and commit them 
whenever a default plugin's routes change:

```bash
cd backend/core/plugins
npm run generate:plugin-reference
```

## Next steps

## Next steps

- [Build your first plugin](../../../docs/how-to/app-node/plugins.md)
- See a working [`extraPluginDirs` setup](../../../examples/full-site/README.md)
- Review the [App Node's extension model, data access, and auth design](../../../docs/concepts/stack/app-node.md)
- [Understand where plugins fit in the stack](../../../docs/concepts/stack/app-toolkit.md)
- See all [`startAppNode()` options](../mdk/README.md)