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
  everyone, unlike the Kernel listener, where an empty whitelist is open.

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
| `kernelKeyFile` | Optional | `string` | None | Where the runtime writes its Kernel public key on `start()`, for the Kernel's `auth.whitelist` |
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

`pipeToResponse(result, rawResponse)` writes a stream result to a Node `ServerResponse`. `resolvePluginDir(appDir)` returns the
directory holding `mdk-plugin.json` (`<appDir>/plugin`, then `<appDir>`). The wire protocol is described at the top of
[`lib/protocol.js`](./lib/protocol.js).

### Stream backpressure

The stream protocol has no flow control, and the transport does not slow the runtime down when the caller stops reading. So
each stream's unread body is capped at `maxStreamBufferBytes` (default 16 MiB): past it the client destroys the stream with
`ERR_APP_STREAM_OVERFLOW` and closes the channel, the runtime stops sending, and the handler's `raw` emits `'close'`. Behind
the Gateway, an HTTP client that reads too slowly gets a truncated response. On the runtime side, `raw.write()` returns
`false` while the connection's send buffer is full and `raw` emits `'drain'` when it empties, so a handler that respects
`write()`'s return value (or pipes with `stream.pipeline`) does not pile data up in the runtime.

## Manifest

`loadAppManifest(appDir)` / `validateAppManifest(obj, label)` read and validate `mdk-app.yaml`; other keys pass through.

| Field | Status | Description |
|-------|--------|-------------|
| `id` | Required | Reverse-DNS id, e.g. `io.tether.example` |
| `version` | Required | Semver |
| `displayName` | Required | Human name |
| `description` | Optional | One-line summary |
| `permissions` | Required (`[]` for none) | Rules `{ resources, verbs, resourceNames? }` over Kernel resources: the access the app's service account is granted as role `app-<name>` in `spec.rbac`, which the Kernel enforces on every call |
| `config` | Optional | Default config handed to the controllers |
| `main` | Optional | The app's background logic, `<file>[#export]` beside the route table. The export is called as `main(config, context)` and awaited before the runtime first serves, in the same module registry as the controllers, so state it sets up is theirs too. A rejection fails `start()` |

## Errors

| Code | Meaning |
|------|---------|
| `ERR_APP_MANIFEST_MISSING` / `ERR_APP_MANIFEST_INVALID` | `mdk-app.yaml` absent or invalid |
| `ERR_PLUGIN_MANIFEST_MISSING` | No `mdk-plugin.json` in `<appDir>/plugin` or `<appDir>` |
| `ERR_PLUGIN_*` | Other route table or handler problems, thrown by [`loadPlugin()`](./lib/plugin-loader.js) |
| `ERR_APP_RUNTIME_SEED_INVALID` | A persisted seed file is not 32 bytes |
| `ERR_APP_ROUTE_NOT_FOUND` | Unknown route id (404) |
| `ERR_APP_PROTOCOL_VERSION` | Caller and runtime disagree on the protocol version |
| `ERR_APP_RUNTIME_UNAVAILABLE` | Runtime unreachable, or it does not allow the caller's key (502) |
| `ERR_APP_RUNTIME_TIMEOUT` | No answer (or stream head) within `timeoutMs` (504) |
| `ERR_APP_REQUEST_ABORTED` | The caller's `signal` aborted the call |
| `ERR_APP_STREAM_OVERFLOW` | A stream's reader fell more than `maxStreamBufferBytes` behind; the stream was torn down |
| `ERR_APP_MAIN_NOT_FUNCTION` | `main` in `mdk-app.yaml` does not name a function |
| `ERR_APP_RUNTIME_CLIENT_NOT_CONNECTED` | A client call before `connect()` |
