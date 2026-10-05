# @tetherto/mdk-plugins

The bundled [Gateway](../gateway/README.md) plugins and the declarative plugin format for extending the MDK Gateway with
custom HTTP routes.

## Overview

A plugin is a directory containing:

- `mdk-plugin.json`: manifest declaring route identity, HTTP surface, and caching
- One or more controller files — each exports `async function (req)`

A Gateway loads exactly the plugins your stack declares — nothing here, including `telemetry`, `site-hashrate`, and
`site-monitor`, is registered automatically. Declare one via `spec.gateway.plugins[]` or `startGateway({ extraPluginDirs: [...] })`.
The `auth` plugin ships here too, but is [neither registered nor wired](#the-bundled-auth-plugin) even once declared.

> [!TIP]
> New to the plugin system? Read the [Gateway plugins how-to guide](../../../docs/guides/gateway/plugins.md) for a step-by-step walkthrough.
> For the broader toolkit context, see the [MDK App Toolkit concept page](../../../docs/concepts/app-toolkit.md).

## Manifest format

Read a real manifest rather than a field table — every supported field is exercised across the shipping manifests, and they are validated at startup
so they cannot drift:

- [telemetry manifest](telemetry/mdk-plugin.json): `cache`, query `parameters`, `responses`, `constraints`, `errors`, and
named-export handlers (`./controllers/power-mode.js#timeline`)
- [site-plugin manifest](../../../examples/full-site/plugins/site/mdk-plugin.json): a `POST` with a `requestBody`, path
`parameters`, and `safety`

What is required and what is rejected is defined by `_validateManifest` in [`plugin-loader.js`](../gateway/workers/lib/plugin-loader.js): `name`,
`version`, and a non-empty `routes` array, plus per route an `id`, a `handler`, an allowed `http.method` (`GET`/`POST`/`PUT`/`DELETE`/`PATCH`), an
`http.path`, and unique route ids. Path parameters in `{param}` form are normalized to Fastify's `:param`.

Beyond the validated fields, three are read:

- `cache` is enforced: an array of dot-paths composed into the cache key by [`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js):

  ```json
  {
    "id": "telemetry.hashrate",
    "cache": ["query.start", "query.end", "query.groupBy"],
    ...
  }
  ```

  Pass `?overwriteCache=true` with a non-empty `Authorization` header to bypass and refresh. The flag is honored only when
  the value is literally `true` and the header is non-empty; the Gateway does not authenticate or validate it. Any other
  value, including `false`, or a missing header is ignored. See
  [the guide's Caching step](../../../docs/guides/gateway/plugins.md#caching) for the how-to
- `description` is read by [`generate-plugin-reference.js`](../../../docs/scripts/generate-plugin-reference.js) to build the route tables
- `stream` marks a route that owns the raw `ServerResponse` instead of returning a plain value: [`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js)
hijacks the reply so Fastify never serializes it, and calls the handler as `(req, raw)`. A throw before any header is written returns the standard
[error body](#error-responses); a throw after headers are sent just ends the socket instead of leaving it open.
[`backend/plugins/agent`](../../plugins/agent/README.md) is the shipping example — its message route streams `text/event-stream` this way.
See [the guide's Stream routes step](../../../docs/guides/gateway/plugins.md#stream-routes) for the how-to

The following have no reader:

- `constraints`, `errors`, and `safety` record intent for humans and agents reading the manifest
- [`auth` and `permissions`](../../../docs/guides/gateway/plugins.md#auth-and-permissions) may be used to document what a route expects,
and pair each declaration with the matching check in the controller that serves it

## Controllers

A controller exports `async function (req)` and returns a value that is serialized as a `200` JSON response. Use `"handler":
"./file.js#namedExport"` for a non-default export. Any shipping controller shows the shape — for example,
[`hashrate.js`](telemetry/controllers/hashrate.js).

`req`, assembled in [`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js):

| Field         | Type     | Contains                                        |
| ------------- | -------- | ----------------------------------------------- |
| `req.params`  | `object` | Path parameters (e.g. `{ deviceId: 'wm-001' }`) |
| `req.query`   | `object` | Query string parameters                         |
| `req.body`    | `object` | Parsed JSON request body                        |
| `req.headers` | `object` | HTTP headers                                    |
| `req._info`   | `object` | Internal request metadata (rarely needed)       |

- A controller builds its own [`@tetherto/mdk-client`](../client/README.md) from the plugin's
[context module](../../../docs/guides/gateway/plugins.md#the-plugins-context-module) (`require('@tetherto/mdk-gateway/plugin')`), same
as [`telemetry/lib/client.js`](telemetry/lib/client.js) does, and requires that module once per plugin rather than per controller

> [!TIP]
> The [plugin authoring guide](../../../docs/guides/gateway/plugins.md) walks through building a controller and the
> [plugin's context module](../../../docs/guides/gateway/plugins.md#the-plugins-context-module) — its full field list.

## Error responses

A returned value is serialized as a `200`. A throw is turned into one error body by `errorResponse()` in
[`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js), the same shape for normal and stream routes:

| Field        | Type     | Contains                                                                                  |
| ------------ | -------- | ----------------------------------------------------------------------------------------- |
| `statusCode` | `number` | `err.statusCode` when an integer 400 or higher, otherwise `400`                           |
| `error`      | `string` | The HTTP reason phrase for `statusCode` (e.g. `Conflict`), falling back to `Bad Request`  |
| `message`    | `string` | The error's own text for `ERR_*` codes and Fastify 4xx errors, else the status phrase     |

Attach `.statusCode` to a thrown error to choose the code. A `message` is returned verbatim only when it is safe: an
`ERR_*` code, or a Fastify 4xx error (validation, content type, body size). Any other message is replaced with the
status phrase and the real error is logged, so internal detail never reaches the client. Each plugin documents the
`ERR_*` codes it throws in its own README, as the [agent plugin's error table](../../plugins/agent/README.md#errors) does.

## Plugins MDK ships

These plugins ship with MDK. **None of them is loaded unless your stack declares it.** `spec.gateway.plugins[]` is the
whole truth about what a Gateway runs. Declaring one is the same work as [declaring any other package](#declare-a-plugin-in-your-stack);
[`auth`](#the-bundled-auth-plugin) needs work beyond declaring it.

> [!Note]
> These plugins' routes are served without authentication: the Gateway applies no token check of its own; [protecting a route is
> controller responsibility](../../../docs/guides/gateway/plugins.md#auth-and-permissions).

The [supported plugins reference](../../../docs/reference/supported-plugins.md) lists every route each shipped plugin
serves, generated from these manifests by
[`docs/scripts/generate-plugin-reference.js`](../../../docs/scripts/generate-plugin-reference.js). Routes you add through
`extraPluginDirs` are owned by their own manifests and are not listed here.

### Declare a plugin in your stack

They are subdirectories of the one `@tetherto/mdk-plugins` package, so each is addressed by its subpath:

```yaml
# mdk.yaml
spec:
  gateway:
    port: 3847
    plugins:
      - package: "@tetherto/mdk-plugins/telemetry"
      - package: "@tetherto/mdk-plugins/site-monitor"
      - package: "@tetherto/mdk-plugins/site-hashrate"
      - package: "@example/mdk-plugin-mine"      # your own, unchanged
```

`@tetherto/mdk-plugins` has to be resolvable from the project directory, which it is for a stack scaffolded by
`mdk init` (it arrives with `@tetherto/mdk-gateway`). Add it to your own `package.json` if you vendored things yourself.

Programmatically, `startGateway()` takes directories rather than package names, and
[`bundledPluginDir()`](../mdk/README.md#bundledplugindirname) resolves one for you:

```js
const { startGateway, bundledPluginDir } = require('@tetherto/mdk-core')

await startGateway({
  port: 3847,
  kernelKey,
  extraPluginDirs: [bundledPluginDir('telemetry'), path.join(__dirname, 'plugins', 'site')]
})
```

Every route is served without authentication. The Gateway applies no token check of its own, so protecting a route is controller work
([auth and permissions](../../../docs/guides/gateway/plugins.md#auth-and-permissions)).

### The bundled auth plugin

`auth` ships in this package for reference. Adding its directory to `extraPluginDirs` mounts the routes but does not give you working endpoints:

- [`auth/controllers/permissions.js`](auth/controllers/permissions.js), [`auth/controllers/token.js`](auth/controllers/token.js), and
[`auth/controllers/ext-data.js`](auth/controllers/ext-data.js) all still declare a second `services` handler parameter and call `ctx.authLib` or
`ctx.dataProxy` on it, but [`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js) invokes every handler with `req` alone, so
`services` arrives `undefined` — all three throw a `TypeError` on that, which the worker's `onError` hook returns as HTTP 400
- [`auth/controllers/userinfo.js`](auth/controllers/userinfo.js) returns `req._info.user`. Nothing populates `_info`, which
[`plugin-adapter.js`](../gateway/workers/lib/plugin-adapter.js) defaults to `{}`, so the route answers with an empty body

Authentication is [yours to supply](../../../docs/guides/gateway/plugins.md#auth-and-permissions): bring an identity layer and implement the checks
your routes need inside their controllers.

## Mounting plugins

```js
const { startGateway } = require('@tetherto/mdk-core')

await startGateway({
  kernel,
  extraPluginDirs: [
    path.join(__dirname, 'plugins/my-metrics')
  ]
})
```

### Manifest validation errors

The loader validates every manifest and handler at startup and throws on the first problem. The
[Gateway's own error reference](../gateway/README.md#errors) lists the codes and their fixes.

### Runtime plugin errors

For plugin errors thrown after startup: a throw inside a plugin's `onReady` callback — registered via
`context.onReady(fn)` on [the plugin's context module](../../../docs/guides/gateway/plugins.md#the-plugins-context-module) —
is caught and logged as a warning; it does not stop the Gateway or any other plugin.

## Directory layout

```text
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
│   ├── controllers/
│   │   ├── hashrate.js
│   │   ├── consumption.js
│   │   ├── efficiency.js
│   │   ├── miner-status.js
│   │   ├── power-mode.js
│   │   ├── temperature.js
│   │   └── containers.js
│   └── lib/
│       ├── client.js         # mdk client built from this plugin's ambient context
│       └── site-data.js      # worker-owned telemetry history over the mdk client
├── site-hashrate/
│   ├── mdk-plugin.json
│   ├── controllers/
│   │   └── hashrate-history.js
│   └── lib/
│       └── client.js         # mdk client built from this plugin's ambient context
├── site-monitor/
│   ├── mdk-plugin.json
│   ├── controllers/
│   │   ├── site.js
│   │   ├── feature-config.js
│   │   └── hashrate.js
│   └── lib/
│       └── client.js         # mdk client built from this plugin's ambient context
├── lib/
│   ├── constants.js
│   ├── metrics.utils.js
│   ├── period.utils.js
│   └── utils.js
├── package.json
└── tests/
    └── unit/
        └── generate-plugin-reference.test.js  # unit tests for the supported-plugins generator
```

## Next steps

- [Build your first plugin](../../../docs/guides/gateway/plugins.md)
- See a working [`extraPluginDirs` setup](../../../examples/full-site/README.md)
- Review the [Gateway's extension model, data access, and security model](../gateway/README.md#extend-the-gateway)
- [Understand where plugins fit as an extension point](../../../docs/concepts/the-integration-model.md)
- See all [`startGateway()` options](../mdk/README.md)
