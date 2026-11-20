# Gateway

## Overview

The Gateway is a router for [apps](#extend-the-gateway): each app is a plugin that defines its own routes and business logic, runs
in its own [`@tetherto/mdk-app-runtime`](../app-runtime/README.md) process, and opens its own connection to Kernel. The Gateway reads
each app's route table (`mdk-plugin.json`) and forwards every request to the app's runtime over HRPC; it executes no app code.

The Gateway, `@tetherto/mdk-gateway`, delivers an HTTP interface on top of the
[Kernel](../kernel/README.md): each app has its own [`@tetherto/mdk-client`](../client/README.md), signed in as the app, to reach
the Kernel, which routes a query to whichever [Worker](../../workers/README.md) owns the target device.

With an authority, which is a Kernel or a Gateway credential and what `mdk run` always wires, the Gateway signs callers in at
`/auth/*` and checks every app route against `spec.rbac`. Without one, it falls back to gating the routes a manifest marks
`"auth": true` through an `authVerifier` you supply, as the [security model](#security-model) sets out.

> [!NOTE]
> The Gateway's responsibilities stop at forwarding the request to the right controller and returning whatever that controller produces;
> it never combines results from more than one controller itself. The route (the URL your app calls) is handled entirely by the plugin
> that declared it. That plugin's "controller" must build the whole answer
> and hand it back as the HTTP response. If a route needs to combine telemetry from many
> devices, such as total hashrate across every miner on site, that happens inside that one controller, which must
> query every relevant Worker and aggregate the results.

## HTTP API overview

The Gateway declares no application routes of its own. Every REST route it serves comes from one of these sources, all wired in
[`http.node.wrk.js`](workers/http.node.wrk.js):

| Source | How it arrives | Set it up |
|--------|----------------|-----------|
| Sign-in routes | `/auth/*`, registered when the Gateway has an authority. The [Gateway HTTP API reference](docs/http-api.md) is generated from the route objects it registers | Give the Gateway a Kernel ([Kernel connection](#kernel-connection)), then [create the first operator](../../../docs/guides/security/create-the-first-operator.md) to sign in as |
| Apps | Every app the stack declares in `spec.apps[]`, or that you pass as `apps`, and nothing else. Mounted under `/apps/<name>` unless the app sets `mount` | [Create an app](../../../docs/guides/gateway/apps.md#create-an-app), then [declare and mount it](../../../docs/guides/gateway/apps.md#declare-and-mount-it) |
| `additionalRoutes` | Raw Fastify route objects you pass to `startGateway()` | [Raw Fastify routes](#raw-fastify-routes) |
| Static files | `GET /*` from `staticRootPath`, only when `common.json` sets it | The [`staticRootPath` option](#configuration); in production, read the [security model](#security-model) first |

Which app paths that adds up to is a property of the manifests, not of the Gateway: each app's route table is its own
`mdk-plugin.json` ([every field it can declare](../app-runtime/docs/route-table-fields.md)), and the Gateway does not enumerate app
routes anywhere else. An app's builder may [generate an HTTP reference and OpenAPI document from its route
table](../app-runtime/README.md#route-table), in the app's own repository.

> [!IMPORTANT]
> A Gateway loads **only** what it is told to load. A stack serves just the apps it declares, and any other path gets `404`.

### Request forwarding

Each route is a Fastify route, so its `schema` is enforced at the Gateway, with Fastify's default validator options: types are
coerced (`coerceTypes: 'array'`), defaults are filled in and properties `additionalProperties: false` excludes are removed. The
app runtime receives the body after this, and does not validate it again.

A nullable scalar in a body schema keeps a JSON `null` when `null` is part of its own `type`, as in
`{ "type": ["number", "null"], "minimum": 0 }`. In `anyOf`, a `number`, `integer`, `string`, `boolean`, or `array` branch tried
before the branch that takes `null` coerces it to `0`, `""`, `false`, or an array; in `oneOf`, `null` then matches two branches
and the request is refused. `z.toJSONSchema` writes a bounded nullable (`z.number().min(0).nullable()`) and a nullable array as
that `anyOf`, so rewrite them as a type list in the route table. [`mdk validate app`](../../../packages/cli/README.md) warns about both shapes.

The Gateway reads the runtime's key from the app's `keyFile`
on every request and forwards `{ params, query, body, headers }` by route `id`. A unary result comes back as JSON, so a controller
returns plain data (a `Buffer` would arrive as its JSON form); a `stream: true` route pipes the runtime's status,
headers, and body to the response. The `authorization`, `proxy-authorization`, and `cookie` headers are not forwarded: the caller's
identity reaches the app as `req._info`, and app code never sees credentials it could replay. A missing or invalid key file answers
`503` `ERR_APP_RUNTIME_UNAVAILABLE: <name>` (a runtime removes its key file when it stops), an unreachable runtime `502`. A unary
call, and the wait for a stream's response head, is bounded by the [`appTimeoutMs` option](#app-forwarding) (default `60000`);
past it the Gateway answers `504` `ERR_APP_RUNTIME_TIMEOUT`. A client that disconnects first aborts its call: while the runtime connection is
still opening the request is never sent, and a stream's channel is closed so the controller's response emits `close`. A `cache`
route is cached under the app name, route id, and the named request fields (plus a hash of the caller's identity on an `auth: true`
route), and is not aborted, since waiting requests share it.

A stream route's body is held at the Gateway while the HTTP client reads it, up to the [`maxStreamBufferBytes` option](#app-forwarding)
per stream (default `16777216`, 16 MiB). A client that falls further behind gets a truncated response: the status and headers are
already sent, so the connection closes before the body ends, and the Gateway logs `ERR_APP_STREAM_OVERFLOW` at `warn` with the app
and route ID. A client that disconnects is not logged at `warn`. Each slow stream can hold this much, so a higher value raises the
Gateway's worst-case memory.

## Live data

The Gateway has no push channel — clients poll its HTTP routes for updates.

> A UI reads a route with `useQuery` and a `refetchInterval` — the [mvp-site](../../../examples/mvp-site/README.md) dashboard
> polls its `site` plugin's routes this way. Pick the interval per route: fast for live readings, slow for inventory.

## Configuration

Config files are written to `opts.root/config/facs/` by `startGateway()`. Example files ship in `backend/core/gateway/config/facs/*.example`.
Edit the generated files to persist your changes across restarts. `./setup-config.sh` seeds the active files from those examples;
an existing file is left alone so local edits survive a re-run, and `-f` overwrites it.

| File | Controls |
|------|---------|
| `httpd.config.json` | Fastify HTTP server options |
| `store.config.json` | Hyperbee store path; the store holds identity seeds only |
| `net.config.json` | IP assignment (DHCP facility) |
| `logging.config.json` | Log level, format |

HTTP hardening is read from `startGateway()` options first, then from `common.json`, then from the defaults below. A
custom `authVerifier` is a function, so only `startGateway()` (or a programmatic worker `ctx`) can pass one. There are no
built-in verifiers. `staticRootPath` is the exception: the worker reads it from `common.json` only, so set it there or
through `startGateway({ common })`, as for the [app forwarding options](#app-forwarding).

| Option | Default | Effect |
|--------|---------|--------|
| `authVerifier` | none | Without an authority only: `async (request, route) => identity \| false`. Runs for every `auth: true` route; see [security model](#security-model) |
| `allowedHosts` | `[]` | Extra `Host` values served, as `name` (any port) or `name:port`. `localhost`, `127.0.0.1`, and `[::1]` on the bound port, plus a specific bind address, are always allowed. `["*"]` turns the check off |
| `trustProxy` | `false` | Fastify `trustProxy`. Behind a proxy you control, set the proxy's address or subnet (`"10.0.0.1"`, `"10.0.0.0/8"`, or a list): the client IP is then the `X-Forwarded-For` entry that proxy added. `true` trusts every hop, so a client chooses its own IP (and its rate-limit bucket), `X-Forwarded-Host` and `X-Forwarded-Proto`; it is safe only behind a proxy that replaces all three headers with values it sets itself, and the Gateway warns at boot that a client can set its own IP. A hop count (`1`, or `--trust-proxy 1`) is refused with `ERR_GATEWAY_TRUST_PROXY_INVALID`, since Fastify treats it as trusting no proxy. `--trust-proxy` is the standalone worker's flag; under `mdk run`, set `spec.gateway.config.trustProxy` |
| `bodyLimit` | `1048576` | Largest request body in bytes; a larger one gets `413` |
| `rateLimit` | `{ max: 300, timeWindow: "1 minute" }` | [`@fastify/rate-limit`](https://github.com/fastify/fastify-rate-limit) options, keyed by client IP; `false` disables |
| `helmet` | Helmet defaults without `upgrade-insecure-requests` | [`@fastify/helmet`](https://github.com/fastify/fastify-helmet) options; `false` disables |
| `staticRootPath` | unset | Directory served at `GET /*` (with `index.html` for unknown paths). Must be an absolute path: a relative one stops the Gateway at start with `FST_STATIC_INVALID_OPTION`. Static serving is off unless you set it. Read from `common.json` only, never from a top-level `startGateway()` option |

```js
await startGateway({
  kernel,
  authVerifier: async (request, route) => {
    const token = request.headers.authorization?.replace('Bearer ', '')
    return token ? await myIdentityLayer.verify(token) : false // e.g. { user: { userId }, perms: ['miner:w'] }
  },
  allowedHosts: ['mdk.example.com', '10.0.0.4:3000']
})
```

### App forwarding

Two options bound what the Gateway holds for an app call. Unlike the hardening options, they are read from `common.json`
only, not from a top-level `startGateway()` option. Every way of setting them writes that file:

- `startGateway({ common: { appTimeoutMs, maxStreamBufferBytes } })` merges the overrides into `<root>/config/common.json`:
  over the shipped example on first run, over the existing file after that. A start with no overrides leaves the file alone,
  so an override outlives the boot option that set it until you edit the file; see
  [config management](../mdk/README.md#config-management).
- `mdk run` passes `spec.gateway.config` from `mdk.yaml` as that `common`, so the file is
  `<project>/.mdk/gateway/config/common.json`. The same block reaches the MCP server, where `appTimeoutMs` bounds its app
  calls too ([`createMcpServer()`](../mcp/README.md#createmcpserverroot-port-config-plugindirs-apps-options));
  `maxStreamBufferBytes` applies only to the Gateway's HTTP stream routes.
- Edit `common.json` directly. `./setup-config.sh` seeds it from `common.json.example`, which carries both values.

| Option | Default | Effect |
|--------|---------|--------|
| `appTimeoutMs` | `60000` | Milliseconds allowed for an app's reply on a non-stream route, or for a stream's response head. Past it the Gateway answers `504` `ERR_APP_RUNTIME_TIMEOUT` |
| `maxStreamBufferBytes` | `16777216` (16 MiB) | Bytes of unread body the Gateway holds per stream. Past it the connection closes after the response head and the Gateway logs `ERR_APP_STREAM_OVERFLOW` at `warn`. When omitted, the Gateway passes nothing and the [runtime client](../app-runtime/README.md#client-api) applies its own 16 MiB cap |

Both take a positive integer; a digit string (`"60000"`) is accepted, and an omitted or `null` value means the default.
Anything else fails boot with `ERR_GATEWAY_APP_TIMEOUT_INVALID` or `ERR_GATEWAY_STREAM_BUFFER_INVALID`.
[Request forwarding](#request-forwarding) describes the timeout, the overflow, and the memory each slow stream can hold.

## Kernel connection

> [!NOTE]
> `startGateway()`, used throughout this section, is exported by [`@tetherto/mdk-core`](../mdk/README.md), not by this
> `@tetherto/mdk-gateway` package.

The Gateway opens no Kernel connection for device traffic: each app runtime dials Kernel over HRPC (`@hyperswarm/rpc`) with its own
keypair, using the Kernel's listener public key. For identity and policy, the Gateway uses the in-process Kernel directly when
started with `kernel`, and reaches a Kernel in another process over HRPC as its own service account when started with
`kernelKey` and `gatewayCredential` ([security model](#security-model)). `startGateway()` still resolves that key
**before any boot side effects**, in this order:

1. `kernelKey`: hex string or Buffer. Pass `kernelKey: false` to run without a Kernel key (useful when testing without a live Kernel).
2. `kernel`: an in-process `KernelManager` handle; the key comes from `kernel.getPublicKey()`.
3. Key file: `keyFile` (default: `DEFAULT_KEY_FILE`, i.e. `~/.mdk/.kernel-key`), which `getKernel()` publishes on start.
4. If none resolves, `startGateway()` throws `ERR_KERNEL_KEY_FILE_NOT_FOUND`.

**Zero-config (same host, default)**: Start the Kernel with `getKernel()`, then `startGateway()` with no endpoint options: the
Gateway picks the key up from the key file automatically.

**Cross-host**: Obtain the Kernel listener key with `kernel.getPublicKey().toString('hex')` on the host running Kernel, then pass
it on the Gateway host:

```js
await startGateway({ kernelKey: '<kernel-listener-pubkey-hex>' })
```

On a private DHT, pass `bootstrap` and `dhtHost` to `startGateway()` (`ctx.kernelBootstrap`, `ctx.kernelDhtHost`; the
`--kernelBootstrap` and `--kernelDhtHost` flags when spawned as a service). Both apply to every DHT node the Gateway starts: its net
facility, its Kernel client, and its client to app runtimes. The [private DHT guide](../../../docs/guides/deployment/private-dht.md)
covers the whole stack.

Kernel's allowlist (`hrpc.whitelist`) is fail-closed: empty admits nobody, so [each app runtime's Kernel public key must be admitted
before the connection is accepted](../kernel/README.md#caller-admission-and-authorization). A runtime writes that key to its `kernelKeyFile`;
`mdk run` points it into the trusted-keys dir, where the Kernel admits it. It is derived from a seed persisted in the runtime's store,
so it survives restarts. `startGateway({ kernel })` from `@tetherto/mdk-core` also admits the Gateway's own DHT key (`status.rpcClientKey`)
on an in-process Kernel and publishes it to the trusted-keys dir for same-machine Kernels and Workers.

## Security model

- **Every app route is checked against `spec.rbac`** when the Gateway has an authority: the in-process Kernel's issuer and
  policy (`startGateway({ kernel })`, as `mdk run` boots it), or a Kernel in another process reached as the Gateway's own
  service account (`startGateway({ kernelKey, gatewayCredential })`, as `mdk run gateway` boots it). The authority verifies
  tokens against the issuer's public keys and follows the policy without a round trip per request. Out of process it polls the
  policy and every subject's token version every 5 s, so a revoked token stops working within one poll, and a policy it has
  not refreshed for 60 s (`maxStaleMs`) allows nothing until a poll succeeds.
- **A bearer token on every app route**: a request without `Authorization: Bearer <access token>`, or with one that fails
  verification (expired, forged, or bound to an HRPC caller), answers
  [`401 ERR_AUTH_UNAUTHORIZED`](docs/http-api.md#errors-on-every-app-route) with `WWW-Authenticate: Bearer`. It runs as a
  `preParsing` hook, after the Host check and rate limit and before the body is read, so failed tokens count against the rate
  limit. A manifest's `auth` and `permissions` fields no longer matter: no route is open, and the Gateway logs a warning at
  boot for each route that sets `permissions`.
- **A rule for the route**: each route is governed as the resource `<app>/<path>` (the app's name and the route's path template,
  `ops-center/miners/:id`) and a verb, the route's `verb` or else one from its method (`GET` `get`, `POST` `create`, `PUT`/`PATCH`
  `update`, `DELETE` `delete`). A route that declares `resourceName: { param | query | body: "<field>" }` is checked for that
  instance. No matching rule answers `403 ERR_AUTH_FORBIDDEN: <sub> may not <verb> <resource> [<name>]`, one of the
  [errors every app route can answer](docs/http-api.md#errors-on-every-app-route).
- **Every decision is logged** as one `authz` line: `{ app, route, method, path, resource, verb, kind, sub, resourceName,
  decision, reason, role, policyVersion }`, including `unauthenticated` refusals and sign-in attempts at `POST /auth/login` and
  `POST /auth/token`.
- **The identity, never the token, reaches app code**: the runtime receives `{ kind, sub, email, groups }` as `req._info`;
  `authorization`, `proxy-authorization`, and `cookie` headers are stripped. A signed-in user's access token travels beside the
  request as its `actor`, which the runtime sends only to the Kernel through `req.mdk`, so the Kernel verifies the user and checks
  their rules as well as the app's. A call the Kernel refuses with `ERR_KERNEL_ACTION_FORBIDDEN` reaches HTTP as `403`; the
  [controller status rule](docs/http-api.md#errors-on-every-app-route) gives the status of any other refusal.
- **Sign-in routes**: the `/auth` routes proxy the Kernel's token issuer. [Each route's inputs, response statuses, and error
  codes](docs/http-api.md), with full schemas in its [`openapi.json`](docs/openapi.json), are generated from the route objects the
  Gateway registers. Refresh-token rotation is in the [identity package's overview](../identity/README.md#overview), and a reused
  refresh token and the reuse grace window in its [Sessions end when](../identity/README.md#sessions-end-when). One cookie rule is
  the Gateway's alone: the refresh cookie is `Secure` everywhere but plain-HTTP loopback, so over plain HTTP on a network the browser
  keeps no refresh cookie. Serve TLS, directly or at a proxy; behind a proxy that forwards a loopback `Host`, set `trustProxy` so the
  cookie keeps `Secure`.

Without an authority (a Gateway started with neither a Kernel nor a credential), the older verifier path applies:

- **Routes marked `"auth": true` fail closed**: before body parsing, validation, the cache, or the forward to the app runtime, the Gateway
  calls the configured `authVerifier(request, route)`. `route` is `{ id, method, path, app, permissions }` from the manifest. A falsy return,
  or no verifier at all, answers `401 ERR_AUTH_UNAUTHORIZED`; a verifier may throw its own `4xx` `ERR_*` error (for example
  `403 ERR_AUTH_PERM_DENIED`), and any other throw is a `401`. A truthy return is the caller's identity: it is forwarded to the runtime and
  reaches the controller as `req._info` ([auth and permissions](../../../docs/guides/gateway/apps.md#auth-and-permissions))
- **There is no built-in verifier**: an `authVerifier` given by name (the removed `"loopback"`) is refused at boot with
  `ERR_GATEWAY_AUTH_VERIFIER_INVALID`
- **Routes without `"auth": true` are open**: any caller that passes the Host check reaches them, with `req._info` set to `{}`

Whichever path applies:

- **Host allowlist**: a request whose `Host` header is not in `allowedHosts` (loopback on the bound port by default) gets
  [`403 ERR_GATEWAY_HOST_NOT_ALLOWED`](docs/http-api.md#errors-on-every-app-route), which blocks DNS-rebinding pages from reading a
  gateway on `localhost`. Add the names your clients use when you bind to a LAN address or put the Gateway behind a proxy
- **Limits and headers**: rate limiting ([`429 ERR_RATE_LIMITED`](docs/http-api.md#errors-on-every-app-route)), a configurable
  `bodyLimit`, and Helmet security headers are on by default. The rate limit counts a failed sign-in, a request an app route
  refuses for its token, and a request an `authVerifier` refuses, so those attempts are throttled. The limit is per client
  address, not per caller: behind a shared address, such as a NAT or a proxy not set in `trustProxy`, a client sending bad tokens
  can spend the budget of the signed-in users that share it. `trustProxy` is off. There is no `GET /echo` route.
- **Input validation**: path, query and header `parameters` and the `application/json` `requestBody` schema are validated before the request
  is forwarded
- **Per-caller cache**: a `cache` route checked against `spec.rbac`, or behind `auth: true`, adds a SHA-256 of the verified identity
  (`req._info`) to its cache key, so two callers never share a cached response or an in-flight call. Without an authority, a route that is
not marked `auth: true` keeps one shared entry per key
- **Cache refresh**: `?overwriteCache=true` bypasses a cached response only for a caller the `authVerifier` returned with `cache:overwrite`
  in its `perms` array
- **App code runs outside the Gateway**: the Gateway reads only each app's route table; the controllers run in the app's own runtime
  process, and a manifest `handler` must resolve inside its plugin directory
- **App runtime security**: a runtime admits only the public keys in its `allowedKeys`/`allowedKeyFiles`. The Gateway presents one
  key to every runtime, written to `gatewayKeyFile` (and `status.appClientKey`) and derived from a seed at
  `<root>/identity/seedRuntimeClient` (`0600`), so it survives restarts. The key file is replaced atomically with mode `0644`
  in a directory created `0700`, since runtimes refuse an allowed-key file that is group/other-writable or owned by another user
- **Static files**: static serving goes through `@fastify/static`, which `@tetherto/svc-facs-httpd@2.0.1` pins to `^9`. That range carries
  GHSA-8pvw-jcv7-9cmj and GHSA-83w8-p2f5-377r. Add the override in [Known dependency advisory](#known-dependency-advisory) to your
  app, or leave `staticRootPath` unset in production and serve the UI from a separate web server or proxy
- **Kernel connection security**: the HRPC connection is an encrypted Noise channel. Kernel's HRPC firewall is fail-closed: each app
  runtime's Kernel public key (its `kernelKeyFile`, stable across restarts) must be admitted (`hrpc.whitelist`, `kernel.allowKey()`, or
  the trusted-keys dir). Workers that app clients call directly must allow the same key (`allowedKeys`).
  See [Kernel Transport](../kernel/README.md#transports) and the `auth-whitelist` example
  for the key exchange pattern
- Connecting admits a caller and grants it nothing: Kernel checks the access token on every request an app runtime sends and judges it
  against `spec.rbac`
- Human and AI callers reach the same routes on the same terms: a user and a service account are checked against the same
  `spec.rbac`, and the MCP server applies the same route-to-resource mapping to agents

## Known dependency advisory

A fresh install of `@tetherto/mdk-gateway` (and of `@tetherto/mdk-core` and `@tetherto/mdk-mcp`, which depend on it) resolves
`@fastify/static@9.x` through `@tetherto/svc-facs-httpd@2.0.1`. `npm audit` then reports one high advisory
(GHSA-8pvw-jcv7-9cmj, GHSA-83w8-p2f5-377r) on `@fastify/static`, and moderate ones on the packages that pull it in. The
vulnerable code runs only when `staticRootPath` is set; static serving is off by default.

The fix needs a `svc-facs-httpd` release on `@fastify/static ^10.1.2`. Until then, add an override to your app's **root**
`package.json`. npm applies `overrides` only from the project being installed, so this package cannot set it for you:

```json
{
  "overrides": {
    "@fastify/static": "^10.1.2"
  }
}
```

Then reinstall and confirm:

```bash
npm install
npm ls @fastify/static     # @fastify/static@10.x under @tetherto/svc-facs-httpd
npm audit --omit=dev       # no @fastify/static advisory
```

`svc-facs-httpd` uses `@fastify/static` only through `register(...)` with `root`, `prefix` and `constraints`, plus `reply.sendFile`
for the 404 page, and these work unchanged on 10.x. Remove the override once a `svc-facs-httpd` release requires `^10`.

## Extend the Gateway

### Apps (recommended)

Pass each app's directory and the file its runtime writes its key to via `apps` to mount its routes at startup:

```js
await startGateway({
  kernel,
  gatewayKeyFile: './run/gateway.key',
  apps: [
    { name: 'my-metrics', appDir: path.join(__dirname, 'apps/my-metrics'), keyFile: './run/my-metrics.key' }
  ]
})
```

Run each app with [`createAppRuntime()`](../app-runtime/README.md) and `allowedKeyFiles: ['./run/gateway.key']`. Controllers receive
`(req)` and reach the Kernel through the `@tetherto/mdk-client` the runtime hands them as `config.mdkClient`, read via
`require('@tetherto/mdk-gateway/plugin')`, which acts as the app. Under `spec.rbac`, `req.mdk` acts for a signed-in user instead.
The Gateway forwards no service account's token, so for a service account `req.mdk` is `config.mdkClient`, acting as the app.
The plugins MDK ships run the same way, only when a stack declares them; nothing auto-registers.

The [Gateway apps guide](../../../docs/guides/gateway/apps.md) covers the authoring steps and the controller contract, and the
[supported apps reference](../../../docs/reference/supported-apps.md) lists which apps ship and where they live. Every route-table
field is in the [route-table field reference](../app-runtime/docs/route-table-fields.md). The loader enforces the fields checked
"Always" at boot; the rest are checked by `mdk validate app` and CI. [What the loader throws](#errors) is linked from here.

### Raw Fastify routes

For one-off handlers that do not need the plugin manifest format, pass `additionalRoutes` directly:

```js
await startGateway({
  kernel,
  additionalRoutes: [
    {
      method: 'GET',
      url: '/custom/endpoint',
      handler: async (req, reply) => { return { ok: true } }
    }
  ]
})
```

These are registered as plain Fastify routes: no app runtime and no manifest validation. Unlike an app controller, the handler
receives the Fastify `reply`, so this is the way to control status codes.

## Errors

An HTTP caller receives the [errors every app route can answer](docs/http-api.md#errors-on-every-app-route), listed by stage in
the generated HTTP reference.

The Gateway reads each app's route table through app-runtime's [`loadPlugin()`](../app-runtime/lib/plugin-loader.js) at startup,
which throws on the first problem. Its codes are listed in app-runtime's
[route table load errors](../app-runtime/README.md#route-table-load-errors). The `apps` option errors are in the
[`startGateway()` reference](../mdk/README.md).

### Boot and wiring errors

The Gateway throws these codes while it starts or while its modules load, before it serves a request. The option codes belong to
the [hardening options](#configuration) and the [app forwarding options](#app-forwarding).

| Code                                   | Fires when                                                                                   | Fix                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ERR_HTTP_PORT_INVALID`                | The HTTP worker starts with no `port`                                                        | Pass a port                                              |
| `ERR_GATEWAY_AUTH_VERIFIER_INVALID`    | `authVerifier` is a name, such as the removed `"loopback"`, or any other value that is not a function | Pass a function, or remove `authVerifier`                |
| `ERR_GATEWAY_ALLOWED_HOSTS_INVALID`    | `allowedHosts` is neither an array nor a comma-separated string, or an entry or the bind address is not `name` or `name:port` | Fix the entry the message names                          |
| `ERR_GATEWAY_TRUST_PROXY_INVALID`      | `trustProxy` is a hop count: a number or a digit string                                      | Give the proxy's address or CIDR                         |
| `ERR_GATEWAY_BODY_LIMIT_INVALID`       | `bodyLimit` is not a positive integer or a digit string                                      | Pass the limit in bytes                                  |
| `ERR_GATEWAY_APP_TIMEOUT_INVALID`      | `appTimeoutMs` is set and is not a positive integer or a digit string                        | Pass milliseconds, or omit it for the default            |
| `ERR_GATEWAY_STREAM_BUFFER_INVALID`    | `maxStreamBufferBytes` is set and is not a positive integer or a digit string                | Pass bytes, or omit it for the default                   |
| `ERR_GATEWAY_AUTHORITY_KERNEL_INVALID` | `localAuthority()` is called with anything but a started `KernelManager`                     | Start the Kernel before passing it                       |
| `ERR_NO_PLUGIN_CONTEXT`                | [`@tetherto/mdk-gateway/plugin`](plugin.js) is required outside a loaded plugin, such as a controller required directly in a test | Load the plugin through an app runtime                   |
| `ERR_AUTH_ROUTE_STATUS_UNKNOWN`        | A sign-in route in [`auth-routes.js`](workers/lib/auth-routes.js) declares an error whose status, given or looked up from its code, is not an integer | Give the code an integer status                          |

### Decision log reasons

The `authz` line the Gateway [logs for every decision](#security-model) carries a `reason` that the HTTP caller never receives:
the caller gets `401 ERR_AUTH_UNAUTHORIZED` or `403 ERR_AUTH_FORBIDDEN`. A Gateway whose Kernel runs in another process sets two
reasons itself.

| Code                                   | Fires when                                                                                   | Fix                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ERR_RBAC_POLICY_STALE`                | No policy poll has succeeded for `maxStaleMs` (60 s by default), so every request is denied  | Restore the Gateway's connection to the Kernel           |
| `ERR_IDENTITY_TOKEN_REVOKED`           | A token's subject is missing from the Gateway's copy of the token versions, or its `ver` is not the current one, after one extra poll | Refresh, or sign in again                                |

Every other `ERR_*` reason comes from the package that made the decision: identity's
[access token verification](../identity/README.md#access-token-verification) codes on a `401`, and the RBAC package's
[deny reasons](../rbac/README.md#deny-reasons) on a `403`.

## Directory layout

```text
gateway/
├── workers/
│   ├── http.node.wrk.js          # WrkServerHttp — Fastify worker, mounts app routes
│   └── lib/
│       ├── plugin-loader.js      # Re-exports @tetherto/mdk-app-runtime's manifest loader
│       ├── plugin-adapter.js     # Converts app routes to Fastify handlers that forward to the runtime, applies caching
│       ├── plugin-gateway.js     # Builds a plugin's context ({ config }), for the MCP server
│       ├── security.js           # authVerifier hook, Host allowlist, hardening defaults
│       ├── constants.js
│       ├── utils.js
│       └── server/lib/           # cachedRoute.js and send200.js, used by the adapter
├── config/
│   └── facs/                     # Example config files (*.json.example)
├── db/                           # Local store directory (identity seeds)
└── tests/
    ├── unit/lib/                 # One suite per lib module
    └── integration/
        ├── api.test.js           # HTTP route tests
        └── app-forwarding.test.js # The Gateway against real app runtimes
```

## Next steps

- [Run the Gateway](../../../docs/guides/gateway/run.md)
- [Secure the site](../../../docs/guides/security/index.md): admit this Gateway to Kernel and lock down the fleet
- [Add routes with apps](../../../docs/guides/gateway/apps.md)
- [Look up the sign-in routes](docs/http-api.md): each route's inputs, response statuses and error codes, generated from the route objects the Gateway registers
- Browse the [supported apps reference](../../../docs/reference/supported-apps.md)
- See a complete [worked example](../../../examples/mvp-site/README.md)
- Browse the [`startGateway()` options](../mdk/README.md)
- Reach MDK over MCP — run the standalone [`@tetherto/mdk-mcp`](../mcp/README.md) process (`mdk run mcp`), which derives
  tools from this Gateway's own plugins without the Gateway hosting any MCP code itself
- Skip the HTTP surface and plugin system entirely by [connecting to Kernel directly](../client/README.md) with
  `@tetherto/mdk-client` — viable for a background service that only dispatches commands, though most applications build on the Gateway
