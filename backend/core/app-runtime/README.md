# @tetherto/mdk-app-runtime

## Overview

Runs one app in its own process and serves its route handlers over **HRPC**. An app is a directory with an
`mdk-app.yaml` manifest and a route table (`mdk-plugin.json`, in `plugin/` or the app root) whose handlers are ordinary
Gateway-plugin controllers, loaded through this package's [plugin loader](./lib/plugin-loader.js). The
[Gateway](../gateway/README.md) reads only the route table, with the same loader, and forwards each request to the app's
runtime; it runs no app code.

- **Own Kernel client**: the runtime builds one Kernel client and hands it to controllers as `config.mdkClient`. It dials with
  a per-app transport key persisted under `storeDir` and signs in as the app's service account, `app:<name>`, from the credential
  in `credentialFile`. The Kernel checks every call against what `spec.rbac` grants that account. Controllers never see a Kernel
  key or the credential, and Kernel fields in either config layer are dropped, so an app cannot build a client of its own.
- **Operator identity at the Kernel**: each request's `req.mdk` is the Kernel client for work done for that request. When the
  Gateway forwarded a signed-in user, it is `config.mdkClient.withActor(<their token>)`: every call carries the operator's token
  beside the app's, the Kernel allows it only when `spec.rbac` allows both, and the write-command log records the operator via
  `app:<name>`. Otherwise `req.mdk` is `config.mdkClient`. The token never appears on `req`. Use `req.mdk` in controllers, and
  `config.mdkClient` for background work done as the app alone.
- **Closed front door**: the HRPC server accepts only the keys in `allowedKeys` and `allowedKeyFiles`. An empty allow set denies
  everyone, as an empty allowlist does at the [Kernel listener](../kernel/README.md#caller-admission-and-authorization).

Controllers `require('@tetherto/mdk-gateway/plugin')` and get a frozen `{ config, logger, onReady }` context. The loader
answers that specifier itself, so the app runtime and its apps don't need `@tetherto/mdk-gateway` installed.

## Options

`createAppRuntime(opts)` returns `{ name, manifest, routes, start(), stop(), getPublicKey(), getKernelPublicKey() }`. `start()`
resolves `{ publicKey }`; `start()` and `stop()` are idempotent.

| Option | Status | Type | Default | Description |
|--------|--------|------|---------|-------------|
| `name` | Required | `string` | None | Operator-owned handle; also the log namespace `mdk:app:<name>` |
| `appDir` | Required | `string` | None | App directory holding `mdk-app.yaml` and the route table |
| `config` | Optional | `object` | `{}` | Operator overrides; wins over the manifest's `config` defaults |
| `kernelKey` | Optional | `string` | None | Kernel listener public key the runtime's client dials; without it `config.mdkClient` fails each call with `ERR_MDK_CLIENT_UNAVAILABLE` |
| `kernelBootstrap` | Optional | `array` | None | DHT bootstrap for the runtime's Kernel client |
| `kernelDhtHost` | Optional | `string` | All interfaces | Interface the runtime's Kernel client binds |
| `credentialFile` | Optional | `string` | None | The app's service-account credential, JSON `{ name, privateKeyPem }` (`mdk add app` writes it to `.mdk/credentials/apps/<name>.json`). `name` must be `app:<name>` |
| `credential` | Optional | `object` | None | The same as `{ name, privateKey }`, instead of a file |
| `bootstrap` | Optional | `array` | HyperDHT default | DHT bootstrap nodes for the runtime's server; a private list keeps it off the public DHT |
| `dhtHost` | Optional | `string` | All interfaces | Interface the runtime server's DHT node binds; the server key is the same with or without it |
| `storeDir` | Optional | `string` | None | Persists the RPC and Kernel seeds (`0o600`) so both keys survive restarts; without it they are random per start. Its `data/` subdirectory is the app's own writable directory, passed as `config.dataDir` (`null` without a `storeDir`) |
| `allowedKeys` | Optional | `string[]` | `[]` | Hex public keys allowed to call the runtime |
| `allowedKeyFiles` | Optional | `string[]` | `[]` | Files holding hex keys (64 hex characters, whitespace-separated), re-read on every connection so start order does not matter. A file is skipped, with one warning, unless it is a regular file (not a symlink) owned by the runtime's user and not group/world-writable; `0644` is fine |
| `keyFile` | Optional | `string` | None | Where the runtime writes its public key once listening (the Gateway's `apps[].keyFile`) |
| `kernelKeyFile` | Optional | `string` | None | Where the runtime writes its Kernel public key on `start()`, for the Kernel's [caller allowlist](../kernel/README.md#caller-admission-and-authorization) |
| `logger` | Optional | `object` | `debug`-based | Overrides the default logger |

`getPublicKey()` is the HRPC server key while serving, otherwise `null`. `getKernelPublicKey()` is the transport key the
runtime's Kernel client dials with, available before `start()`. A runtime with a `kernelKey` and no credential logs a warning:
the Kernel refuses every call that carries no token.

| Code                                   | Fires when                                                       | Fix                                               |
| -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `ERR_APP_RUNTIME_CREDENTIAL_UNREADABLE` | `credentialFile` is missing or not JSON                         | Point it at the file `mdk add app` wrote          |
| `ERR_APP_RUNTIME_CREDENTIAL_MISMATCH`  | The credential's `name` is not `app:<name>`, or it has no private key | Pass this app's own credential              |

`bin/run-app.js` (`mdk-app-runtime`) is what `mdk run` spawns for each app: it reads the options as JSON from
`MDK_APP_RUNTIME_OPTIONS`, reports `{ type: 'ready', publicKey }` or `{ type: 'error', message }` over IPC, and stops on
`SIGTERM`, `SIGINT` or IPC disconnect. `mdk-app-runtime --help` prints usage.

A caller whose key is allowed is fully trusted: it reaches every route without the Gateway's auth, schema checks or rate limit,
and the `identity` it sends arrives as the controller's `req._info` as is (its `actor` token goes only to the Kernel, which
verifies it itself). Allow only the Gateway's key, and keep its key file
writable by the runtime's user alone. On Linux, `MDK_APP_RUNTIME_OPTIONS` stays readable in `/proc/<pid>/environ` (to the same
user and root) after the runtime deletes it from `process.env`.

## Client API

`createRuntimeClient({ seed, bootstrap, dhtHost, dht, rpc, poolLingerMs, maxStreamBufferBytes })` is the caller side, used by the Gateway:
one key (derived from `seed`, or the injected `rpc`'s) for every runtime it calls.

| Member | Description |
|--------|-------------|
| `publicKey` | `Buffer`: the key every runtime sees; list it in their `allowedKeyFiles` |
| `connect()` | Opens the transport |
| `invoke(runtimeKey, routeId, req, { identity, timeoutMs, signal })` | Unary call; `req` is `{ params, query, body, headers }`. Rejects with an error carrying `.statusCode`. Aborting `signal` while the connection is still opening drops the request before it is sent |
| `stream(runtimeKey, routeId, req, { identity, timeoutMs, signal })` | For `stream: true` routes; resolves `{ statusCode, headers, stream }`. Aborting `signal` before the head closes the channel. See [Stream backpressure](#stream-backpressure) |
| `close()` | Closes the transport it owns (an injected `rpc` / `dht` is left open) |

`pipeToResponse(result, rawResponse)` writes a stream result to a Node `ServerResponse`. It writes the response head synchronously, so a head that cannot be written (headers already sent, an invalid header value) throws before any promise exists. The promise resolves with the error that ended the body early, or `undefined` when the body completed. `resolvePluginDir(appDir)` returns the
directory holding the route table (`<appDir>/plugin`, then `<appDir>`), and `PLUGIN_FILE` is its filename, `mdk-plugin.json`. The wire protocol is described at the top of
[`lib/protocol.js`](./lib/protocol.js).

### Stream backpressure

The stream protocol has no flow control, and the transport does not slow the runtime down when the caller stops reading. So
each stream's unread body is capped at `maxStreamBufferBytes` (default 16 MiB): past it the client destroys the stream with
`ERR_APP_STREAM_OVERFLOW` and closes the channel, the runtime stops sending, and the handler's `raw` emits `'close'`. Behind
the Gateway, an HTTP client that reads too slowly gets a truncated response, and the Gateway logs the overflow at `warn`. On the runtime side, `raw.write()` returns
`false` while the connection's send buffer is full and `raw` emits `'drain'` when it empties, so a handler that respects
`write()`'s return value (or pipes with `stream.pipeline`) does not pile data up in the runtime.

## Manifest

`loadAppManifest(appDir)` / `validateAppManifest(obj, label)` read and validate `mdk-app.yaml`; other keys pass through.

| Field | Status | Description |
|-------|--------|-------------|
| `id` | Required | Reverse-DNS id, e.g. `io.tether.example` |
| `version` | Required | semver |
| `displayName` | Required | Human name |
| `description` | Optional | One-line summary |
| `permissions` | Required (`[]` for none) | Rules `{ resources, verbs, resourceNames? }` over Kernel resources: the access the app's service account is granted as role `app-<name>` in `spec.rbac`, which the Kernel enforces on every call |
| `config` | Optional | Default config handed to the controllers |
| `main` | Optional | The app's background logic, `<file>[#export]` beside the route table. The export is called as `main(config, context)` and awaited before the runtime first serves, in the same module registry as the controllers, so state it sets up is theirs too. A rejection fails `start()` |

## Route table

The route table's shape is [`mdk-plugin.schema.json`](./mdk-plugin.schema.json), JSON Schema 2020-12, published with this package
as `@tetherto/mdk-app-runtime/mdk-plugin.schema.json`. The [route-table field reference](./docs/route-table-fields.md) is generated
from it. The loader's own check stays the authority at startup: the schema's base rules reject only what the loader rejects, and
its rules for the OpenAPI-shaped form are errors only in a table that declares a `routeTableVersion`, warnings otherwise. The stamp is
the schema generation the table is written against, currently `"1"`, as `contractVersion` is for a Worker contract.

| Export | What it does |
| ------ | ------------ |
| `PLUGIN_FILE` | The route table's filename |
| `validateRouteTable(table, { strict })` | Checks a parsed table against the schema and returns `{ ok, errors, warnings }`. `strict: true` makes the OpenAPI-shaped rules errors in any table |
| `routeTableToOpenApi(table, { appName, mount })` | Returns `{ document, gaps }`: the table as an OpenAPI 3.1 document served under `mount` (default `/apps/<appName>`), and what the table does not declare. `appName` is the app's `spec.apps` name, which the RBAC resource in each operation's `x-mdk-access` is built from. Each operation also declares a bearer `security` requirement whose role name is that RBAC requirement, `<verb> <resource>`, so standard OpenAPI tools see that a token is needed. The document holds only what the table declares |
| `fastifyRoutesToOpenApi(routes, { title, version, server, components })` | The same for Fastify route objects registered in code, such as the Gateway's sign-in routes. Reads OpenAPI's `schema.responses`, which Fastify ignores, never Fastify's `schema.response`; `components` is copied into the document for those responses to refer to |
| `renderReference(document, gaps, { generatedBy, source, openapiFile })` | The Markdown HTTP reference for a document. Purpose comes from each route's `description`, an Errors section lists every declared error code with its status, after any component responses that carry an `x-mdk-stage`, once each by stage, and anything undeclared shows as "Not declared" |

An app in its own repository generates its reference with these, without a Gateway or any other app:

```js
const fs = require('fs')
const { routeTableToOpenApi, renderReference } = require('@tetherto/mdk-app-runtime')

const table = JSON.parse(fs.readFileSync('plugin/mdk-plugin.json', 'utf8'))
const { document, gaps } = routeTableToOpenApi(table, { appName: 'demo' })
fs.writeFileSync('docs/openapi.json', JSON.stringify(document, null, 2) + '\n')
fs.writeFileSync('docs/http-api.md', renderReference(document, gaps, {
  generatedBy: 'scripts/docs.js',
  source: 'plugin/mdk-plugin.json',
  openapiFile: 'openapi.json'
}))
```

## Errors

Grouped by who receives the error. Only the first group reaches an HTTP caller.

### Errors an HTTP caller receives

A request to an app route meets the Host check, the rate limit, authentication, body parsing, authorization, body validation,
forwarding to the app runtime, and the route's controller, in that order on a Gateway with an RBAC authority. On a Gateway with no
authority, an operator's verifier takes the place of authentication and authorization. It runs between the rate limit and body
parsing. The Gateway declares the
[codes and statuses each stage answers](../gateway/docs/http-api.md#errors-on-every-app-route) once, the forwarding codes this
package raises included, and the reference generator adds them to each app's HTTP reference in this repository, beside the codes
the app's route table declares.

### Errors at startup

Thrown when an app runtime starts, before it serves:

| Code | Fires when |
| --- | --- |
| `ERR_APP_MANIFEST_MISSING` / `ERR_APP_MANIFEST_INVALID` | `mdk-app.yaml` absent or invalid |
| `ERR_PLUGIN_*` | A route table or handler problem at load: see [Route table load errors](#route-table-load-errors) |
| `ERR_APP_RUNTIME_NAME_REQUIRED` / `ERR_APP_RUNTIME_APP_DIR_REQUIRED` | `createAppRuntime` was called without `name` or `appDir` |
| `ERR_APP_RUNTIME_CREDENTIAL_UNREADABLE` / `ERR_APP_RUNTIME_CREDENTIAL_MISMATCH` | The `credentialFile` cannot be used: see [Options](#options) |
| `ERR_APP_RUNTIME_OPTIONS_REQUIRED` / `ERR_APP_RUNTIME_OPTIONS_INVALID` | `mdk-app-runtime` found `MDK_APP_RUNTIME_OPTIONS` unset, not JSON, or not a JSON object |
| `ERR_APP_RUNTIME_SEED_INVALID` | A persisted seed file is not 32 bytes |
| `ERR_APP_MAIN_NOT_FUNCTION` | `main` in `mdk-app.yaml` does not name a function |
| `ERR_APP_RUNTIME_ONREADY_FN_REQUIRED` | App code called `context.onReady` with something other than a function |

### Errors in the client library

Thrown by the runtime client to the process that calls it, such as the Gateway:

| Code | Fires when |
| --- | --- |
| `ERR_APP_REQUEST_ABORTED` | The caller's `signal` aborted the call. Its status is `499`: the HTTP caller has gone, so no one receives it |
| `ERR_APP_REQUEST_FAILED` | The runtime answered a failure without an `ERR_*` code, such as a unary controller's error it masked. The client's error carries this `code`, the runtime's status, and the status text as its message. Behind the Gateway, the HTTP caller receives that status and the status text, never this code. |
| `ERR_APP_RUNTIME_CLIENT_NOT_CONNECTED` | A client call before `connect()` |
| `ERR_APP_RUNTIME_CLIENT_OPTIONS_INVALID` | `createRuntimeClient` got a `maxStreamBufferBytes` that is not a positive number |
| `ERR_APP_STREAM_OVERFLOW` | A stream's reader fell more than `maxStreamBufferBytes` behind: the client destroys the stream with this error (status `502`) and closes the channel. It fires only after the stream's head, so behind the Gateway the HTTP caller gets a truncated response, never this error, and the Gateway logs it at `warn` |

### Route-table tools

From the validator and the reference generator, at authoring or build time:

| Code | Fires when |
| --- | --- |
| `ERR_PLUGIN_MANIFEST_TYPE` / `_ENUM` / `_MINIMUM` / `_REQUIRED` / `_UNEXPECTED` | Findings `validateRouteTable` returns, not throws: a field of the wrong type, a value outside its allowed set, a number below its minimum, a missing required field, or a key the schema does not allow |
| `ERR_ROUTE_REFERENCE_APP_NAME` | `routeTableToOpenApi` was called without `appName` |

### Route table load errors

[`loadPlugin()`](./lib/plugin-loader.js) validates the route table when an app runtime or the Gateway starts, and throws on
the first problem. The Gateway reads route tables only; an app runtime also loads the handlers, so the `ERR_PLUGIN_HANDLER_*`
codes come from the app runtime. The MCP server's and the Worker runtime's own loaders reuse some of these codes for their own
manifests; this table describes app-runtime's loader.

| Code | Fires when | Fix |
| --- | --- | --- |
| `ERR_PLUGIN_MANIFEST_MISSING` | No `mdk-plugin.json` in `<appDir>/plugin` or `<appDir>` | Add the route table, or fix the app's `appDir` |
| `ERR_PLUGIN_MANIFEST_INVALID` | The manifest fails to parse as JSON, parses to a non-object value (such as a bare string or number), is missing `name` or `version`, or has no non-empty `routes` array; or a route is missing `id`/`handler`/a valid `method`/`path`, has a `path` that does not start with `/`, has a non-boolean `auth`, or has an invalid `verb` or `resourceName`. A JSON array manifest passes the object check and fails on the missing `name` field instead, with the same code and a different message. | Fix the field the error message names. [`mdk validate app`](../../../packages/cli/README.md) checks a table against these rules and the [route-table schema](./docs/route-table-fields.md) before it ships |
| `ERR_PLUGIN_ROUTE_DUPLICATE_ID` | Two routes in the same manifest share an `id` | Rename one of the duplicate route ids |
| `ERR_PLUGIN_ROUTE_DUPLICATE_PATH` | Two routes in the same manifest share a method and path (`/x/{id}` and `/x/:id` are the same path) | Remove or move one of them |
| `ERR_PLUGIN_HANDLER_NOT_FOUND` | A route's `handler` (or the app's `main`) file path doesn't exist | Fix the `handler` path for that route |
| `ERR_PLUGIN_HANDLER_LOAD_FAILED` | The `handler` (or `main`) file exists but cannot load: a dependency is not installed, or it throws when required. The message carries the cause | Install the app's dependencies, or fix the error the message names |
| `ERR_PLUGIN_HANDLER_NOT_FUNCTION` | A route's resolved handler module (or named export) isn't a function | Export a function from the file |
| `ERR_PLUGIN_HANDLER_OUTSIDE_PLUGIN` | A route's `handler` (or the app's `main`) is absolute or resolves outside the plugin directory | Move the handler into the plugin and use a relative path |
